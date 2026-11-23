import { admin, envOk, getUser, limited, tooMany } from '../../../../lib/server';

const str = (v, n) => String(v || '').slice(0, n);

// Creates "Month N+1" from a finished strategy plus the owner's real results. The build is charged later, when they press Build.
export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'review', 10, 3600)) return tooMany();

  const { strategyId, review = {} } = await req.json();
  const { data: p } = await admin.from('strategies').select('*').eq('id', strategyId).eq('user_id', user.id).single();
  if (!p || !p.plan?.overview) return Response.json({ error: 'Build the strategy first.' }, { status: 400 });

  const clean = {
    kpis: (Array.isArray(review.kpis) ? review.kpis : []).slice(0, 8).map((k) => ({ metric: str(k.metric, 160), target: str(k.target, 160), actual: str(k.actual, 160) })),
    worked: str(review.worked, 2000), didnt: str(review.didnt, 2000), notes: str(review.notes, 2000),
  };
  if (!clean.worked.trim() && !clean.didnt.trim() && !clean.kpis.some((k) => k.actual.trim())) {
    return Response.json({ error: 'Add at least one result or a note about what worked or did not.' }, { status: 400 });
  }
  const month = (p.month || 1) + 1;
  const { data: child, error } = await admin.from('strategies').insert({
    user_id: user.id, title: `${p.title} · Month ${month}`.slice(0, 80), brief: p.brief, template: p.template, research: p.research,
    parent_id: p.id, month, review: clean, status: 'ready', messages: [],
  }).select('id').single();
  if (error) return Response.json({ error: 'Could not create the next month.' }, { status: 500 });
  return Response.json({ id: child.id });
}
