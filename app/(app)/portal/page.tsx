import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PHASES } from '@/lib/phases'
import Bar from '@/components/Bar'
import JoinWaitlist from './JoinWaitlist'
export const dynamic='force-dynamic'
export default async function Portal(){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)redirect('/login')
  const {data:profile}=await sb.from('profiles').select('full_name,role,tool_access').eq('id',user.id).single()
  if(profile?.role==='admin')redirect('/admin')
  const {data:projects}=await sb.from('projects').select('id,title,service,phase').order('created_at',{ascending:false})
  const name=profile?.full_name||user.email
  return <div className="shell"><Bar label="Client area" name={name}/>
    <h1 style={{fontSize:'clamp(40px,6vw,64px)'}}>Welcome, {name.split(' ')[0]}.</h1>
    <h2 className="sec">Your projects</h2>
    {projects?.length?<div className="grid">{projects.map(p=>{const i=PHASES.findIndex(x=>x[0]===p.phase)
      return <a className="card pc" href={'/portal/projects/'+p.id} key={p.id}><span className="tag">{p.service||'PROJECT'}</span><h3 style={{fontSize:28}}>{p.title}</h3>
        <div className="phases" aria-hidden="true">{PHASES.map((x,k)=><i key={x[0]} className={k<=i?'on':''}/>)}</div>
        <div className="row"><b>Now: {PHASES[i]?.[1]}</b><span className="muted">{i+1} of {PHASES.length}</span></div><p className="muted" style={{margin:'14px 0 0',fontSize:14}}>Open project &amp; chat →</p></a>})}</div>
      :<div className="card"><p style={{margin:0}}>No active projects yet. When you start a service with us, you’ll follow each phase here.</p>
        <p style={{margin:'16px 0 0'}}><a className="btn ghost" href="https://wa.me/97455548407" target="_blank" rel="noopener">Message us on WhatsApp</a></p></div>}
    <h2 className="sec">Coming soon</h2>
    <div className="card"><span className="tag">IN DEVELOPMENT</span><h3 style={{fontSize:32}}>Our social media tool</h3>
      <p className="muted" style={{maxWidth:560}}>Strategy, captions and visuals, checked before you see a preview. Join the list for early access.</p>
      {profile?.tool_access?<a className="btn" href="/portal/tool">Open the tool →</a>:<><JoinWaitlist name={name} email={user.email}/><p style={{margin:'14px 0 0'}}><a href="/portal/tool">Learn more</a></p></>}</div>
  </div>
}
