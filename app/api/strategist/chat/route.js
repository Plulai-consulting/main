import { admin, envOk, getUser, limited, tooMany } from '../../../../lib/server';
import { claude, claudeJSON, llmReady } from '../../../../lib/anthropic';
import { INTERVIEW_SYSTEM, FINISH_TOOL, EXTRACT_SYSTEM } from '../../../../lib/strategist';
import { briefOK } from '../../../../lib/brief';
import { TEMPLATES } from '../../../../lib/templates';
import { TEMPLATE_PROMPTS } from '../../../../lib/template-prompts';

export const maxDuration = 60;

// Builds the brief from the saved conversation (more reliable than trusting a single tool call)
async function extractBrief(msgs) {
  const transcript = msgs.map((m) => `${m.role === 'user' ? 'OWNER' : 'STRATEGIST'}: ${String(m.content).replace(/\n?\s*OPTIONS:.*$/im, '')}`).join('\n\n');
  const b = await claudeJSON({
    system: EXTRACT_SYSTEM, user: transcript, max_tokens: 1500,
    chain: [['claude-haiku-5-5', 20000], ['claude-sonnet-5-5', 25000]],
  });
  b.posts_per_week = Math.min(7, Math.max(3, parseInt(b.posts_per_week) || 5));
  return b;
}

// Sonnet asks the questions (better judgment); Haiku is the fallback
async function interview(msgs, template) {
  const system = INTERVIEW_SYSTEM + (TEMPLATE_PROMPTS[template] ? `\n\nINDUSTRY FOCUS:\n${TEMPLATE_PROMPTS[template].interview}` : '');
  let last;
  for (const [model, timeoutMs] of [['claude-sonnet-5-5', 30000], ['claude-haiku-5-5', 20000]]) {
    try { return await claude({ model, system, messages: msgs, max_tokens: 2500, tools: [FINISH_TOOL], timeoutMs }); }
    catch (e) { last = e; console.error(`interview with ${model} failed:`, e.message); }
  }
  throw last;
}

export async function POST(req) {
  if (!envOk() || !llmReady()) return Response.json({ error: 'Server keys are missing (add OPENROUTER_API_KEY or ANTHROPIC_API_KEY in .env.local).' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await limited(user, 'chat', 40, 600)) return tooMany();

  const { strategyId, text, rebuild, template } = await req.json();
  let s = null;
  if (strategyId) {
    const { data } = await admin.from('strategies').select('*').eq('id', strategyId).eq('user_id', user.id).single();
    s = data;
    if (!s) return Response.json({ error: 'Strategy not found.' }, { status: 404 });
  }

  // ---- Rebuild the brief from the saved conversation ----
  if (rebuild) {
    if (!s || !['interview', 'ready'].includes(s.status)) return Response.json({ error: 'Cannot rebuild this brief.' }, { status: 400 });
    let brief = null;
    try { brief = await extractBrief(s.messages || []); } catch (e) { console.error('extractBrief failed:', e.message); }
    if (!briefOK(brief)) return Response.json({ error: 'I still do not have enough details. Please answer a few more of Maya’s questions.' }, { status: 422 });
    const title = String(brief.brand_name).slice(0, 60);
    await admin.from('strategies').update({ brief, status: 'ready', title, updated_at: new Date().toISOString() }).eq('id', s.id);
    return Response.json({ strategyId: s.id, reply: '', done: true, brief, title });
  }

  const t = String(text || '').trim().slice(0, 2000);
  if (!t) return Response.json({ error: 'Write a message first.' }, { status: 400 });
  if (!s) {
    const { data } = await admin.from('strategies').insert({ user_id: user.id, template: TEMPLATES[template] && template !== 'general' ? template : null }).select().single();
    s = data;
  }
  if (['building', 'done'].includes(s.status)) return Response.json({ error: 'This strategy is already built.' }, { status: 400 });

  const msgs = [...(s.messages || []), { role: 'user', content: t }];
  if (msgs.filter((m) => m.role === 'user').length > 24) return Response.json({ error: 'Interview limit reached. Build the strategy or start a new one.' }, { status: 400 });

  let res;
  try {
    res = await interview(msgs, s.template);
  } catch (e) {
    console.error('strategist chat failed:', e);
    return Response.json({ error: `The strategist is unavailable (${String(e.message).slice(0, 140)}). Try again.` }, { status: 502 });
  }
  let reply = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  const tool = res.content.find((b) => b.type === 'tool_use' && b.name === 'finish_interview');

  // The tool call only says "I'm done". Use its answers if complete, otherwise rebuild them from the conversation.
  let brief = null;
  if (tool) {
    brief = tool.input;
    if (!briefOK(brief)) {
      try { brief = await extractBrief([...msgs, { role: 'assistant', content: reply || 'Interview finished.' }]); }
      catch (e) { console.error('extractBrief failed:', e.message); brief = null; }
    }
    if (!briefOK(brief)) {
      brief = null;
      reply = reply || 'Before I build your plan, could you tell me a bit more about what you sell and who buys it?';
    }
  }
  reply = reply || 'I have what I need.';

  const patch = { messages: [...msgs, { role: 'assistant', content: reply }], updated_at: new Date().toISOString() };
  if (s.title === 'New strategy') patch.title = t.slice(0, 48);
  if (brief) { patch.brief = brief; patch.status = 'ready'; patch.title = String(brief.brand_name || 'New strategy').slice(0, 60); }
  await admin.from('strategies').update(patch).eq('id', s.id);
  return Response.json({ strategyId: s.id, reply, done: !!brief, brief: brief || null, title: patch.title || s.title });
}
