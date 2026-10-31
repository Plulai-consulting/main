import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import Bar from '@/components/Bar'
import Results from '@/components/Results'
export const dynamic='force-dynamic'
export default async function Plan({params}){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)redirect('/login')
  const {data:me}=await sb.from('profiles').select('full_name').eq('id',user.id).single()
  const {data:g}=await sb.from('generations').select('id,status,brief,strategy,posts,created_at').eq('id',params.id).maybeSingle()
  if(!g)notFound()
  let posts=g.posts||[]
  if(g.status==='ready'){
    const db=adminClient()
    posts=await Promise.all(posts.map(async(p,i)=>{if(!p.image_path)return p
      const [a,b]=await Promise.all([db.storage.from('tool-images').createSignedUrl(p.image_path,3600),db.storage.from('tool-images').createSignedUrl(p.image_path,3600,{download:`plulai-post-${i+1}.png`})])
      return {...p,url:a.data?.signedUrl,download:b.data?.signedUrl}}))
  }
  const s=g.strategy
  return <div className="shell"><Bar label="Client area" name={me?.full_name||user.email}/>
    <p><a href="/portal/tool">← Social media tool</a></p>
    <h1 style={{fontSize:'clamp(36px,5vw,56px)',marginTop:12}}>{g.brief.business_name}</h1>
    {g.status==='needs_review'&&<div className="card" style={{marginTop:24}}><h3 style={{fontSize:26}}>Our team is polishing your plan.</h3><p className="muted" style={{margin:'10px 0 0'}}>We hold every plan to a high standard, so a specialist is giving yours a final review. We’ll email you as soon as it’s ready.</p></div>}
    {g.status==='running'&&<div className="card" style={{marginTop:24}}><p style={{margin:0}}>Your plan is still being created. Refresh in a minute.</p></div>}
    {g.status==='failed'&&<div className="card" style={{marginTop:24}}><p style={{margin:0}}>This plan could not be created. It does not count toward your monthly limit. Please try again.</p></div>}
    {g.status==='ready'&&!(s&&Array.isArray(g.posts))&&<div className="card" style={{marginTop:24}}><p style={{margin:0}}>This plan is not available. Please contact us and we will fix it.</p></div>}
    {g.status==='ready'&&s&&Array.isArray(g.posts)&&<>
      <h2 className="sec">Your strategy</h2>
      <div className="card" dir="auto"><p style={{fontSize:19,margin:'0 0 14px'}}>{s.summary}</p>
        <p className="muted"><b>Audience:</b> {s.audience}</p><p className="muted"><b>Posting rhythm:</b> {s.cadence}</p><p className="muted"><b>Tone:</b> {s.tone_notes}</p>
        <div className="grid" style={{marginTop:16}}>{s.pillars.map(p=><div key={p.name}><b>{p.name}{p.share_percent?` · ${p.share_percent}%`:''}</b><p className="muted" style={{margin:'4px 0 0'}}>{p.why}{p.based_on?<><br/><i>Because you told us: {p.based_on}</i></>:null}</p></div>)}</div></div>
      {s.diagnosis&&<>
        <h2 className="sec">What’s holding growth back</h2>
        <div className="card" dir="auto"><p style={{fontSize:19,margin:'0 0 12px'}}>{s.diagnosis.main_problem}</p>
          <p className="muted"><b>What you told us:</b> {s.diagnosis.evidence}</p><p className="muted" style={{margin:0}}><b>The opportunity:</b> {s.diagnosis.opportunity}</p></div>
        <h2 className="sec">Your offer</h2>
        <div className="card offer-card" dir="auto">{s.offer.name&&<span className="tag">{s.offer.name}</span>}<h3 style={{fontSize:28,margin:'10px 0 10px'}}>{s.offer.headline}</h3><p style={{fontSize:18,margin:'0 0 14px'}}>{s.offer.promise}</p>
          {s.offer.dream_outcome&&<p className="muted"><b>The result they want:</b> {s.offer.dream_outcome}</p>}
          {s.offer.value_levers&&<p className="muted"><b>More certain:</b> {s.offer.value_levers.certainty} <b>· Faster:</b> {s.offer.value_levers.speed} <b>· Easier:</b> {s.offer.value_levers.effort}</p>}
          <p className="muted"><b>For:</b> {s.offer.for_whom}</p>
          {!!s.offer.includes.length&&<p className="muted"><b>Includes:</b> {s.offer.includes.join(' · ')}</p>}
          {!!s.offer.proof.length&&<p className="muted"><b>Proof:</b> {s.offer.proof.join(' · ')}</p>}
          {s.offer.risk_reducer&&<p className="muted"><b>Risk reducer:</b> {s.offer.risk_reducer}</p>}
          {s.offer.honest_urgency&&<p className="muted"><b>Why now:</b> {s.offer.honest_urgency}</p>}
          <p className="muted"><b>Call to action:</b> {s.offer.call_to_action}</p>
          {!!s.offer.needs_from_owner.length&&<div style={{marginTop:6}}><b>Decisions only you can make</b><ul className="muted" style={{margin:'6px 0 0',paddingInlineStart:20}}>{s.offer.needs_from_owner.map((n,i)=><li key={i}>{n}</li>)}</ul></div>}</div>
        {s.offer.upgrades&&<>
        <h2 className="sec">Make the offer even stronger</h2>
        <div className="card" dir="auto"><p className="muted" style={{marginTop:0}}>These are ideas, not facts. Use one only if you can honestly deliver it. We never use them in your posts until you decide.</p>
          {!!s.offer.upgrades.bonuses.length&&<><b>Bonuses</b><ul className="muted" style={{margin:'6px 0 14px',paddingInlineStart:20}}>{s.offer.upgrades.bonuses.map((x,i)=><li key={i}>{x.idea}. <i>{x.why_it_sells}</i> Cost to you: {x.cost_to_you}</li>)}</ul></>}
          {!!s.offer.upgrades.guarantee_options.length&&<><b>Guarantee options</b><ul className="muted" style={{margin:'6px 0 14px',paddingInlineStart:20}}>{s.offer.upgrades.guarantee_options.map((x,i)=><li key={i}><b>{x.type}:</b> {x.wording} <i>Risk to you: {x.risk_to_you}</i></li>)}</ul></>}
          {!!s.offer.upgrades.scarcity_options.length&&<><b>Honest scarcity</b><ul className="muted" style={{margin:'6px 0 14px',paddingInlineStart:20}}>{s.offer.upgrades.scarcity_options.map((x,i)=><li key={i}>{x.idea}. <i>Only if: {x.honest_condition}</i></li>)}</ul></>}
          {s.offer.upgrades.price_framing&&<p className="muted" style={{margin:0}}><b>How to present the price:</b> {s.offer.upgrades.price_framing}</p>}</div></>}
        {s.campaign&&<>
        <h2 className="sec">Your signature campaign: {s.campaign.name}</h2>
        <div className="card offer-card" dir="auto"><p style={{fontSize:19,margin:'0 0 12px'}}>{s.campaign.big_idea}</p><p style={{fontSize:22,margin:'0 0 14px'}}><b>“{s.campaign.launch_line}”</b></p>
          {!!s.campaign.category_conventions.length&&<p className="muted"><b>What almost everyone in your field does:</b> {s.campaign.category_conventions.join(' · ')}</p>}
          <p className="muted"><b>What you do instead:</b> {s.campaign.our_unfair_angle}</p>
          <p className="muted"><b>Why they can’t copy it:</b> {s.campaign.why_competitors_cant_copy}</p>
          <p className="muted"><b>What customers do:</b> {s.campaign.mechanic}</p>
          <p className="muted"><b>The proof moment:</b> {s.campaign.proof_moment}</p>
          <p className="muted"><b>Test it first (48 hours):</b> {s.campaign.test_first}</p>
          {!!s.campaign.success_signals.length&&<p className="muted"><b>You’ll know it works when:</b> {s.campaign.success_signals.join(' · ')}</p>}
          <p className="muted" style={{margin:0}}><i>{s.campaign.originality_note}</i></p></div>
        <div className="grid" dir="auto" style={{marginTop:14}}>{s.campaign.phases.map(w=><div className="card" key={w.week}><span className="tag">WEEK {w.week}</span><b>{w.name}</b><p className="muted" style={{margin:'6px 0'}}>{w.what_happens}</p><p className="muted" style={{margin:'0 0 6px',fontSize:14}}>{(w.content||[]).join(', ')}</p><p className="muted" style={{margin:0,fontSize:14}}><b>In person:</b> {w.offline_touchpoint}</p></div>)}</div></>}
        {s.visual_direction&&<>
        <h2 className="sec">How your posts will look</h2>
        <div className="card" dir="auto">{!!(g.brief?.brand_colors||[]).length&&<div className="swatches" style={{marginBottom:12}}>{g.brief.brand_colors.map(c=><span className="swatch" key={c}><i style={{background:c}} aria-hidden="true"/><code>{c}</code></span>)}</div>}
          <p className="muted"><b>Style:</b> {s.visual_direction.style}</p><p className="muted"><b>Colors:</b> {s.visual_direction.palette_use}</p><p className="muted" style={{margin:0}}><b>Avoid:</b> {s.visual_direction.avoid}</p></div></>}
        <h2 className="sec">Do these in the next 7 days</h2>
        <div className="grid" dir="auto">{s.quick_wins.map((w,i)=><div className="card" key={i}><span className="tag">{w.effort.toUpperCase()} EFFORT · {w.time_needed}</span><b>{w.action}</b><p className="muted" style={{margin:'6px 0 0'}}>{w.why}</p></div>)}</div>
        <h2 className="sec">When someone enquires</h2>
        <div className="card" dir="auto"><p className="muted" style={{margin:'0 0 6px'}}><b>First reply you can send:</b></p><p style={{whiteSpace:'pre-wrap',margin:'0 0 14px'}}>{s.lead_handling.first_reply}</p>
          <p className="muted"><b>Follow-up:</b> {s.lead_handling.follow_up}</p>
          {!!s.lead_handling.tracking.length&&<p className="muted" style={{margin:0}}><b>Write these numbers down weekly:</b> {s.lead_handling.tracking.join(' · ')}</p>}</div></>}
      {s.positioning&&<>
        <h2 className="sec">Positioning</h2>
        <div className="card" dir="auto"><p style={{fontSize:19,margin:'0 0 12px'}}>{s.positioning.statement}</p>
          <p className="muted"><b>Proof:</b> {s.positioning.proof_points.join(' · ')}</p><p className="muted" style={{margin:0}}><b>Not for:</b> {s.positioning.not_for}</p></div>
        <h2 className="sec">Who we’re talking to</h2>
        <div className="grid" dir="auto">{s.personas.map(x=><div className="card" key={x.name}><b>{x.name}</b><p className="muted" style={{margin:'4px 0 10px'}}>{x.who}</p>
          <p className="muted" style={{margin:'0 0 6px'}}><b>Wants:</b> {x.wants}</p><p className="muted" style={{margin:'0 0 6px'}}><b>Hesitates because:</b> {x.objection}</p><p className="muted" style={{margin:0}}><b>Our answer:</b> {x.how_we_answer}</p></div>)}</div>
        <h2 className="sec">Your first 4 weeks</h2>
        <div className="grid" dir="auto">{s.calendar.map(w=><div className="card" key={w.week}><span className="tag">WEEK {w.week}</span><b>{w.focus}</b><p className="muted" style={{margin:'6px 0'}}>{w.goal}</p><p className="muted" style={{margin:0,fontSize:14}}>{w.content_types.join(', ')}</p></div>)}</div>
        <h2 className="sec">How we’ll know it works</h2>
        <div className="card" dir="auto">{s.kpis.map(k=><p key={k.metric} style={{margin:'0 0 12px'}}><b>{k.metric}</b> <span className="muted">· {k.how_to_measure} · {k.target}</span></p>)}
          {!!s.assumptions.length&&<p className="muted"><b>Assumptions:</b> {s.assumptions.join(' · ')}</p>}
          {!!s.risks.length&&<p className="muted"><b>Watch out for:</b> {s.risks.join(' · ')}</p>}
          {!!s.will_not_do.length&&<p className="muted" style={{margin:0}}><b>What we chose not to do:</b> {s.will_not_do.join(' · ')}</p>}</div></>}
      <h2 className="sec">Your posts</h2><Results id={g.id} posts={posts}/></>}
  </div>
}
