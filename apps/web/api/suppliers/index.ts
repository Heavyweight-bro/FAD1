export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any): Promise<void> {
  return safe(res, async () => {
    if (req.method !== 'GET' && req.method !== 'POST') return sendJson(res, { success: false, error: 'Method not allowed' }, 405);

    const authz = await requireUser(req);
    if (!authz.ok) return sendJson(res, { success: false, error: authz.error }, 401);

    if (req.method === 'GET') {
      const search = (req.query?.search ?? '') as string;
      const q = search
        ? `/suppliers?select=*&order=created_at.desc&name=ilike.*${encodeURIComponent(search)}*`
        : `/suppliers?select=*&order=created_at.desc`;

      const r = await supabaseRest<any[]>(q, { headers: { Prefer: 'count=exact' } });
      if (!r.ok) return sendJson(res, { success: false, error: r.error }, 500);
      return sendJson(res, { success: true, data: r.data, total: r.count ?? 0 });
    }

    const body = await readJson<{ name: string; country?: string; metadata?: any }>(req);
    if (!body?.name) return sendJson(res, { success: false, error: 'name required' }, 400);
    const insert = await supabaseRest<any[]>(
      `/suppliers?select=*`,
      { method: 'POST', body: { name: body.name, country: body.country ?? null, metadata: body.metadata ?? {} } },
    );
    if (!insert.ok) return sendJson(res, { success: false, error: insert.error }, 500);
    return sendJson(res, { success: true, data: insert.data[0] }, 201);
  });
}

function sendJson(res: any, payload: any, status = 200) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function safe(res: any, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    sendJson(res, { success: false, error: message }, 500);
  }
}

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function supabaseUrl(): string {
  return env('SUPABASE_URL').replace(/\/+$/, '');
}

function supabaseServiceKey(): string {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY');
  return serviceKey;
}

async function requireUser(req: any) {
  const auth = (req.headers?.authorization || req.headers?.Authorization || '') as string;
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { ok: false as const, error: 'Missing Authorization bearer JWT' };
  const resp = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: supabaseServiceKey(), authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return { ok: false as const, error: 'Invalid JWT' };
  const user = await resp.json();
  return { ok: true as const, user };
}

async function readJson<T>(req: any): Promise<T> {
  if (req.body && typeof req.body === 'object') return req.body as T;
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = new TextDecoder().decode(Buffer.concat(chunks as any));
  try {
    return JSON.parse(text || '{}') as T;
  } catch {
    throw new Error('Invalid JSON body');
  }
}

async function supabaseRest<T>(
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

  const contentRange = resp.headers.get('content-range');
  const count = contentRange?.includes('/') ? Number(contentRange.split('/')[1]) : undefined;
  const text = await resp.text();
  const data = text ? (JSON.parse(text) as T) : (null as T);
  if (!resp.ok) {
    const err = (data as any)?.message || (data as any)?.error || text || `HTTP ${resp.status}`;
    return { ok: false, error: err, status: resp.status };
  }
  return { ok: true, data, count };
}
