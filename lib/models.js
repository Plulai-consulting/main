// The ONE place that says which models exist, what each supports, and what it costs in credits.
// Credit rule: 1 credit = $0.0075 of API cost (worst case). Retail is about $0.025-0.03 per credit.
// Always check each model's page on fal.ai (https://fal.ai/models/<id>) before launch; prices and inputs change.
const SIZE = { '16:9': 'landscape_16_9', '9:16': 'portrait_16_9', '1:1': 'square_hd', '4:3': 'landscape_4_3' };
const IMG_AR = ['16:9', '9:16', '1:1', '4:3'];
const pick = (t) => (t === 'a' ? (d) => d.images?.[0]?.url : (d) => d.video?.url);

export const MODELS = {
  // ---------- IMAGES ----------
  gpt_image: {
    type: 'image', label: 'GPT Image', note: 'Best for text & detail',
    id: 'openai/gpt-image-2.5/flare/text-to-image', refId: null,
    aspects: IMG_AR, cost: () => 12, // ~$0.05-0.07 per 1K image; wider sizes may cost more
    input: (p) => ({ prompt: p.prompt, image_size: SIZE[p.aspect], quality: 'high', num_images: 1 }),
    pick: pick('a'), ext: 'png',
  },
  nano_banana: {
    type: 'image', label: 'Nano Banana', note: 'Photoreal, up to 4K, accepts a reference',
    id: 'google/nano-banana-2.1', refId: 'google/nano-banana-2.1/edit',
    aspects: IMG_AR,
    resolutions: ['1K', '2K', '4K'], // fal: 2K = 1.5x and 4K = 2x the ~$0.08 1K price
    cost: (p) => ({ '1K': 13, '2K': 19, '4K': 25 }[p.res] || 13),
    input: (p, ref) => ({ prompt: p.prompt, aspect_ratio: p.aspect, resolution: p.res || '1K', num_images: 1, output_format: 'png', ...(ref ? { image_urls: [ref] } : {}) }),
    pick: pick('a'), ext: 'png',
  },
  flux_draft: {
    type: 'image', label: 'FLUX Draft', note: 'Fast and cheap drafts',
    id: 'fal-ai/flux/schnell', refId: null,
    aspects: IMG_AR, cost: () => 2,
    input: (p) => ({ prompt: p.prompt, image_size: SIZE[p.aspect], num_images: 1 }),
    pick: pick('a'), ext: 'jpg',
  },

  // ---------- VIDEOS ----------
  veo_lite: {
    type: 'video', label: 'Veo 3.1 Lite', note: 'Budget, with sound',
    id: 'fal-ai/veo3.1/lite', refId: 'fal-ai/veo3.1/lite/image-to-video', // VERIFY refId on fal.ai
    aspects: ['16:9', '9:16'], durations: [4, 6, 8],
    resolutions: ['720p', '1080p'], // ~$0.05/s at 720p, ~$0.08/s at 1080p (with audio)
    cost: (p) => (p.res === '1080p' ? 13 : 8) * p.seconds,
    input: (p, ref) => ({ prompt: p.prompt, aspect_ratio: p.aspect, duration: `${p.seconds}s`, resolution: p.res || '720p', ...(ref ? { image_url: ref } : {}) }),
    pick: pick('v'), ext: 'mp4',
  },
  kling_pro: {
    type: 'video', label: 'Kling 3 Pro', note: 'Smooth motion, 4K option',
    id: 'fal-ai/kling-video/o3/pro/text-to-video', refId: 'fal-ai/kling-video/o3/pro/image-to-video',
    aspects: ['16:9', '9:16', '1:1'], durations: [5, 10, 15],
    resolutions: ['hd', '4k'],
    // 4K runs on its own endpoints (~$0.42/s). VERIFY the 4K text-to-video id on fal.ai
    resEndpoints: { '4k': { id: 'fal-ai/kling-video/o3/4k/text-to-video', refId: 'fal-ai/kling-video/o3/4k/image-to-video' } },
    cost: (p) => (p.res === '4k' ? 65 : 18) * p.seconds,
    input: (p, ref) => ({ prompt: p.prompt, duration: String(p.seconds), generate_audio: false, ...(ref ? { image_url: ref } : { aspect_ratio: p.aspect }) }),
    pick: pick('v'), ext: 'mp4',
  },
  veo_fast: {
    type: 'video', label: 'Veo 3.1 Fast', note: 'Cinematic, with sound, up to 4K',
    id: 'fal-ai/veo3.1/fast', refId: 'fal-ai/veo3.1/fast/image-to-video',
    aspects: ['16:9', '9:16'], durations: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'], // fal: $0.15/s with audio at 720p/1080p, $0.35/s at 4K
    cost: (p) => (p.res === '4k' ? 54 : 23) * p.seconds,
    input: (p, ref) => ({ prompt: p.prompt, aspect_ratio: p.aspect, duration: `${p.seconds}s`, resolution: p.res || '720p', generate_audio: true, ...(ref ? { image_url: ref } : {}) }),
    pick: pick('v'), ext: 'mp4',
  },
  seedance: {
    type: 'video', label: 'Seedance 2.0', note: 'Cinematic, premium, with sound (720p)',
    id: 'bytedance/seedance-2.0/text-to-video', refId: 'bytedance/seedance-2.0/image-to-video', // VERIFY refId and its image field
    aspects: ['16:9', '9:16', '1:1', '4:3'], durations: [5, 10],
    cost: (p) => 47 * p.seconds, // ~$0.30/s at 720p with audio (its maximum resolution)
    input: (p, ref) => ({ prompt: p.prompt, duration: String(p.seconds), aspect_ratio: p.aspect, resolution: '720p', generate_audio: true, ...(ref ? { image_url: ref } : {}) }),
    pick: pick('v'), ext: 'mp4',
  },

  // ---------- Upscalers (not in the picker; used by the Upscale button) ----------
  upscale_image: {
    type: 'image', hidden: true, label: 'Upscaled', id: 'fal-ai/esrgan', refId: null, aspects: [], cost: () => 3,
    input: (p, src) => ({ image_url: src, scale: 2, output_format: 'png' }),
    pick: (d) => d.image?.url, ext: 'png',
  },
  upscale_video: {
    type: 'video', hidden: true, label: 'Upscaled', id: 'fal-ai/topaz/upscale/video', refId: null, aspects: [], // VERIFY input/output fields
    cost: (p) => 13 * p.seconds,
    input: (p, src) => ({ video_url: src }),
    pick: pick('v'), ext: 'mp4',
  },
  // Hidden (kept so old jobs still finish)
  video: {
    type: 'video', hidden: true, label: 'Kling Standard', note: '',
    id: 'fal-ai/kling-video/o3/standard/text-to-video', refId: 'fal-ai/kling-video/o3/standard/image-to-video',
    aspects: ['16:9', '9:16', '1:1'], durations: [5, 10, 15], cost: (p) => 12 * p.seconds,
    input: (p, ref) => ({ prompt: p.prompt, duration: String(p.seconds), aspect_ratio: p.aspect, ...(ref ? { image_url: ref } : {}) }),
    pick: pick('v'), ext: 'mp4',
  },
};

export const DEFAULTS = { image: 'gpt_image', video: 'veo_lite' };
export const COUNTS = { image: [1, 2, 4], video: [1, 2] };
export const resLabel = (r) => ({ '4k': '4K', hd: 'Standard' }[r] || r);
export const modelsOf = (type) => Object.entries(MODELS).filter(([, m]) => m.type === type && !m.hidden);
export const endpointOf = (m, res, hasRef) => {
  const o = m.resEndpoints?.[res];
  return hasRef ? o?.refId || m.refId : o?.id || m.id;
};
export const modelFor = (endpoint) =>
  Object.values(MODELS).find((m) =>
    [m.id, m.refId, ...Object.values(m.resEndpoints || {}).flatMap((o) => [o.id, o.refId])].includes(endpoint));
