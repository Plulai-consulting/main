import { admin, envOk, fal, getUser, limited, tooMany } from '../../../lib/server';
import { MODELS, COUNTS, endpointOf, estUSD } from '../../../lib/models';
import { screenPrompt } from '../../../lib/safety';
import { enhancePrompt } from '../../../lib/enhance';
import { STYLES } from '../../../lib/styles';

export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing in .env.local. Check all 4 values, then restart npm run dev.' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'gen', 20, 600)) return tooMany();

  const { type, prompt, params = {}, refPath, refBucket, conversationId } = await req.json();
  const m0 = MODELS[params.model];
  const m = m0 && m0.type === type && !m0.hidden ? m0 : null;
  const p = { prompt: String(prompt || '').trim(), aspect: params.aspect, seconds: Number(params.seconds) || 5, res: params.res };
  if (!m || !p.prompt || p.prompt.length > 2000) return Response.json({ error: 'Invalid prompt.' }, { status: 400 });
  const { data: st } = await admin.from('app_settings').select('value').eq('key', 'disabled_models').maybeSingle();
  if (st?.value?.includes?.(params.model)) return Response.json({ error: 'This model is temporarily unavailable. Please pick another one.' }, { status: 400 });
  if (!m.aspects.includes(p.aspect)) return Response.json({ error: 'Unsupported size.' }, { status: 400 });
  if (m.durations && !m.durations.includes(p.seconds)) return Response.json({ error: 'Unsupported length.' }, { status: 400 });
  const verdict = await screenPrompt(p.prompt);
  if (!verdict.ok) {
    await admin.from('moderation_log').insert({ user_id: user.id, source: 'generate', excerpt: p.prompt.slice(0, 300), reason: verdict.reason });
    return Response.json({ error: 'This request goes against our acceptable use policy. Please try a different idea.' }, { status: 400 });
  }
  p.res = m.resolutions ? (m.resolutions.includes(p.res) ? p.res : m.resolutions[0]) : undefined;
  const count = COUNTS[type].includes(Number(params.count)) ? Number(params.count) : 1;

  // Reference image (optional): must live in the user's own folder
  const bucketName = refBucket === 'outputs' ? 'outputs' : 'references';
  let refUrl = null;
  if (refPath && m.refId) {
    if (!refPath.startsWith(user.id + '/')) return Response.json({ error: 'Invalid reference.' }, { status: 400 });
    const { data } = await admin.storage.from(bucketName).createSignedUrl(refPath, 3600);
    refUrl = data?.signedUrl || null;
  }
  const endpoint = endpointOf(m, p.res, !!refUrl);

  // Style preset + prompt booster (tuned per model)
  const style = STYLES[params.style] ? params.style : null;
  const base = style ? `${p.prompt}. Style: ${STYLES[style].text}` : p.prompt;
  const used = params.enhance === false ? base
    : await enhancePrompt(base, { type, model: params.model, hasRef: !!refUrl, aspect: p.aspect, seconds: p.seconds });
  const enhanced = used !== p.prompt ? used : null;

  // One job per variation: each charges credits and appears as its own result
  const batch = crypto.randomUUID();
  const ids = [];
  for (let k = 0; k < count; k++) {
    const { data: id, error } = await admin.rpc('start_generation', {
      p_user: user.id, p_type: type, p_model: endpoint, p_prompt: p.prompt,
      p_params: { aspect: p.aspect, seconds: p.seconds, model: params.model, res: p.res, style, enhanced, batch, variation: k + 1, of: count },
      p_ref: refUrl && bucketName === 'references' ? refPath : null, p_cost: m.cost(p), p_conv: conversationId,
    });
    if (error) {
      if (ids.length) break; // later variations ran out of credits: keep the ones already started
      const none = error.message.includes('insufficient_credits');
      const badConv = error.message.includes('bad_conversation');
      return Response.json({ error: none ? 'insufficient_credits' : badConv ? 'Conversation not found.' : 'Could not start.' }, { status: none ? 402 : badConv ? 400 : 500 });
    }
    try {
      const { request_id } = await fal.queue.submit(endpoint, { input: m.input({ ...p, prompt: used }, refUrl) });
      await admin.from('generations').update({ request_id, est_cost_usd: estUSD(params.model, p) }).eq('id', id);
      ids.push(id);
    } catch (e) {
      await admin.rpc('fail_generation', { p_gen: id, p_error: 'Provider error' }); // refunds credits
      if (!ids.length) return Response.json({ error: 'The provider rejected the request. Credits were refunded.' }, { status: 502 });
      break;
    }
  }
  return Response.json({ id: ids[0], ids, started: ids.length, wanted: count });
}
