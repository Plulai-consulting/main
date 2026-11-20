import { admin, envOk, getUser } from '../../../lib/server';
import { settle } from '../../../lib/finalize';

export async function GET(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing in .env.local.' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');

  const { data: g } = await admin.from('generations').select('*').eq('id', id).eq('user_id', user.id).single();
  if (!g) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(await settle(g));
}
