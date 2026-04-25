import { json, readJson, requireUser, supabaseAdmin } from '../_shared';

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const authz = await requireUser(req);
  if (!authz.ok) return json({ success: false, error: authz.error }, 401);

  const sb = supabaseAdmin();

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') ?? '';

    let q = sb.from('suppliers').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (search) q = q.ilike('name', `%${search}%`);
    const { data, error, count } = await q;
    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, data, total: count ?? 0 });
  }

  const body = await readJson<{ name: string; country?: string; metadata?: any }>(req);
  if (!body?.name) return json({ success: false, error: 'name required' }, 400);
  const { data, error } = await sb
    .from('suppliers')
    .insert({ name: body.name, country: body.country ?? null, metadata: body.metadata ?? {} })
    .select()
    .single();
  if (error) return json({ success: false, error: error.message }, 500);
  return json({ success: true, data }, 201);
}

