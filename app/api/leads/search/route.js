import { admin, envOk, getUser, limited, tooMany } from '../../../../lib/server';
import { claude, claudeJSON, llmReady, provider } from '../../../../lib/anthropic';
import { PLAN_SYSTEM, SEARCH_SYSTEM, QUALIFY_SYSTEM, domain, isBlocked, lastJSON } from '../../../../lib/leads';
import { siteCheck } from '../../../../lib/netsafe';
import { LEAD_SEARCH_COST } from '../../../../lib/config';

export const maxDuration = 60;
const s2 = (v, n) => String(v || '').slice(0, n);
const num = (v, max) => Math.min(max, Math.max(0, Number(v) || 0));
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

function fallbackQueries(icp) {
  const inds = String(icp.industries || icp.description || '').split(/[,;]/).map((x) => x.trim()).filter(Boolean).slice(0, 2);
  const locs = String(icp.locations || '').split(/[,;]/).map((x) => x.trim()).filter(Boolean).slice(0, 3);
  const out = [];
  for (const i of inds.length ? inds : ['companies']) for (const l of locs.length ? locs : ['']) { out.push(`${i} in ${l}`.trim(), `top ${i} ${l} directory`.trim()); }
  return out.slice(0, 8);
}

export async function POST(req) {
  if (!envOk() || !llmReady()) return Response.json({ error: 'Server keys are missing (add OPENROUTER_API_KEY or ANTHROPIC_API_KEY).' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'leads', 40, 3600)) return tooMany();

  const { campaignId, step } = await req.json();
  const { data: c } = await admin.from('campaigns').select('*').eq('id', campaignId).eq('user_id', user.id).single();
  if (!c) return Response.json({ error: 'Campaign not found.' }, { status: 404 });
  const { data: existing } = await admin.from('leads').select('name,website,category,why_fit,quality').eq('campaign_id', c.id);
  const have = (existing || []).map((l) => domain(l.website)).filter(Boolean);
  const liked = (existing || []).filter((l) => l.quality === 1).slice(0, 5).map((l) => `${l.name} (${l.category || ''})`);
  const disliked = (existing || []).filter((l) => l.quality === -1).slice(0, 5).map((l) => `${l.name} (${l.category || ''})`);
  let r = c.last_search || null;
  const save = (v) => admin.from('campaigns').update({ last_search: v, updated_at: new Date().toISOString() }).eq('id', c.id);
  const ctx = { offer: c.offer, goal: c.goal, ideal_customer: c.icp, language: c.language };
  const refundAll = async (msg) => {
    await admin.rpc('refund_credits', { p_user: user.id, p_plan: r?.from_plan || 0, p_topup: r?.from_topup || 0, p_reason: 'leads_refund', p_ref: c.id });
    await save(null);
    return Response.json({ error: `${msg} Your credits were refunded.` }, { status: 502 });
  };

  // ---- Step 1: plan the searches (credits are charged here) ----
  if (step === 'plan') {
    if (r?.paid && !r.done) return Response.json({ stage: r.stage || 'planned' }); // already started: resume
    const { data: spent, error } = await admin.rpc('spend_credits', { p_user: user.id, p_amount: LEAD_SEARCH_COST, p_reason: 'leads', p_ref: c.id });
    if (error) {
      const none = error.message.includes('insufficient_credits');
      return Response.json({ error: none ? 'insufficient_credits' : 'Could not start.' }, { status: none ? 402 : 500 });
    }
    r = { paid: true, from_plan: spent.plan, from_topup: spent.topup, stage: 'planned' };
    let queries = [];
    try {
      const out = await claudeJSON({ system: PLAN_SYSTEM, user: JSON.stringify({ ...ctx, already_have: have.slice(0, 40), liked, disliked }), max_tokens: 1200, chain: [['claude-haiku-5-5', 25000], ['claude-sonnet-5-5', 25000]] });
      queries = (out.queries || []).map((q) => s2(typeof q === 'string' ? q : q?.q, 160).trim()).filter(Boolean).slice(0, 8);
    } catch (e) { console.error('lead plan failed:', e.message); }
    if (queries.length < 3) queries = fallbackQueries(c.icp);
    r.queries = queries;
    await save(r);
    return Response.json({ stage: 'planned' });
  }

  if (!r?.paid || r.done) return Response.json({ error: 'Start a search first.' }, { status: 400 });

  // ---- Step 2: run many searches in parallel and collect candidate companies ----
  if (step === 'search') {
    if (r.stage !== 'planned') return Response.json({ stage: r.stage });
    try {
      const per = provider() === 'anthropic' ? 2 : 1; // OpenRouter's search plugin runs one search per request
      const groups = chunk(r.queries, per).slice(0, per === 2 ? 4 : 6);
      const system = `${SEARCH_SYSTEM}\nContext: ${JSON.stringify({ ...ctx, already_have: have.slice(0, 40) })}`;
      const done = await Promise.allSettled(groups.map((qs) => claude({ model: 'claude-haiku-5-5', system, web: true, max_tokens: 2000, timeoutMs: 50000, messages: [{ role: 'user', content: `Search the web for: ${qs.join(' ; ')}` }] })));
      const ok = done.filter((d) => d.status === 'fulfilled').map((d) => d.value);
      const seen = new Set(have);
      const candidates = [];
      for (const j of ok) {
        const text = j.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
        for (const x of lastJSON(text)?.companies || []) {
          const d = domain(x.website);
          if (!x.name || !d || isBlocked(d) || seen.has(d)) continue;
          seen.add(d);
          candidates.push({ name: s2(x.name, 120), website: `https://${d}`, location: s2(x.location, 120), what: s2(x.what, 250), signal: s2(x.signal, 200), source_url: /^https?:/i.test(x.source_url) ? s2(x.source_url, 300) : '' });
        }
      }
      if (candidates.length < 3) throw new Error('the web search found too few companies');
      r = { ...r, stage: 'searched', candidates: candidates.slice(0, 24) };
      await save(r);
      return Response.json({ stage: 'searched', found: candidates.length });
    } catch (e) {
      console.error('lead search failed:', e);
      return refundAll(`The search failed (${String(e.message).slice(0, 120)}).`);
    }
  }

  // ---- Step 3: open each company's own website to verify it and read its public contact details ----
  if (step === 'verify') {
    if (r.stage !== 'searched') return Response.json({ stage: r.stage });
    const checked = [];
    for (const batch of chunk(r.candidates || [], 8)) {
      const res = await Promise.all(batch.map(async (x) => ({ ...x, site: await siteCheck(x.website) })));
      checked.push(...res);
    }
    const kept = checked.filter((x) => !x.site.dead); // drop dead and parked domains
    kept.sort((a, b) => Number(b.site.ok) - Number(a.site.ok));
    if (!kept.length) return refundAll('None of the companies found had a working website.');
    r = { ...r, stage: 'verified', checked: kept.slice(0, 20), candidates: undefined };
    await save(r);
    return Response.json({ stage: 'verified', verified: kept.filter((x) => x.site.ok).length });
  }

  // ---- Step 4: score each company against the ideal customer, using what the websites really say ----
  if (step === 'qualify') {
    if (r.stage !== 'verified') return Response.json({ error: 'Run the earlier steps first.' }, { status: 400 });
    const cands = r.checked.slice(0, 16);
    let out;
    try {
      out = await claudeJSON({
        system: QUALIFY_SYSTEM, max_tokens: 3200, chain: [['claude-sonnet-5-5', 38000], ['claude-haiku-5-5', 15000]],
        user: JSON.stringify({
          campaign: ctx, liked, disliked,
          candidates: cands.map((x) => ({ domain: domain(x.website), name: x.name, location: x.location, found_via_search: x.what, signal_from_search: x.signal, website_checked: x.site.ok, site_title: x.site.title || '', site_description: x.site.description || '', site_text: (x.site.text || '').slice(0, 900) })),
        }),
      });
    } catch (e) {
      console.error('lead qualify failed:', e);
      return Response.json({ error: `Scoring failed (${String(e.message).slice(0, 120)}). Press Resume to retry (no extra charge).` }, { status: 502 });
    }
    const byDomain = Object.fromEntries(cands.map((x) => [domain(x.website), x]));
    const rows = [];
    for (const q of out.results || []) {
      const x = byDomain[domain(q.domain)];
      if (!x || q.excluded) continue;
      const cr = { industry: num(q.criteria?.industry, 2), location: num(q.criteria?.location, 2), size: num(q.criteria?.size, 1), signal: num(q.criteria?.signal, 1) };
      if (cr.industry < 1 || cr.location < 1) continue; // must match both the industry and the place
      const s = x.site;
      const contactable = !!(s.emails?.length || s.phones?.length || s.whatsapp || s.contact_page);
      const pts = cr.industry + cr.location + cr.size + cr.signal + (contactable ? 1 : 0);
      let score = Math.min(5, Math.max(1, Math.round(1 + (4 * pts) / 7)));
      if (!s.ok) score = Math.min(score, 3); // not verified: cap the score
      if (score < 3) continue;
      const channels = {};
      if (s.emails?.[0]) channels.email = s.emails[0];
      if (s.phones?.[0]) channels.phone = s.phones[0];
      if (s.whatsapp) channels.whatsapp = s.whatsapp;
      if (s.contact_page) channels.contact_page = s.contact_page;
      if (s.instagram) channels.instagram = s.instagram;
      if (s.linkedin) channels.linkedin = s.linkedin;
      rows.push({
        campaign_id: c.id, user_id: user.id, name: s2(x.name, 120), website: x.website, location: s2(x.location, 120), category: s2(q.category, 120),
        description: s2(q.description || s.description || x.what, 300), why_fit: s2(q.why_fit, 400), fit_score: score,
        signals: (Array.isArray(q.signals) ? q.signals : []).map((v) => s2(v, 120)).slice(0, 5), channels,
        source_urls: [x.source_url, x.website].filter(Boolean), confidence: !s.ok ? 'low' : pts >= 5.5 ? 'high' : 'medium',
        evidence: { verified: !!s.ok, criteria: { ...cr, contact: contactable ? 1 : 0 }, points: pts, facts: (Array.isArray(q.facts) ? q.facts : []).map((v) => s2(v, 160)).slice(0, 3), checked_at: new Date().toISOString() },
      });
    }
    rows.sort((a, b) => b.fit_score - a.fit_score || b.evidence.points - a.evidence.points);
    const top = rows.slice(0, 12);
    if (!top.length) return Response.json({ ...(await refundAll('No qualified companies matched.').then((x) => x.json())), inserted: 0, refunded: true });
    await admin.from('leads').insert(top);
    await save({ done: true, at: new Date().toISOString() });
    return Response.json({ inserted: top.length, verified: top.filter((t) => t.evidence.verified).length });
  }
  return Response.json({ error: 'Invalid step.' }, { status: 400 });
}
