import { admin, envOk, getUser } from '../../../../lib/server';
import { claude, llmReady } from '../../../../lib/anthropic';
import { INTERVIEW_SYSTEM, FINISH_TOOL } from '../../../../lib/strategist';

export const maxDuration = 60;

export async function POST(req) {
  if (!envOk() || !llmReady()) return Response.json({ error: 'Server keys are missing (add OPENROUTER_API_KEY or ANTHROPIC_API_KEY in .env.local).' }, { status: 500 });
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const { strategyId, text } = await req.json();
  const t = String(text || '').trim().slice(0, 2000);
  if (!t) return Response.json({ error: 'Write a message first.' }, { status: 400 });

  let s;
  if (strategyId) {
    const { data } = await admin.from('strategies').select('*').eq('id', strategyId).eq('user_id', user.id).single();
    s = data;
    if (!s) return Response.json({ error: 'Strategy not found.' }, { status: 404 });
  } else {
    const { data } = await admin.from('strategies').insert({ user_id: user.id }).select().single();
    s = data;
  }
  if (['building', 'done'].includes(s.status)) return Response.json({ error: 'This strategy is already built.' }, { status: 400 });

  const msgs = [...(s.messages || []), { role: 'user', content: t }];
  if (msgs.filter((m) => m.role === 'user').length > 30) return Response.json({ error: 'Interview limit reached. Build the strategy or start a new one.' }, { status: 400 });

  let res;
  try {
    res = await claude({ model: 'claude-haiku-5-5', system: INTERVIEW_SYSTEM, messages: msgs, max_tokens: 900, tools: [FINISH_TOOL] });
  } catch (e) {
    console.error('strategist chat failed:', e);
    return Response.json({ error: `The strategist is unavailable (${String(e.message).slice(0, 140)}). Try again.` }, { status: 502 });
  }
  const reply = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() || 'I have what I need.';
  const tool = res.content.find((b) => b.type === 'tool_use' && b.name === 'finish_interview');

  const patch = { messages: [...msgs, { role: 'assistant', content: reply }], updated_at: new Date().toISOString() };
  if (s.title === 'New strategy') patch.title = t.slice(0, 48); // name the conversation from the first message
  if (tool) {
    patch.brief = tool.input;
    patch.status = 'ready';
    patch.title = String(tool.input.brand_name || 'New strategy').slice(0, 60);
  }
  await admin.from('strategies').update(patch).eq('id', s.id);
  return Response.json({ strategyId: s.id, reply, done: !!tool, brief: patch.brief || null, title: patch.title || s.title });
}
