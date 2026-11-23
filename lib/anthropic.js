// Server-only: one helper for Claude, through Anthropic directly OR through OpenRouter.
// Switch with LLM_PROVIDER=anthropic|openrouter (default: anthropic if ANTHROPIC_API_KEY is set, else openrouter).
// Always returns Anthropic-style blocks: { content: [{type:'text',text}, {type:'tool_use',name,input}] }.
import { admin } from './server';

// Turns provider billing problems into a friendly message for users and an alert for the admin.
async function providerError(status, message, prov) {
  const msg = String(message || 'request failed');
  if (status === 402 || /credit balance|insufficient credits|exceeds your available credits|maximum cost exceeds|payment required|add credits/i.test(msg)) {
    try { await admin.from('app_settings').upsert({ key: 'provider_alert', value: { at: new Date().toISOString(), provider: prov, message: msg.slice(0, 300) } }); } catch {}
    const e = new Error('the AI service is temporarily unavailable');
    e.code = 'PROVIDER_CREDITS';
    e.raw = msg; // the real provider message (admin only)
    return e;
  }
  return new Error(msg);
}

const OR_MODELS = { 'claude-haiku-5-5': 'anthropic/claude-haiku-5.5', 'claude-sonnet-5-5': 'anthropic/claude-sonnet-5.5' };

export const provider = () => {
  const p = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (p === 'openrouter' || p === 'anthropic') return p;
  return process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openrouter';
};
export const llmReady = () =>
  provider() === 'anthropic' ? !!process.env.ANTHROPIC_API_KEY : !!process.env.OPENROUTER_API_KEY;

export async function claude({ model, system, messages, max_tokens = 1000, tools, web = false, timeoutMs = 55000 }) {
  const signal = AbortSignal.timeout(timeoutMs);

  if (provider() === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens, system, messages, ...(web ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] } : tools ? { tools } : {}) }),
      signal,
    });
    const j = await r.json();
    if (!r.ok) throw await providerError(r.status, j.error?.message || 'Claude request failed', 'anthropic');
    j.sources = (j.content || []).filter((b) => b.type === 'web_search_tool_result' && Array.isArray(b.content)).flatMap((b) => b.content.map((c) => ({ title: c.title, url: c.url })));
    return j;
  }

  // OpenRouter: OpenAI-compatible format, converted back to Anthropic-style blocks
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Pllulai Studio' },
    body: JSON.stringify({
      model: OR_MODELS[model] || model, max_tokens,
      messages: [{ role: 'system', content: system }, ...messages],
      ...(web ? { plugins: [{ id: 'web', max_results: 6 }] } : {}),
      ...(tools ? { tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })) } : {}),
    }),
    signal,
  });
  const j = await r.json();
  if (!r.ok || !j.choices) throw await providerError(r.status, j.error?.message || 'OpenRouter request failed', 'openrouter');
  const msg = j.choices[0].message || {};
  const content = [];
  if (msg.content) content.push({ type: 'text', text: typeof msg.content === 'string' ? msg.content : msg.content.map((c) => c.text || '').join('') });
  for (const tc of msg.tool_calls || []) {
    let input = {};
    try { input = JSON.parse(tc.function.arguments || '{}'); } catch {}
    content.push({ type: 'tool_use', name: tc.function.name, input });
  }
  const sources = (msg.annotations || []).filter((a) => a.type === 'url_citation').map((a) => ({ title: a.url_citation?.title, url: a.url_citation?.url }));
  return { content, stop: j.choices[0].finish_reason, sources };
}

function parseJSON(text) {
  const t = text.replace(/```json|```/g, '');
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in the answer');
  try { return JSON.parse(m[0]); }
  catch { return JSON.parse(m[0].replace(/,\s*([}\]])/g, '$1')); } // remove trailing commas
}

// Asks for JSON only. Tries the strong model first, then a faster one, so a step rarely fails.
// Total time stays under 55s (Vercel limit is 60s).
const CHAIN = [['claude-sonnet-5-5', 36000], ['claude-haiku-5-5', 17000]];
export async function claudeJSON({ system, user, max_tokens, chain = CHAIN }) {
  let lastErr;
  for (const [model, timeoutMs] of chain) {
    try {
      const j = await claude({ model, system, max_tokens, timeoutMs, messages: [{ role: 'user', content: user }] });
      const stop = j.stop_reason || j.stop;
      if (stop === 'max_tokens' || stop === 'length') throw new Error('the answer was cut off');
      return parseJSON(j.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
    } catch (e) {
      lastErr = e;
      console.error(`claudeJSON with ${model} failed:`, e.message);
    }
  }
  throw lastErr;
}
