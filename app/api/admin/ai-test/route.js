import { envOk, getAdmin } from '../../../../lib/server';
import { claude, provider, llmReady } from '../../../../lib/anthropic';

export const maxDuration = 60;

// Sends a tiny request to each AI model and reports the provider's real answer. Costs a fraction of a cent.
export async function POST(req) {
  if (!envOk()) return Response.json({ error: 'Server keys are missing.' }, { status: 500 });
  if (!(await getAdmin(req))) return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const out = { provider: provider(), key_present: llmReady(), key_info: null, tests: [] };
  if (!out.key_present) return Response.json(out);

  if (out.provider === 'openrouter') {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }, signal: AbortSignal.timeout(10000) });
      const j = await r.json();
      const d = j.data || {};
      out.key_info = r.ok ? { limit: d.limit, usage: d.usage, limit_remaining: d.limit_remaining, is_free_tier: d.is_free_tier } : { error: j.error?.message || `HTTP ${r.status}` };
    } catch (e) { out.key_info = { error: String(e.message).slice(0, 120) }; }
  }
  for (const model of ['claude-haiku-5-5', 'claude-sonnet-5-5']) {
    const t0 = Date.now();
    try {
      const j = await claude({ model, system: 'Reply with the single word OK.', messages: [{ role: 'user', content: 'ping' }], max_tokens: 10, timeoutMs: 20000 });
      out.tests.push({ model, ok: true, ms: Date.now() - t0, reply: j.content.filter((b) => b.type === 'text').map((b) => b.text).join('').slice(0, 40) });
    } catch (e) { out.tests.push({ model, ok: false, ms: Date.now() - t0, error: String(e.raw || e.message).slice(0, 300) }); }
  }
  return Response.json(out);
}
