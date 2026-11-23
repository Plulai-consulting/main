import { admin, envOk, getUser, limited, tooMany } from '../../../../lib/server';
import { claudeJSON, llmReady } from '../../../../lib/anthropic';
import { EMAIL_SYSTEM } from '../../../../lib/leads';
import { LEAD_EMAIL_COST } from '../../../../lib/config';

export const maxDuration = 60;
const s2 = (v, n) => String(v || '').slice(0, n);

export async function POST(req) {
  if (!envOk() || !llmReady()) return Response.json({ error: 'Server keys are missing (add OPENROUTER_API_KEY or ANTHROPIC_API_KEY).' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'leadmail', 40, 3600)) return tooMany();

  const { campaignId, leadIds } = await req.json();
  const { data: c } = await admin.from('campaigns').select('*').eq('id', campaignId).eq('user_id', user.id).single();
  if (!c) return Response.json({ error: 'Campaign not found.' }, { status: 404 });
  const ids = [...new Set(Array.isArray(leadIds) ? leadIds : [])].slice(0, 3);
  const { data: leads } = ids.length ? await admin.from('leads').select('*').in('id', ids).eq('campaign_id', c.id).eq('user_id', user.id) : { data: [] };
  if (!leads?.length) return Response.json({ error: 'No leads selected.' }, { status: 400 });

  const cost = LEAD_EMAIL_COST * leads.length;
  const { data: spent, error } = await admin.rpc('spend_credits', { p_user: user.id, p_amount: cost, p_reason: 'lead_emails', p_ref: c.id });
  if (error) {
    const none = error.message.includes('insufficient_credits');
    return Response.json({ error: none ? 'insufficient_credits' : 'Could not start.' }, { status: none ? 402 : 500 });
  }
  const refund = (plan, topup) => admin.rpc('refund_credits', { p_user: user.id, p_plan: plan, p_topup: topup, p_reason: 'lead_emails_refund', p_ref: c.id });

  try {
    let brand = null;
    if (c.strategy_id) {
      const { data: s } = await admin.from('strategies').select('brief').eq('id', c.strategy_id).eq('user_id', user.id).single();
      const b = s?.brief || {};
      brand = { brand_name: b.brand_name, differentiators: b.differentiators, proof: b.proof, voice: b.voice, restrictions: b.restrictions, avoid: b.avoid };
    }
    const out = await claudeJSON({
      system: EMAIL_SYSTEM, max_tokens: 3200,
      user: JSON.stringify({
        campaign: { offer: c.offer, goal: c.goal, tone: c.tone, language: c.language, sender: c.sender }, brand,
        leads: leads.map((l) => ({ lead_id: l.id, name: l.name, website: l.website, location: l.location, category: l.category, description: l.description, why_fit: l.why_fit, signals: l.signals, facts: l.evidence?.facts || [] })),
      }),
    });
    const byId = Object.fromEntries((out.results || []).map((r) => [r.lead_id, r]));
    const okIds = [];
    for (const l of leads) {
      const r = byId[l.id];
      const emails = (r?.emails || []).filter((e) => e?.subject && e?.body).slice(0, 3)
        .map((e, i) => ({ step: i + 1, delay_days: Number(e.delay_days) || [0, 3, 7][i] || 7, subject: s2(e.subject, 120), body: s2(e.body, 2500) }));
      if (!emails.length) continue;
      await admin.from('leads').update({ drafts: { emails, dm: s2(r.dm, 400), at: new Date().toISOString() }, status: l.status === 'new' ? 'drafted' : l.status }).eq('id', l.id);
      okIds.push(l.id);
    }
    const missing = leads.length - okIds.length;
    if (missing > 0) await refund(0, missing * LEAD_EMAIL_COST);
    if (!okIds.length) return Response.json({ error: 'The writer returned nothing usable. Your credits were refunded.' }, { status: 502 });
    return Response.json({ drafted: okIds, refunded: missing * LEAD_EMAIL_COST });
  } catch (e) {
    console.error('lead emails failed:', e);
    await refund(spent.plan, spent.topup);
    return Response.json({ error: `Could not write the emails (${String(e.message).slice(0, 140)}). Your credits were refunded.` }, { status: 502 });
  }
}
