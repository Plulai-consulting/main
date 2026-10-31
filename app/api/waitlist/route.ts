import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const EMAIL=/^\S+@\S+\.\S+$/
export async function POST(req){
  let b;try{b=await req.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
  if(b.website)return NextResponse.json({ok:true}) // honeypot: bots fill this hidden field
  const name=String(b.name||'').trim().slice(0,100)
  const email=String(b.email||'').trim().toLowerCase().slice(0,200)
  const business=String(b.business||'').trim().slice(0,150)
  if(!name||!EMAIL.test(email))return NextResponse.json({error:'Name and valid email required'},{status:400})
  const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
  const {error}=await sb.from('waitlist').upsert({name,email,business},{onConflict:'email'})
  if(error)return NextResponse.json({error:'Could not save'},{status:500})
  return NextResponse.json({ok:true})
}
