'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

function Form() {
  const router = useRouter();
  const [signup, setSignup] = useState(useSearchParams().get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const creds = { email: email.trim(), password };
    const { data, error } = signup ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (error) return setMsg(error.message);
    if (data.session) router.push('/studio');
    else setMsg('Check your email to confirm your account, then log in.');
  }

  return (
    <div className="center">
      <form className="card glass" onSubmit={submit}>
        <Link href="/" className="logo">✦ Pllulai Studio</Link>
        <h1 style={{ margin: '10px 0 0', fontSize: 28 }}>{signup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{signup ? 'You get 20 free credits to start.' : 'Log in to create images and videos.'}</p>
        <input className="field" type="email" aria-label="Email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" type="password" aria-label="Password" placeholder="Password (6+ characters)" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn primary" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Sign up' : 'Log in'}</button>
        {msg && <div className="err" role="alert" style={{ padding: 0 }}>{msg}</div>}
        <button type="button" className="btn" style={{ background: 'none', border: 0 }} onClick={() => { setSignup(!signup); setMsg(''); }}>
          {signup ? 'Have an account? Log in' : 'No account? Sign up'}
        </button>
      </form>
    </div>
  );
}
export default function Login() { return <Suspense><Form /></Suspense>; }
