import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Bar from '@/components/Bar'
import Timeline from '@/components/Timeline'
import Chat from '@/components/Chat'
export const dynamic='force-dynamic'
export default async function ClientProject({params}){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)redirect('/login')
  const {data:me}=await sb.from('profiles').select('full_name,role').eq('id',user.id).single()
  if(me?.role==='admin')redirect('/admin/projects/'+params.id)
  const {data:p}=await sb.from('projects').select('id,title,service,phase,client_id').eq('id',params.id).maybeSingle() // RLS: only your own
  if(!p)notFound()
  const name=me?.full_name||user.email
  return <div className="shell"><Bar label="Client area" name={name}/>
    <p><a href="/portal">← Your projects</a></p>
    <span className="tag" style={{marginTop:16}}>{(p.service||'PROJECT').toUpperCase()}</span>
    <h1 style={{fontSize:'clamp(36px,5vw,56px)'}}>{p.title}</h1>
    <div className="grid" style={{marginTop:28,alignItems:'start'}}>
      <div className="card"><h3 style={{fontSize:24,marginBottom:6}}>Where we are</h3><Timeline phase={p.phase}/></div>
      <div className="card"><h3 style={{fontSize:24,marginBottom:14}}>Message our team</h3><Chat projectId={p.id} userId={user.id} clientId={user.id} clientName={name}/></div>
    </div></div>
}
