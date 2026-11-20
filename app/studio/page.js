'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Game from '../components/Game';
import { supabase } from '../../lib/supabase';
import { MODELS, DEFAULTS, COUNTS, modelsOf, resLabel } from '../../lib/models';
import { STYLES } from '../../lib/styles';

const ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Older'];
const bucket = (d) => {
  const n = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : n < 8 ? 'Previous 7 days' : 'Older';
};

export default function Studio() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [convs, setConvs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [items, setItems] = useState([]);
  const [urls, setUrls] = useState({});
  const [mode, setMode] = useState('video');
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('16:9');
  const [seconds, setSeconds] = useState(5);
  const [ref, setRef] = useState(null);
  const [pick, setPick] = useState(DEFAULTS);
  const [enhance, setEnhance] = useState(true);
  const [style, setStyle] = useState(null);
  const [res, setRes] = useState(null);
  const [count, setCount] = useState(1);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const model = MODELS[pick[mode]];
  const cost = model.cost({ seconds, res }) * count;
  const title = convs.find((c) => c.id === activeId)?.title || 'New conversation';

  useEffect(() => {
    if (!model.aspects.includes(aspect)) setAspect(model.aspects[0]);
    if (model.durations && !model.durations.includes(seconds)) setSeconds(model.durations[0]);
    if (model.resolutions && !model.resolutions.includes(res)) setRes(model.resolutions[0]);
    if (!COUNTS[mode].includes(count)) setCount(1);
  }, [mode, pick]);

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase.from('profiles').select('plan_credits,topup_credits').eq('id', uid).single();
    if (data) setCredits(data.plan_credits + data.topup_credits);
  }, []);

  const sign = useCallback(async (rows) => {
    const paths = rows.filter((r) => r.status === 'done' && r.output_path).map((r) => r.output_path);
    if (!paths.length) return;
    const { data } = await supabase.storage.from('outputs').createSignedUrls(paths, 3600);
    const m = {};
    data?.forEach((d, i) => { if (d.signedUrl) m[paths[i]] = d.signedUrl; });
    setUrls((u) => ({ ...u, ...m }));
  }, []);

  const loadConvs = useCallback(async () => {
    const { data } = await supabase.from('conversations').select('id,title,updated_at').order('updated_at', { ascending: false });
    setConvs(data || []);
    return data || [];
  }, []);

  const openConv = useCallback(async (id) => {
    setActiveId(id); setItems([]); setErr('');
    if (!id) return;
    const { data } = await supabase.from('generations').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
    setItems(data || []); sign(data || []);
  }, [sign]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');
      setUser(user); loadProfile(user.id);
      const list = await loadConvs();
      if (list[0]) openConv(list[0].id);
    })();
  }, []);

  // Poll unfinished generations every 4s
  useEffect(() => {
    const pending = items.filter((i) => i.status === 'processing');
    if (!pending.length || !user) return;
    const t = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      for (const it of pending) {
        const r = await fetch('/api/status?id=' + it.id, { headers: { Authorization: 'Bearer ' + session.access_token } });
        if (!r.ok) continue;
        const row = await r.json();
        if (row.status !== 'processing') {
          setItems((a) => a.map((x) => (x.id === row.id ? row : x)));
          sign([row]); loadProfile(user.id);
        }
      }
    }, 4000);
    return () => clearInterval(t);
  }, [items, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [items.length, activeId]);

  // Prompt sent over from the Marketing Strategist ("Create the image/video")
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pl-prefill');
      if (!raw) return;
      localStorage.removeItem('pl-prefill');
      const p = JSON.parse(raw);
      if (p.mode === 'image' || p.mode === 'video') setMode(p.mode);
      if (p.prompt) setPrompt(String(p.prompt).slice(0, 2000));
      if (p.aspect) setAspect(p.aspect);
    } catch {}
  }, []);
  useEffect(() => {
    const el = inputRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 132) + 'px'; }
  }, [prompt]);

  async function pickFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setErr('Reference must be under 10 MB.');
    const path = `${user.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await supabase.storage.from('references').upload(path, f);
    if (error) return setErr(error.message);
    setErr(''); setRef({ path, bucket: 'references', name: f.name, url: URL.createObjectURL(f) });
  }

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true); setErr('');
    let cid = activeId, created = false;
    if (!cid) {
      const { data, error } = await supabase.from('conversations').insert({ user_id: user.id }).select().single();
      if (error) { setBusy(false); return setErr(error.message); }
      cid = data.id; created = true; setActiveId(cid);
    }
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify({
        type: mode, prompt, conversationId: cid,
        params: { aspect, seconds, model: pick[mode], enhance, style, res, count },
        refPath: model.refId ? ref?.path || null : null,
        refBucket: ref?.bucket || 'references',
      }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      if (created) { await supabase.from('conversations').delete().eq('id', cid); setActiveId(null); }
      return setErr(j.error === 'insufficient_credits' ? 'Not enough credits for this generation.' : j.error || 'Something went wrong.');
    }
    const { data } = await supabase.from('generations').select('*').in('id', j.ids || [j.id]).order('created_at', { ascending: true });
    setItems((a) => [...a, ...(data || [])]); setPrompt(''); if (inputRef.current) inputRef.current.style.height = 'auto'; setRef(null); setOpen(false);
    if (j.started < j.wanted) setErr(`Started ${j.started} of ${j.wanted}: not enough credits for the rest.`);
    loadProfile(user.id); loadConvs();
  }

  async function rename(c) {
    const t = window.prompt('Rename conversation', c.title);
    if (!t || !t.trim()) return;
    await supabase.from('conversations').update({ title: t.trim().slice(0, 80) }).eq('id', c.id);
    loadConvs();
  }

  async function remove(c) {
    if (!window.confirm(`Delete "${c.title}" and all its images and videos?`)) return;
    const { data: gs } = await supabase.from('generations').select('output_path,reference_path').eq('conversation_id', c.id);
    const outs = (gs || []).map((g) => g.output_path).filter(Boolean);
    const refs = (gs || []).map((g) => g.reference_path).filter(Boolean);
    if (outs.length) await supabase.storage.from('outputs').remove(outs);
    if (refs.length) await supabase.storage.from('references').remove(refs);
    await supabase.from('conversations').delete().eq('id', c.id);
    const list = await loadConvs();
    if (c.id === activeId) openConv(list[0]?.id || null);
  }

  // Turn a finished image into the reference for the next generation (refine it, or animate it)
  function reuse(i, toVideo) {
    const m = toVideo ? 'video' : 'image';
    setMode(m);
    setPick((p) => (MODELS[p[m]].refId ? p : { ...p, [m]: modelsOf(m).find(([, x]) => x.refId)[0] }));
    setRef({ path: i.output_path, bucket: 'outputs', name: 'Previous result', url: urls[i.output_path] });
    inputRef.current?.focus();
  }

  async function upscale(i) {
    setErr('');
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch('/api/upscale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify({ generationId: i.id }),
    });
    const j = await r.json();
    if (!r.ok) return setErr(j.error === 'insufficient_credits' ? 'Not enough credits to upscale.' : j.error || 'Something went wrong.');
    const { data } = await supabase.from('generations').select('*').eq('id', j.id).single();
    setItems((a) => [...a, data]); loadProfile(user.id); loadConvs();
  }

  const logout = async () => { await supabase.auth.signOut(); router.replace('/'); };
  const filtered = convs.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
  const groups = ORDER.map((g) => [g, filtered.filter((c) => bucket(c.updated_at) === g)]).filter(([, l]) => l.length);

  return (
    <div className="app">
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <aside className={'side glass' + (menu ? ' open' : '')}>
        <div className="logo">✦ Pllulai Studio</div>
        <button className="btn primary" onClick={() => { openConv(null); setMenu(false); inputRef.current?.focus(); }}>＋ New conversation</button>
        <Link href="/strategist" className="btn">✦ Marketing strategist</Link>
        <input className="field search" aria-label="Search conversations" placeholder="Search conversations" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="hist">
          {groups.map(([g, list]) => (
            <div key={g}>
              <div className="glabel">{g}</div>
              {list.map((c) => (
                <div key={c.id} className={'row' + (c.id === activeId ? ' act' : '')}>
                  <button className="t" onClick={() => { openConv(c.id); setMenu(false); }}>{c.title}</button>
                  <span className="acts">
                    <button className="a" aria-label="Rename" onClick={() => rename(c)}>✎</button>
                    <button className="a" aria-label="Delete" onClick={() => remove(c)}>✕</button>
                  </span>
                </div>
              ))}
            </div>
          ))}
          {!convs.length && <div className="muted" style={{ padding: 8, fontSize: 13 }}>No conversations yet.</div>}
        </div>
        <div className="acct">
          <b>{credits} credits left</b>
          <span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</span>
          <button className="btn" style={{ height: 38 }} onClick={logout}>Log out</button>
        </div>
      </aside>

      <section className="main">
        <div className="ctitle">{title}</div>
        <div className="topbar"><button className="menu" aria-label="Open menu" onClick={() => setMenu(true)}>☰</button><span className="tt">{title}</span><span className="pill2">{credits} cr</span></div>
        <div className="feed"><div className="feed-in">
          {!items.length && <h1 style={{ textAlign: 'center', margin: 'auto', fontSize: 36 }}>What will you create?</h1>}
          {items.map((i, idx) => (
            <div key={i.id} style={{ display: 'contents' }}>
              {!(i.params?.batch && items[idx - 1]?.params?.batch === i.params.batch) && <div className="you sel">{i.prompt}</div>}
              <div className="bot glass">
                {i.params?.of > 1 && <div className="vlabel">Variation {i.params.variation} of {i.params.of}</div>}
                {i.status === 'processing' && <Game type={i.type} />}
                {i.status === 'failed' && <div className="st muted">⚠ {i.error || 'Failed'}. Your credits were refunded.</div>}
                {i.status === 'done' && (urls[i.output_path]
                  ? (i.type === 'video' ? <video src={urls[i.output_path]} controls loop playsInline /> : <img src={urls[i.output_path]} alt={i.prompt} />)
                  : <div className="st muted">Loading…</div>)}
                {i.status === 'done' && urls[i.output_path] && (
                  <div style={{ padding: '8px 4px 0', fontSize: 13 }}><a href={urls[i.output_path]} target="_blank" rel="noreferrer">Open / download</a> <span className="muted">· {MODELS[i.params?.model]?.label || ''} · {i.params?.aspect}{i.params?.res ? ` · ${resLabel(i.params.res)}` : ''}{i.type === 'video' ? ` · ${i.params?.seconds}s` : ''}</span></div>
                )}
                {i.status === 'done' && urls[i.output_path] && (
                  <div className="rbtns">
                    {i.type === 'image' && <button className="mini" onClick={() => reuse(i, false)}>Use as reference</button>}
                    {i.type === 'image' && <button className="mini" onClick={() => reuse(i, true)}>Animate</button>}
                    {!i.params?.upscale && <button className="mini" onClick={() => upscale(i)}>Upscale · {i.type === 'image' ? MODELS.upscale_image.cost({}) : MODELS.upscale_video.cost({ seconds: i.params?.seconds || 5 })} cr</button>}
                  </div>
                )}
                {i.status === 'done' && i.params?.enhanced && (
                  <details style={{ padding: '8px 4px 0', fontSize: 13 }}><summary className="muted">Prompt used</summary><div className="muted">{i.params.enhanced}</div></details>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div></div>

        <div className="composer">
          {open && <div className="scrim2" onClick={() => setOpen(false)} />}
          {open && (
            <div className="pop-up">
              <b>{mode === 'video' ? 'Video' : 'Image'} settings</b>
              <div>
                <div className="lbl">Model</div>
                <div className="models">{modelsOf(mode).map(([k, m]) => (
                  <button key={k} className={'mdl' + (k === pick[mode] ? ' sel' : '')} onClick={() => setPick({ ...pick, [mode]: k })}>
                    <span><b>{m.label}</b><br /><small>{m.note}</small></span>
                    <small>{m.durations ? `${m.cost({ seconds: 1 })} cr/sec` : `${m.cost({ seconds })} cr`}</small>
                  </button>
                ))}</div>
              </div>
              <div>
                <div className="lbl">Aspect ratio</div>
                <div className="seg">{model.aspects.map((a) => <button key={a} className={a === aspect ? 'sel' : ''} onClick={() => setAspect(a)}>{a}</button>)}</div>
              </div>
              {model.durations && (
                <div>
                  <div className="lbl">Length</div>
                  <div className="seg">{model.durations.map((s) => <button key={s} className={s === seconds ? 'sel' : ''} onClick={() => setSeconds(s)}>{s}s</button>)}</div>
                </div>
              )}
              {model.resolutions && (
                <div>
                  <div className="lbl">Resolution (higher costs more credits)</div>
                  <div className="seg">{model.resolutions.map((r) => <button key={r} className={r === res ? 'sel' : ''} onClick={() => setRes(r)}>{resLabel(r)}</button>)}</div>
                </div>
              )}
              <div>
                <div className="lbl">Variations (each one costs credits)</div>
                <div className="seg">{COUNTS[mode].map((n) => <button key={n} className={n === count ? 'sel' : ''} onClick={() => setCount(n)}>{n}</button>)}</div>
              </div>
              <div>
                <div className="lbl">Prompt booster (adds detail for better results)</div>
                <div className="seg"><button className={enhance ? 'sel' : ''} onClick={() => setEnhance(true)}>On</button><button className={!enhance ? 'sel' : ''} onClick={() => setEnhance(false)}>Off</button></div>
              </div>
              <div>
                <div className="lbl">Reference image</div>
                {model.refId
                  ? <button className="btn" onClick={() => fileRef.current?.click()}>{ref ? `✓ ${ref.name}` : 'Upload a reference image'}</button>
                  : <span className="muted" style={{ fontSize: 14 }}>{model.label} doesn’t take a reference. Try a model that does.</span>}
              </div>
              <button className="btn primary done" onClick={() => setOpen(false)}>Done</button>
            </div>
          )}
          <div className="cbox glass">
            <textarea ref={inputRef} className="prompt" rows={1} aria-label="Describe what you want to create" placeholder="Describe your video or image…"
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 132) + 'px'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(hover: none)').matches) { e.preventDefault(); generate(); } }} />
            {err && <div className="err" role="alert">{err}</div>}
            <div className="styles">
              {Object.entries(STYLES).map(([k, s]) => (
                <button key={k} className={'chip' + (style === k ? ' sel' : '')} onClick={() => setStyle(style === k ? null : k)}>{s.label}</button>
              ))}
            </div>
            <div className="crow">
              <button className="round" aria-label="Add reference image" onClick={() => (model.refId ? fileRef.current?.click() : setOpen(true))}>＋</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
              <div className="seg">
                <button className={mode === 'image' ? 'sel' : ''} onClick={() => setMode('image')}>Image</button>
                <button className={mode === 'video' ? 'sel' : ''} onClick={() => setMode('video')}>Video</button>
              </div>
              <button className="btn" onClick={() => setOpen(!open)}>⚙ {model.label} · {aspect}{model.durations ? ` · ${seconds}s` : ''}{model.resolutions ? ` · ${resLabel(res || model.resolutions[0])}` : ''}{count > 1 ? ` · ×${count}` : ''}</button>
              {ref && (
                <span className="rchip">
                  {ref.url && <img src={ref.url} alt="" />}
                  <span>{model.refId ? ref.name : 'Not used by this model'}</span>
                  <button aria-label="Remove reference" onClick={() => setRef(null)}>✕</button>
                </span>
              )}
              <div className="sp" />
              <button className="btn primary" disabled={busy || !prompt.trim() || cost > credits} onClick={generate}>
                {busy ? 'Starting…' : `Generate · ${cost} credits`}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

