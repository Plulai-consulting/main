'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { MODELS } from '../../lib/models';
import Game from '../components/Game';

const SCENES = {
  white: ['Clean white studio', 'a clean seamless pure white studio background with a soft natural shadow'],
  marble: ['Marble surface', 'a polished white marble surface with soft window light and a blurred neutral background'],
  wood: ['Warm wood table', 'a warm wooden table with soft morning light and a softly blurred cozy background'],
  lifestyle: ['Lifestyle scene', 'a bright modern lifestyle setting that suits the product, natural daylight, shallow depth of field'],
  gradient: ['Soft gradient', 'a smooth soft gradient studio backdrop in a color that complements the product'],
  outdoor: ['Outdoors', 'an outdoor setting with natural sunlight and soft greenery in the background, shallow depth of field'],
};
const ASPECTS = ['1:1', '4:3', '9:16', '16:9'];

export default function Tools() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [urls, setUrls] = useState({});
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [scene, setScene] = useState('white');
  const [custom, setCustom] = useState('');
  const [aspect, setAspect] = useState('1:1');
  const [count, setCount] = useState(2);
  const [files, setFiles] = useState({});
  const [consent, setConsent] = useState(false);

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

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');
      setUser(user); loadProfile(user.id);
    })();
  }, []);

  // Poll unfinished jobs
  useEffect(() => {
    const pending = jobs.filter((j) => j.status === 'processing');
    if (!pending.length || !user) return;
    const t = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      for (const it of pending) {
        const r = await fetch('/api/status?id=' + it.id, { headers: { Authorization: 'Bearer ' + session.access_token } });
        if (!r.ok) continue;
        const row = await r.json();
        if (row.status !== 'processing') { setJobs((a) => a.map((x) => (x.id === row.id ? row : x))); sign([row]); loadProfile(user.id); }
      }
    }, 4000);
    return () => clearInterval(t);
  }, [jobs, user]);

  async function convId() {
    const { data } = await supabase.from('conversations').select('id').eq('title', 'Studio tools').limit(1);
    if (data?.[0]) return data[0].id;
    const { data: c } = await supabase.from('conversations').insert({ user_id: user.id, title: 'Studio tools' }).select().single();
    return c.id;
  }
  async function upload(file, maxMB) {
    if (file.size > maxMB * 1024 * 1024) throw new Error(`The file must be under ${maxMB} MB.`);
    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await supabase.storage.from('references').upload(path, file);
    if (error) throw new Error(error.message);
    return path;
  }
  async function authed(url, body) {
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(body) });
    return { ...(await r.json().catch(() => ({}))), ok: r.ok };
  }
  async function addJobs(ids) {
    const { data } = await supabase.from('generations').select('*').in('id', ids);
    setJobs((a) => [...(data || []), ...a]); loadProfile(user.id);
  }
  const fail = (j) => setErr(j.error === 'insufficient_credits' ? 'Not enough credits for this tool.' : j.error || 'Something went wrong.');

  async function run(kind) {
    const file = files[kind];
    if (!file || busy) return;
    setBusy(kind); setErr('');
    try {
      const cid = await convId();
      if (kind === 'product') {
        const path = await upload(file, 10);
        const sceneText = custom.trim() ? `${custom.trim()}` : SCENES[scene][1];
        const prompt = `Professional product photograph. Keep the product exactly as it appears in the reference image: same shape, colors, logo and text, with no changes. Place it in ${sceneText}. Realistic lighting, natural contact shadows and reflections, sharp focus, high detail, no extra text, no watermark.`;
        const j = await authed('/api/generate', { type: 'image', prompt, conversationId: cid, params: { aspect, model: 'nano_banana', res: '1K', count, enhance: false }, refPath: path, refBucket: 'references' });
        if (!j.ok) return fail(j);
        await addJobs(j.ids || [j.id]);
      } else {
        const path = await upload(file, kind === 'captions' ? 25 : 10);
        const j = await authed('/api/tools', { tool: kind, bucket: 'references', path, conversationId: cid, label: kind === 'rembg' ? 'Remove background' : 'Add captions' });
        if (!j.ok) return fail(j);
        await addJobs([j.id]);
      }
    } catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  }

  const pick = (kind) => (e) => setFiles((f) => ({ ...f, [kind]: e.target.files?.[0] || null }));
  const productCost = MODELS.nano_banana.cost({ res: '1K' }) * count;

  return (
    <div className="sp-wrap">
      <div className="sp-bar">
        <Link href="/studio" className="btn">← Studio</Link>
        <div className="logo grow">🛠 Studio tools</div>
        <span className="pill2">{credits} credits</span>
      </div>
      {err && <div className="err" role="alert" style={{ padding: '0 0 12px' }}>{err}</div>}

      <label className="chk"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I have the right to use the files I upload, and anyone shown in them has agreed. I accept the <Link href="/legal/acceptable-use">acceptable use policy</Link>.</span></label>

      <div className="tools-grid">
        <div className="panel glass">
          <h3 style={{ marginTop: 0 }}>Remove background</h3>
          <p className="muted" style={{ marginTop: 0 }}>Get a clean cut-out with a transparent background, ready for any design.</p>
          <label className="drop">{files.rembg ? files.rembg.name : 'Choose a photo (JPG or PNG, up to 10 MB)'}<input type="file" accept="image/*" hidden onChange={pick('rembg')} /></label>
          <button className="btn primary" disabled={!consent || !files.rembg || !!busy} onClick={() => run('rembg')}>{busy === 'rembg' ? 'Uploading…' : `Remove background · ${MODELS.tool_rembg.cost({})} credits`}</button>
        </div>

        <div className="panel glass">
          <h3 style={{ marginTop: 0 }}>Product photos & new backgrounds</h3>
          <p className="muted" style={{ marginTop: 0 }}>Upload one product photo and get professional shots in new settings. The product itself stays the same.</p>
          <label className="drop">{files.product ? files.product.name : 'Choose your product photo (up to 10 MB)'}<input type="file" accept="image/*" hidden onChange={pick('product')} /></label>
          <div className="lbl">Scene</div>
          <div className="chips2">{Object.entries(SCENES).map(([k, [label]]) => <button key={k} className={'chip' + (scene === k && !custom.trim() ? ' sel' : '')} onClick={() => { setScene(k); setCustom(''); }}>{label}</button>)}</div>
          <input className="field" style={{ marginTop: 10 }} aria-label="Describe your own scene" placeholder="Or describe your own scene, for example: on a beach at sunset" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '12px 0' }}>
            <div><div className="lbl">Shape</div><div className="seg">{ASPECTS.map((a) => <button key={a} className={a === aspect ? 'sel' : ''} onClick={() => setAspect(a)}>{a}</button>)}</div></div>
            <div><div className="lbl">Variations</div><div className="seg">{[1, 2, 4].map((n) => <button key={n} className={n === count ? 'sel' : ''} onClick={() => setCount(n)}>{n}</button>)}</div></div>
          </div>
          <button className="btn primary" disabled={!consent || !files.product || !!busy || productCost > credits} onClick={() => run('product')}>{busy === 'product' ? 'Uploading…' : `Create product photos · ${productCost} credits`}</button>
        </div>

        <div className="panel glass">
          <h3 style={{ marginTop: 0 }}>Auto-captions for video</h3>
          <p className="muted" style={{ marginTop: 0 }}>Adds styled subtitles to your video. It detects the language, including Arabic. Best for clips up to about a minute.</p>
          <label className="drop">{files.captions ? files.captions.name : 'Choose a video (MP4, MOV or WebM, up to 25 MB)'}<input type="file" accept="video/*" hidden onChange={pick('captions')} /></label>
          <button className="btn primary" disabled={!consent || !files.captions || !!busy} onClick={() => run('captions')}>{busy === 'captions' ? 'Uploading…' : `Add captions · ${MODELS.tool_captions.cost({})} credits`}</button>
        </div>
      </div>

      {jobs.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <h3 style={{ margin: '0 0 4px' }}>Your results</h3>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Everything is also saved in your studio history under “Studio tools”.</p>
          <div className="res-grid">
            {jobs.map((j) => (
              <div key={j.id} className="glass">
                {j.status === 'processing' && <Game label="Working on it…" />}
                {j.status === 'failed' && <div className="muted" style={{ padding: 12 }}>⚠ {j.error || 'Failed'}. Credits refunded.</div>}
                {j.status === 'done' && (urls[j.output_path]
                  ? <>{j.type === 'video' ? <video src={urls[j.output_path]} controls playsInline /> : <img src={urls[j.output_path]} alt="" />}
                    <div style={{ padding: '8px 4px 2px', fontSize: 13 }}><a href={urls[j.output_path]} target="_blank" rel="noreferrer">Open / download</a></div></>
                  : <div className="muted" style={{ padding: 12 }}>Loading…</div>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
