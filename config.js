// Cloudflare Pages Function: GET /api/config
// Gives the browser the Supabase project URL and its public (anon / publishable) key.
// These two values are meant to be public; the data is protected by Row Level Security in Supabase.
// Set them in Cloudflare > Settings > Variables and Secrets: SUPABASE_URL, SUPABASE_ANON_KEY
export async function onRequestGet({ env }) {
  const url = env.SUPABASE_URL || '', key = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';
  return new Response(JSON.stringify(url && key ? { supabaseUrl: url, supabaseKey: key } : {}), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
