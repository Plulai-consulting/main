import { admin, envOk, fal, getUser, limited, tooMany } from '../../../lib/server';
import { MODELS, estUSD } from '../../../lib/models';

export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing in .env.local. Check all 4 values, then restart npm run dev.' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'tool', 30, 600)) return tooMany();

  const { generationId } = await req.json();
  const { data: src } = await admin.from('generations').select('*').eq('id', generationId).eq('user_id', user.id).single();
  if (!src || src.status !== 'done' || !src.output_path || src.params?.upscale) {
    return Response.json({ error: 'Nothing to upscale.' }, { status: 400 });
  }
  const key = src.type === 'image' ? 'upscale_image' : 'upscale_video';
  const m = MODELS[key];
  const p = { seconds: Number(src.params?.seconds) || 5 };

  const { data: signed } = await admin.storage.from('outputs').createSignedUrl(src.output_path, 3600);
  if (!signed?.signedUrl) return Response.json({ error: 'Could not read the file.' }, { status: 500 });

  const { data: id, error } = await admin.rpc('start_generation', {
    p_user: user.id, p_type: src.type, p_model: m.id, p_prompt: `Upscale: ${src.prompt}`.slice(0, 200),
    p_params: { aspect: src.params?.aspect, seconds: p.seconds, model: key, upscale: true, source: src.id },
    p_ref: null, p_cost: m.cost(p), p_conv: src.conversation_id,
  });
  if (error) {
    const none = error.message.includes('insufficient_credits');
    return Response.json({ error: none ? 'insufficient_credits' : 'Could not start.' }, { status: none ? 402 : 500 });
  }
  try {
    const { request_id } = await fal.queue.submit(m.id, { input: m.input(p, signed.signedUrl) });
    await admin.from('generations').update({ request_id, est_cost_usd: estUSD(key, p) }).eq('id', id);
    return Response.json({ id });
  } catch (e) {
    await admin.rpc('fail_generation', { p_gen: id, p_error: 'Provider error' }); // refunds credits
    return Response.json({ error: 'The provider rejected the request. Credits were refunded.' }, { status: 502 });
  }
}
