import { createClient } from '@supabase/supabase-js';

export function json(res: any, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function supabaseAdmin() {
  const url = env('SUPABASE_URL');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE / SUPABASE_SERVICE_KEY)');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'ite-vercel' } },
  });
}

export async function safe<T>(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return json({ success: false, error: message }, 500);
  }
}

export async function requireUser(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { ok: false as const, error: 'Missing Authorization bearer JWT' };
  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return { ok: false as const, error: 'Invalid JWT' };
  return { ok: true as const, user: data.user };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error('Invalid JSON body');
  }
}

