import { readJson, requireUser, safe, sendJson, supabaseAdmin } from '../_shared';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any): Promise<void> {
  return safe(req, res, async () => {
    if (req.method !== 'GET' && req.method !== 'POST') return sendJson(res, { success: false, error: 'Method not allowed' }, 405);

    const authz = await requireUser(req);
    if (!authz.ok) return sendJson(res, { success: false, error: authz.error }, 401);

    const sb = await supabaseAdmin();

    if (req.method === 'GET') {
      const search = (req.query?.search ?? '') as string;

      let q = sb.from('suppliers').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (search) q = q.ilike('name', `%${search}%`);
      const { data, error, count } = await q;
      if (error) return sendJson(res, { success: false, error: error.message }, 500);
      return sendJson(res, { success: true, data, total: count ?? 0 });
    }

    const body = await readJson<{ name: string; country?: string; metadata?: any }>(req);
    if (!body?.name) return sendJson(res, { success: false, error: 'name required' }, 400);
    const { data, error } = await sb
      .from('suppliers')
      .insert({ name: body.name, country: body.country ?? null, metadata: body.metadata ?? {} })
      .select()
      .single();
    if (error) return sendJson(res, { success: false, error: error.message }, 500);
    return sendJson(res, { success: true, data }, 201);
  });
}

