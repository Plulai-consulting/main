import { admin, envOk, getAdmin } from '../../../../lib/server';
import { runHealth } from '../../../../lib/health';

export const maxDuration = 60;

// Free check: compares what our code sends with fal's public schema for every model. No jobs are run.
export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  if (!(await getAdmin(req))) return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const health = await runHealth();
  await admin.from('app_settings').upsert({ key: 'model_health', value: health });
  return Response.json({ health });
}
