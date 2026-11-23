import { admin, envOk, getAdmin } from '../../../../lib/server';

export async function GET(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  if (!(await getAdmin(req))) return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const q = new URL(req.url).searchParams.get('q') || '';
  const { data, error } = await admin.rpc('admin_users', { p_q: q.slice(0, 80) });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ users: data });
}

export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  if (!(await getAdmin(req))) return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const { action, userId, amount, reason } = await req.json();
  if (!userId) return Response.json({ error: 'Missing user.' }, { status: 400 });
  if (action === 'grant') {
    const n = parseInt(amount);
    if (!n || Math.abs(n) > 100000) return Response.json({ error: 'Enter a credit amount (positive to add, negative to remove).' }, { status: 400 });
    const { error } = await admin.rpc('admin_grant', { p_user: userId, p_amount: n, p_reason: String(reason || '').slice(0, 60) });
    return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true });
  }
  if (action === 'ban' || action === 'unban') {
    const { error } = await admin.from('profiles').update({ banned: action === 'ban', banned_reason: action === 'ban' ? String(reason || '').slice(0, 200) : null }).eq('id', userId);
    return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true });
  }
  return Response.json({ error: 'Unknown action.' }, { status: 400 });
}
