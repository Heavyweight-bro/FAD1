import { readJson, requireUser, safe, sendJson, supabaseAdmin } from '../_shared';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any): Promise<void> {
  return safe(req, res, async () => {
    const authz = await requireUser(req);
    if (!authz.ok) return sendJson(res, { success: false, error: authz.error }, 401);

    const id = (req.query?.id ?? '') as string;
    if (!id) return sendJson(res, { success: false, error: 'id required' }, 400);

    const sb = await supabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('suppliers')
        .select('*, invoice_templates(*), template_assets(*)')
        .eq('id', id)
        .single();
      if (error) return sendJson(res, { success: false, error: error.message }, 500);
      return sendJson(res, { success: true, data });
    }

    if (req.method === 'PUT') {
      const body = await readJson<Record<string, unknown>>(req);
      const { data, error } = await sb.from('suppliers').update(body).eq('id', id).select().single();
      if (error) return sendJson(res, { success: false, error: error.message }, 500);
      return sendJson(res, { success: true, data });
    }

    if (req.method === 'DELETE') {
      const { error } = await sb.from('suppliers').delete().eq('id', id);
      if (error) return sendJson(res, { success: false, error: error.message }, 500);
      return sendJson(res, { success: true });
    }

    return sendJson(res, { success: false, error: 'Method not allowed' }, 405);
  });
}

