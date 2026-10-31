'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
const COLS='id,sender_id,body,created_at'
export default function Chat({projectId,userId,clientId,clientName}){
  const [sb]=useState(()=>createClient())
  const [msgs,setMsgs]=useState<any[]>([]),[text,setText]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false)
  const box=useRef<any>(null)
  const add=m=>setMsgs(x=>x.some(y=>y.id===m.id)?x:[...x,m].sort((a,b)=>a.created_at<b.created_at?-1:1))
  useEffect(()=>{
    let on=true
    const load=()=>sb.from('messages').select(COLS).eq('project_id',projectId).order('created_at').limit(300).then(({data})=>{if(on&&data)data.forEach(add)})
    load()
    const ch=sb.channel('project-'+projectId).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'project_id=eq.'+projectId},({new:m})=>add(m)).subscribe()
    const poll=setInterval(load,15000) // safety net if the live connection drops
    return()=>{on=false;clearInterval(poll);sb.removeChannel(ch)}
  },[projectId])
  useEffect(()=>{const b=box.current;if(b)b.scrollTop=b.scrollHeight},[msgs])
  async function send(e){
    e.preventDefault();const body=text.trim();if(!body||busy)return
    setErr('');setBusy(true)
    const {data,error}=await sb.from('messages').insert({project_id:projectId,sender_id:userId,body}).select(COLS).single()
    setBusy(false)
    if(error){setErr('Message not sent. Please try again.');return}
    add(data);setText('')
  }
  const who=id=>id===userId?'You':id===clientId?clientName:'PlulAI team'
  return <div className="chat"><div className="msgs" ref={box} role="log" aria-live="polite" aria-label="Project messages">
      {!msgs.length&&<p className="muted" style={{margin:0}}>No messages yet. Say hello below.</p>}
      {msgs.map(m=><div key={m.id} className={'msg'+(m.sender_id===userId?' me':'')}><small>{who(m.sender_id)} · {new Date(m.created_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</small>{m.body}</div>)}
    </div>
    <form className="chatform" onSubmit={send}><input value={text} onChange={e=>setText(e.target.value)} placeholder="Write a message…" maxLength={4000} aria-label="Message"/><button className="btn" disabled={busy||!text.trim()}>Send</button></form>
    {err&&<p className="err" role="alert">{err}</p>}</div>
}
