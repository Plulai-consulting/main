import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { makeImage } from '@/lib/ai/pipeline'
export const maxDuration=300
export async function POST(req){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)return NextResponse.json({error:'Please log in.'},{status:401})
  const {generation_id,index}=await req.json().catch(()=>({}))
  const i=Number(index)
  const {data:gen}=await sb.from('generations').select('id,user_id,status,brief,posts').eq('id',String(generation_id||'')).maybeSingle() // rules: own rows only
  if(!gen||gen.status!=='ready'||!Number.isInteger(i)||!gen.posts?.[i])return NextResponse.json({error:'Not found'},{status:404})
  if(gen.posts[i].image_path||gen.posts[i].image_status==='failed')return NextResponse.json({ok:true})
  const db=adminClient()
  const img=await makeImage(gen.brief,gen.posts[i],`${gen.id}-${i}`)
  // re-read right before writing so parallel updates are not lost
  const {data:cur}=await db.from('generations').select('posts').eq('id',gen.id).single()
  const posts=cur.posts
  if(img){
    const ext=img.type.includes('jpeg')?'jpg':img.type.includes('webp')?'webp':'png'
    const path=`${gen.user_id}/${gen.id}/${i}.${ext}`
    const up=await db.storage.from('tool-images').upload(path,img.buf,{contentType:img.type,upsert:true})
    posts[i]=up.error?{...posts[i],image_status:'failed'}:{...posts[i],image_path:path}
  }else posts[i]={...posts[i],image_status:'failed'}
  await db.from('generations').update({posts}).eq('id',gen.id)
  return NextResponse.json({ok:!!posts[i].image_path})
}
