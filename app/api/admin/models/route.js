import { admin, envOk, getAdmin } from '../../../../lib/server';
import { MODELS } from '../../../../lib/models';

export async function GET(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  if (!(await getAdmin(req))) return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const { data } = await admin.from('app_settings').select('key,value').in('key', ['disabled_models', 'model_health']);
  const get = (k) => data?.find((x) => x.key === k)?.value;
  const models = Object.entries(MODELS).filter(([, m]) => !m.hidden).map(([key, m]) => ({ key, label: m.label, type: m.type }));
  return Response.json({ models, disabled: get('disabled_models') || [], health: get('model_health') || null });
}

export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  if (!(await getAdmin(req))) return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const { key, disabled } = await req.json();
  if (!MODELS[key]) return Response.json({ error: 'Unknown model.' }, { status: 400 });
  const { data } = await admin.from('app_settings').select('value').eq('key', 'disabled_models').maybeSingle();
  const set = new Set(data?.value || []);
  disabled ? set.add(key) : set.delete(key);
  await admin.from('app_settings').upsert({ key: 'disabled_models', value: [...set] });
  return Response.json({ disabled: [...set] });
}
