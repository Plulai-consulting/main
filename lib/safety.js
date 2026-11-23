// Server-only: screens prompts before any credits are spent.
import { claude, llmReady } from './anthropic';

const MINORS = '(child|children|kid|kids|minor|underage|loli|teen|teenage|schoolgirl|schoolboy|toddler)';
const SEXUAL = '(sexual|sex|sexy|porn|pornographic|erotic|undress|undressed)';
const HARD = new RegExp(`\\b${MINORS}\\b[\\s\\S]{0,60}\\b${SEXUAL}\\b|\\b${SEXUAL}\\b[\\s\\S]{0,60}\\b${MINORS}\\b`, 'i');
const EXPLICIT = /\b(porn|pornographic|nsfw|hentai|xxx|erotic)\b/i; // words like "nude" or "naked" are left to the AI check, because "nude lipstick" and "naked cake" are normal marketing terms

const SAFETY_SYSTEM = `You are a content safety filter for an AI image and video generator that businesses use for marketing. Decide whether the request must be refused.
Refuse: sexual or nude content; any sexual content involving minors; realistic depictions of real, named people (celebrities, politicians, public figures) or deepfakes of real people; graphic violence or gore; content that promotes self-harm, terrorism, hate, illegal drugs or weapons trafficking; fake documents, scams, or deceptive health, financial or legal claims.
Allow normal marketing content (including \"nude\" as a color or style, such as nude lipstick, and \"naked cake\"): products, food, places, fashion, generic people in non-sexual settings, medical education, ordinary business scenes.
Reply with ONLY JSON: {"allowed":true} or {"allowed":false,"reason":"short category"}.`;

export async function screenPrompt(text) {
  const t = String(text || '');
  if (HARD.test(t)) return { ok: false, reason: 'sexual content involving minors' };
  if (EXPLICIT.test(t)) return { ok: false, reason: 'explicit content' };
  if (!llmReady()) return { ok: true };
  try {
    const j = await claude({ model: 'claude-haiku-5-5', system: SAFETY_SYSTEM, messages: [{ role: 'user', content: t.slice(0, 1500) }], max_tokens: 60, timeoutMs: 6000 });
    const out = j.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return { ok: true };
    const v = JSON.parse(m[0]);
    return v.allowed === false ? { ok: false, reason: String(v.reason || 'policy').slice(0, 80) } : { ok: true };
  } catch { return { ok: true }; } // if the check itself fails, do not block normal users
}

const LEAD_SAFETY = `You are a safety filter for a B2B lead research and outreach tool. Refuse the request if it asks to find or contact private individuals' personal data (personal emails, phone numbers, home addresses), minors, people to harass, stalk or pressure, adult services, illegal goods or services, scams, fake offers, or deceptive impersonation. Allow ordinary B2B prospecting of businesses and professionals through public business information. Reply with ONLY JSON: {"allowed":true} or {"allowed":false,"reason":"short category"}.`;

export async function screenLead(text) {
  if (!llmReady()) return { ok: true };
  try {
    const j = await claude({ model: 'claude-haiku-5-5', system: LEAD_SAFETY, messages: [{ role: 'user', content: String(text).slice(0, 2500) }], max_tokens: 60, timeoutMs: 6000 });
    const m = j.content.filter((b) => b.type === 'text').map((b) => b.text).join('').match(/\{[\s\S]*\}/);
    if (!m) return { ok: true };
    const v = JSON.parse(m[0]);
    return v.allowed === false ? { ok: false, reason: String(v.reason || 'policy').slice(0, 80) } : { ok: true };
  } catch { return { ok: true }; }
}
