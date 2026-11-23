// Server-only: safely opens public company websites to verify them and read their public contact details.
import dns from 'node:dns/promises';
import net from 'node:net';

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) { const x = ip.toLowerCase(); return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80') || x.startsWith('::ffff:'); }
  return true;
}

// Blocks private networks, so a poisoned search result can never make the server call internal addresses.
async function assertPublic(urlStr) {
  const u = new URL(urlStr);
  if (!/^https?:$/.test(u.protocol)) throw new Error('blocked protocol');
  const h = u.hostname;
  if (net.isIP(h) || h === 'localhost' || !h.includes('.') || h.endsWith('.local') || h.endsWith('.internal')) throw new Error('blocked host');
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('blocked port');
  const addrs = await dns.lookup(h, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('blocked address');
  return u;
}

export async function safeFetch(urlStr, { timeoutMs = 6000, maxBytes = 400000 } = {}) {
  let url = urlStr;
  for (let i = 0; i < 4; i++) { // follow at most 3 redirects, re-checking every hop
    const u = await assertPublic(url);
    const r = await fetch(u, {
      redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'PllulaiBot/1.0 (business research; reads public pages)', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en,ar;q=0.8' },
    });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { url = new URL(r.headers.get('location'), u).toString(); continue; }
    if (!r.ok) return { ok: false, status: r.status };
    if (!/text\/html|application\/xhtml/i.test(r.headers.get('content-type') || '')) return { ok: false, status: 415 };
    const reader = r.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); size += value.length; if (size > maxBytes) { reader.cancel(); break; } }
    return { ok: true, url: u.toString(), html: Buffer.concat(chunks).toString('utf8') };
  }
  return { ok: false, status: 310 };
}

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const JUNK_EMAIL = /\.(png|jpe?g|gif|svg|webp|css|js)$|sentry|wixpress|example\.|your-?email|domain\.com|@2x|noreply|no-reply|u00/i;
const PARKED = /domain (is )?for sale|buy this domain|this domain (may be|is) (for sale|parked)|parked (free|domain)|under construction|coming soon/i;

export function parseSite(html, baseUrl) {
  const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<!--[\s\S]*?-->/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const description = (html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["']/i)?.[1] || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:description|og:description)["']/i)?.[1] || '').trim().slice(0, 300);
  let decoded = html;
  try { decoded = html.replace(/%40/g, '@'); } catch {}
  const emails = [...new Set((decoded.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g) || []).map((e) => e.toLowerCase()).filter((e) => !JUNK_EMAIL.test(e)))];
  const phones = [...new Set([...(html.match(/tel:([+\d][\d\s\-().]{6,20}\d)/gi) || []).map((x) => x.slice(4).trim()), ...(strip(html).match(/\+\d{1,3}[\s\-.]?\(?\d{1,4}\)?(?:[\s\-.]?\d{2,4}){2,4}/g) || [])].map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.replace(/\D/g, '').length >= 8 && p.replace(/\D/g, '').length <= 15))];
  const whatsapp = html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d{7,15})/i)?.[1] || '';
  const ig = html.match(/instagram\.com\/([A-Za-z0-9._]{2,30})(?=[\/"'?\s])/i)?.[1];
  const instagram = ig && !['p', 'reel', 'reels', 'explore', 'accounts', 'share', 'tv'].includes(ig.toLowerCase()) ? `https://instagram.com/${ig}` : '';
  const li = html.match(/linkedin\.com\/company\/([A-Za-z0-9._%-]+)/i)?.[1];
  let contactLink = '';
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    if (/contact|reach-us|get-in-touch|اتصل|تواصل/i.test(m[1]) && !/^(mailto|tel):/i.test(m[1])) { try { contactLink = new URL(m[1], baseUrl).toString(); } catch {} if (contactLink && hostOf(contactLink) === hostOf(baseUrl)) break; contactLink = ''; }
  }
  return { title, description, text: strip(html), emails, phones, whatsapp, instagram, linkedin: li ? `https://linkedin.com/company/${li}` : '', contactLink };
}

const rankEmails = (emails, host) => [...emails].sort((a, b) => (b.endsWith('@' + host) || b.endsWith('.' + host)) - (a.endsWith('@' + host) || a.endsWith('.' + host)));

// Opens the home, contact and about pages and collects only what the company itself publishes.
export async function siteCheck(website) {
  try {
    const home = await safeFetch(website);
    if (!home.ok) return { ok: false, dead: [404, 410].includes(home.status), reason: `the site returned ${home.status || 'an error'}` };
    const h = parseSite(home.html, home.url);
    if (PARKED.test(h.text.slice(0, 900))) return { ok: false, dead: true, reason: 'parked or empty domain' };
    const origin = new URL(home.url).origin;
    const host = hostOf(home.url);
    const urls = [h.contactLink || origin + '/contact', origin + '/about'];
    const pages = await Promise.all(urls.map((u) => safeFetch(u).catch(() => ({ ok: false }))));
    const extra = pages.map((p, i) => (p.ok ? { ...parseSite(p.html, p.url), url: p.url, i } : null)).filter(Boolean);
    const all = [h, ...extra];
    const emails = rankEmails([...new Set(all.flatMap((p) => p.emails))], host).slice(0, 3);
    return {
      ok: true, title: h.title, description: h.description,
      text: [h.text.slice(0, 800), ...extra.map((p) => p.text.slice(0, 250))].join(' ').slice(0, 1100),
      emails, phones: [...new Set(all.flatMap((p) => p.phones))].slice(0, 2),
      whatsapp: all.find((p) => p.whatsapp)?.whatsapp || '', instagram: all.find((p) => p.instagram)?.instagram || '', linkedin: all.find((p) => p.linkedin)?.linkedin || '',
      contact_page: extra.find((p) => p.i === 0)?.url || (h.contactLink || ''), thin: h.text.length < 200,
    };
  } catch (e) {
    const m = String(e.message || e);
    return { ok: false, dead: /ENOTFOUND|EAI_AGAIN/.test(m), reason: m.slice(0, 60) };
  }
}
