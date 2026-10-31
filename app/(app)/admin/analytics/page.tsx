import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PHASES } from '@/lib/phases'
import Bar from '@/components/Bar'
import AdminNav from '@/components/AdminNav'
export const dynamic='force-dynamic'
const DAY=864e5
function daily(rows,days){
  const out:any[]=[];for(let i=days-1;i>=0;i--)out.push({key:new Date(Date.now()-i*DAY).toISOString().slice(0,10),n:0})
  const idx=Object.fromEntries(out.map((o,i)=>[o.key,i]))
  rows.forEach(r=>{const k=String(r.created_at).slice(0,10);if(k in idx)out[idx[k]].n++});return out
}
function dur(ms){if(ms==null)return '-';const m=Math.round(ms/6e4);if(m<60)return m+' min';const h=Math.floor(m/60);return h<48?`${h} h ${m%60} min`:Math.round(h/24)+' days'}
function Chart({data,title}){
  const max=Math.max(1,...data.map(d=>d.n)),total=data.reduce((a,d)=>a+d.n,0)
  return <div className="card"><div className="row"><b>{title}</b><span className="muted">{total} in 30 days</span></div>
    <div className="bars" role="img" aria-label={`${title}: ${total} in the last 30 days`}>{data.map(d=><i key={d.key} title={`${d.key}: ${d.n}`} style={{height:(d.n/max*100)+'%',minHeight:d.n?4:1}}/>)}</div>
    <div className="row muted"><span>{data[0].key.slice(5)}</span><span>today</span></div></div>
}
function HBars({rows}){const max=Math.max(1,...rows.map(r=>r[1]));return <div style={{display:'grid',gap:10}}>{rows.map(([l,n])=><div key={l}><div className="row"><span>{l}</span><b>{n}</b></div><div className="hb"><i style={{width:(n/max*100)+'%'}}/></div></div>)}</div>}
export default async function Analytics(){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)redirect('/login')
  const {data:me}=await sb.from('profiles').select('full_name,role').eq('id',user.id).single()
  if(me?.role!=='admin')redirect('/portal')
  const since=new Date(Date.now()-30*DAY).toISOString()
  const [w,c,p,m]=await Promise.all([
    sb.from('waitlist').select('email,created_at').order('created_at',{ascending:false}).limit(5000),
    sb.from('profiles').select('email,created_at').eq('role','client').limit(5000),
    sb.from('projects').select('phase,service,last_message_at,last_from_admin').limit(5000),
    sb.from('messages').select('project_id,created_at,profiles(role)').gte('created_at',since).order('created_at').limit(5000)])
  const wl=w.data||[],cl=c.data||[],pr=p.data||[]
  const clientEmails=new Set(cl.map(x=>(x.email||'').toLowerCase()))
  const converted=wl.filter(x=>clientEmails.has(x.email.toLowerCase())).length
  // reply time: a client's message until the next team message in the same project (includes nights and weekends)
  const pending:Record<string,number>={},waits:number[]=[]
  ;(m.data||[]).forEach(x=>{const role=x.profiles?.role,t=new Date(x.created_at).getTime()
    if(role==='client'){if(!pending[x.project_id])pending[x.project_id]=t}
    else if(role==='admin'&&pending[x.project_id]){waits.push(t-pending[x.project_id]);delete pending[x.project_id]}})
  waits.sort((a,b)=>a-b);const median=waits.length?waits[Math.floor(waits.length/2)]:null
  const awaiting=pr.filter(x=>x.last_message_at&&x.last_from_admin===false).length
  const bySvc={};pr.forEach(x=>{const k=x.service||'Other';bySvc[k]=(bySvc[k]||0)+1})
  return <div className="shell"><Bar label="Admin" name={me.full_name||user.email}/><AdminNav current="/admin/analytics"/>
    <h1 style={{fontSize:'clamp(40px,6vw,64px)'}}>Analytics</h1>
    <div className="stats" style={{marginTop:28}}>
      <div className="card stat"><b>{wl.length}</b><span className="muted">Waitlist total</span></div>
      <div className="card stat"><b>{wl.length?Math.round(converted/wl.length*100):0}%</b><span className="muted">Waitlist with an account ({converted})</span></div>
      <div className="card stat"><b>{dur(median)}</b><span className="muted">Median reply time, 30 days</span></div>
      <div className="card stat"><b>{awaiting}</b><span className="muted">Chats awaiting your reply</span></div></div>
    <div className="grid"><Chart title="Waitlist signups" data={daily(wl,30)}/><Chart title="New client accounts" data={daily(cl,30)}/></div>
    <div className="grid" style={{marginTop:20}}>
      <div className="card"><h3 style={{fontSize:22,marginBottom:16}}>Projects by phase</h3><HBars rows={PHASES.map(([k,l])=>[l,pr.filter(x=>x.phase===k).length])}/></div>
      <div className="card"><h3 style={{fontSize:22,marginBottom:16}}>Projects by service</h3>{Object.keys(bySvc).length?<HBars rows={Object.entries(bySvc).sort((a,b)=>(b[1] as number)-(a[1] as number))}/>:<p className="muted" style={{margin:0}}>No projects yet.</p>}</div></div>
    <h2 className="sec">Export</h2>
    <p style={{display:'flex',gap:12,flexWrap:'wrap'}}>{['waitlist','clients','projects'].map(t=><a key={t} className="btn ghost" href={'/admin/export/'+t}>Download {t} (CSV)</a>)}</p>
  </div>
}
