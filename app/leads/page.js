'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { LEAD_SEARCH_COST, LEAD_EMAIL_COST } from '../../lib/config';
import Game from '../components/Game';

const STATUSES = ['new', 'drafted', 'contacted', 'replied', 'won', 'lost', 'excluded'];
const TONES = ['friendly', 'professional', 'direct', 'warm and personal'];
const BLANK = {
  name: '', offer: '', goal: 'Book a short call', tone: 'friendly', language: 'English', senderName: '', senderRole: '', senderCompany: '', senderWebsite: '',
  icpDesc: '', industries: '', locations: '', roles: '', size: '', signals: '', exclusions: '', strategyId: '',
};

async function api(url, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !j.error) j.error = r.status === 504 ? 'The server timed out. Please try again.' : `Request failed (${r.status}).`;
  return { ...j, ok: r.ok, status: r.status };
}
const mailto = (to, s, b) => `mailto:${to}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`;
const STEP_LABEL = { plan: 'Planning the searches…', search: 'Searching the web…', verify: 'Checking each company’s own website…', qualify: 'Scoring how well each company fits…' };
const NEXT = { planned: 'search', searched: 'verify', verified: 'qualify' };
const CRIT = { industry: ['Industry match', 2], location: ['Location match', 2], size: ['Company size', 1], signal: ['Buying signal', 1], contact: ['Public contact found', 1] };
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function Leads() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [list, setList] = useState([]);
  const [active, setActive] = useState(null);
  const [leads, setLeads] = useState([]);
  const [view, setView] = useState('intro'); // intro | form | campaign
  const [f, setF] = useState(BLANK);
  const [strategies, setStrategies] = useState([]);
  const [sel, setSel] = useState([]);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [step, setStep] = useState('');
  const [flt, setFlt] = useState('all');
  const [err, setErr] = useState('');

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase.from('profiles').select('plan_credits,topup_credits').eq('id', uid).single();
    if (data) setCredits(data.plan_credits + data.topup_credits);
  }, []);
  const loadList = useCallback(async () => {
    const { data } = await supabase.from('campaigns').select('id,name,updated_at').order('updated_at', { ascending: false });
    setList(data || []);
  }, []);
  const loadLeads = useCallback(async (id) => {
    const { data } = await supabase.from('leads').select('*').eq('campaign_id', id).order('fit_score', { ascending: false }).order('created_at', { ascending: true });
    setLeads(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');
      setUser(user); loadProfile(user.id); loadList();
      const { data } = await supabase.from('strategies').select('id,title,brief').not('brief', 'is', null);
      setStrategies(data || []);
    })();
  }, []);

  async function open(id) {
    const { data } = await supabase.from('campaigns').select('*').eq('id', id).single();
    if (!data) return;
    setActive(data); setView('campaign'); setSel([]); setErr(''); setMsg(''); setMenu(false);
    loadLeads(id);
  }
  async function remove(c) {
    if (!window.confirm(`Delete "${c.name}" with all its leads and drafts?`)) return;
    await supabase.from('campaigns').delete().eq('id', c.id);
    if (active?.id === c.id) { setActive(null); setView('intro'); }
    loadList();
  }

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  function prefill(id) {
    const s = strategies.find((x) => x.id === id);
    if (!s) return setF((x) => ({ ...x, strategyId: '' }));
    const b = s.brief || {};
    setF((x) => ({
      ...x, strategyId: id, name: x.name || `${b.brand_name || s.title} outreach`, offer: x.offer || [b.offer, b.differentiators].filter(Boolean).join('. '),
      senderCompany: x.senderCompany || b.brand_name || '', language: x.language === 'English' && b.languages?.[0] ? b.languages[0] : x.language,
      locations: x.locations || b.market || '', tone: TONES.includes(b.voice) ? b.voice : x.tone,
    }));
  }
  async function create() {
    setBusy('create'); setErr('');
    const j = await api('/api/leads/campaign', f);
    setBusy('');
    if (!j.ok) return setErr(j.error || 'Something went wrong.');
    setF(BLANK); await loadList(); await open(j.id);
  }

  async function findLeads() {
    setBusy('find'); setErr(''); setMsg('');
    const ls = active.last_search;
    let cur = ls?.paid && !ls.done ? NEXT[ls.stage] || 'plan' : 'plan'; // resume where it stopped, with no extra charge
    let final = null;
    while (cur) {
      setStep(cur);
      const j = await api('/api/leads/search', { campaignId: active.id, step: cur });
      if (!j.ok) { setErr(j.error === 'insufficient_credits' ? `Not enough credits. A search costs ${LEAD_SEARCH_COST}.` : j.error); break; }
      if (cur === 'qualify') { final = j; break; }
      cur = NEXT[j.stage];
    }
    setBusy(''); setStep('');
    const { data } = await supabase.from('campaigns').select('*').eq('id', active.id).single();
    if (data) setActive(data);
    loadProfile(user.id); loadLeads(active.id); loadList();
    if (final?.refunded) setMsg('No qualified companies matched this profile. Your credits were refunded. Try broader locations or industries.');
    else if (final) setMsg(`Added ${final.inserted} qualified companies (${final.verified} with a verified website). Review them below.`);
  }
  async function setQuality(l, quality) {
    const q = l.quality === quality ? 0 : quality;
    setLeads((a) => a.map((x) => (x.id === l.id ? { ...x, quality: q } : x)));
    await supabase.from('leads').update({ quality: q }).eq('id', l.id);
  }

  async function writeEmails(ids) {
    if (!ids.length) return;
    setBusy('write'); setErr(''); setMsg('');
    let done = 0;
    for (let i = 0; i < ids.length; i += 3) {
      const j = await api('/api/leads/write', { campaignId: active.id, leadIds: ids.slice(i, i + 3) });
      if (!j.ok) { setErr(j.error === 'insufficient_credits' ? 'Not enough credits for the rest.' : j.error); break; }
      done += j.drafted.length;
      await loadLeads(active.id);
    }
    setBusy(''); loadProfile(user.id);
    if (done) setMsg(`Wrote personalized emails for ${done} lead${done > 1 ? 's' : ''}.`);
  }

  async function setStatus(l, status) {
    setLeads((a) => a.map((x) => (x.id === l.id ? { ...x, status } : x)));
    await supabase.from('leads').update({ status }).eq('id', l.id);
  }
  async function saveNotes(l, notes) {
    if (notes === l.notes) return;
    setLeads((a) => a.map((x) => (x.id === l.id ? { ...x, notes } : x)));
    await supabase.from('leads').update({ notes }).eq('id', l.id);
  }
  async function dropLead(l) {
    if (!window.confirm(`Remove ${l.name}?`)) return;
    await supabase.from('leads').delete().eq('id', l.id);
    setLeads((a) => a.filter((x) => x.id !== l.id));
  }
  function exportCSV() {
    const cell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const head = ['Company', 'Website', 'Location', 'Email', 'Phone', 'Fit', 'Status', 'Subject 1', 'Body 1', 'Subject 2', 'Body 2', 'Subject 3', 'Body 3', 'DM'];
    const rows = leads.map((l) => { const e = l.drafts?.emails || []; return [l.name, l.website, l.location, l.channels?.email, l.channels?.phone, l.fit_score, l.status, e[0]?.subject, e[0]?.body, e[1]?.subject, e[1]?.body, e[2]?.subject, e[2]?.body, l.drafts?.dm]; });
    const blob = new Blob(['\ufeff' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${active.name.replace(/\W+/g, '-')}-leads.csv`; a.click();
  }
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const shown = leads.filter((l) => (flt === 'email' ? l.channels?.email : flt === 'top' ? l.fit_score >= 4 : flt === 'open' ? ['new', 'drafted'].includes(l.status) : true));
  const needDraft = leads.filter((l) => !l.drafts).map((l) => l.id);

  return (
    <div className="app">
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <aside className={'side glass' + (menu ? ' open' : '')}>
        <div className="logo">🎯 Leads & campaigns</div>
        <button className="btn primary" onClick={() => { setView('form'); setMenu(false); setErr(''); }}>＋ New campaign</button>
        <Link href="/studio" className="btn">← Back to studio</Link>
        <div className="hist">
          {list.map((c) => (
            <div key={c.id} className={'row' + (c.id === active?.id && view === 'campaign' ? ' act' : '')}>
              <button className="t" onClick={() => open(c.id)}>{c.name}</button>
              <span className="acts"><button className="a" aria-label="Delete" onClick={() => remove(c)}>✕</button></span>
            </div>
          ))}
          {!list.length && <div className="muted" style={{ padding: 8, fontSize: 13 }}>No campaigns yet.</div>}
        </div>
        <div className="acct"><b>{credits} credits left</b><span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</span></div>
      </aside>

      <section className="main">
        <div className="ctitle">{view === 'campaign' ? active?.name : 'Leads & campaigns'}</div>
        <div className="topbar"><button className="menu" aria-label="Open menu" onClick={() => setMenu(true)}>☰</button><span className="tt">{view === 'campaign' ? active?.name : 'Leads & campaigns'}</span><span className="pill2">{credits} cr</span></div>
        <div className="sp-scroll"><div className="sp-inner">
          {err && <div className="err" role="alert" style={{ padding: '0 0 12px' }}>{err}</div>}
          {msg && <div className="panel glass" style={{ marginBottom: 12 }}>{msg}</div>}

          {view === 'intro' && (
            <div className="panel glass">
              <h2 style={{ marginTop: 0 }}>Find qualified leads and write personal outreach</h2>
              <p className="muted">Describe what you sell and who you want to reach. Maya searches the public web for matching businesses, scores how well each one fits, and writes a personalized email sequence for every lead. You review everything and send from your own email.</p>
              <button className="btn primary" onClick={() => setView('form')}>Start a campaign</button>
            </div>
          )}

          {view === 'form' && (
            <div className="panel glass">
              <h3 style={{ marginTop: 0 }}>New campaign</h3>
              {strategies.length > 0 && <div style={{ marginBottom: 12 }}><div className="lbl">Prefill from a marketing strategy (optional)</div>
                <select className="sel-s" style={{ maxWidth: '100%' }} value={f.strategyId} onChange={(e) => prefill(e.target.value)}><option value="">None</option>{strategies.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>}
              <div className="lbl">Campaign name</div><input className="field" value={f.name} onChange={set('name')} placeholder="For example: Dubai restaurants, spring offer" />
              <div className="lbl" style={{ marginTop: 12 }}>What are you offering?</div><textarea className="field ta" rows={3} value={f.offer} onChange={set('offer')} placeholder="One or two sentences about your product or service and its main benefit" />
              <div className="lbl" style={{ marginTop: 12 }}>Who do you want to reach?</div><textarea className="field ta" rows={3} value={f.icpDesc} onChange={set('icpDesc')} placeholder="Describe your ideal customer company: what they do, how big they are, what problem they have" />
              <div className="kv2">
                <div><div className="lbl">Industries</div><input className="field" value={f.industries} onChange={set('industries')} placeholder="Restaurants, cafes" /></div>
                <div><div className="lbl">Locations (required)</div><input className="field" value={f.locations} onChange={set('locations')} placeholder="Dubai, Abu Dhabi" /></div>
                <div><div className="lbl">Decision-maker roles</div><input className="field" value={f.roles} onChange={set('roles')} placeholder="Owner, marketing manager" /></div>
                <div><div className="lbl">Company size</div><input className="field" value={f.size} onChange={set('size')} placeholder="5 to 50 employees" /></div>
                <div><div className="lbl">Buying signals to look for</div><input className="field" value={f.signals} onChange={set('signals')} placeholder="New branch, hiring, launching" /></div>
                <div><div className="lbl">Exclude</div><input className="field" value={f.exclusions} onChange={set('exclusions')} placeholder="Big chains, franchises" /></div>
              </div>
              <h4 style={{ margin: '18px 0 6px' }}>Your emails</h4>
              <div className="kv2">
                <div><div className="lbl">Goal of the email</div><input className="field" value={f.goal} onChange={set('goal')} /></div>
                <div><div className="lbl">Language</div><input className="field" value={f.language} onChange={set('language')} placeholder="English, Arabic..." /></div>
                <div><div className="lbl">Tone</div><select className="sel-s" style={{ maxWidth: '100%', width: '100%', borderRadius: 14 }} value={f.tone} onChange={set('tone')}>{TONES.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div><div className="lbl">Your name</div><input className="field" value={f.senderName} onChange={set('senderName')} /></div>
                <div><div className="lbl">Your role</div><input className="field" value={f.senderRole} onChange={set('senderRole')} /></div>
                <div><div className="lbl">Company</div><input className="field" value={f.senderCompany} onChange={set('senderCompany')} /></div>
              </div>
              <div className="rbtns"><button className="btn primary" onClick={create} disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create campaign'}</button></div>
            </div>
          )}

          {view === 'campaign' && active && (
            <div>
              <details className="panel glass" style={{ marginBottom: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Sending responsibly (read this)</summary>
                <ul className="ul2 muted" style={{ marginBottom: 0 }}>
                  <li>These leads come from public web pages and may be incomplete or out of date. Check each one before you contact it.</li>
                  <li>Contact businesses, not private individuals. Only use business contact details that are publicly listed.</li>
                  <li>Say who you are, be honest, and keep the opt-out line. Stop writing to anyone who asks.</li>
                  <li>Rules on unsolicited messages differ by country. You are responsible for following the law where you and your recipients are. We never send emails for you: you send from your own email.</li>
                </ul>
              </details>

              <div className="panel glass" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="btn primary" disabled={!!busy || credits < LEAD_SEARCH_COST} onClick={findLeads}>{active.last_search?.paid && !active.last_search?.done ? 'Resume the search (no extra charge)' : `${leads.length ? 'Find more leads' : 'Find leads'} · ${LEAD_SEARCH_COST} credits`}</button>
                  <button className="btn" disabled={!!busy || !needDraft.length || credits < LEAD_EMAIL_COST} onClick={() => writeEmails(needDraft)}>Write emails for all new · {needDraft.length * LEAD_EMAIL_COST} credits</button>
                  <button className="btn" disabled={!!busy || !sel.length || credits < LEAD_EMAIL_COST} onClick={() => writeEmails(sel)}>Write for selected ({sel.length}) · {sel.length * LEAD_EMAIL_COST} credits</button>
                  <button className="mini" onClick={exportCSV} disabled={!leads.length}>Export CSV</button>
                </div>
                <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>Offer: {active.offer}</p>
              </div>

              {busy === 'find' && <div className="panel glass" style={{ marginBottom: 12 }}><b>{STEP_LABEL[step] || 'Working…'}</b><p className="muted" style={{ fontSize: 14 }}>Planning, searching, checking websites and scoring takes a few minutes. Keep this page open.</p><Game label="Tap the orb while Maya searches" /></div>}
              {busy === 'write' && <div className="panel glass" style={{ marginBottom: 12 }}><b>Writing personalized emails…</b><Game label="Tap the orb while Maya writes" /></div>}

              {!leads.length && !busy && <div className="panel glass muted">No leads yet. Press “Find leads” to search.</div>}
              {leads.length > 0 && <div className="chips2" style={{ marginBottom: 10 }}>{[['all', 'All'], ['email', 'Has email'], ['top', '4 stars and up'], ['open', 'Not contacted yet']].map(([k, label]) => <button key={k} className={'chip' + (flt === k ? ' sel' : '')} onClick={() => setFlt(k)}>{label}</button>)}</div>}
              {shown.map((l) => (
                <div key={l.id} className="panel glass" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <input type="checkbox" aria-label={`Select ${l.name}`} checked={sel.includes(l.id)} onChange={() => toggle(l.id)} style={{ marginTop: 6, width: 18, height: 18 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                        <b style={{ fontSize: 17 }}>{l.website ? <a href={l.website} target="_blank" rel="noreferrer">{l.name}</a> : l.name}</b>
                        <span title="Fit score" style={{ color: '#ffd166' }}>{stars(l.fit_score)}</span>
                        <span className="muted" style={{ fontSize: 13 }}>{[l.category, l.location].filter(Boolean).join(' · ')}</span>
                        <span className="pill">{l.confidence} confidence</span>{l.evidence?.verified && <span className="pill">✓ Website checked</span>}
                      </div>
                      <p style={{ margin: '6px 0' }}>{l.description}</p>
                      <p className="muted" style={{ margin: '0 0 6px' }}><b>Why they fit:</b> {l.why_fit}</p>
                      {l.signals?.length > 0 && <div className="chips2" style={{ margin: '0 0 8px' }}>{l.signals.map((s, i) => <span key={i} className="pill">{s}</span>)}</div>}
                      <div style={{ fontSize: 14 }}>
                        {l.channels?.email && <span>✉ <a href={`mailto:${l.channels.email}`}>{l.channels.email}</a> · </span>}
                        {l.channels?.phone && <span>☎ <a href={`tel:${l.channels.phone.replace(/[^+\d]/g, '')}`}>{l.channels.phone}</a> · </span>}
                        {l.channels?.whatsapp && <span><a href={`https://wa.me/${l.channels.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a> · </span>}
                        {l.channels?.contact_page && <span><a href={l.channels.contact_page} target="_blank" rel="noreferrer">Contact page</a> · </span>}
                        {l.channels?.instagram && <span><a href={l.channels.instagram} target="_blank" rel="noreferrer">Instagram</a> · </span>}
                        {l.channels?.linkedin && <span><a href={l.channels.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></span>}
                        {!Object.keys(l.channels || {}).length && <span className="muted">No public contact details found</span>}
                      </div>
                      {l.source_urls?.length > 0 && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Sources: {l.source_urls.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer">[{i + 1}] </a>)}</div>}

                      {l.drafts?.emails?.length > 0 && (
                        <details style={{ marginTop: 10 }}>
                          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Personalized emails ({l.drafts.emails.length})</summary>
                          {l.drafts.emails.map((e) => (
                            <div key={e.step} className="tbox">
                              <div className="muted" style={{ fontSize: 12 }}>Email {e.step} · send {e.delay_days === 0 ? 'first' : `${e.delay_days} days later`}</div>
                              <div><b>{e.subject}</b></div>
                              <div className="pcap" style={{ margin: '6px 0' }}>{e.body}</div>
                              <div className="rbtns" style={{ padding: 0 }}>
                                <button className="mini" onClick={() => navigator.clipboard.writeText(`Subject: ${e.subject}\n\n${e.body}`)}>Copy</button>
                                {l.channels?.email && <a className="mini" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={mailto(l.channels.email, e.subject, e.body)}>Open in my email app</a>}
                              </div>
                            </div>
                          ))}
                          {l.drafts.dm && <div className="tbox"><div className="muted" style={{ fontSize: 12 }}>Short message (Instagram, LinkedIn or WhatsApp)</div><div className="pcap">{l.drafts.dm}</div><div className="rbtns" style={{ padding: 0 }}><button className="mini" onClick={() => navigator.clipboard.writeText(l.drafts.dm)}>Copy</button></div></div>}
                        </details>
                      )}

                      {l.evidence && (
                        <details style={{ marginTop: 10 }}>
                          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Why this score ({l.evidence.points} of 7 points)</summary>
                          <ul className="ul2">{Object.entries(CRIT).map(([k, [label, max]]) => <li key={k}>{label}: {l.evidence.criteria?.[k] ?? 0} of {max}</li>)}</ul>
                          {l.evidence.facts?.length > 0 && <div className="muted" style={{ fontSize: 13 }}>From their website: {l.evidence.facts.join(' · ')}</div>}
                          {!l.evidence.verified && <div className="muted" style={{ fontSize: 13 }}>Their website could not be opened, so this lead is based on search results only. Check it manually.</div>}
                        </details>
                      )}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
                        <button className={'mini' + (l.quality === 1 ? ' sel' : '')} onClick={() => setQuality(l, 1)}>👍 Good fit</button>
                        <button className={'mini' + (l.quality === -1 ? ' sel' : '')} onClick={() => setQuality(l, -1)}>👎 Not a fit</button>
                        <select className="sel-s" aria-label="Status" value={l.status} onChange={(e) => setStatus(l, e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select>
                        <input className="field" style={{ flex: 1, minWidth: 180, height: 44 }} aria-label="Notes" placeholder="Notes" defaultValue={l.notes} onBlur={(e) => saveNotes(l, e.target.value)} />
                        {!l.drafts && <button className="mini" disabled={!!busy} onClick={() => writeEmails([l.id])}>Write emails · {LEAD_EMAIL_COST} cr</button>}
                        <button className="mini" onClick={() => dropLead(l)}>Remove</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div></div>
      </section>
    </div>
  );
}
