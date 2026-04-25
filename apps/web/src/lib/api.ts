import { supabase } from './supabase';
import { getEnv } from './env';

export type ApiResult<T> = { success: true } & T;

function apiBaseUrl(): string {
  const explicit = getEnv('VITE_API_BASE_URL');
  if (explicit) return explicit.replace(/\/+$/, '');

  // Default to Supabase functions domain derived from VITE_SUPABASE_URL
  const url = getEnv('VITE_SUPABASE_URL');
  if (!url) throw new Error('Missing env var: VITE_API_BASE_URL (or VITE_SUPABASE_URL)');
  const u = new URL(url);
  const host = u.host; // qsz...supabase.co
  const projectRef = host.split('.')[0];
  return `https://${projectRef}.functions.supabase.co`;
}

export async function apiFetch<T>(
  path: string,
  init?: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> },
): Promise<T> {
  const base = apiBaseUrl();
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init?.headers ?? {}),
  };

  // Add admin JWT for authenticated UI requests
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.authorization = `Bearer ${token}`;
  }

  const resp = await fetch(url, { ...init, headers });
  const text = await resp.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!resp.ok) {
    const message = json?.error || `HTTP ${resp.status}`;
    throw new Error(message);
  }
  return json as T;
}

