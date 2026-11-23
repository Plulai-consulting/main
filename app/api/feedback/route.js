import { admin, envOk, getUser, limited, tooMany } from '../../../lib/server';

export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'feedback', 80, 3600)) return tooMany();
  const { kind, refId, rating } = await req.json();
  if (!['generation', 'strategy'].includes(kind) || ![1, -1].includes(rating)) return Response.json({ error: 'Invalid feedback.' }, { status: 400 });
  const table = kind === 'generation' ? 'generations' : 'strategies';
  const { data: row } = await admin.from(table).select('id').eq('id', refId).eq('user_id', user.id).single();
  if (!row) return Response.json({ error: 'Not found.' }, { status: 404 });
  await admin.from('feedback').upsert({ user_id: user.id, kind, ref_id: refId, rating }, { onConflict: 'user_id,kind,ref_id' });
  return Response.json({ ok: true });
}
