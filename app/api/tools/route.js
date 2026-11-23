import { admin, envOk, fal, getUser, limited, tooMany } from '../../../lib/server';
import { MODELS, estUSD } from '../../../lib/models';

const TOOLS = { rembg: 'tool_rembg', captions: 'tool_captions' };

// Runs a one-click studio tool on an uploaded file or on one of the user's results.
export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing in .env.local.' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'tool', 30, 600)) return tooMany();

  const { tool, bucket, path, conversationId, label } = await req.json();
  const key = TOOLS[tool];
  const m = MODELS[key];
  if (!m) return Response.json({ error: 'Unknown tool.' }, { status: 400 });
  const b = bucket === 'outputs' ? 'outputs' : 'references';
  if (!path || !String(path).startsWith(user.id + '/')) return Response.json({ error: 'Invalid file.' }, { status: 400 });

  const { data: signed } = await admin.storage.from(b).createSignedUrl(path, 3600);
  if (!signed?.signedUrl) return Response.json({ error: 'Could not read the file.' }, { status: 500 });

  const { data: id, error } = await admin.rpc('start_generation', {
    p_user: user.id, p_type: m.type, p_model: m.id, p_prompt: String(label || m.label).slice(0, 200),
    p_params: { model: key, tool, aspect: '', seconds: 0 }, p_ref: b === 'references' ? path : null,
    p_cost: m.cost({}), p_conv: conversationId,
  });
  if (error) {
    const none = error.message.includes('insufficient_credits');
    return Response.json({ error: none ? 'insufficient_credits' : 'Could not start.' }, { status: none ? 402 : 500 });
  }
  try {
    const { request_id } = await fal.queue.submit(m.id, { input: m.input({}, signed.signedUrl) });
    await admin.from('generations').update({ request_id, est_cost_usd: estUSD(key, {}) }).eq('id', id);
    return Response.json({ id });
  } catch (e) {
    await admin.rpc('fail_generation', { p_gen: id, p_error: 'Provider error' }); // refunds credits
    return Response.json({ error: 'The provider rejected the file. Credits were refunded.' }, { status: 502 });
  }
}
