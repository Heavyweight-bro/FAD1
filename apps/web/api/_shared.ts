export function sendJson(res: any, payload: any, status = 200) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function supabaseUrl(): string {
  return env('SUPABASE_URL').replace(/\/+$/, '');
}

export function supabaseServiceKey(): string {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE / SUPABASE_SERVICE_KEY)');
  }
  return serviceKey;
}

export async function safe(req: any, res: any, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    sendJson(res, { success: false, error: message }, 500);
  }
}

export async function requireUser(req: any) {
  const auth = (req.headers?.authorization || req.headers?.Authorization || '') as string;
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { ok: false as const, error: 'Missing Authorization bearer JWT' };

  // Validate user via Supabase Auth REST API.
  const resp = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: supabaseServiceKey(),
      authorization: `Bearer ${token}`,
    },
  });
  if (!resp.ok) return { ok: false as const, error: 'Invalid JWT' };
  const user = await resp.json();
  return { ok: true as const, user };
}

export async function readJson<T>(req: any): Promise<T> {
  if (req.body && typeof req.body === 'object') return req.body as T;
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = new TextDecoder().decode(Buffer.concat(chunks as any));
  try {
    return JSON.parse(text || '{}') as T;
  } catch {
    throw new Error('Invalid JSON body');
  }
}

export async function supabaseRest<T>(
  path: string,
  init?: { method?: string; body?: any; headers?: Record<string, string> },
): Promise<{ ok: true; data: T; count?: number } | { ok: false; error: string; status: number }> {
  const url = `${supabaseUrl()}/rest/v1${path}`;
  const headers: Record<string, string> = {
    apikey: supabaseServiceKey(),
    authorization: `Bearer ${supabaseServiceKey()}`,
    ...(init?.headers ?? {}),
  };
  if (init?.body !== undefined) headers['content-type'] = 'application/json';

  const resp = await fetch(url, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const countHeader = resp.headers.get('content-range'); // e.g. 0-9/123
  const count = countHeader?.split('/')[1] ? Number(countHeader.split('/')[1]) : undefined;
  const text = await resp.text();
  const data = text ? (JSON.parse(text) as T) : (null as T);
  if (!resp.ok) {
    const err = (data as any)?.message || (data as any)?.error || text || `HTTP ${resp.status}`;
    return { ok: false, error: err, status: resp.status };
  }
  return { ok: true, data, count };
}

