'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

async function call(method, url, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { ...j, ok: r.ok, status: r.status };
}
const usd = (n) => '$' + Number(n || 0).toFixed(2);
const STATUS = { ok: '✅ OK', warn: '⚠️ Check', fail: '❌ Problem' };

export default function Admin() {
  const router = useRouter();
  const [tab, setTab] = useState('overview');
  const [denied, setDenied] = useState(false);
  const [err, setErr] = useState('');
  const [days, setDays] = useState(30);
  const [ov, setOv] = useState(null);
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [rep, setRep] = useState(null);
  const [mdl, setMdl] = useState(null);
  const [checking, setChecking] = useState(false);
  const [ai, setAi] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);

  const loadOverview = useCallback(async () => {
    const j = await call('GET', `/api/admin/overview?days=${days}`);
    if (j.status === 403) return setDenied(true);
    if (!j.ok) return setErr(j.error || 'Failed to load.');
    setOv(j);
  }, [days]);
  const loadUsers = useCallback(async () => { const j = await call('GET', '/api/admin/users?q=' + encodeURIComponent(q)); if (j.ok) setUsers(j.users); }, [q]);
  const loadReports = useCallback(async () => { const j = await call('GET', '/api/admin/reports'); if (j.ok) setRep(j); }, []);
  const loadModels = useCallback(async () => { const j = await call('GET', '/api/admin/models'); if (j.ok) setMdl(j); }, []);

  useEffect(() => { (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) router.replace('/login'); })(); }, []);
  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === 'users') loadUsers(); if (tab === 'reports') loadReports(); if (tab === 'models') loadModels(); }, [tab]);

  async function grant(u) {
    const a = window.prompt(`Credits to add to ${u.email} (use a negative number to remove):`, '50');
    if (!a) return;
    const j = await call('POST', '/api/admin/users', { action: 'grant', userId: u.id, amount: a, reason: 'manual' });
    j.ok ? loadUsers() : setErr(j.error);
  }
  async function ban(u, on) {
    const reason = on ? window.prompt('Reason for the ban:', 'Policy violation') : '';
    if (on && !reason) return;
    const j = await call('POST', '/api/admin/users', { action: on ? 'ban' : 'unban', userId: u.id, reason });
    j.ok ? loadUsers() : setErr(j.error);
  }
  async function resolve(id, action) { const j = await call('POST', '/api/admin/reports', { id, action }); j.ok ? loadReports() : setErr(j.error); }
  async function runCheck() {
    setChecking(true); setErr('');
    const j = await call('POST', '/api/admin/health');
    setChecking(false);
    if (!j.ok) return setErr(j.error || 'The check failed.');
    loadModels();
  }
  async function testAI() {
    setAiBusy(true); setAi(null);
    const j = await call('POST', '/api/admin/ai-test');
    setAiBusy(false);
    setAi(j.ok ? j : { error: j.error || 'The test failed.' });
  }
  async function toggle(key, disabled) { const j = await call('POST', '/api/admin/models', { key, disabled }); if (j.ok) setMdl((m) => ({ ...m, disabled: j.disabled })); }

  if (denied) return <div className="center"><div className="card glass"><h2 style={{ margin: 0 }}>Not allowed</h2><p className="muted">This page is for admins. In Supabase, run: <code>update public.profiles set is_admin = true where email = 'your email';</code></p><Link className="btn" href="/studio">Back to studio</Link></div></div>;

  const results = mdl?.health?.results || [];
  return (
    <div className="sp-wrap" style={{ maxWidth: 1100 }}>
      <div className="sp-bar">
        <Link href="/studio" className="btn">← Studio</Link>
        <div className="logo grow">⚙ Admin</div>
        <div className="seg tabs">{['overview', 'users', 'reports', 'models'].map((t) => <button key={t} className={tab === t ? 'sel' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}{t === 'reports' && ov?.open_reports ? ` (${ov.open_reports})` : ''}</button>)}</div>
      </div>
      {err && <div className="err" role="alert" style={{ padding: '0 0 12px' }}>{err}</div>}
      {ov?.alert && <div className="panel glass" role="alert" style={{ marginBottom: 14, borderColor: '#ffb4b4' }}><b>⚠ AI provider billing problem</b> <span className="muted">({ov.alert.provider}, {new Date(ov.alert.at).toLocaleString()})</span><p style={{ margin: '6px 0' }}>{ov.alert.message}</p><p className="muted" style={{ margin: '0 0 8px' }}>Add credits to your {ov.alert.provider} account. Until then, strategies, research, lead search and emails will fail (users are refunded automatically).</p><button className="mini" onClick={async () => { await call('POST', '/api/admin/overview', { action: 'clear_alert' }); loadOverview(); }}>I fixed it, dismiss</button></div>}

      {tab === 'overview' && ov && (
        <div>
          <div className="seg" style={{ width: 'fit-content', marginBottom: 14 }}>{[7, 30, 90].map((d) => <button key={d} className={days === d ? 'sel' : ''} onClick={() => setDays(d)}>{d} days</button>)}</div>
          <div className="grid-s">
            {[
              ['Users', `${ov.users} (${ov.new_users} new)`], ['Generations', `${ov.generations} (${ov.failed} failed)`],
              ['Stuck jobs (30+ min)', ov.stuck], ['Open reports', ov.open_reports], ['Blocked prompts', ov.blocked_prompts],
              ['Feedback', `👍 ${ov.thumbs_up}  👎 ${ov.thumbs_down}`],
              ['Credits spent', Math.round(ov.credits_spent)], [`Revenue equivalent (at ${usd(ov.retail_per_credit)}/credit)`, usd(ov.revenue_equiv)],
              ['Estimated provider cost', usd(ov.total_cost)], ['Estimated margin', ov.margin == null ? '–' : Math.round(ov.margin * 100) + '%'],
            ].map(([k, v]) => <div key={k} className="panel glass"><div className="muted" style={{ fontSize: 13 }}>{k}</div><div style={{ fontSize: 24, fontWeight: 700 }}>{v}</div></div>)}
          </div>
          <p className="muted" style={{ fontSize: 13 }}>No payments are connected yet, so revenue here is the retail value of credits spent. Costs are estimates from model prices. Compare them with your real fal.ai and AI-provider bills.</p>
          <div className="panel glass" style={{ overflowX: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Credit movements by reason</h3>
            <table className="atable"><thead><tr><th>Reason</th><th>Count</th><th>Credits</th></tr></thead><tbody>
              {(ov.by_reason || []).map((r) => <tr key={r.reason}><td>{r.reason}</td><td>{r.n}</td><td>{r.credits}</td></tr>)}
            </tbody></table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="panel glass" style={{ overflowX: 'auto' }}>
          <input className="field" aria-label="Search users" placeholder="Search by email, then press Enter" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadUsers()} />
          <table className="atable" style={{ marginTop: 12 }}><thead><tr><th>Email</th><th>Credits</th><th>Jobs</th><th>Est. cost</th><th>Blocked</th><th>Joined</th><th></th></tr></thead><tbody>
            {users.map((u) => (
              <tr key={u.id}><td>{u.email}{u.banned && <b style={{ color: '#ffb4b4' }}> · banned</b>}</td><td>{u.plan_credits + u.topup_credits}</td><td>{u.gens}</td><td>{usd(u.cost_usd)}</td><td>{u.blocked}</td><td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{ whiteSpace: 'nowrap' }}><button className="mini" onClick={() => grant(u)}>± Credits</button> <button className="mini" onClick={() => ban(u, !u.banned)}>{u.banned ? 'Unban' : 'Ban'}</button></td></tr>
            ))}
          </tbody></table>
        </div>
      )}

      {tab === 'reports' && rep && (
        <div>
          <h3 style={{ margin: '0 0 8px' }}>Open reports</h3>
          {!rep.reports.length && <div className="muted">No open reports.</div>}
          {rep.reports.map((r) => (
            <div key={r.id} className="panel glass" style={{ marginBottom: 12 }}>
              <div><b>{r.reason}</b> <span className="muted">· {r.email} · {new Date(r.created_at).toLocaleString()}</span></div>
              {r.details && <p style={{ margin: '6px 0' }}>{r.details}</p>}
              <p className="muted" style={{ margin: '6px 0' }}>Prompt: {r.generations?.prompt}</p>
              {r.url && <a href={r.url} target="_blank" rel="noreferrer">Open the result</a>}
              <div className="rbtns"><button className="mini" onClick={() => resolve(r.id, 'dismiss')}>Dismiss</button><button className="mini" onClick={() => resolve(r.id, 'remove')}>Remove result</button><button className="mini" onClick={() => resolve(r.id, 'ban')}>Remove + ban user</button></div>
            </div>
          ))}
          <h3 style={{ margin: '20px 0 8px' }}>Recently blocked prompts</h3>
          <div className="panel glass" style={{ overflowX: 'auto' }}><table className="atable"><thead><tr><th>When</th><th>User</th><th>Reason</th><th>Prompt (start)</th></tr></thead><tbody>
            {rep.blocked.map((b) => <tr key={b.id}><td>{new Date(b.created_at).toLocaleString()}</td><td>{b.email}</td><td>{b.reason}</td><td>{b.excerpt}</td></tr>)}
          </tbody></table></div>
        </div>
      )}

      {tab === 'models' && mdl && (
        <div>
          <div className="panel glass" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>AI connection test</h3>
            <p className="muted" style={{ marginTop: 0 }}>Sends a tiny request to each AI model (costs a fraction of a cent) and shows the provider’s real answer. Use it when strategies, research or emails fail.</p>
            <button className="btn primary" onClick={testAI} disabled={aiBusy}>{aiBusy ? 'Testing…' : 'Test the AI connection'}</button>
            {ai?.error && <p className="err" style={{ padding: 0 }}>{ai.error}</p>}
            {ai && !ai.error && (
              <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>
                <div>Provider in use: <b>{ai.provider}</b> · key set: <b>{ai.key_present ? 'yes' : 'NO'}</b></div>
                {ai.key_info && <div>{ai.key_info.error ? <span className="err" style={{ padding: 0 }}>Key check: {ai.key_info.error}</span> : <span>Key limit: <b>{ai.key_info.limit ?? 'none'}</b> · used: <b>{ai.key_info.usage ?? '?'}</b> · remaining: <b>{ai.key_info.limit_remaining ?? 'no limit set'}</b> · free tier: <b>{String(ai.key_info.is_free_tier)}</b></span>}</div>}
                {ai.tests.map((t) => <div key={t.model}>{t.ok ? '✅' : '❌'} {t.model}: {t.ok ? `works (${t.ms} ms)` : <span style={{ color: '#ffb4b4' }}>{t.error}</span>}</div>)}
              </div>
            )}
          </div>
          <div className="panel glass" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>Model health check</h3>
            <p className="muted" style={{ marginTop: 0 }}>Compares what the app sends to each model with fal.ai’s public specification. It is free and runs no jobs. Run it after changing models and before launch. Last run: {mdl.health ? new Date(mdl.health.at).toLocaleString() : 'never'}.</p>
            <button className="btn primary" onClick={runCheck} disabled={checking}>{checking ? 'Checking…' : 'Run health check'}</button>
          </div>
          <div className="panel glass" style={{ overflowX: 'auto', marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>Models shown to users</h3>
            <table className="atable"><thead><tr><th>Model</th><th>Type</th><th>Shown to users</th><th></th></tr></thead><tbody>
              {mdl.models.map((m) => { const off = mdl.disabled.includes(m.key); return <tr key={m.key}><td>{m.label}</td><td>{m.type}</td><td>{off ? 'Hidden' : 'Yes'}</td><td><button className="mini" onClick={() => toggle(m.key, !off)}>{off ? 'Show' : 'Hide'}</button></td></tr>; })}
            </tbody></table>
          </div>
          {results.length > 0 && (
            <div className="panel glass" style={{ overflowX: 'auto' }}>
              <h3 style={{ marginTop: 0 }}>Results</h3>
              <table className="atable"><thead><tr><th>Status</th><th>Model</th><th>Check</th><th>Endpoint</th><th>Notes</th></tr></thead><tbody>
                {[...results].sort((a, b) => ['fail', 'warn', 'ok'].indexOf(a.status) - ['fail', 'warn', 'ok'].indexOf(b.status)).map((r, i) => (
                  <tr key={i}><td>{STATUS[r.status]}</td><td>{r.label}</td><td>{r.kind}</td><td><code>{r.endpoint}</code></td><td>{(r.notes || []).join('; ')}</td></tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
