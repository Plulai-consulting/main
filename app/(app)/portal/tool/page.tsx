import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Bar from '@/components/Bar'
import Interview from '@/components/Interview'
export const dynamic='force-dynamic'
export default async function Tool(){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)redirect('/login')
  const {data:me}=await sb.from('profiles').select('full_name,role,tool_access,monthly_quota').eq('id',user.id).single()
  if(me?.role==='admin')redirect('/admin/tool')
  const name=me?.full_name||user.email
  const {data:gens}=await sb.from('generations').select('id,status,brief,created_at').order('created_at',{ascending:false}).limit(20)
  const month=new Date().toISOString().slice(0,7)
  const used=(gens||[]).filter(g=>g.status!=='failed'&&g.created_at.slice(0,7)===month).length
  return <div className="shell"><Bar label="Client area" name={name}/>
    <p><a href="/portal">← Your projects</a></p>
    <h1 style={{fontSize:'clamp(36px,5vw,56px)',marginTop:12}}>Social media tool</h1>
    <p className="muted" style={{maxWidth:640}}>We start with a short discovery session, like a first meeting with a strategist. Then we build your strategy and posts, and review every line before you see it.</p>
    {me?.tool_access?<>
      <p className="muted">Plans this month: <b>{used} of {me.monthly_quota}</b></p>
      <Interview/>
      {!!gens?.length&&<><h2 className="sec">Your plans</h2><div className="card">{gens.map(g=><p key={g.id} style={{margin:'0 0 10px'}}><a href={'/portal/tool/'+g.id}><b>{g.brief.business_name}</b></a> <span className="muted">· {new Date(g.created_at).toLocaleDateString('en-GB')} · {g.status==='ready'?'Ready':g.status==='needs_review'?'In final review':g.status==='running'?'Creating':'Not created'}</span></p>)}</div></>}
    </>:<div className="card" style={{marginTop:24}}><span className="tag">EARLY ACCESS</span><h3 style={{fontSize:28}}>You’re on the way in.</h3><p className="muted" style={{maxWidth:560}}>The tool is opening to a small group first. We’ll enable your account and email you. Questions? <a href="https://wa.me/97455548407" target="_blank" rel="noopener">Message us on WhatsApp</a>.</p></div>}
  </div>
}
