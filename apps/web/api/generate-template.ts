export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any): Promise<void> {
  return safe(res, async () => {
    if (req.method !== 'POST') return sendJson(res, { success: false, error: 'Method not allowed' }, 405);
    const authz = await requireUser(req);
    if (!authz.ok) return sendJson(res, { success: false, error: authz.error }, 401);

    const body = await readJson<{ supplier_id?: string; image_base64: string; mime_type: string }>(req);
    if (!body?.image_base64 || !body?.mime_type) return sendJson(res, { success: false, error: 'image_base64 and mime_type required' }, 400);

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return sendJson(res, { success: false, error: 'Missing GOOGLE_AI_API_KEY' }, 500);

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Generate an HTML invoice template that replicates the layout and styling.

REQUIREMENTS:
1. Use Handlebars variables: {{variable_name}}
2. Items array: {{#each items}}...{{/each}}
3. Include inline CSS in <style>
4. A4 print: @page size A4 margin 10mm; body width 190mm
5. Tables must use table-layout: fixed
6. Font sizes: 8-10px; tables 7-8px

STANDARD VARIABLES:
- Buyer: {{buyer_name}}, {{buyer_address}}, {{buyer_vat}}, {{buyer_phone}}, {{buyer_email}}
- Seller: {{seller_name}}, {{seller_address}}
- Bank: {{beneficiary_name}}, {{account_number}}, {{bank_name}}, {{swift_code}}, {{bank_address}}
- Document: {{invoice_number}}, {{invoice_date}}, {{total_amount}}, {{currency}}, {{payment_terms}}
- Delivery: {{delivery_term}}, {{delivery_place}}, {{port_of_loading}}, {{port_of_discharge}}, {{bl_number}}, {{container_number}}
- Items: {{#each items}}{{this.number}}, {{this.description}}, {{this.quantity}}, {{this.unit_price}}, {{this.amount}}{{/each}}

Return ONLY the complete HTML starting with <!DOCTYPE html>. No markdown.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: body.mime_type, data: body.image_base64 } },
    ]);

    let html = result.response.text().trim();
    html = html.replace(/```html\n?|\n?```/g, '').trim();
    if (!html.toLowerCase().startsWith('<!doctype')) return sendJson(res, { success: false, error: 'Gemini returned invalid HTML' }, 500);
    return sendJson(res, { success: true, html_template: html });
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
