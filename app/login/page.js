'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function Form() {
  const router = useRouter();
  const [signup, setSignup] = useState(useSearchParams().get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (!SITEKEY) return;
    const draw = () => window.turnstile?.render('#ts-box', { sitekey: SITEKEY, callback: setToken, 'expired-callback': () => setToken('') });
    if (window.turnstile) { draw(); return; }
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = draw;
    document.head.appendChild(s);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const creds = { email: email.trim(), password, ...(SITEKEY ? { options: { captchaToken: token } } : {}) };
    const { data, error } = signup ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (SITEKEY) { window.turnstile?.reset(); setToken(''); }
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
        {SITEKEY && <div id="ts-box" />}
        <button className="btn primary" disabled={busy || (SITEKEY && !token)}>{busy ? 'Please wait…' : signup ? 'Sign up' : 'Log in'}</button>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>By continuing you agree to our <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.</p>
        {msg && <div className="err" role="alert" style={{ padding: 0 }}>{msg}</div>}
        <button type="button" className="btn" style={{ background: 'none', border: 0 }} onClick={() => { setSignup(!signup); setMsg(''); }}>
          {signup ? 'Have an account? Log in' : 'No account? Sign up'}
        </button>
      </form>
    </div>
  );
}
export default function Login() { return <Suspense><Form /></Suspense>; }
