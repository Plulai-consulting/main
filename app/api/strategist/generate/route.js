import { admin, envOk, getUser } from '../../../../lib/server';
import { claudeJSON, llmReady } from '../../../../lib/anthropic';
import { OVERVIEW_SYSTEM, OVERVIEW2_SYSTEM, WEEK_SYSTEM, weekRange } from '../../../../lib/strategist';
import { STRATEGY_COST } from '../../../../lib/config';

export const maxDuration = 60;
const STEPS = ['overview', 'overview2', ...[1, 2, 3, 4].flatMap((w) => [`w${w}p1`, `w${w}p2`])];
const ASPECTS = ['1:1', '9:16', '16:9', '4:3'];
const now = () => new Date().toISOString();
const save = (id, patch) => admin.from('strategies').update({ ...patch, updated_at: now() }).eq('id', id);

function clean(p, a, b) {
  const v = p.visual || {};
  const day = Math.min(b, Math.max(a, parseInt(p.day) || a));
  return {
    day, channel: String(p.channel || ''), format: String(p.format || ''), pillar: String(p.pillar || ''),
    hook: String(p.hook || ''), caption: String(p.caption || ''), cta: String(p.cta || ''), best_time: String(p.best_time || ''),
    hashtags: (Array.isArray(p.hashtags) ? p.hashtags : []).map(String).slice(0, 10),
    visual: {
      type: v.type === 'video' ? 'video' : 'image', aspect: ASPECTS.includes(v.aspect) ? v.aspect : '1:1',
      prompt: String(v.prompt || ''), note: String(v.note || ''),
    },
  };
}

export async function POST(req) {
  if (!envOk() || !llmReady()) return Response.json({ error: 'Server keys are missing (add OPENROUTER_API_KEY or ANTHROPIC_API_KEY in .env.local).' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const { strategyId, step } = await req.json();
  const { data: s } = await admin.from('strategies').select('*').eq('id', strategyId).eq('user_id', user.id).single();
  if (!s || !s.brief) return Response.json({ error: 'Finish the interview first.' }, { status: 400 });
  const plan = s.plan || { overview: null, weeks: {}, done: {} };

  // ---- Step 1: first half of the overview (credits are charged here) ----
  if (step === 'overview') {
    if (plan.done?.overview) return Response.json({ plan, status: s.status });

    let spent;
    if (s.status === 'building' && s.cost_credits > 0) {
      spent = { plan: s.from_plan, topup: s.from_topup }; // earlier attempt crashed after charging: do not charge again
    } else {
      const { data: claimed } = await admin.from('strategies').update({ status: 'building' })
        .eq('id', s.id).in('status', ['ready', 'failed']).select().single();
      if (!claimed) return Response.json({ error: 'This strategy is not ready to build.' }, { status: 409 });
      const { data, error } = await admin.rpc('spend_credits', { p_user: user.id, p_amount: STRATEGY_COST, p_reason: 'strategy', p_ref: s.id });
      if (error) {
        await admin.from('strategies').update({ status: 'ready' }).eq('id', s.id);
        const none = error.message.includes('insufficient_credits');
        return Response.json({ error: none ? 'insufficient_credits' : 'Could not start.' }, { status: none ? 402 : 500 });
      }
      spent = data;
      await save(s.id, { cost_credits: STRATEGY_COST, from_plan: spent.plan, from_topup: spent.topup });
    }
    try {
      const overview = await claudeJSON({ system: OVERVIEW_SYSTEM, user: JSON.stringify({ brief: s.brief }), max_tokens: 2000 });
      const next = { overview, weeks: {}, done: { overview: true } };
      await save(s.id, { plan: next, status: 'building' });
      return Response.json({ plan: next, status: 'building' });
    } catch (e) {
      console.error('strategy overview failed:', e);
      await admin.rpc('refund_credits', { p_user: user.id, p_plan: spent.plan, p_topup: spent.topup, p_reason: 'strategy_refund', p_ref: s.id });
      await save(s.id, { status: 'ready', cost_credits: 0, from_plan: 0, from_topup: 0 });
      return Response.json({ error: `Could not build the strategy (${String(e.message).slice(0, 140)}). Your credits were refunded.` }, { status: 502 });
    }
  }

  // ---- Step 2: second half of the overview (already paid, safe to retry) ----
  if (step === 'overview2') {
    if (!plan.overview) return Response.json({ error: 'Invalid step.' }, { status: 400 });
    if (plan.done?.overview2) return Response.json({ plan, status: s.status });
    if (plan.overview.channels) { // strategies built before this split already have it
      const next = { ...plan, done: { ...plan.done, overview2: true } };
      await save(s.id, { plan: next });
      return Response.json({ plan: next, status: s.status });
    }
    try {
      const out = await claudeJSON({ system: OVERVIEW2_SYSTEM, user: JSON.stringify({ brief: s.brief, overview: plan.overview }), max_tokens: 1800 });
      const next = {
        ...plan,
        overview: { ...plan.overview, channels: out.channels || [], kpis: out.kpis || [], content_rules: out.content_rules || [], risks: out.risks || [] },
        done: { ...plan.done, overview2: true },
      };
      await save(s.id, { plan: next });
      return Response.json({ plan: next, status: s.status });
    } catch (e) {
      console.error('strategy overview2 failed:', e);
      return Response.json({ error: `Step failed (${String(e.message).slice(0, 140)}). Press Resume to retry (no extra charge).`, plan, status: s.status }, { status: 502 });
    }
  }

  // ---- Steps 3-10: two short calls per week (already paid, safe to retry) ----
  const m = /^w([1-4])p([12])$/.exec(step || '');
  if (!m || !plan.overview || !['building', 'done'].includes(s.status)) return Response.json({ error: 'Invalid step.' }, { status: 400 });
  if (plan.done?.[step]) return Response.json({ plan, status: s.status });

  const week = +m[1], part = +m[2];
  const N = Math.min(7, Math.max(3, parseInt(s.brief.posts_per_week) || 5));
  const n1 = Math.ceil(N / 2);
  const n = part === 1 ? n1 : N - n1;
  const existing = plan.weeks?.[week] || [];
  const [a, b] = weekRange(week);
  try {
    const out = await claudeJSON({
      system: WEEK_SYSTEM, max_tokens: 2600,
      user: JSON.stringify({
        brief: s.brief, overview: plan.overview, week,
        theme: plan.overview.weekly_themes?.find((x) => x.week === week) || null,
        day_range: [a, b], posts_to_write: n,
        already_written_this_week: existing.map((p) => ({ day: p.day, channel: p.channel, hook: p.hook })),
      }),
    });
    const posts = (out.posts || []).slice(0, n).map((p) => clean(p, a, b));
    const next = { ...plan, weeks: { ...plan.weeks, [week]: [...existing, ...posts].sort((x, y) => x.day - y.day) }, done: { ...plan.done, [step]: true } };
    const all = STEPS.every((k) => next.done[k]);
    await save(s.id, { plan: next, status: all ? 'done' : 'building' });
    return Response.json({ plan: next, status: all ? 'done' : 'building' });
  } catch (e) {
    console.error('strategy step failed:', step, e);
    return Response.json({ error: `Step failed (${String(e.message).slice(0, 140)}). Press Resume to retry (no extra charge).`, plan, status: s.status }, { status: 502 });
  }
}
