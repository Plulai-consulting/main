'use server'
import { assemble } from '@/lib/ai/review'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PHASES } from '@/lib/phases'
import { adminClient } from '@/lib/supabase/admin'
async function requireAdmin(){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)redirect('/login')
  const {data:p}=await sb.from('profiles').select('role').eq('id',user.id).single()
  if(p?.role!=='admin')redirect('/portal')
  return {sb,user}
}
export async function createProject(fd){
  const {sb}=await requireAdmin()
  const client_id=String(fd.get('client_id')||''),title=String(fd.get('title')||'').trim().slice(0,120),service=String(fd.get('service')||'').trim().slice(0,60)
  if(!client_id||!title)return
  const {data,error}=await sb.from('projects').insert({client_id,title,service}).select('id').single()
  if(error)return
  revalidatePath('/admin/projects')
  redirect('/admin/projects/'+data.id)
}
export async function setPhase(fd){
  const {sb,user}=await requireAdmin()
  const id=String(fd.get('id')||''),phase=String(fd.get('phase')||''),label=PHASES.find(p=>p[0]===phase)?.[1]
  if(!id||!label)return
  const {error}=await sb.from('projects').update({phase}).eq('id',id)
  if(error)return
  await sb.from('messages').insert({project_id:id,sender_id:user.id,body:`Project moved to the ${label} phase.`})
  revalidatePath('/admin/projects/'+id);revalidatePath('/portal');revalidatePath('/admin')
}
export async function setToolAccess(fd){
  await requireAdmin()
  const id=String(fd.get('id')||''),enable=fd.get('enable')==='1',q=Math.max(0,Math.min(100,parseInt(fd.get('quota'),10)||5))
  if(!id)return
  await adminClient().from('profiles').update({tool_access:enable,monthly_quota:q}).eq('id',id).eq('role','client')
  revalidatePath('/admin/tool')
}
export async function reviewGeneration(fd){
  await requireAdmin()
  const id=String(fd.get('id')||''),approve=fd.get('decision')==='approve',db=adminClient()
  const {data:g}=await db.from('generations').select('id,status').eq('id',id).single()
  if(!g||g.status!=='needs_review')return
  if(approve){
    const {data:a}=await db.from('generation_audits').select('attempt,draft').eq('generation_id',id).not('draft','is',null)
    const plan=assemble(a)
    if(!plan)return // nothing complete to approve: the strategy or the posts never passed
    await db.from('generations').update({status:'ready',strategy:plan.strategy,posts:plan.posts,finished_at:new Date().toISOString()}).eq('id',id)
  }else await db.from('generations').update({status:'failed'}).eq('id',id)
  revalidatePath('/admin/tool')
}
