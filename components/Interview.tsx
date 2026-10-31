'use client'
import { useEffect, useState } from 'react'
const PL=['Instagram','TikTok','Facebook','LinkedIn','X']
const AREA_LABEL={offer:'Offer',economics:'Numbers',customer:'Customers',differentiation:'Difference',goal:'Goal',history:'History',brand:'Brand',constraints:'Limits',timing:'Timing'}
async function call(url,body){
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const j=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error((j.error||'Something went wrong. Please try again.')+(j.hint?' [Admin detail: '+j.hint+']':''))
  return j
}
// Waiting screen: shows what is happening, how long it usually takes, and keeps moving so it never looks frozen.
const THINK={
  start:{title:'Getting to know your business',usual:'Usually 20 to 60 seconds',tau:25,lines:['Reading what you told us','Working out what we still need to know','Writing questions that fit your business']},
  answer:{title:'Reading your answers',usual:'Usually 20 to 60 seconds',tau:25,lines:['Thinking about what you said','Checking what is still unclear','Preparing your next questions']},
  profile:{title:'Putting together what we learned',usual:'Usually 30 to 90 seconds',tau:40,lines:['Collecting your answers','Writing your business profile','Spotting what is holding growth back']},
  build:{title:'Building your plan',usual:'Usually 2 to 5 minutes',tau:110,steps:['Reviewing everything you told us','Finding what is holding growth back','Designing your offer and strategy','Writing your posts','Checking every line for quality'],stepAt:[0,15,40,85,130],
    tips:['The more specific your answers, the more personal the plan.','Every plan is checked before you see it.','Nothing is invented: we only use facts you gave us.']}
}
function Thinking({kind}){
  const c=THINK[kind],[t,setT]=useState(0)
  useEffect(()=>{const id=setInterval(()=>setT(x=>x+1),1000);return()=>clearInterval(id)},[])
  const pct=Math.min(95,Math.round(100*(1-Math.exp(-t/c.tau))))
  const slow=t>c.tau*3.2
  return <div className="card think" dir="auto">
    <div className="think-head"><span className="spin" aria-hidden="true"/><div><h3 role="status" style={{fontSize:26,margin:0}}>{c.title}<span className="sr">. Please keep this page open.</span></h3><p className="muted" style={{margin:'4px 0 0',fontSize:14}}>{c.usual}. Please keep this page open.</p></div></div>
    <div className="bar" aria-hidden="true"><i style={{width:pct+'%'}}/></div>
    {c.steps?<ol className="think-steps" aria-hidden="true">{c.steps.map((s,i)=>{const last=c.stepAt.filter(a=>t>=a).length-1;return <li key={s} className={i<last?'done':i===last?'now':''}><span>{i<last?'✓':i===last?'…':''}</span>{s}</li>})}</ol>
      :<p className="think-line" aria-hidden="true">{c.lines[Math.floor(t/5)%c.lines.length]}…</p>}
    {c.tips&&<p className="muted" style={{margin:'14px 0 0',fontSize:14}} aria-hidden="true">{c.tips[Math.floor(t/8)%c.tips.length]}</p>}
    {slow&&<p className="muted" style={{margin:'14px 0 0',fontSize:14}}>This is taking longer than usual. It is still working, so please don’t refresh.</p>}
  </div>
}
export default function Interview(){
  const [stage,setStage]=useState('start'),[busy,setBusy]=useState(''),[err,setErr]=useState('')
  const [colors,setColors]=useState<any[]>([]),[id,setId]=useState<any>(null),[round,setRound]=useState<any>(null),[ans,setAns]=useState({}),[oth,setOth]=useState({}),[profile,setProfile]=useState<any>(null)
  const run=async(kind,fn)=>{setErr('');setBusy(kind);try{await fn()}catch(e:any){setErr(e.message)}setBusy('')}
  const start=e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target).entries())
    run('start',async()=>{const j=await call('/api/tool/interview',{action:'start',...b,brand_colors:colors});setId(j.id);setRound(j.round);setAns({});setOth({});setStage('ask')})}
  // One final answer per question: the chosen options plus anything typed in "write your own".
  const finalAnswers=()=>{const out={};for(const q of round.questions){const parts:any[]=[]
    if(q.type==='multi')parts.push(...(ans[q.id]||'').split(' | ').filter(Boolean));else if(ans[q.id]&&String(ans[q.id]).trim())parts.push(String(ans[q.id]).trim())
    if(oth[q.id]&&oth[q.id].trim()&&(q.type==='choice'||q.type==='multi'))parts.push(oth[q.id].trim())
    if(parts.length)out[q.id]=parts.join(' | ')}return out}
  const submit=e=>{e.preventDefault();const fa=finalAnswers(),need=Math.min(3,round.questions.length)
    if(Object.keys(fa).length<need){setErr('Please answer at least '+need+' questions. Short answers are fine.');return}
    setStage('wait');run(round.no>=3?'profile':'answer',async()=>{
      try{const j=await call('/api/tool/interview',{action:'answer',id,answers:fa})
        if(j.done){setProfile(j.profile);setStage('review')}else{setRound(j.round);setAns({});setOth({});setStage('ask');window.scrollTo({top:0,behavior:'smooth'})}}
      catch(x:any){setStage('ask');throw x}})}
  const create=e=>{e.preventDefault();const f=new FormData(e.target),platforms=f.getAll('platforms')
    if(!platforms.length){setErr('Choose at least one platform.');return}
    run('build',async()=>{
      const j=await call('/api/tool/generate',{interview_id:id,platforms,post_count:Number(f.get('post_count')),corrections:f.get('corrections')||''})
      location.assign('/portal/tool/'+j.id);await new Promise(()=>{})})}
  if(busy)return <Thinking kind={busy}/>
  if(stage==='start')return <form onSubmit={start} className="card" style={{display:'grid',gap:16}}>
    <p className="muted" style={{margin:0}}>First we’ll learn your business, the way a strategist would in a first meeting. You’ll answer about 10 to 15 short questions over two or three rounds.</p>
    <div className="two"><label>Business name<input name="business_name" required maxLength={80}/></label><label>Industry<input name="industry" required maxLength={80} placeholder="Restaurant, clinic, gym…"/></label></div>
    <label>Tell us about your business in your own words<textarea name="description" required minLength={20} maxLength={1500} rows={5} placeholder="What you do, who comes to you, what you’re known for, and what you want from social media."/></label>
    <div className="two"><label>Where do your customers live?<input name="market" defaultValue="Qatar" maxLength={60}/></label><label>Language for your content<select name="language"><option>English</option><option>Arabic</option></select></label></div>
    <fieldset className="pl"><legend>Brand colors (optional)</legend>
      <p className="muted" style={{margin:'0 0 10px',fontSize:14}}>Add up to 4. The first is your main color. We use them to design your posts.</p>
      <div className="swatches">{colors.map((c,i)=><span className="swatch" key={i}><input type="color" aria-label={'Brand color '+(i+1)} value={c} onChange={e=>setColors(a=>a.map((x,j)=>j===i?e.target.value:x))}/><code>{c}</code><button type="button" aria-label={'Remove brand color '+(i+1)} onClick={()=>setColors(a=>a.filter((_,j)=>j!==i))}>×</button></span>)}
        {colors.length<4&&<button type="button" className="btn ghost" style={{padding:'8px 16px'}} onClick={()=>setColors(a=>[...a,'#0e3d32'])}>+ Add a color</button>}</div></fieldset>
    {err&&<p className="err" role="alert">{err}</p>}
    <button className="btn" style={{justifySelf:'start'}}>Start the session</button></form>
  if(stage==='ask'){
    const cov=round.coverage||{},avg=Math.round((Object.values(cov) as number[]).reduce((a,b)=>a+b,0)/Math.max(1,Object.keys(cov).length))
    const set=(q,v)=>setAns(a=>({...a,[q]:v}))
    return <form onSubmit={submit} className="card" style={{display:'grid',gap:22}}>
      <div><span className="tag">QUESTIONS {round.no} OF UP TO 3</span><div className="hb" aria-label={`Understanding so far: ${avg}%`}><i style={{width:avg+'%'}}/></div>
        <p className="muted" style={{margin:'8px 0 0',fontSize:13}}>{Object.keys(cov).map(k=>(AREA_LABEL[k]||k)+' '+cov[k]+'%').join(' · ')}</p></div>
      {round.reflection&&<p className="reflect" dir="auto">{round.reflection}</p>}
      {round.questions.map(q=><div key={q.id} className="q" dir="auto"><label htmlFor={q.id} style={{fontSize:18,lineHeight:1.4}}>{q.question}</label><p className="why">{q.why}</p>
        {q.type==='text'&&<input id={q.id} value={ans[q.id]||''} maxLength={800} onChange={e=>set(q.id,e.target.value)}/>}
        {q.type==='long'&&<textarea id={q.id} rows={4} value={ans[q.id]||''} maxLength={800} onChange={e=>set(q.id,e.target.value)}/>}
        {q.type==='choice'&&<div className="chipset" role="radiogroup" aria-label={q.question}>{q.options.map(o=><button type="button" key={o} role="radio" aria-checked={ans[q.id]===o} className={ans[q.id]===o?'on':''} onClick={()=>set(q.id,ans[q.id]===o?'':o)}>{o}</button>)}</div>}
        {q.type==='multi'&&<div className="chipset" role="group" aria-label={q.question}>{q.options.map(o=>{const cur=(ans[q.id]||'').split(' | ').filter(Boolean),on=cur.includes(o);return <button type="button" key={o} aria-pressed={on} className={on?'on':''} onClick={()=>set(q.id,(on?cur.filter(x=>x!==o):[...cur,o]).join(' | '))}>{o}</button>})}</div>}
        {(q.type==='choice'||q.type==='multi')&&<input aria-label={'More detail or your own answer: '+q.question} placeholder="Add more detail or write your own answer (optional)" maxLength={300} style={{marginTop:10}} value={oth[q.id]||''} onChange={e=>setOth(o=>({...o,[q.id]:e.target.value}))}/>}
      </div>)}
      {err&&<p className="err" role="alert">{err}</p>}
      <button className="btn" style={{justifySelf:'start'}}>Continue</button></form>
  }
  const p=profile,list=a=>(a||[]).filter(Boolean)
  return <form onSubmit={create} className="card" style={{display:'grid',gap:20}} dir="auto">
    <div><span className="tag">HERE’S WHAT WE UNDERSTOOD</span><p style={{fontSize:19,margin:'8px 0 0'}}>{p.business_summary}</p></div>
    <div className="grid">
      <div><b>Your goal</b><p className="muted" style={{margin:'4px 0 0'}}>{p.goal.statement}{p.goal.timeframe?` (${p.goal.timeframe})`:''}</p></div>
      <div><b>Who buys</b><p className="muted" style={{margin:'4px 0 0'}}>{p.customers.primary}</p></div>
      {!!list(p.offer.hero_items).length&&<div><b>Hero items</b><p className="muted" style={{margin:'4px 0 0'}}>{list(p.offer.hero_items).join(', ')}</p></div>}
      {!!list(p.differentiators).length&&<div><b>What sets you apart</b><p className="muted" style={{margin:'4px 0 0'}}>{list(p.differentiators).join(', ')}</p></div>}
      {p.bottleneck&&p.bottleneck.type!=='unclear'&&<div><b>What may be holding growth back</b><p className="muted" style={{margin:'4px 0 0'}}>{p.bottleneck.type}: {p.bottleneck.evidence}</p></div>}
    </div>
    {!!list(p.unknowns).length&&<div><b>Still open (we’ll plan around these)</b><ul className="muted" style={{margin:'6px 0 0',paddingInlineStart:20}}>{list(p.unknowns).map((u,i)=><li key={i}>{u}</li>)}</ul></div>}
    <label>Anything we got wrong, or should know before we build? (optional)<textarea name="corrections" rows={3} maxLength={600}/></label>
    <fieldset className="pl"><legend>Platforms</legend>{PL.map(x=><label key={x} className="chk"><input type="checkbox" name="platforms" value={x} defaultChecked={x==='Instagram'}/>{x}</label>)}</fieldset>
    <label style={{maxWidth:220}}>Number of posts<select name="post_count" defaultValue="5"><option>3</option><option>5</option><option>7</option><option>10</option></select></label>
    {err&&<p className="err" role="alert">{err}</p>}
    <button className="btn" style={{justifySelf:'start'}}>Create my strategy and posts</button></form>
}
