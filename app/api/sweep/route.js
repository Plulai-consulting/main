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
  return Response.json({ checked: rows?.length || 0, finished: changed });
}
