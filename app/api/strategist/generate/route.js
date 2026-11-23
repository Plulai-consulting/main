import { admin, envOk, getUser, limited, tooMany } from '../../../../lib/server';
import { claudeJSON, llmReady } from '../../../../lib/anthropic';
import { OVERVIEW_SYSTEM, OVERVIEW2_SYSTEM, OVERVIEW3_SYSTEM, WEEK_SYSTEM, weekRange } from '../../../../lib/strategist';
import { STRATEGY_COST } from '../../../../lib/config';
import { briefOK } from '../../../../lib/brief';
import { TEMPLATE_PROMPTS } from '../../../../lib/template-prompts';

export const maxDuration = 60;
const STEPS = ['overview', 'overview2', 'overview3', ...[1, 2, 3, 4].flatMap((w) => [1, 2, 3].map((p) => `w${w}p${p}`))];
const ASPECTS = ['1:1', '9:16', '16:9', '4:3'];
const OBJ = ['awareness', 'trust', 'convert'];
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const save = (id, patch) => admin.from('strategies').update({ ...patch, updated_at: now() }).eq('id', id);
const list = (v, n) => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, n) : []);

function clean(p, a, b) {
  const v = p.visual || {};
  return {
    day: Math.min(b, Math.max(a, parseInt(p.day) || a)),
    channel: String(p.channel || ''), format: String(p.format || ''), pillar: String(p.pillar || ''),
    objective: OBJ.includes(p.objective) ? p.objective : 'awareness', series: String(p.series || ''),
    hook: String(p.hook || ''), caption: String(p.caption || ''), cta: String(p.cta || ''), best_time: String(p.best_time || ''),
    hashtags: list(p.hashtags, 10), script: list(p.script, 6), slides: list(p.slides, 7), engagement: String(p.engagement || ''),
    visual: {
      type: v.type === 'video' ? 'video' : 'image', aspect: ASPECTS.includes(v.aspect) ? v.aspect : '1:1',
      prompt: String(v.prompt || ''), note: String(v.note || ''),
    },
  };
}

// Splits N posts per week into 3 short parts, e.g. 5 -> [2,2,1]
const sizes = (N) => [0, 1, 2].map((i) => Math.floor(N / 3) + (i < N % 3 ? 1 : 0));

export async function POST(req) {
  if (!envOk() || !llmReady()) return Response.json({ error: 'Server keys are missing (add OPENROUTER_API_KEY or ANTHROPIC_API_KEY in .env.local).' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'strat', 80, 600)) return tooMany();

  const { strategyId, step } = await req.json();
  const { data: s } = await admin.from('strategies').select('*').eq('id', strategyId).eq('user_id', user.id).single();
  if (!s || !briefOK(s.brief)) return Response.json({ error: 'The brief is incomplete. Tell Maya a few more details, or rebuild the brief from the conversation.' }, { status: 400 });
  const plan = s.plan || { overview: null, weeks: {}, done: {} };
  const ctx = { brief: s.brief, today: today() };
  if (TEMPLATE_PROMPTS[s.template]) ctx.industry_notes = TEMPLATE_PROMPTS[s.template].plan;
  const rr = s.research?.report;
  if (rr) ctx.research = { gaps_and_opportunities: rr.gaps_and_opportunities, angles_to_own: rr.angles_to_own, market_trends: rr.market_trends, keywords_hashtags: rr.keywords_hashtags, what_to_avoid: rr.what_to_avoid };
  if (s.parent_id && s.review) {
    const { data: parent } = await admin.from('strategies').select('plan').eq('id', s.parent_id).eq('user_id', user.id).single();
    const po = parent?.plan?.overview;
    if (po) {
      ctx.review = s.review;
      ctx.month = s.month;
      ctx.previous = {
        summary: po.summary, big_idea: po.big_idea, pillars: (po.pillars || []).map((p) => `${p.name} ${p.share_percent}%`), kpis: po.kpis,
        hooks: Object.values(parent.plan.weeks || {}).flat().map((p) => p.hook).filter(Boolean),
      };
    }
  }
  const stepFailed = (e, name) => {
    console.error(`strategy ${name} failed:`, e);
    return Response.json({ error: `Step failed (${String(e.message).slice(0, 140)}). Press Resume to retry (no extra charge).`, plan, status: s.status }, { status: 502 });
  };

  // ---- Step 1: first part of the overview (credits are charged here) ----
  if (step === 'overview') {
    if (plan.done?.overview) return Response.json({ plan, status: s.status });
    let spent;
    if (s.status === 'building' && s.cost_credits > 0) {
      spent = { plan: s.from_plan, topup: s.from_topup }; // an earlier attempt crashed after charging: do not charge again
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
      const overview = await claudeJSON({ system: OVERVIEW_SYSTEM, user: JSON.stringify(ctx), max_tokens: 2400 });
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

  // ---- Steps 2 and 3: the rest of the overview (already paid, safe to retry) ----
  if (step === 'overview2' || step === 'overview3') {
    if (!plan.overview) return Response.json({ error: 'Invalid step.' }, { status: 400 });
    if (plan.done?.[step]) return Response.json({ plan, status: s.status });
    const legacy = step === 'overview2' ? plan.overview.channels : plan.overview.content_rules; // strategies built before the split
    if (legacy) {
      const next = { ...plan, done: { ...plan.done, [step]: true } };
      await save(s.id, { plan: next });
      return Response.json({ plan: next, status: s.status });
    }
    try {
      const out = await claudeJSON({
        system: step === 'overview2' ? OVERVIEW2_SYSTEM : OVERVIEW3_SYSTEM, max_tokens: 2400,
        user: JSON.stringify({ ...ctx, overview: plan.overview }),
      });
      const next = { ...plan, overview: { ...plan.overview, ...out }, done: { ...plan.done, [step]: true } };
      await save(s.id, { plan: next });
      return Response.json({ plan: next, status: s.status });
    } catch (e) { return stepFailed(e, step); }
  }

  // ---- Steps 4-15: three short calls per week (already paid, safe to retry) ----
  const m = /^w([1-4])p([1-3])$/.exec(step || '');
  if (!m || !plan.overview || !['building', 'done'].includes(s.status)) return Response.json({ error: 'Invalid step.' }, { status: 400 });
  if (plan.done?.[step]) return Response.json({ plan, status: s.status });

  const week = +m[1], part = +m[2];
  const N = Math.min(7, Math.max(3, parseInt(s.brief.posts_per_week) || 5));
  const n = sizes(N)[part - 1];
  const existing = plan.weeks?.[week] || [];
  const [a, b] = weekRange(week);
  const finish = async (weeks, doneKey) => {
    const next = { ...plan, weeks, done: { ...plan.done, [doneKey]: true } };
    const all = STEPS.every((k) => next.done[k]);
    await save(s.id, { plan: next, status: all ? 'done' : 'building' });
    return Response.json({ plan: next, status: all ? 'done' : 'building' });
  };
  if (existing.length >= N) return finish(plan.weeks || {}, step); // older strategies already have this week's posts
  try {
    const out = await claudeJSON({
      system: WEEK_SYSTEM, max_tokens: 2600,
      user: JSON.stringify({
        ...ctx, overview: plan.overview, week,
        theme: plan.overview.weekly_themes?.find((x) => x.week === week) || null,
        day_range: [a, b], posts_to_write: n,
        already_written_this_week: existing.map((p) => ({ day: p.day, channel: p.channel, hook: p.hook })),
      }),
    });
    const posts = (out.posts || []).slice(0, n).map((p) => clean(p, a, b));
    return finish({ ...plan.weeks, [week]: [...existing, ...posts].sort((x, y) => x.day - y.day) }, step);
  } catch (e) { return stepFailed(e, step); }
}
