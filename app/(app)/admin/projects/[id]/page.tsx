import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PHASES } from '@/lib/phases'
import Bar from '@/components/Bar'
import AdminNav from '@/components/AdminNav'
import Timeline from '@/components/Timeline'
import Chat from '@/components/Chat'
import { setPhase } from '../../actions'
export const dynamic='force-dynamic'
export default async function AdminProject({params}){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)redirect('/login')
  const {data:me}=await sb.from('profiles').select('full_name,role').eq('id',user.id).single()
  if(me?.role!=='admin')redirect('/portal')
  const {data:p}=await sb.from('projects').select('id,title,service,phase,client_id,profiles(full_name,email)').eq('id',params.id).maybeSingle()
  if(!p)notFound()
  const cname=p.profiles?.full_name||p.profiles?.email||'Client'
  return <div className="shell"><Bar label="Admin" name={me.full_name||user.email}/><AdminNav current="/admin/projects"/>
    <p><a href="/admin/projects">← All projects</a></p>
    <span className="tag" style={{marginTop:16}}>{(p.service||'PROJECT').toUpperCase()} · {cname}</span>
    <h1 style={{fontSize:'clamp(36px,5vw,56px)'}}>{p.title}</h1>
    <div className="grid" style={{marginTop:28,alignItems:'start'}}>
      <div className="card"><h3 style={{fontSize:24,marginBottom:6}}>Progress</h3><Timeline phase={p.phase}/>
        <form action={setPhase} style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:20}}><input type="hidden" name="id" value={p.id}/>
          <select name="phase" defaultValue={p.phase} aria-label="Phase">{PHASES.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>
          <button className="btn">Update phase</button></form>
        <p className="muted" style={{fontSize:13,margin:'12px 0 0'}}>The client sees the new phase and a message in the chat.</p></div>
      <div className="card"><h3 style={{fontSize:24,marginBottom:14}}>Chat with {cname}</h3><Chat projectId={p.id} userId={user.id} clientId={p.client_id} clientName={cname}/></div>
    </div></div>
}
