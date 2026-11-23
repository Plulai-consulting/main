'use client';
import { useState } from 'react';
import Game from '../components/Game';
import { STRATEGY_COST, RESEARCH_COST, EXTRA_COST, EXTRA_LABEL } from '../../lib/config';

const pretty = (k) => String(k).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
export const toText = (v, ind = '') => {
  if (v == null || v === '') return '';
  if (typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? toText(x, ind) : `${ind}- ${x}`)).join('\n');
  return Object.entries(v).filter(([k]) => k !== 'at').map(([k, x]) => (typeof x === 'object' ? `${ind}${pretty(k)}:\n${toText(x, ind + '  ')}` : `${ind}${pretty(k)}: ${x}`)).join('\n');
};

// Shows any JSON result (ads, emails, research...) as readable blocks
function Tree({ v, label }) {
  if (v == null || v === '' || label === 'at') return null;
  if (typeof v !== 'object') return <div className="tr"><b>{pretty(label)}:</b> <span className="pcap">{String(v)}</span></div>;
  if (Array.isArray(v)) {
    if (!v.length) return null;
    return (
      <div className="tr">{label && <b>{pretty(label)}</b>}
        {v.every((x) => typeof x !== 'object')
          ? <ul className="ul2">{v.map((x, i) => <li key={i}>{x}</li>)}</ul>
          : v.map((x, i) => <div key={i} className="tbox"><Tree v={x} /></div>)}
      </div>
    );
  }
  return <div className="tr">{label && <b>{pretty(label)}</b>}{Object.entries(v).map(([k, x]) => <Tree key={k} v={x} label={k} />)}</div>;
}

function CopyBtn({ text, label = 'Copy' }) {
  const [ok, setOk] = useState(false);
  return <button className="mini" onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>{ok ? 'Copied ✓' : label}</button>;
}

export function ResearchTab({ active, onRun, busy }) {
  const r = active.research;
  if (busy) return <div className="panel glass"><b>Researching the market…</b><p className="muted" style={{ fontSize: 14 }}>Searching the web for your competitors. This takes about a minute. Play while you wait.</p><Game label="Tap the orb while Maya researches" /></div>;
  if (!r?.report) {
    return (
      <div className="panel glass">
        <h3 style={{ marginTop: 0 }}>Competitor research</h3>
        <p className="muted">Maya searches the live web for your competitors and your market, then reports their positioning, strengths and weaknesses, content style, and the gaps you can own. The findings are used when she builds your plan.</p>
        <button className="btn primary" onClick={onRun}>{r?.notes ? 'Finish the report (no extra charge)' : `Research competitors · ${RESEARCH_COST} credits`}</button>
      </div>
    );
  }
  const { summary, ...rest } = r.report;
  return (
    <div>
      <div className="panel glass" style={{ marginBottom: 14 }}><h3 style={{ marginTop: 0 }}>Summary</h3><p style={{ margin: 0 }}>{summary}</p></div>
      <div className="grid-s">
        {Object.entries(rest).map(([k, v]) => <div key={k} className="panel glass"><h3>{pretty(k)}</h3><Tree v={v} /></div>)}
      </div>
      {r.sources?.length > 0 && <div className="panel glass" style={{ marginTop: 14 }}><h3 style={{ marginTop: 0 }}>Sources</h3><ul className="ul2">{r.sources.map((x, i) => <li key={i}><a href={x.url} target="_blank" rel="noreferrer">{x.title || x.url}</a></li>)}</ul></div>}
      <p className="muted" style={{ fontSize: 13 }}>Based on public web pages found at the time of the search. Check important facts before relying on them.</p>
    </div>
  );
}

const EXTRA_INFO = {
  ads: 'Six ads for Meta, TikTok and Google, with audiences and a testing plan.',
  whatsapp: 'Six broadcast messages for the month, plus reply templates for common questions.',
  emails: 'A five-email sequence that turns new contacts into customers.',
  outreach: 'The creators to target, DM and email templates, and a campaign brief.',
};
export function ExtrasTab({ active, run, busy }) {
  const ex = active.extras || {};
  return (
    <div className="grid-s">
      {Object.keys(EXTRA_COST).map((k) => (
        <div key={k} className={'panel glass' + (ex[k] ? ' wide' : '')}>
          <h3 style={{ marginTop: 0 }}>{EXTRA_LABEL[k]}</h3>
          <p className="muted" style={{ marginTop: 0 }}>{EXTRA_INFO[k]}</p>
          <div className="rbtns" style={{ paddingTop: 0 }}>
            <button className="btn primary" disabled={!!busy} onClick={() => run(k)}>{busy === k ? 'Writing…' : `${ex[k] ? 'Write again' : 'Write it'} · ${EXTRA_COST[k]} credits`}</button>
            {ex[k] && <CopyBtn text={toText(ex[k])} label="Copy all" />}
          </div>
          {ex[k] && <div style={{ marginTop: 12 }}><Tree v={ex[k]} /></div>}
        </div>
      ))}
    </div>
  );
}

export function ReviewTab({ active, onSubmit, busy }) {
  const kp = active.plan?.overview?.kpis || [];
  const [rows, setRows] = useState(kp.map((k) => ({ metric: k.metric, target: k.target, actual: '' })));
  const [worked, setWorked] = useState('');
  const [didnt, setDidnt] = useState('');
  const [notes, setNotes] = useState('');
  if (!active.plan?.overview) return <div className="panel glass muted">Build the plan first, then come back after the month to review the results.</div>;
  return (
    <div className="panel glass">
      <h3 style={{ marginTop: 0 }}>Monthly review</h3>
      <p className="muted">Enter what really happened. Maya studies it and builds Month {(active.month || 1) + 1}: more of what worked, fixes for what did not, and no repeated hooks. The next plan is built for {STRATEGY_COST} credits when you press Build.</p>
      {rows.map((r, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div>{r.metric} <span className="muted">· target: {r.target}</span></div>
          <input className="field" aria-label={`Result for ${r.metric}`} placeholder="Your actual result" value={r.actual} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, actual: e.target.value } : x)))} />
        </div>
      ))}
      <div className="lbl">What worked (best posts, offers, channels)</div>
      <textarea className="field ta" rows={3} value={worked} onChange={(e) => setWorked(e.target.value)} />
      <div className="lbl" style={{ marginTop: 12 }}>What did not work</div>
      <textarea className="field ta" rows={3} value={didnt} onChange={(e) => setDidnt(e.target.value)} />
      <div className="lbl" style={{ marginTop: 12 }}>Anything else (new offers, events, feedback)</div>
      <textarea className="field ta" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="rbtns"><button className="btn primary" disabled={busy} onClick={() => onSubmit({ kpis: rows, worked, didnt, notes })}>{busy ? 'Creating…' : `Create Month ${(active.month || 1) + 1} plan`}</button></div>
    </div>
  );
}

export function ChildReady({ active, onBuild, credits, busy }) {
  const rv = active.review || {};
  return (
    <div className="panel glass">
      <h3 style={{ marginTop: 0 }}>{active.title}</h3>
      <p className="muted">Maya will use your review to build this month. Your brief and research carry over.</p>
      {(rv.kpis || []).filter((k) => k.actual).map((k, i) => <div key={i}>{k.metric}: <b>{k.actual}</b> <span className="muted">(target {k.target})</span></div>)}
      {rv.worked && <p><b>Worked:</b> {rv.worked}</p>}
      {rv.didnt && <p><b>Did not work:</b> {rv.didnt}</p>}
      {rv.notes && <p><b>Notes:</b> {rv.notes}</p>}
      <div className="rbtns"><button className="btn primary" onClick={onBuild} disabled={busy || credits < STRATEGY_COST}>Build Month {active.month} · {STRATEGY_COST} credits</button></div>
    </div>
  );
}

const OBJ_LABEL = { awareness: 'Awareness', trust: 'Trust', convert: 'Convert' };

export function Post({ p, asText, tags, onVisual }) {
  const [copied, setCopied] = useState(false);
  return (
    <details className="pcard glass">
      <summary>
        <b>Day {p.day}</b><span className="pill">{p.channel}</span><span className="pill">{p.format}</span>
        {p.objective && <span className="pill">{OBJ_LABEL[p.objective] || p.objective}</span>}
        <span className="hk">{p.hook}</span>
      </summary>
      <div className="pbody">
        {p.series && <div className="muted">Series: {p.series}</div>}
        <div className="pcap">{p.caption}</div>
        <div className="muted">{tags(p).join(' ')}</div>
        {p.script?.length > 0 && <div><b>Video script</b><ol className="ol2">{p.script.map((x, i) => <li key={i}>{x}</li>)}</ol></div>}
        {p.slides?.length > 0 && <div><b>Slides</b><ol className="ol2">{p.slides.map((x, i) => <li key={i}>{x}</li>)}</ol></div>}
        <div><b>CTA:</b> {p.cta} <span className="muted">· Best time: {p.best_time}</span></div>
        {p.engagement && <div className="muted"><b>Engagement:</b> {p.engagement}</div>}
        <div className="muted"><b>Visual ({p.visual?.type}, {p.visual?.aspect}):</b> {p.visual?.prompt}</div>
        {p.visual?.note && <div className="muted"><b>Note:</b> {p.visual.note}</div>}
        <div className="rbtns" style={{ paddingTop: 4 }}>
          <button className="mini" onClick={() => { navigator.clipboard.writeText(asText(p)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied ✓' : 'Copy post'}</button>
          <button className="mini" onClick={() => onVisual(p)}>Create the {p.visual?.type}</button>
        </div>
      </div>
    </details>
  );
}

export function StrategyView({ o }) {
  const has = (v) => Array.isArray(v) && v.length > 0;
  return (
    <div className="grid-s">
      <div className="panel glass wide"><h3>Summary</h3><p>{o.summary}</p><p className="muted"><b>Positioning:</b> {o.positioning}</p></div>
      {o.review_insights && <div className="panel glass wide"><h3>What the review changed</h3>
        <p style={{ margin: '0 0 8px' }}><b>Focus:</b> {o.review_insights.focus}</p>
        <div className="funnel"><div><b>Worked</b><ul className="ul2">{(o.review_insights.what_worked || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div><div><b>Changing</b><ul className="ul2">{(o.review_insights.what_to_change || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div></div>
      </div>}
      {o.big_idea?.name && <div className="panel glass wide"><h3>Big idea · {o.big_idea.name}</h3><p style={{ margin: 0 }}>{o.big_idea.concept}</p></div>}
      <div className="panel glass"><h3>Audience insights</h3>
        <ul>{(o.audience_insights || []).map((x, i) => <li key={i}>{typeof x === 'string' ? x : <span>{x.insight}<br /><span className="muted">→ {x.so_what}</span></span>}</li>)}</ul>
      </div>
      <div className="panel glass"><h3>Content pillars</h3>
        {(o.pillars || []).map((p, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{p.name}</b><span className="muted">{p.share_percent}%</span></div>
            <div className="bar"><i style={{ width: p.share_percent + '%' }} /></div>
            <div className="muted" style={{ fontSize: 13 }}>{p.purpose}</div>
            {has(p.example_ideas) && <div className="muted" style={{ fontSize: 13 }}>Ideas: {p.example_ideas.join(' · ')}</div>}
          </div>
        ))}
      </div>
      <div className="panel glass"><h3>Weekly themes</h3>
        {(o.weekly_themes || []).map((w) => <div key={w.week} style={{ marginBottom: 10 }}><b>Week {w.week}: {w.theme}</b><div className="muted" style={{ fontSize: 13 }}>{w.goal}{w.key_message ? ` · Message: ${w.key_message}` : ''}</div></div>)}
      </div>
      <div className="panel glass"><h3>Channels</h3>
        {(o.channels || []).map((c, i) => <div key={i} style={{ marginBottom: 10 }}><b>{c.name}</b> <span className="muted">· {c.frequency}</span><div className="muted" style={{ fontSize: 13 }}>{c.role} {c.content_mix ? `Mix: ${c.content_mix}. ` : ''}Best times: {c.best_times}</div></div>)}
        {!has(o.channels) && <div className="muted">No channels were generated.</div>}
      </div>
      {has(o.funnel) && <div className="panel glass wide"><h3>Funnel</h3>
        <div className="funnel">{o.funnel.map((f, i) => <div key={i}><b>{f.stage}</b><div className="muted" style={{ fontSize: 13 }}>{f.goal}</div><div style={{ fontSize: 13, marginTop: 4 }}>{f.content_types}</div><div style={{ fontSize: 13, marginTop: 4, color: '#9be7ff' }}>CTA: {f.cta}</div></div>)}</div>
      </div>}
      {has(o.content_series) && <div className="panel glass"><h3>Content series</h3>
        {o.content_series.map((c, i) => <div key={i} style={{ marginBottom: 10 }}><b>{c.name}</b> <span className="muted">· {c.format}, {c.frequency}</span><div className="muted" style={{ fontSize: 13 }}>{c.description}</div></div>)}
      </div>}
      <div className="panel glass"><h3>KPIs</h3>
        {(o.kpis || []).map((k, i) => <div key={i} style={{ marginBottom: 12 }}><div>{k.metric}</div><b style={{ color: '#9be7ff' }}>{k.target}</b>{k.baseline ? <span className="muted"> · now: {k.baseline}</span> : null}{k.how_to_measure ? <div className="muted" style={{ fontSize: 13 }}>{k.how_to_measure}</div> : null}</div>)}
      </div>
      {o.voice_guide && <div className="panel glass"><h3>Voice guide</h3>
        {has(o.voice_guide.tone_words) && <p style={{ margin: '0 0 8px' }}><b>Tone:</b> {o.voice_guide.tone_words.join(', ')}</p>}
        {has(o.voice_guide.do) && <><b>Do</b><ul>{o.voice_guide.do.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
        {has(o.voice_guide.dont) && <><b>Don’t</b><ul>{o.voice_guide.dont.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
        {has(o.voice_guide.sample_captions) && <><b>Sample lines</b><ul>{o.voice_guide.sample_captions.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
      </div>}
      <div className="panel glass"><h3>Content rules</h3><ul>{(o.content_rules || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      {has(o.regional_moments) && <div className="panel glass"><h3>Key dates</h3>
        {o.regional_moments.map((r, i) => <div key={i} style={{ marginBottom: 10 }}><b>{r.moment}</b> <span className="muted">· {r.when}</span><div className="muted" style={{ fontSize: 13 }}>{r.idea}</div></div>)}
      </div>}
      <div className="panel glass"><h3>Risks</h3><ul>{(o.risks || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      {has(o.assumptions) && <div className="panel glass wide"><h3>Assumptions to confirm</h3><ul>{o.assumptions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
    </div>
  );
}
