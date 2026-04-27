import { readJson, requireUser, safe, sendJson } from './_shared';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any): Promise<void> {
  return safe(req, res, async () => {
    if (req.method !== 'POST') return sendJson(res, { success: false, error: 'Method not allowed' }, 405);
    const authz = await requireUser(req);
    if (!authz.ok) return sendJson(res, { success: false, error: authz.error }, 401);

    const body = await readJson<{ supplier_id?: string; image_base64: string; mime_type: string }>(req);
    if (!body?.image_base64 || !body?.mime_type) return sendJson(res, { success: false, error: 'image_base64 and mime_type required' }, 400);

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return sendJson(res, { success: false, error: 'Missing GOOGLE_AI_API_KEY' }, 500);

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

