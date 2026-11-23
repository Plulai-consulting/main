import { admin, envOk, getAdmin } from '../../../../lib/server';

export async function GET(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  if (!(await getAdmin(req))) return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const { data: reports } = await admin.from('reports').select('id,user_id,generation_id,reason,details,status,created_at, generations(prompt,type,output_path)').eq('status', 'open').order('created_at', { ascending: false }).limit(50);
  const { data: blocked } = await admin.from('moderation_log').select('id,user_id,source,excerpt,reason,created_at').order('created_at', { ascending: false }).limit(40);
  const ids = [...new Set([...(reports || []), ...(blocked || [])].map((r) => r.user_id).filter(Boolean))];
  const { data: profs } = ids.length ? await admin.from('profiles').select('id,email').in('id', ids) : { data: [] };
  const email = Object.fromEntries((profs || []).map((p) => [p.id, p.email]));
  const withUrl = await Promise.all((reports || []).map(async (r) => {
    let url = null;
    if (r.generations?.output_path) url = (await admin.storage.from('outputs').createSignedUrl(r.generations.output_path, 3600)).data?.signedUrl || null;
    return { ...r, email: email[r.user_id], url };
  }));
  return Response.json({ reports: withUrl, blocked: (blocked || []).map((b) => ({ ...b, email: email[b.user_id] })) });
}

export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  if (!(await getAdmin(req))) return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const { id, action } = await req.json();
  const { data: r } = await admin.from('reports').select('*, generations(output_path)').eq('id', id).single();
  if (!r) return Response.json({ error: 'Not found.' }, { status: 404 });
  if (action === 'remove' || action === 'ban') {
    const path = r.generations?.output_path;
    if (path) await admin.storage.from('outputs').remove([path]);
    if (r.generation_id) await admin.from('generations').update({ output_path: null, status: 'failed', error: 'Removed for policy reasons' }).eq('id', r.generation_id);
    if (action === 'ban') await admin.from('profiles').update({ banned: true, banned_reason: `Report: ${r.reason}`.slice(0, 200) }).eq('id', r.user_id);
  }
  await admin.from('reports').update({ status: action === 'dismiss' ? 'dismissed' : 'actioned' }).eq('id', id);
  return Response.json({ ok: true });
}
