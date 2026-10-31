import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Bar from '@/components/Bar'
import AdminNav from '@/components/AdminNav'
import SetupCheck from '@/components/SetupCheck'
import { setToolAccess, reviewGeneration } from '../actions'
import { assemble } from '@/lib/ai/review'
export const dynamic='force-dynamic'
export default async function AdminTool(){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)redirect('/login')
  const {data:me}=await sb.from('profiles').select('full_name,role').eq('id',user.id).single()
  if(me?.role!=='admin')redirect('/portal')
  const since=new Date(Date.now()-30*864e5).toISOString()
  const [cl,wl,gens,rev]=await Promise.all([
    sb.from('profiles').select('id,full_name,email,tool_access,monthly_quota').eq('role','client').order('created_at',{ascending:false}).limit(200),
    sb.from('waitlist').select('email').limit(5000),
    sb.from('generations').select('status').gte('created_at',since).limit(5000),
    sb.from('generations').select('id,brief,created_at,generation_audits(attempt,issues,draft)').eq('status','needs_review').order('created_at').limit(20)])
  const onList=new Set((wl.data||[]).map(x=>x.email.toLowerCase()))
  const n=s=>(gens.data||[]).filter(g=>g.status===s).length
  return <div className="shell"><Bar label="Admin" name={me.full_name||user.email}/><AdminNav current="/admin/tool"/>
    <h1 style={{fontSize:'clamp(40px,6vw,64px)'}}>AI tool</h1>
    <div className="stats" style={{marginTop:28}}>
      <div className="card stat"><b>{n('ready')}</b><span className="muted">Plans delivered, 30 days</span></div>
      <div className="card stat"><b>{n('needs_review')}</b><span className="muted">Waiting for your review</span></div>
      <div className="card stat"><b>{n('failed')}</b><span className="muted">Failed (not charged to quota)</span></div>
      <div className="card stat"><b>{(cl.data||[]).filter(c=>c.tool_access).length}</b><span className="muted">Clients with access</span></div></div>
    <h2 className="sec">Setup check</h2>
    <SetupCheck/>
    <h2 className="sec">Review queue</h2>
    {(rev.data||[]).map(g=>{const last=[...(g.generation_audits||[])].sort((a,b)=>b.attempt-a.attempt)[0]
      const plan=assemble(g.generation_audits),stratDraft=[...(g.generation_audits||[])].filter(x=>x.draft?.pillars).sort((x,y)=>y.attempt-x.attempt)[0]?.draft
      return <div className="card" key={g.id} style={{marginBottom:16}}><h3 style={{fontSize:24}}>{g.brief.business_name} <span className="muted" style={{fontSize:14}}>· {g.brief.industry} · {g.brief.language}</span></h3>
        <p className="muted" style={{margin:'12px 0 6px'}}>Problems the checks could not resolve automatically:</p>
        <ul style={{margin:'0 0 14px',paddingLeft:20}}>{(last?.issues||[]).map((i,k)=><li key={k}>{i.post_index>=0?`Post ${i.post_index+1}`:'Strategy'} · {i.category}: {i.problem}</li>)}</ul>
        <details><summary style={{cursor:'pointer'}}>Show the draft</summary>{!plan&&stratDraft&&<p dir="auto" className="muted"><b>Strategy draft:</b> {stratDraft.summary}</p>}{(plan?.posts||[]).map((p,k)=><p key={k} dir="auto" className="muted" style={{whiteSpace:'pre-wrap'}}><b>{k+1}. {p.platform}</b> {p.caption}</p>)}</details>
        <form action={reviewGeneration} style={{display:'flex',gap:10,marginTop:16}}><input type="hidden" name="id" value={g.id}/>
          {plan?<button className="btn" name="decision" value="approve">Approve as is</button>:<span className="muted" style={{alignSelf:'center'}}>Nothing complete to approve: the strategy or the posts did not pass.</span>}<button className="btn ghost" name="decision" value="reject">Reject</button></form></div>})}
    {!rev.data?.length&&<div className="card"><p className="muted" style={{margin:0}}>Nothing waiting. Plans that pass every automatic check go straight to the client.</p></div>}
    <h2 className="sec">Who can use the tool</h2>
    <div className="card scroll"><table><thead><tr><th>CLIENT</th><th>EMAIL</th><th>WAITLIST</th><th>MONTHLY PLANS</th><th>ACCESS</th></tr></thead><tbody>
      {(cl.data||[]).map(c=><tr key={c.id}><td>{c.full_name||'-'}</td><td>{c.email}</td><td>{onList.has((c.email||'').toLowerCase())?'Yes':'-'}</td>
        <td colSpan={2}><form action={setToolAccess} style={{display:'flex',gap:10,alignItems:'center'}}><input type="hidden" name="id" value={c.id}/><input type="hidden" name="enable" value={c.tool_access?'0':'1'}/>
          <input name="quota" type="number" min="0" max="100" defaultValue={c.monthly_quota} style={{width:84,padding:'8px 10px'}} aria-label="Plans per month"/>
          <button className={c.tool_access?'btn ghost':'btn'}>{c.tool_access?'Disable':'Enable'}</button></form></td></tr>)}
      {!cl.data?.length&&<tr><td colSpan={5} className="muted">No clients yet.</td></tr>}</tbody></table></div>
  </div>
}
