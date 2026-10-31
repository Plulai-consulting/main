import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PHASES } from '@/lib/phases'
import Bar from '@/components/Bar'
import AdminNav from '@/components/AdminNav'
export const dynamic='force-dynamic'
const fmt=d=>new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
export default async function Admin(){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)redirect('/login')
  const {data:me}=await sb.from('profiles').select('full_name,role').eq('id',user.id).single()
  if(me?.role!=='admin')redirect('/portal')
  const [w,c,p,m]=await Promise.all([
    sb.from('waitlist').select('name,email,business,created_at',{count:'exact'}).order('created_at',{ascending:false}).limit(100),
    sb.from('profiles').select('full_name,email,created_at',{count:'exact'}).eq('role','client').order('created_at',{ascending:false}).limit(100),
    sb.from('projects').select('phase,last_message_at,last_from_admin'),
    sb.from('messages').select('id,body,created_at,project_id,projects(title)').order('created_at',{ascending:false}).limit(8)])
  const awaiting=(p.data||[]).filter(x=>x.last_message_at&&x.last_from_admin===false).length
  const active=(p.data||[]).filter(x=>x.phase!=='delivered').length
  return <div className="shell"><Bar label="Admin" name={me.full_name||user.email}/><AdminNav current="/admin"/>
    <h1 style={{fontSize:'clamp(40px,6vw,64px)'}}>Overview</h1>
    <div className="stats" style={{marginTop:28}}>
      <div className="card stat"><b>{w.count??0}</b><span className="muted">Waitlist signups</span></div>
      <div className="card stat"><b>{c.count??0}</b><span className="muted">Client accounts</span></div>
      <div className="card stat"><b>{awaiting}</b><span className="muted">Chats awaiting reply</span></div>
      <div className="card stat"><b>{active}</b><span className="muted">Active projects</span></div>
      {PHASES.slice(0,4).map(([k,l])=><div className="card stat" key={k}><b>{(p.data||[]).filter(x=>x.phase===k).length}</b><span className="muted">{l} phase</span></div>)}
    </div>
    <h2 className="sec">Recent messages</h2>
    <div className="card">{(m.data||[]).map(x=><p key={x.id} style={{margin:'0 0 12px'}}><a href={'/admin/projects/'+x.project_id}><b>{x.projects?.title||'Project'}</b></a> <span className="muted">· {fmt(x.created_at)}</span><br/><span className="muted">{x.body.slice(0,140)}</span></p>)}{!m.data?.length&&<p className="muted" style={{margin:0}}>No messages yet.</p>}</div>
    <h2 className="sec">Waitlist</h2>
    <div className="card scroll"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>BUSINESS</th><th>JOINED</th></tr></thead><tbody>
      {(w.data||[]).map(r=><tr key={r.email}><td>{r.name}</td><td>{r.email}</td><td>{r.business||'-'}</td><td>{fmt(r.created_at)}</td></tr>)}
      {!w.data?.length&&<tr><td colSpan={4} className="muted">No signups yet.</td></tr>}</tbody></table></div>
    <h2 className="sec">Clients</h2>
    <div className="card scroll"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>JOINED</th></tr></thead><tbody>
      {(c.data||[]).map(r=><tr key={r.email}><td>{r.full_name||'-'}</td><td>{r.email}</td><td>{fmt(r.created_at)}</td></tr>)}
      {!c.data?.length&&<tr><td colSpan={3} className="muted">No clients yet.</td></tr>}</tbody></table></div>
  </div>
}
