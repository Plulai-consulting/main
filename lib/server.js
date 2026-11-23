// Server-only helpers. Never import this file from a client component.
import { createClient } from '@supabase/supabase-js';
import { fal } from '@fal-ai/client';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const envOk = () =>
  !!(url && anonKey && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.FAL_KEY);

export const admin = createClient(url || 'http://missing', process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing', {
  auth: { persistSession: false },
});
const anon = createClient(url || 'http://missing', anonKey || 'missing', { auth: { persistSession: false } });

fal.config({ credentials: process.env.FAL_KEY });
export { fal };

// Verifies the logged-in user's token (uses the anon key, so it works even before the service key is right)
export async function getUser(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const { data, error } = await anon.auth.getUser(token);
  if (error) console.error('getUser failed:', error.message);
  const user = data?.user || null;
  if (!user) return null;
  const { data: p } = await admin.from('profiles').select('banned').eq('id', user.id).single();
  return p?.banned ? null : user; // banned users are treated as logged out
}

// Returns true when the user made too many requests of this kind recently
export async function limited(user, key, max, seconds) {
  const { data } = await admin.rpc('hit_rate', { p_user: user.id, p_key: key, p_max: max, p_seconds: seconds });
  return data === false;
}
export const tooMany = () => Response.json({ error: 'You are going too fast. Please wait a moment and try again.' }, { status: 429 });

// Returns the user only if they are an admin
export async function getAdmin(req) {
  const user = await getUser(req);
  if (!user) return null;
  const { data: p } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  return p?.is_admin ? user : null;
}
