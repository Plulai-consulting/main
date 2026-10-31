'use client'
import { useState } from 'react'
export default function JoinWaitlist({name,email}){
  const [s,setS]=useState('idle')
  async function join(){setS('busy');const r=await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email})});setS(r.ok?'done':'err')}
  if(s==='done')return <p className="ok">You’re on the early access list.</p>
  return <><button className="btn" onClick={join} disabled={s==='busy'}>{s==='busy'?'Saving…':'Join the early access list'}</button>{s==='err'&&<p className="err">Something went wrong. Please try again.</p>}</>
}
