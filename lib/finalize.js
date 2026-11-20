// Server-only: checks one unfinished generation, saves the result, or refunds it if it failed or timed out.
import { admin, fal } from './server';
import { modelFor } from './models';

const LIMIT_MIN = { image: 10, video: 30 }; // minutes before a job is considered stuck

async function fail(g, msg) {
  await admin.rpc('fail_generation', { p_gen: g.id, p_error: msg }); // refunds credits, safe to call twice
  const { data } = await admin.from('generations').select('*').eq('id', g.id).single();
  return data;
}

export async function settle(g) {
  if (g.status !== 'processing') return g;
  const age = (Date.now() - new Date(g.created_at)) / 60000;
  const limit = LIMIT_MIN[g.type] || 30;

  if (!g.request_id) return age > 2 ? fail(g, 'Could not start') : g;

  let s;
  try { s = await fal.queue.status(g.model, { requestId: g.request_id }); }
  catch { return age > limit ? fail(g, 'Timed out') : g; } // temporary network problem: try again later

  if (s.status === 'COMPLETED') {
    try {
      const { data } = await fal.queue.result(g.model, { requestId: g.request_id });
      const m = modelFor(g.model);
      const url = m.pick(data);
      if (!url) throw new Error('No output');
      const file = await fetch(url); // provider URLs are temporary: copy into our own storage
      const path = `${g.user_id}/${g.id}.${m.ext}`;
      await admin.storage.from('outputs').upload(path, await file.arrayBuffer(), {
        contentType: file.headers.get('content-type') || undefined, upsert: true,
      });
      const { data: row } = await admin.from('generations')
        .update({ status: 'done', output_path: path }).eq('id', g.id).eq('status', 'processing').select().single();
      return row || (await admin.from('generations').select('*').eq('id', g.id).single()).data;
    } catch (e) {
      return fail(g, 'Generation failed');
    }
  }

  if (age > limit) {
    try { await fal.queue.cancel(g.model, { requestId: g.request_id }); } catch {}
    return fail(g, 'Timed out');
  }
  return g;
}
