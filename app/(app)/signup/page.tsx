'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function Signup(){
  const [err,setErr]=useState('');const [done,setDone]=useState(false);const [busy,setBusy]=useState(false)
  async function submit(e){
    e.preventDefault();setErr('');setBusy(true)
    const f=new FormData(e.target)
    if(String(f.get('password')).length<8){setErr('Use at least 8 characters for your password.');setBusy(false);return}
    const {error}=await createClient().auth.signUp({email:String(f.get('email')||''),password:String(f.get('password')||''),options:{data:{full_name:String(f.get('name')||'')},emailRedirectTo:location.origin+'/auth/callback'}})
    setBusy(false)
    if(error){
      console.error('[signup]',error.code||error.status,error.message)
      const m={over_email_send_rate_limit:'Too many sign-up emails were sent recently. Please wait a while and try again.',email_rate_limit_exceeded:'Too many sign-up emails were sent recently. Please wait a while and try again.',signup_disabled:'Sign-ups are currently closed.',weak_password:'Please choose a stronger password.'}[String(error.code)]
      setErr((m||'We could not create this account. If you already have one, please log in.')+(process.env.NODE_ENV!=='production'?' [Dev detail: '+(error.code||error.status||'')+' '+error.message+']':''))
      return}
    setDone(true)
  }
  if(done)return <main className="auth"><h1 style={{fontSize:44}}>Check your email.</h1><p className="muted" style={{marginTop:18}}>We sent a confirmation link. Open it to activate your account, then <a href="/login">log in</a>.</p></main>
  return <main className="auth"><a className="brand" href="/">← PlulAI Consulting</a>
    <h1 style={{fontSize:48,marginTop:28}}>Create your account</h1>
    <p className="muted" style={{marginTop:12}}>Follow your project and message our team.</p>
    <form onSubmit={submit}>
      <label>Your name<input name="name" autoComplete="name" required/></label>
      <label>Email<input name="email" type="email" autoComplete="email" required/></label>
      <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required/></label>
      {err&&<p className="err" role="alert">{err}</p>}
      <button className="btn" disabled={busy}>{busy?'Creating…':'Create account'}</button>
    </form>
    <p className="muted">Already have an account? <a href="/login">Log in</a></p></main>
}
