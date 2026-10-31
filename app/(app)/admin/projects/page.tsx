import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PHASES } from '@/lib/phases'
import Bar from '@/components/Bar'
import AdminNav from '@/components/AdminNav'
import { createProject } from '../actions'
export const dynamic='force-dynamic'
export default async function Projects(){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)redirect('/login')
  const {data:me}=await sb.from('profiles').select('full_name,role').eq('id',user.id).single()
  if(me?.role!=='admin')redirect('/portal')
  const [pr,cl]=await Promise.all([
    sb.from('projects').select('id,title,service,phase,created_at,last_message_at,last_from_admin,profiles(full_name,email)').order('created_at',{ascending:false}),
    sb.from('profiles').select('id,full_name,email').eq('role','client').order('full_name')])
  return <div className="shell"><Bar label="Admin" name={me.full_name||user.email}/><AdminNav current="/admin/projects"/>
    <p><a href="/admin">← Overview</a></p><h1 style={{fontSize:'clamp(40px,6vw,64px)',marginTop:12}}>Projects</h1>
    <h2 className="sec">New project</h2>
    <form action={createProject} className="card" style={{display:'grid',gap:14,maxWidth:560}}>
      <label>Client<select name="client_id" required defaultValue=""><option value="" disabled>Choose a client</option>{(cl.data||[]).map(c=><option key={c.id} value={c.id}>{c.full_name||c.email} ({c.email})</option>)}</select></label>
      <label>Project title<input name="title" required maxLength={120} placeholder="e.g. Brand refresh"/></label>
      <label>Service<input name="service" maxLength={60} placeholder="Marketing, AI consulting, Audit…"/></label>
      {!cl.data?.length&&<p className="muted" style={{margin:0}}>No client accounts yet. A client must sign up first.</p>}
      <button className="btn" style={{justifySelf:'start'}}>Create project</button></form>
    <h2 className="sec">All projects</h2>
    <div className="card scroll"><table><thead><tr><th>PROJECT</th><th>CLIENT</th><th>SERVICE</th><th>PHASE</th><th>CHAT</th><th></th></tr></thead><tbody>
      {[...(pr.data||[])].sort((a,b)=>Number(b.last_from_admin===false)-Number(a.last_from_admin===false)).map(p=><tr key={p.id}><td>{p.title}</td><td>{p.profiles?.full_name||p.profiles?.email||'-'}</td><td>{p.service||'-'}</td><td>{PHASES.find(x=>x[0]===p.phase)?.[1]}</td><td>{p.last_message_at&&p.last_from_admin===false?<span className="badge">Awaiting reply</span>:<span className="muted">{p.last_message_at?'Replied':'-'}</span>}</td><td><a href={'/admin/projects/'+p.id}>Open →</a></td></tr>)}
      {!pr.data?.length&&<tr><td colSpan={6} className="muted">No projects yet.</td></tr>}</tbody></table></div></div>
}
