import { admin, envOk, getUser, limited, tooMany } from '../../../lib/server';

export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'report', 20, 3600)) return tooMany();
  const { generationId, reason, details } = await req.json();
  const { data: g } = await admin.from('generations').select('id').eq('id', generationId).eq('user_id', user.id).single();
  if (!g) return Response.json({ error: 'Result not found.' }, { status: 404 });
  await admin.from('reports').insert({ user_id: user.id, generation_id: g.id, reason: String(reason || 'Other').slice(0, 100), details: String(details || '').slice(0, 1000) });
  return Response.json({ ok: true });
}
