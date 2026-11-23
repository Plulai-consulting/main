import { claude, llmReady } from './anthropic';
// Prompt booster: rewrites a short idea into a detailed prompt tuned for the chosen model (server-only).
// Needs OPENROUTER_API_KEY or ANTHROPIC_API_KEY. Without one, the original prompt is used unchanged.
const COMMON = `You are an expert prompt writer for AI image and video models. Rewrite the user's idea as ONE detailed prompt in English (translate if needed, but keep any text that must appear in the result exactly as written, in quotes, in its original language). Keep the user's subject, intent and every named detail. Add only what improves the result: concrete specifics, composition, lighting, atmosphere, style. Never add people, brands, logos, watermarks or on-screen text the user did not imply. No lists, no preamble, no quotation marks around the answer: output only the prompt.`;

const VEO = `Target model: Veo (video with native audio). Describe one continuous shot: subject and action, camera movement, setting, lighting, style. Then add the sound: ambient sound, effects, and any spoken line in quotes with who says it. 60 to 110 words. Make the action fit the clip length.`;
const NOTES = {
  gpt_image: `Target model: GPT Image. It follows long, precise instructions and renders text well. Order: subject and action, setting, composition and camera, lighting, color palette, style or medium, fine details. 60 to 110 words. Be literal and concrete, not poetic.`,
  nano_banana: `Target model: Nano Banana. Write natural descriptive sentences like a photo brief: subject, environment, camera and lens, lighting, mood, textures. 50 to 100 words.`,
  flux_draft: `Target model: FLUX Schnell (fast draft). Keep it short and visual: subject, setting, light and style in 25 to 40 words, no long sentences.`,
  veo_lite: VEO,
  veo_fast: VEO,
  kling_pro: `Target model: Kling video. Describe one continuous shot with clear physical motion: what the subject does from start to end, camera movement, speed, lighting, atmosphere. Focus on motion, not static detail. Do not describe sound. 50 to 90 words. Make the action fit the clip length.`,
  seedance: `Target model: Seedance video. Give cinematic direction: shot type, camera move, subject action over time, lighting, atmosphere, then sound (ambience, effects, any spoken line in quotes). 60 to 110 words. One continuous scene unless the user asks for cuts.`,
};
const REF = {
  image: `The user attached a reference image to edit. Describe the change to make, and what must stay the same (identity, composition, colors). Do not re-describe the whole image.`,
  video: `The user attached an image as the first frame. Describe only the motion, camera movement and sound that should happen. Do not re-describe what is already visible in the image.`,
};

export async function enhancePrompt(prompt, o = {}) {
  if (!llmReady() || prompt.length > 400) return prompt; // already detailed, or booster not configured
  const system = [COMMON, NOTES[o.model] || '', o.hasRef ? REF[o.type] || '' : ''].filter(Boolean).join('\n\n');
  const user = `Idea: ${prompt}\nAspect ratio: ${o.aspect || 'any'}` + (o.type === 'video' ? `\nClip length: ${o.seconds} seconds` : '');
  try {
    const j = await claude({ model: 'claude-haiku-5-5', system, messages: [{ role: 'user', content: user }], max_tokens: 400, timeoutMs: 8000 });
    const t = j.content?.find((b) => b.type === 'text')?.text?.trim();
    return t && t.length > 10 ? t : prompt;
  } catch { return prompt; }
}
