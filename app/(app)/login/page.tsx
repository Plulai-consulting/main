'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function Login(){
  const [err,setErr]=useState('');const [busy,setBusy]=useState(false)
  async function submit(e){
    e.preventDefault();setErr('');setBusy(true)
    const f=new FormData(e.target);const sb=createClient()
    const {data,error}=await sb.auth.signInWithPassword({email:String(f.get('email')||''),password:String(f.get('password')||'')})
    if(error){setErr('Email or password is incorrect.');setBusy(false);return}
    const {data:p}=await sb.from('profiles').select('role').eq('id',data.user.id).single()
    const next=new URLSearchParams(location.search).get('next')
    const safe=next&&next.startsWith('/')&&!next.startsWith('//')?next:null
    location.assign(p?.role==='admin'?(safe?.startsWith('/admin')?safe:'/admin'):(safe&&!safe.startsWith('/admin')?safe:'/portal'))
  }
  return <main className="auth"><a className="brand" href="/">← PlulAI Consulting</a>
    <h1 style={{fontSize:48,marginTop:28}}>Log in</h1>
    <form onSubmit={submit}>
      <label>Email<input name="email" type="email" autoComplete="email" required/></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
      {err&&<p className="err" role="alert">{err}</p>}
      <button className="btn" disabled={busy}>{busy?'Logging in…':'Log in'}</button>
    </form>
    <p className="muted">New client? <a href="/signup">Create an account</a></p></main>
}
