// Server-only: one helper for Claude, through Anthropic directly OR through OpenRouter.
// Switch with LLM_PROVIDER=anthropic|openrouter (default: anthropic if ANTHROPIC_API_KEY is set, else openrouter).
// Always returns Anthropic-style blocks: { content: [{type:'text',text}, {type:'tool_use',name,input}] }.
const OR_MODELS = { 'claude-haiku-5-5': 'anthropic/claude-haiku-5.5', 'claude-sonnet-5-5': 'anthropic/claude-sonnet-5.5' };

export const provider = () => {
  const p = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (p === 'openrouter' || p === 'anthropic') return p;
  return process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openrouter';
};
export const llmReady = () =>
  provider() === 'anthropic' ? !!process.env.ANTHROPIC_API_KEY : !!process.env.OPENROUTER_API_KEY;

export async function claude({ model, system, messages, max_tokens = 1000, tools, timeoutMs = 55000 }) {
  const signal = AbortSignal.timeout(timeoutMs);

  if (provider() === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens, system, messages, ...(tools ? { tools } : {}) }),
      signal,
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || 'Claude request failed');
    return j;
  }

  // OpenRouter: OpenAI-compatible format, converted back to Anthropic-style blocks
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Pllulai Studio' },
    body: JSON.stringify({
      model: OR_MODELS[model] || model, max_tokens,
      messages: [{ role: 'system', content: system }, ...messages],
      ...(tools ? { tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })) } : {}),
    }),
    signal,
  });
  const j = await r.json();
  if (!r.ok || !j.choices) throw new Error(j.error?.message || 'OpenRouter request failed');
  const msg = j.choices[0].message || {};
  const content = [];
  if (msg.content) content.push({ type: 'text', text: typeof msg.content === 'string' ? msg.content : msg.content.map((c) => c.text || '').join('') });
  for (const tc of msg.tool_calls || []) {
    let input = {};
    try { input = JSON.parse(tc.function.arguments || '{}'); } catch {}
    content.push({ type: 'tool_use', name: tc.function.name, input });
  }
  return { content, stop: j.choices[0].finish_reason };
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
