import { admin, envOk, getUser, limited, tooMany } from '../../../../lib/server';
import { claude, claudeJSON, llmReady } from '../../../../lib/anthropic';
import { RESEARCH_SEARCH_SYSTEM, RESEARCH_REPORT_SYSTEM } from '../../../../lib/strategist';
import { RESEARCH_COST } from '../../../../lib/config';
import { briefOK } from '../../../../lib/brief';

export const maxDuration = 60;
const save = (id, research) => admin.from('strategies').update({ research, updated_at: new Date().toISOString() }).eq('id', id);

export async function POST(req) {
  if (!envOk() || !llmReady()) return Response.json({ error: 'Server keys are missing (add OPENROUTER_API_KEY or ANTHROPIC_API_KEY).' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'research', 4, 3600)) return tooMany();

  const { strategyId, step } = await req.json();
  const { data: s } = await admin.from('strategies').select('*').eq('id', strategyId).eq('user_id', user.id).single();
  if (!s || !briefOK(s.brief)) return Response.json({ error: 'Finish the interview first.' }, { status: 400 });
  let r = s.research || null;

  // ---- Step 1: live web search (credits are charged here) ----
  if (step === 'search') {
    if (r?.notes) return Response.json({ research: r });
    let spent;
    if (r?.paid) {
      spent = { plan: r.from_plan, topup: r.from_topup }; // an earlier attempt crashed after charging
    } else {
      const { data, error } = await admin.rpc('spend_credits', { p_user: user.id, p_amount: RESEARCH_COST, p_reason: 'research', p_ref: s.id });
      if (error) {
        const none = error.message.includes('insufficient_credits');
        return Response.json({ error: none ? 'insufficient_credits' : 'Could not start.' }, { status: none ? 402 : 500 });
      }
      spent = data;
      r = { paid: true, from_plan: spent.plan, from_topup: spent.topup };
      await save(s.id, r);
    }
    try {
      const j = await claude({
        model: 'claude-haiku-5-5', system: RESEARCH_SEARCH_SYSTEM, web: true, max_tokens: 2200, timeoutMs: 50000,
        messages: [{ role: 'user', content: JSON.stringify({ brief: s.brief }) }],
      });
      const notes = j.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      if (notes.length < 200) throw new Error('the search returned too little');
      const seen = new Set();
      const sources = (j.sources || []).filter((x) => x.url && !seen.has(x.url) && seen.add(x.url)).slice(0, 12);
      r = { ...r, notes, sources };
      await save(s.id, r);
      return Response.json({ research: r });
    } catch (e) {
      console.error('research search failed:', e);
      await admin.rpc('refund_credits', { p_user: user.id, p_plan: spent.plan, p_topup: spent.topup, p_reason: 'research_refund', p_ref: s.id });
      await save(s.id, null);
      return Response.json({ error: `Research failed (${String(e.message).slice(0, 140)}). Your credits were refunded.` }, { status: 502 });
    }
  }

  // ---- Step 2: turn the notes into a report (already paid, safe to retry) ----
  if (step === 'report') {
    if (!r?.notes) return Response.json({ error: 'Run the search first.' }, { status: 400 });
    if (r.report) return Response.json({ research: r });
    try {
      const report = await claudeJSON({ system: RESEARCH_REPORT_SYSTEM, user: JSON.stringify({ brief: s.brief, notes: r.notes, sources: r.sources }), max_tokens: 2600 });
      r = { ...r, report, at: new Date().toISOString() };
      await save(s.id, r);
      return Response.json({ research: r });
    } catch (e) {
      console.error('research report failed:', e);
      return Response.json({ error: `Report failed (${String(e.message).slice(0, 140)}). Press retry (no extra charge).`, research: r }, { status: 502 });
    }
  }
  return Response.json({ error: 'Invalid step.' }, { status: 400 });
}
