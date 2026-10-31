'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
export default function Results({id,posts}){
  const router=useRouter(),started=useRef(false),[busy,setBusy]=useState(false),[copied,setCopied]=useState(-1)
  useEffect(()=>{
    if(started.current)return;started.current=true
    const todo=posts.map((p,i)=>(!p.url&&p.image_status!=='failed')?i:-1).filter(i=>i>=0)
    if(!todo.length)return
    ;(async()=>{setBusy(true)
      for(const i of todo){ // one at a time so updates never overwrite each other
        try{await fetch('/api/tool/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({generation_id:id,index:i})})}catch{}
        router.refresh()}
      setBusy(false)})()
  },[])
  const copy=async(i,p)=>{await navigator.clipboard?.writeText(`${p.caption}\n\n${p.cta}\n\n${p.hashtags.join(' ')}`);setCopied(i);setTimeout(()=>setCopied(-1),1800)}
  return <div>{busy&&<p className="ok" role="status">Creating and checking your images… they appear below as they finish.</p>}
    <div className="grid">{posts.map((p,i)=><article className="card post" key={i}>
      <span className="tag">{p.platform.toUpperCase()} · {p.pillar}</span>{(p.format||p.objective)&&<p className="muted" style={{margin:'8px 0 0',fontSize:13}}>{[p.format,p.objective].filter(Boolean).join(' · ')}</p>}
      {p.url?<img src={p.url} alt={p.overlay_text||'Post image'} className="pimg"/>:<div className="pimg ph">{p.image_status==='failed'?'Image will be added by our team':'Creating image…'}</div>}
      <h3 style={{fontSize:22,margin:'14px 0 8px'}}>{p.hook}</h3>
      <p style={{whiteSpace:'pre-wrap',margin:'0 0 10px'}} dir="auto">{p.caption}</p>
      <p className="muted" style={{margin:'0 0 6px'}} dir="auto"><b>Call to action:</b> {p.cta}</p>
      <p className="muted" style={{margin:'0 0 6px',fontSize:14}} dir="auto">{p.hashtags.join(' ')}</p>
      {p.overlay_text&&<p className="muted" style={{margin:'0 0 8px',fontSize:14}} dir="auto"><b>Suggested text on image:</b> {p.overlay_text}</p>}
      {p.why&&<p className="muted" style={{margin:'0 0 14px',fontSize:14}} dir="auto"><b>Why this post:</b> {p.why}</p>}
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn ghost" onClick={()=>copy(i,p)}>{copied===i?'Copied':'Copy caption'}</button>{p.download&&<a className="btn ghost" href={p.download}>Download image</a>}</div>
    </article>)}</div></div>
}
