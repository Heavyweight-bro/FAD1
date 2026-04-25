/// <reference lib="deno.ns" />

import { withCors, corsHeaders } from '../_shared/cors.ts';
import { json, readJson } from '../_shared/json.ts';
import { getSupabaseAdmin } from '../_shared/supabase.ts';
import { verify1cApiKey } from '../_shared/api-key.ts';
import { DEFAULT_MAPPINGS } from '../_shared/default-mappings.ts';
import { FieldTransformService } from '../_shared/transform.ts';
import { randomKey, sha256Hex } from '../_shared/crypto.ts';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';

type RouteMatch = { ok: true; params: Record<string, string> } | { ok: false };

async function requireAdminUser(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const jwt = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!jwt) return { ok: false as const, error: 'Missing Authorization bearer JWT' };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user) return { ok: false as const, error: 'Invalid JWT' };
  return { ok: true as const, user: data.user };
}

function match(pattern: string, pathname: string): RouteMatch {
  const p = pattern.split('/').filter(Boolean);
  const a = pathname.split('/').filter(Boolean);
  if (p.length !== a.length) return { ok: false };
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const seg = p[i];
    const cur = a[i];
    if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(cur);
    else if (seg !== cur) return { ok: false };
  }
  return { ok: true, params };
}

function badRequest(message: string, status = 400) {
  return withCors(json({ success: false, error: message }, { status }));
}

function ok(data: unknown, status = 200) {
  return withCors(json({ success: true, ...data }, { status }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const pathname = url.pathname;
  const supabase = getSupabaseAdmin();

  try {
    // =========================
    // 1C integration (API key)
    // =========================
    if (pathname === '/api/invoices/generate' && req.method === 'POST') {
      const v = await verify1cApiKey(req);
      if (!v.ok) return badRequest(v.error, 401);

      const body = await readJson<{ supplier_id?: string; supplier_name?: string; data: any }>(req);
      if (!body?.data) return badRequest('Missing data');

      // find template
      let template: any = null;
      if (body.supplier_id) {
        const { data, error } = await supabase
          .from('invoice_templates')
          .select('*, suppliers(*), template_assets(*)')
          .eq('supplier_id', body.supplier_id)
          .eq('is_active', true)
          .maybeSingle();
        if (error) throw error;
        template = data;
      } else if (body.supplier_name) {
        const { data, error } = await supabase
          .from('invoice_templates')
          .select('*, suppliers!inner(*), template_assets(*)')
          .ilike('suppliers.name', `%${body.supplier_name}%`)
          .eq('is_active', true)
          .maybeSingle();
        if (error) throw error;
        template = data;
      } else {
        return badRequest('supplier_id or supplier_name required');
      }

      if (!template) return badRequest('Template not found', 404);

      const { data: mappings, error: mappingsErr } = await supabase
        .from('field_mappings')
        .select('*')
        .eq('template_id', template.id);
      if (mappingsErr) throw mappingsErr;

      const transformer = new FieldTransformService();
      const variables = transformer.transform(body.data, { mappings: mappings ?? [], assets: {} });
      const html = transformer.renderTemplate(template.html_template, variables);

      // MVP: return rendered HTML only.
      // PDF generation is implemented as a separate step (remote chromium) to avoid edge runtime limitations.
      const invoiceNumber = String((variables as any).invoice_number || `INV-${Date.now()}`);

      const { data: invoiceRow, error: invErr } = await supabase
        .from('generated_invoices')
        .insert({
          template_id: template.id,
          invoice_number: invoiceNumber,
          supplier_name: template.suppliers?.name ?? body.supplier_name ?? null,
          invoice_data: body.data,
          status: 'completed',
        })
        .select()
        .single();
      if (invErr) throw invErr;

      return ok({ invoice_id: invoiceRow.id, pdf_url: null, rendered_html: html }, 200);
    }

    // =========================
    // AI: Generate template (Gemini)
    // =========================
    if (pathname === '/api/generate-template' && req.method === 'POST') {
      const authz = await requireAdminUser(req);
      if (!authz.ok) return badRequest(authz.error, 401);

      const body = await readJson<{ supplier_id: string; image_base64: string; mime_type: string }>(req);
      if (!body?.image_base64 || !body?.mime_type) return badRequest('image_base64 and mime_type required');

      const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
      if (!apiKey) return badRequest('Missing GOOGLE_AI_API_KEY secret', 500);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Generate an HTML invoice template that replicates the layout and styling.\n\nREQUIREMENTS:\n1. Use Handlebars variables: {{variable_name}}\n2. Items array: {{#each items}}...{{/each}}\n3. Include inline CSS in <style>\n4. A4 print: @page size A4 margin 10mm; body width 190mm\n5. Tables must use table-layout: fixed\n6. Font sizes: 8-10px; tables 7-8px\n\nSTANDARD VARIABLES:\n- Buyer: {{buyer_name}}, {{buyer_address}}, {{buyer_vat}}, {{buyer_phone}}, {{buyer_email}}\n- Seller: {{seller_name}}, {{seller_address}}\n- Bank: {{beneficiary_name}}, {{account_number}}, {{bank_name}}, {{swift_code}}, {{bank_address}}\n- Document: {{invoice_number}}, {{invoice_date}}, {{total_amount}}, {{currency}}, {{payment_terms}}\n- Delivery: {{delivery_term}}, {{delivery_place}}, {{port_of_loading}}, {{port_of_discharge}}, {{bl_number}}, {{container_number}}\n- Items: {{#each items}}{{this.number}}, {{this.description}}, {{this.quantity}}, {{this.unit_price}}, {{this.amount}}{{/each}}\n\nReturn ONLY the complete HTML starting with <!DOCTYPE html>. No markdown.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: body.mime_type, data: body.image_base64 } },
      ]);
      let html = result.response.text().trim();
      html = html.replace(/```html\\n?|\\n?```/g, '').trim();
      if (!html.toLowerCase().startsWith('<!doctype')) return badRequest('Gemini returned invalid HTML', 500);
      return ok({ html_template: html, note: 'Gemini: згенеровано HTML з першої сторінки PDF.' });
    }

    // All other endpoints require Supabase Auth (admin panel)
    {
      const authz = await requireAdminUser(req);
      if (!authz.ok) return badRequest(authz.error, 401);
    }

    // =========================
    // Suppliers CRUD
    // =========================
    if (pathname === '/api/suppliers' && req.method === 'GET') {
      const search = url.searchParams.get('search') ?? '';
      const query = supabase.from('suppliers').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      const q2 = search ? query.ilike('name', `%${search}%`) : query;
      const { data, error, count } = await q2;
      if (error) throw error;
      return ok({ data, total: count ?? 0 });
    }
    if (pathname === '/api/suppliers' && req.method === 'POST') {
      const body = await readJson<{ name: string; country?: string; metadata?: any }>(req);
      if (!body?.name) return badRequest('name required');
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ name: body.name, country: body.country ?? null, metadata: body.metadata ?? {} })
        .select()
        .single();
      if (error) throw error;
      return ok({ data }, 201);
    }
    {
      const m = match('/api/suppliers/:id', pathname);
      if (m.ok && req.method === 'GET') {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*, invoice_templates(*), template_assets(*)')
          .eq('id', m.params.id)
          .single();
        if (error) throw error;
        return ok({ data });
      }
      if (m.ok && req.method === 'PUT') {
        const body = await readJson<Record<string, unknown>>(req);
        const { data, error } = await supabase.from('suppliers').update(body).eq('id', m.params.id).select().single();
        if (error) throw error;
        return ok({ data });
      }
      if (m.ok && req.method === 'DELETE') {
        const { error } = await supabase.from('suppliers').delete().eq('id', m.params.id);
        if (error) throw error;
        return ok({ success: true });
      }
    }

    // =========================
    // Templates CRUD (+ versions minimal)
    // =========================
    if (pathname === '/api/templates' && req.method === 'GET') {
      const supplierId = url.searchParams.get('supplier_id');
      const activeOnly = (url.searchParams.get('active_only') ?? 'false') === 'true';
      let q = supabase.from('invoice_templates').select('*').order('created_at', { ascending: false });
      if (supplierId) q = q.eq('supplier_id', supplierId);
      if (activeOnly) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return ok({ data });
    }
    if (pathname === '/api/templates' && req.method === 'POST') {
      const body = await readJson<{
        supplier_id: string;
        name: string;
        html_template: string;
        css_styles?: string;
        variables_schema: any;
      }>(req);
      if (!body?.supplier_id || !body?.name || !body?.html_template) return badRequest('supplier_id, name, html_template required');
      const { data, error } = await supabase
        .from('invoice_templates')
        .insert({
          supplier_id: body.supplier_id,
          name: body.name,
          html_template: body.html_template,
          css_styles: body.css_styles ?? null,
          variables_schema: body.variables_schema ?? {},
          is_active: true,
          version: 1,
        })
        .select()
        .single();
      if (error) throw error;

      // create default mappings if none
      await supabase.from('field_mappings').insert(
        DEFAULT_MAPPINGS.map((m) => ({
          template_id: data.id,
          template_variable: m.template_variable,
          source_field: m.source_field,
          field_category: m.field_category,
          is_required: m.is_required ?? false,
          default_value: m.default_value ?? null,
          transform_function: m.transform_function ?? null,
          display_order: m.display_order ?? 0,
        })),
      );

      return ok({ data }, 201);
    }
    {
      const m = match('/api/templates/:id', pathname);
      if (m.ok && req.method === 'GET') {
        const { data, error } = await supabase
          .from('invoice_templates')
          .select('*, field_mappings(*), template_versions(*)')
          .eq('id', m.params.id)
          .single();
        if (error) throw error;
        return ok({ data });
      }
      if (m.ok && req.method === 'PUT') {
        const body = await readJson<Record<string, unknown> & { change_description?: string }>(req);
        const { data: current, error: curErr } = await supabase
          .from('invoice_templates')
          .select('*')
          .eq('id', m.params.id)
          .single();
        if (curErr) throw curErr;

        await supabase.from('template_versions').insert({
          template_id: m.params.id,
          version: current.version,
          html_template: current.html_template,
          css_styles: current.css_styles,
          variables_schema: current.variables_schema,
          change_description: body.change_description ?? 'Auto-saved version',
        });

        const updates = { ...body };
        delete (updates as any).change_description;

        const { data, error } = await supabase
          .from('invoice_templates')
          .update({ ...updates, version: current.version + 1, updated_at: new Date().toISOString() })
          .eq('id', m.params.id)
          .select()
          .single();
        if (error) throw error;
        return ok({ data });
      }
    }

    // Preview: render handlebars -> html
    {
      const m = match('/api/templates/:id/preview', pathname);
      if (m.ok && req.method === 'POST') {
        const body = await readJson<{ test_data: any }>(req);
        const { data: tpl, error: tplErr } = await supabase
          .from('invoice_templates')
          .select('*')
          .eq('id', m.params.id)
          .single();
        if (tplErr) throw tplErr;

        const { data: mappings, error: mapErr } = await supabase.from('field_mappings').select('*').eq('template_id', m.params.id);
        if (mapErr) throw mapErr;
        const transformer = new FieldTransformService();
        const vars = transformer.transform(body.test_data ?? {}, { mappings: mappings ?? [], assets: {} });
        const rendered = transformer.renderTemplate(tpl.html_template, vars);
        return ok({ html: rendered });
      }
    }

    // =========================
    // Mappings
    // =========================
    {
      const m = match('/api/mappings/:template_id', pathname);
      if (m.ok && req.method === 'GET') {
        const { data, error } = await supabase.from('field_mappings').select('*').eq('template_id', m.params.template_id).order('display_order');
        if (error) throw error;
        return ok({ data });
      }
      if (m.ok && req.method === 'PUT') {
        const body = await readJson<any[]>(req);
        await supabase.from('field_mappings').delete().eq('template_id', m.params.template_id);
        const rows = (body ?? []).map((r) => ({
          template_id: m.params.template_id,
          template_variable: r.template_variable ?? r.templateVariable,
          source_field: r.source_field ?? r.sourceField,
          field_category: r.field_category ?? r.category,
          is_required: r.is_required ?? r.isRequired ?? false,
          default_value: r.default_value ?? r.defaultValue ?? null,
          transform_function: r.transform_function ?? r.transformFunction ?? null,
          display_order: r.display_order ?? r.displayOrder ?? 0,
        }));
        const { data, error } = await supabase.from('field_mappings').insert(rows).select();
        if (error) throw error;
        return ok({ data });
      }
    }
    {
      const m = match('/api/mappings/:template_id/reset', pathname);
      if (m.ok && req.method === 'POST') {
        await supabase.from('field_mappings').delete().eq('template_id', m.params.template_id);
        const { data, error } = await supabase
          .from('field_mappings')
          .insert(
            DEFAULT_MAPPINGS.map((r) => ({
              template_id: m.params.template_id,
              template_variable: r.template_variable,
              source_field: r.source_field,
              field_category: r.field_category,
              is_required: r.is_required ?? false,
              default_value: r.default_value ?? null,
              transform_function: r.transform_function ?? null,
              display_order: r.display_order ?? 0,
            })),
          )
          .select();
        if (error) throw error;
        return ok({ data });
      }
    }

    // =========================
    // Settings
    // =========================
    if (pathname === '/api/settings' && req.method === 'GET') {
      const { data, error } = await supabase.from('settings').select('*').order('key');
      if (error) throw error;
      const masked = (data ?? []).map((s: any) => ({
        ...s,
        value: s.key?.toString().includes('key') && s.value ? '***' : s.value,
      }));
      return ok({ data: masked });
    }
    if (pathname === '/api/settings' && req.method === 'PUT') {
      const body = await readJson<Array<{ key: string; value: string }>>(req);
      for (const item of body ?? []) {
        await supabase.from('settings').upsert({ key: item.key, value: item.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
      return ok({ success: true });
    }

    // =========================
    // API keys management
    // =========================
    if (pathname === '/api/api-keys' && req.method === 'GET') {
      const { data, error } = await supabase.from('api_keys').select('id,name,key_prefix,permissions,is_active,last_used_at,created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return ok({ data });
    }
    if (pathname === '/api/api-keys' && req.method === 'POST') {
      const body = await readJson<{ name: string; permissions?: string[] }>(req);
      if (!body?.name) return badRequest('name required');
      const key = randomKey('ite_');
      const keyHash = await sha256Hex(key);
      const keyPrefix = key.slice(0, 8);
      const { data, error } = await supabase
        .from('api_keys')
        .insert({ name: body.name, key_hash: keyHash, key_prefix: keyPrefix, permissions: body.permissions ?? ['generate'] })
        .select('id,name,key_prefix,permissions,is_active,created_at')
        .single();
      if (error) throw error;
      return ok({ data: { ...data, key } }, 201);
    }
    {
      const m = match('/api/api-keys/:id', pathname);
      if (m.ok && req.method === 'DELETE') {
        const { error } = await supabase.from('api_keys').delete().eq('id', m.params.id);
        if (error) throw error;
        return ok({ success: true });
      }
    }

    // =========================
    // Not implemented yet
    // =========================
    return withCors(json({ success: false, error: 'Not found' }, { status: 404 }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return badRequest(message, 500);
  }
});

