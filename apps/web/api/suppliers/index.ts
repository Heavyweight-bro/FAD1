import { readJson, requireUser, safe, sendJson, supabaseRest } from '../_shared';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any): Promise<void> {
  return safe(req, res, async () => {
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

