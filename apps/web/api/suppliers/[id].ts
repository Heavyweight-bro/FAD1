import { json, readJson, requireUser, supabaseAdmin } from '../_shared';

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request): Promise<Response> {
  const authz = await requireUser(req);
  if (!authz.ok) return json({ success: false, error: authz.error }, 401);

  const url = new URL(req.url);
  const id = url.pathname.split('/').pop() || '';
  if (!id) return json({ success: false, error: 'id required' }, 400);

  const sb = supabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('suppliers')
      .select('*, invoice_templates(*), template_assets(*)')
      .eq('id', id)
      .single();
    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, data });
  }

  if (req.method === 'PUT') {
    const body = await readJson<Record<string, unknown>>(req);
    const { data, error } = await sb.from('suppliers').update(body).eq('id', id).select().single();
    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, data });
  }

  if (req.method === 'DELETE') {
    const { error } = await sb.from('suppliers').delete().eq('id', id);
    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true });
  }

  return json({ success: false, error: 'Method not allowed' }, 405);
}

