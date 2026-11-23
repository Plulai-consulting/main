// Background job: finishes or refunds unfinished generations even if the user closed the tab.
// Protected by CRON_SECRET. Vercel Cron sends it automatically as "Authorization: Bearer <CRON_SECRET>".
import { admin, envOk } from '../../../lib/server';
import { settle } from '../../../lib/finalize';

export const maxDuration = 60;

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!envOk() || !secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: rows } = await admin.from('generations').select('*')
    .eq('status', 'processing').order('created_at', { ascending: true }).limit(40);
  let changed = 0;
  for (const g of rows || []) {
    const row = await settle(g);
    if (row && row.status !== 'processing') changed++;
  }

  // Retention: delete results older than RETENTION_DAYS (default 90) together with their files
  const days = Math.max(parseInt(process.env.RETENTION_DAYS) || 90, 7);
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();
  const { data: old } = await admin.from('generations').select('id,output_path,reference_path').lt('created_at', cutoff).neq('status', 'processing').limit(50);
  const outs = (old || []).map((g) => g.output_path).filter(Boolean);
  const refs = (old || []).map((g) => g.reference_path).filter(Boolean);
  if (outs.length) await admin.storage.from('outputs').remove(outs);
  if (refs.length) await admin.storage.from('references').remove(refs);
  if (old?.length) await admin.from('generations').delete().in('id', old.map((g) => g.id));

  return Response.json({ checked: rows?.length || 0, finished: changed, purged: old?.length || 0 });
}
