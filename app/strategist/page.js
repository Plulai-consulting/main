'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { STRATEGY_COST, RESEARCH_COST } from '../../lib/config';
import { TEMPLATES } from '../../lib/templates';
import { StrategyView, Post, ResearchTab, ExtrasTab, ReviewTab, ChildReady } from './parts';
import { briefOK } from '../../lib/brief';
import Game from '../components/Game';

const GREETING = "Hi, I'm Maya, your marketing strategist. I'll ask a few quick questions, then build your 30-day plan with ready-to-post content. To start: what's your brand called, and what do you sell?";
const STEPS = ['overview', 'overview2', 'overview3', ...[1, 2, 3, 4].flatMap((w) => [1, 2, 3].map((p) => `w${w}p${p}`))];
const splitOpts = (t) => {
  const m = String(t).match(/\n?\s*OPTIONS:\s*(.+)\s*$/i);
  return m ? { text: String(t).slice(0, m.index).trim(), opts: m[1].split('|').map((x) => x.trim()).filter(Boolean).slice(0, 5) } : { text: String(t), opts: [] };
};
const LABELS = {
  brand_name: 'Brand', sector: 'Sector', market: 'Market', offer: 'Sells', price_range: 'Prices', customer_journey: 'How customers buy',
  audience: 'Audience', objections: 'Objections', proof: 'Proof', top_priority_product: 'Top priority', sales_channel: 'Where they buy', inspiration: 'Style they like', baseline: 'Current numbers', capacity: 'Content capacity', restrictions: 'Restrictions', start_date: 'Start date', differentiators: 'Different because', competitors: 'Competitors', voice: 'Voice', languages: 'Post language',
  current_marketing: 'Current marketing', assets: 'Assets', goal: '30-day goal', events: 'Events / offers', channels: 'Channels',
  posts_per_week: 'Posts per week', ad_budget: 'Ad budget', avoid: 'Avoid',
};
const ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Older'];
const STATUS = { interview: 'Interview', ready: 'Brief ready', building: 'Building', done: 'Done', failed: 'Failed' };
const bucket = (d) => {
  const n = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : n < 8 ? 'Previous 7 days' : 'Older';
};
const show = (v) => (Array.isArray(v) ? v.join(', ') : String(v));
const tags = (p) => (p.hashtags || []).map((h) => (String(h).startsWith('#') ? h : '#' + h));

async function api(url, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !j.error) j.error = r.status === 504 ? 'The server timed out. Press Resume to continue (no extra charge).' : `Request failed (${r.status}).`;
  return { ...j, ok: r.ok, status: r.status };
}

export default function Strategist() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [list, setList] = useState([]);
  const [active, setActive] = useState(null); // {id,title,status,brief,plan}
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('strategy');
  const [prog, setProg] = useState(null);
  const [menu, setMenu] = useState(false);
  const [ratedS, setRatedS] = useState(0);
  const [template, setTemplate] = useState('general');
  const [rBusy, setRBusy] = useState(false);
  const [xBusy, setXBusy] = useState('');
  const [q, setQ] = useState('');
  const endRef = useRef(null);

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase.from('profiles').select('plan_credits,topup_credits').eq('id', uid).single();
    if (data) setCredits(data.plan_credits + data.topup_credits);
  }, []);
  const loadList = useCallback(async () => {
    const { data } = await supabase.from('strategies').select('id,title,status,updated_at').order('updated_at', { ascending: false });
    setList(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');
      setUser(user); loadProfile(user.id); loadList();
    })();
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, busy]);

  async function openStrategy(id) {
    if (!id) { setActive(null); setMsgs([]); setErr(''); return; }
    const { data } = await supabase.from('strategies').select('*').eq('id', id).single();
    if (!data) return;
    setActive(data); setMsgs(data.messages || []); setErr(''); setTab(data.plan?.overview ? 'strategy' : tab);
  }

  async function send(override) {
    const t = (typeof override === 'string' ? override : text).trim();
    if (!t || busy) return;
    setBusy(true); setErr(''); setText('');
    setMsgs((m) => [...m, { role: 'user', content: t }]);
    const j = await api('/api/strategist/chat', { strategyId: active?.id || null, text: t, template });
    setBusy(false);
    if (!j.ok) return setErr(j.error || 'Something went wrong.');
    setMsgs((m) => [...m, { role: 'assistant', content: j.reply }]);
    setActive((a) => ({ ...(a || {}), id: j.strategyId, template: a?.template || (template !== 'general' ? template : null), title: j.title, status: j.done ? 'ready' : 'interview', brief: j.brief || a?.brief || null }));
    loadList();
  }

  async function rateStrategy(rating) {
    setRatedS(rating);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ kind: 'strategy', refId: active.id, rating }) });
  }

  async function rebuildBrief() {
    if (busy) return;
    setBusy(true); setErr('');
    const j = await api('/api/strategist/chat', { strategyId: active.id, rebuild: true });
    setBusy(false);
    if (!j.ok) return setErr(j.error || 'Something went wrong.');
    setActive((a) => ({ ...a, title: j.title, status: 'ready', brief: j.brief }));
    loadList();
  }

  async function build() {
    setErr('');
    const done = active.plan?.done || {};
    const todo = STEPS.filter((s) => !done[s]);
    setProg({ done: STEPS.length - todo.length, total: STEPS.length });
    for (const s of todo) {
      const j = await api('/api/strategist/generate', { strategyId: active.id, step: s });
      if (!j.ok) {
        setErr(j.error === 'insufficient_credits' ? `Not enough credits. A strategy costs ${STRATEGY_COST}.` : j.error || 'A step failed. Press Resume to continue.');
        if (j.plan) setActive((a) => ({ ...a, plan: j.plan, status: j.status || a.status }));
        setProg(null); loadList(); loadProfile(user.id);
        return;
      }
      setActive((a) => ({ ...a, plan: j.plan, status: j.status }));
      setProg((p) => ({ ...p, done: p.done + 1 }));
      if (s === 'overview') loadProfile(user.id);
    }
    setProg(null); setTab('calendar'); loadList();
  }

  async function rename(s) {
    const t = window.prompt('Rename strategy', s.title);
    if (!t || !t.trim()) return;
    const title = t.trim().slice(0, 80);
    await supabase.from('strategies').update({ title }).eq('id', s.id);
    if (active?.id === s.id) setActive((a) => ({ ...a, title }));
    loadList();
  }
  async function remove(s) {
    if (!window.confirm(`Delete "${s.title}"? Its strategy and posts will be deleted too.`)) return;
    await supabase.from('strategies').delete().eq('id', s.id);
    if (active?.id === s.id) openStrategy(null);
    loadList();
  }
  const filtered = list.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));
  const groups = ORDER.map((g) => [g, filtered.filter((s) => bucket(s.updated_at) === g)]).filter(([, r]) => r.length);

  const greet = TEMPLATES[active?.template || template]?.greeting || GREETING;
  const last = msgs[msgs.length - 1];
  const lastOpts = msgs.length ? (last?.role === 'assistant' ? splitOpts(last.content).opts : []) : splitOpts(greet).opts;

  async function runResearch() {
    if (rBusy) return;
    setRBusy(true); setErr('');
    let r = active.research;
    for (const step of ['search', 'report']) {
      if ((step === 'search' && r?.notes) || (step === 'report' && r?.report)) continue;
      const j = await api('/api/strategist/research', { strategyId: active.id, step });
      if (!j.ok) {
        setErr(j.error === 'insufficient_credits' ? `Not enough credits. Research costs ${RESEARCH_COST}.` : j.error || 'Something went wrong.');
        if (j.research) setActive((a) => ({ ...a, research: j.research }));
        setRBusy(false); loadProfile(user.id);
        return;
      }
      r = j.research; setActive((a) => ({ ...a, research: r }));
      if (step === 'search') loadProfile(user.id);
    }
    setRBusy(false);
  }
  async function runExtra(kind) {
    if (xBusy) return;
    setXBusy(kind); setErr('');
    const j = await api('/api/strategist/extra', { strategyId: active.id, kind });
    setXBusy('');
    if (!j.ok) return setErr(j.error === 'insufficient_credits' ? 'Not enough credits.' : j.error || 'Something went wrong.');
    setActive((a) => ({ ...a, extras: j.extras })); loadProfile(user.id);
  }
  async function submitReview(review) {
    setBusy(true); setErr('');
    const j = await api('/api/strategist/review', { strategyId: active.id, review });
    setBusy(false);
    if (!j.ok) return setErr(j.error || 'Something went wrong.');
    await loadList(); await openStrategy(j.id);
  }
  const plan = active?.plan;
  const weeks = [1, 2, 3, 4];
  const allPosts = weeks.flatMap((w) => plan?.weeks?.[w] || []);
  const complete = STEPS.every((s) => plan?.done?.[s]);
  const asText = (p) => `${p.caption}\n\n${tags(p).join(' ')}`;

  function createVisual(p) {
    try { localStorage.setItem('pl-prefill', JSON.stringify({ prompt: p.visual?.prompt, mode: p.visual?.type, aspect: p.visual?.aspect })); } catch {}
    router.push('/studio');
  }
  function downloadCSV() {
    const cell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Day', 'Channel', 'Format', 'Pillar', 'Hook', 'Caption', 'Hashtags', 'CTA', 'Best time', 'Visual type', 'Visual prompt']]
      .concat(allPosts.map((p) => [p.day, p.channel, p.format, p.pillar, p.hook, p.caption, tags(p).join(' '), p.cta, p.best_time, p.visual?.type, p.visual?.prompt]));
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${(active.title || 'strategy').replace(/\W+/g, '-')}-30-day-plan.csv`; a.click();
  }

  return (
    <div className="app">
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <aside className={'side glass' + (menu ? ' open' : '')}>
        <div className="logo">✦ Marketing strategist</div>
        <button className="btn primary" onClick={() => { openStrategy(null); setMenu(false); }}>＋ New strategy</button>
        <Link href="/studio" className="btn">← Back to studio</Link>
        <input className="field search" aria-label="Search strategies" placeholder="Search strategies" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="hist">
          {groups.map(([g, rows]) => (
            <div key={g}>
              <div className="glabel">{g}</div>
              {rows.map((s) => (
                <div key={s.id} className={'row' + (s.id === active?.id ? ' act' : '')}>
                  <button className="t" onClick={() => { openStrategy(s.id); setMenu(false); }}>{s.title} <small className="muted">· {STATUS[s.status]}</small></button>
                  <span className="acts">
                    <button className="a" aria-label="Rename" onClick={() => rename(s)}>✎</button>
                    <button className="a" aria-label="Delete" onClick={() => remove(s)}>✕</button>
                  </span>
                </div>
              ))}
            </div>
          ))}
          {!list.length && <div className="muted" style={{ padding: 8, fontSize: 13 }}>No strategies yet.</div>}
        </div>
        <div className="acct">
          <b>{credits} credits left</b>
          <span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</span>
        </div>
      </aside>

      <section className="main">
        <div className="ctitle">{active?.title || 'New strategy'}</div>
        <div className="topbar"><button className="menu" aria-label="Open menu" onClick={() => setMenu(true)}>☰</button><span className="tt">{active?.title || 'New strategy'}</span><span className="pill2">{credits} cr</span></div>
        <div className="sp-scroll"><div className="sp-inner">

      {/* ---------- Interview ---------- */}
      {active?.parent_id && !plan?.overview && !prog && <ChildReady active={active} onBuild={build} credits={credits} busy={busy} />}
      {err && active?.parent_id && !plan?.overview && !prog && <div className="err" role="alert">{err}</div>}
      {!plan?.overview && !prog && !active?.parent_id && (
        <div className="panel glass">
          {!active && msgs.length === 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="lbl">What kind of business?</div>
              <div className="chips2">{Object.entries(TEMPLATES).map(([k, t]) => <button key={k} className={'chip' + (template === k ? ' sel' : '')} onClick={() => setTemplate(k)}>{t.icon} {t.label}</button>)}</div>
            </div>
          )}
          <div className="chat">
            <div className="m a">{splitOpts(greet).text}</div>
            {msgs.map((m, i) => <div key={i} className={'m ' + (m.role === 'user' ? 'u sel' : 'a')}>{splitOpts(m.content).text}</div>)}
            {busy && <div className="m a muted">Maya is thinking…</div>}
            {!busy && lastOpts.length > 0 && active?.status !== 'ready' && <div className="chips2">{lastOpts.map((o) => <button key={o} className="chip" onClick={() => send(o)}>{o}</button>)}</div>}
            <div ref={endRef} />
          </div>
          {err && <div className="err" role="alert" style={{ padding: '0 0 10px' }}>{err}</div>}

          {active?.status === 'ready' && !briefOK(active.brief) ? (
            <div className="panel glass" style={{ marginBottom: 12 }}>
              <b>Your brief is incomplete.</b> <span className="muted">Tell Maya a few more details below, or rebuild it from this conversation.</span>
              <div className="rbtns"><button className="mini" onClick={rebuildBrief} disabled={busy}>Rebuild brief from conversation</button></div>
            </div>
          ) : active?.status === 'ready' ? (
            <div>
              <h3 style={{ margin: '4px 0 10px' }}>Your brief</h3>
              <dl className="kv">
                {Object.entries(active.brief).filter(([k, v]) => LABELS[k] && v && v.length !== 0).map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}><dt>{LABELS[k]}</dt><dd>{show(v)}</dd></div>
                ))}
              </dl>
              <div className="rbtns" style={{ paddingTop: 16 }}>
                <button className="btn primary" onClick={build} disabled={credits < STRATEGY_COST}>Build my 30-day strategy · {STRATEGY_COST} credits</button>
                {!active.research?.report && <button className="btn" onClick={runResearch} disabled={rBusy || credits < RESEARCH_COST}>{rBusy ? 'Researching…' : `Research competitors first · ${RESEARCH_COST} credits`}</button>}
                {active.research?.report && <span className="muted" style={{ alignSelf: 'center', fontSize: 14 }}>Competitor research ready ✓ (used in your plan)</span>}
              </div>
              <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>Want to change something? Just tell Maya below, and she will update the brief.</p>
            </div>
          ) : null}

          {active?.status !== 'building' && (
            <div className="sp-input" style={{ marginTop: 12 }}>
              <textarea className="field ta" rows={2} aria-label="Your answer" placeholder="Type your answer…" value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(hover: none)').matches) { e.preventDefault(); send(); } }} />
              <button className="btn primary" onClick={() => send()} disabled={busy || !text.trim()}>Send</button>
            </div>
          )}
          {active?.status === 'building' && <button className="btn primary" onClick={build}>Resume building (no extra charge)</button>}
        </div>
      )}

      {/* ---------- Building ---------- */}
      {prog && (
        <div className="panel glass">
          <h3 style={{ margin: '0 0 8px' }}>Building your strategy…</h3>
          <div className="bar"><i style={{ width: (prog.done / prog.total) * 100 + '%' }} /></div>
          <p className="muted" style={{ fontSize: 14 }}>{prog.done === 0 ? 'Analysing your brand…' : `Step ${Math.min(prog.done + 1, prog.total)} of ${prog.total}`}. This takes a few minutes. Keep this page open and play while you wait.</p>
          <Game label="Tap the orb while Maya works" />
        </div>
      )}

      {/* ---------- Plan ---------- */}
      {plan?.overview && !prog && (
        <div>
          <div className="plan-head">
            <h2 style={{ margin: 0 }}>{active.title}</h2>
            <span className="rbtns" style={{ padding: 0 }}><span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>Was this useful?</span><button className={'mini' + (ratedS === 1 ? ' sel' : '')} aria-label="Useful" onClick={() => rateStrategy(1)}>👍</button><button className={'mini' + (ratedS === -1 ? ' sel' : '')} aria-label="Not useful" onClick={() => rateStrategy(-1)}>👎</button></span>
            <div className="seg tabs">
              <button className={tab === 'strategy' ? 'sel' : ''} onClick={() => setTab('strategy')}>Strategy</button>
              <button className={tab === 'calendar' ? 'sel' : ''} onClick={() => setTab('calendar')}>Calendar & posts</button>
              <button className={tab === 'research' ? 'sel' : ''} onClick={() => setTab('research')}>Research</button>
              <button className={tab === 'extras' ? 'sel' : ''} onClick={() => setTab('extras')}>Ads, email & more</button>
              <button className={tab === 'review' ? 'sel' : ''} onClick={() => setTab('review')}>Monthly review</button>
              <button className={tab === 'chat' ? 'sel' : ''} onClick={() => setTab('chat')}>Conversation</button>
            </div>
          </div>
          {err && <div className="err" role="alert" style={{ padding: '0 0 10px' }}>{err}</div>}
          {!complete && <div className="panel glass" style={{ marginBottom: 14 }}><b>Some posts are still missing.</b> <button className="btn primary" style={{ marginLeft: 10 }} onClick={build}>Resume (no extra charge)</button></div>}

          {tab === 'strategy' && <StrategyView o={plan.overview} />}

          {tab === 'research' && <ResearchTab active={active} onRun={runResearch} busy={rBusy} />}
          {tab === 'extras' && <ExtrasTab active={active} run={runExtra} busy={xBusy} />}
          {tab === 'review' && <ReviewTab key={active.id} active={active} onSubmit={submitReview} busy={busy} />}
          {tab === 'chat' && (
            <div className="panel glass"><div className="chat">
              <div className="m a">{splitOpts(greet).text}</div>
              {msgs.map((m, i) => <div key={i} className={'m ' + (m.role === 'user' ? 'u sel' : 'a')}>{splitOpts(m.content).text}</div>)}
            </div></div>
          )}

          {tab === 'calendar' && (
            <div>
              <div className="rbtns" style={{ paddingTop: 0, paddingBottom: 12 }}>
                <button className="mini" onClick={downloadCSV} disabled={!allPosts.length}>Download CSV</button>
                <button className="mini" onClick={() => navigator.clipboard.writeText(allPosts.map((p) => `DAY ${p.day} · ${p.channel} · ${p.format}\n${asText(p)}`).join('\n\n---\n\n'))} disabled={!allPosts.length}>Copy all posts</button>
              </div>
              {weeks.map((w) => (
                <section key={w} style={{ marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 8px' }}>Week {w}{plan.overview.weekly_themes?.find((x) => x.week === w)?.theme ? ` · ${plan.overview.weekly_themes.find((x) => x.week === w).theme}` : ''}</h3>
                  {(plan.weeks?.[w] || []).map((p, i) => <Post key={i} p={p} asText={asText} tags={tags} onVisual={createVisual} />)}
                  {!(plan.weeks?.[w] || []).length && <div className="muted">No posts yet for this week.</div>}
                </section>
              ))}
            </div>
          )}
        </div>
      )}
        </div></div>
      </section>
    </div>
  );
}

