import { admin, envOk, getAdmin } from '../../../../lib/server';

const RETAIL = 0.03;                     // assumed price per credit, for the profit estimate
const LLM = { strategy: 0.22, research: 0.10, extra: 0.05 }; // rough API cost per run (USD)
const SPEND = (r) => /^(generation|refund|strategy|strategy_refund|research|research_refund|extra_|leads|lead_emails)/.test(r);

export async function GET(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  if (!(await getAdmin(req))) return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const days = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get('days')) || 30, 1), 365);
  const { data: o, error } = await admin.rpc('admin_overview', { p_days: days });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: al } = await admin.from('app_settings').select('value').eq('key', 'provider_alert').maybeSingle();
  const by = o.by_reason || [];
  const net = (re) => by.filter((r) => re.test(r.reason));
  const credits = -by.filter((r) => SPEND(r.reason)).reduce((a, r) => a + Number(r.credits), 0);
  const runs = (a, b) => Math.max(0, (net(a).reduce((x, r) => x + Number(r.n), 0)) - (net(b).reduce((x, r) => x + Number(r.n), 0)));
  const llm = runs(/^strategy$/, /^strategy_refund$/) * LLM.strategy + runs(/^research$/, /^research_refund$/) * LLM.research + runs(/^extra_(ads|whatsapp|emails|outreach)$/, /^extra_refund$/) * LLM.extra;
  const emailCredits = -by.filter((r) => /^lead_emails(_refund)?$/.test(r.reason)).reduce((a, r) => a + Number(r.credits), 0);
  const llm2 = runs(/^leads$/, /^leads_refund$/) * 0.35 + (emailCredits / 3) * 0.015;
  const revenue = credits * RETAIL;
  const cost = Number(o.gen_cost_usd) + llm + llm2;
  return Response.json({ alert: al?.value || null, days, ...o, credits_spent: credits, revenue_equiv: revenue, llm_cost: llm, total_cost: cost, margin: revenue > 0 ? (revenue - cost) / revenue : null, retail_per_credit: RETAIL });
}

export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  if (!(await getAdmin(req))) return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const { action } = await req.json();
  if (action === 'clear_alert') await admin.from('app_settings').delete().eq('key', 'provider_alert');
  return Response.json({ ok: true });
}
