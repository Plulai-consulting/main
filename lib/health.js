// Server-only: checks every model endpoint against fal's public schema, without spending money.
import { MODELS } from './models';

const SAMPLE_IMG = 'https://example.com/sample.png';

async function schemaFor(endpoint) {
  const r = await fetch(`https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=${encodeURIComponent(endpoint)}`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) return { error: r.status === 404 ? 'endpoint not found on fal.ai' : `schema request failed (${r.status})` };
  const j = await r.json();
  const comps = j.components?.schemas || {};
  const resolve = (node, depth = 0) => {
    if (!node || depth > 4) return node;
    if (node.$ref) return resolve(comps[node.$ref.split('/').pop()], depth + 1);
    if (node.allOf?.length === 1) return resolve(node.allOf[0], depth + 1);
    return node;
  };
  for (const [path, def] of Object.entries(j.paths || {})) {
    if (path.includes('/requests/')) continue;
    const body = resolve(def.post?.requestBody?.content?.['application/json']?.schema);
    if (body?.properties) {
      const enums = {};
      for (const [k, v] of Object.entries(body.properties)) { const e = resolve(v)?.enum; if (e) enums[k] = e; }
      return { props: Object.keys(body.properties), required: body.required || [], enums };
    }
  }
  return { error: 'could not read the input schema' };
}

function check(schema, input) {
  const notes = [];
  let status = 'ok';
  for (const k of Object.keys(input)) {
    if (!schema.props.includes(k)) { status = status === 'fail' ? 'fail' : 'warn'; notes.push(`field "${k}" is not in the model's schema`); }
    const e = schema.enums[k];
    if (e && !e.map(String).includes(String(input[k]))) { status = 'fail'; notes.push(`"${k}" = ${input[k]} is not allowed (allowed: ${e.join(', ')})`); }
  }
  for (const k of schema.required) if (!(k in input)) { status = 'fail'; notes.push(`required field "${k}" is missing`); }
  return { status, notes };
}

export async function runHealth() {
  const jobs = [];
  for (const [key, m] of Object.entries(MODELS)) {
    const p = { prompt: 'health check', aspect: m.aspects?.[0] || '16:9', seconds: m.durations?.[0] || 5, res: m.resolutions?.[0] };
    const direct = m.hidden && !m.durations && !m.aspects?.length; // tools and upscalers take a file, not a prompt
    jobs.push({ key, label: m.label, kind: direct ? 'tool' : 'text', endpoint: m.id, input: m.input(p, direct ? SAMPLE_IMG : undefined) });
    if (m.refId) jobs.push({ key, label: m.label, kind: 'reference', endpoint: m.refId, input: m.input(p, SAMPLE_IMG) });
    for (const [res, o] of Object.entries(m.resEndpoints || {})) {
      const pr = { ...p, res };
      jobs.push({ key, label: m.label, kind: `${res} text`, endpoint: o.id, input: m.input(pr) });
      if (o.refId) jobs.push({ key, label: m.label, kind: `${res} reference`, endpoint: o.refId, input: m.input(pr, SAMPLE_IMG) });
    }
  }
  const results = await Promise.all(jobs.map(async (j) => {
    try {
      const sc = await schemaFor(j.endpoint);
      if (sc.error) return { ...j, input: undefined, status: 'fail', notes: [sc.error] };
      return { ...j, input: undefined, ...check(sc, j.input) };
    } catch (e) { return { ...j, input: undefined, status: 'warn', notes: ['check timed out'] }; }
  }));
  return { at: new Date().toISOString(), results };
}
