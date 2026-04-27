import { readJson, requireUser, safe, sendJson, supabaseRest } from '../_shared';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any): Promise<void> {
  return safe(req, res, async () => {
    const authz = await requireUser(req);
    if (!authz.ok) return sendJson(res, { success: false, error: authz.error }, 401);

    const id = (req.query?.id ?? '') as string;
    if (!id) return sendJson(res, { success: false, error: 'id required' }, 400);

    if (req.method === 'GET') {
      const r = await supabaseRest<any[]>(`/suppliers?select=*,invoice_templates(*),template_assets(*)&id=eq.${encodeURIComponent(id)}`);
      if (!r.ok) return sendJson(res, { success: false, error: r.error }, 500);
      return sendJson(res, { success: true, data: r.data[0] ?? null });
    }

    if (req.method === 'PUT') {
      const body = await readJson<Record<string, unknown>>(req);
      const r = await supabaseRest<any[]>(`/suppliers?id=eq.${encodeURIComponent(id)}&select=*`, {
        method: 'PATCH',
        body,
      });
      if (!r.ok) return sendJson(res, { success: false, error: r.error }, 500);
      return sendJson(res, { success: true, data: r.data[0] ?? null });
    }

    if (req.method === 'DELETE') {
      const r = await supabaseRest<unknown>(`/suppliers?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!r.ok) return sendJson(res, { success: false, error: r.error }, 500);
      return sendJson(res, { success: true });
    }

    return sendJson(res, { success: false, error: 'Method not allowed' }, 405);
  });
}

