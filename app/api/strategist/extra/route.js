import { admin, envOk, getUser, limited, tooMany } from '../../../../lib/server';
import { claudeJSON, llmReady } from '../../../../lib/anthropic';
import { EXTRA_PROMPTS } from '../../../../lib/strategist';
import { EXTRA_COST } from '../../../../lib/config';
import { briefOK } from '../../../../lib/brief';
import { TEMPLATE_PROMPTS } from '../../../../lib/template-prompts';

export const maxDuration = 60;

export async function POST(req) {
  if (!envOk() || !llmReady()) return Response.json({ error: 'Server keys are missing (add OPENROUTER_API_KEY or ANTHROPIC_API_KEY).' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'extra', 12, 3600)) return tooMany();

  const { strategyId, kind } = await req.json();
  if (!EXTRA_PROMPTS[kind]) return Response.json({ error: 'Unknown content type.' }, { status: 400 });
  const { data: s } = await admin.from('strategies').select('*').eq('id', strategyId).eq('user_id', user.id).single();
  if (!s || !briefOK(s.brief)) return Response.json({ error: 'Finish the interview first.' }, { status: 400 });

  const { data: spent, error } = await admin.rpc('spend_credits', { p_user: user.id, p_amount: EXTRA_COST[kind], p_reason: 'extra_' + kind, p_ref: s.id });
  if (error) {
    const none = error.message.includes('insufficient_credits');
    return Response.json({ error: none ? 'insufficient_credits' : 'Could not start.' }, { status: none ? 402 : 500 });
  }
  try {
    const o = s.plan?.overview;
    const ctx = {
      brief: s.brief,
      strategy: o ? { summary: o.summary, positioning: o.positioning, big_idea: o.big_idea, pillars: o.pillars, weekly_themes: o.weekly_themes, content_series: o.content_series, funnel: o.funnel, voice_guide: o.voice_guide } : null,
      research: s.research?.report ? { gaps_and_opportunities: s.research.report.gaps_and_opportunities, angles_to_own: s.research.report.angles_to_own } : null,
      industry_notes: TEMPLATE_PROMPTS[s.template]?.plan || null,
    };
    const out = await claudeJSON({ system: EXTRA_PROMPTS[kind], user: JSON.stringify(ctx), max_tokens: 3000 });
    const extras = { ...(s.extras || {}), [kind]: { ...out, at: new Date().toISOString() } };
    await admin.from('strategies').update({ extras, updated_at: new Date().toISOString() }).eq('id', s.id);
    return Response.json({ extras });
  } catch (e) {
    console.error('extra failed:', kind, e);
    await admin.rpc('refund_credits', { p_user: user.id, p_plan: spent.plan, p_topup: spent.topup, p_reason: 'extra_refund', p_ref: s.id });
    return Response.json({ error: `Could not write it (${String(e.message).slice(0, 140)}). Your credits were refunded.` }, { status: 502 });
  }
}
