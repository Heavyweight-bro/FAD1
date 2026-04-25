import { json, readJson, requireUser } from './_shared';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  const authz = await requireUser(req);
  if (!authz.ok) return json({ success: false, error: authz.error }, 401);

  const body = await readJson<{ image_base64: string; mime_type: string }>(req);
  if (!body?.image_base64 || !body?.mime_type) return json({ success: false, error: 'image_base64 and mime_type required' }, 400);

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return json({ success: false, error: 'Missing GOOGLE_AI_API_KEY' }, 500);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Analyze this invoice image and return ONLY valid JSON with:

{
  "documentType": "invoice"|"proforma"|"commercial_invoice",
  "hasLogo": boolean,
  "logoPosition": {"x": number, "y": number, "width": number, "height": number} | null,
  "hasStamp": boolean,
  "stampPosition": {"x": number, "y": number, "width": number, "height": number} | null,
  "hasSignature": boolean,
  "signaturePosition": {"x": number, "y": number, "width": number, "height": number} | null,
  "tableColumns": string[],
  "sections": string[]
}

All positions are percentages (0..100). No markdown, no explanation.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: body.mime_type, data: body.image_base64 } },
  ]);

  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '');
  try {
    const analysis = JSON.parse(text);
    return json({ success: true, analysis });
  } catch {
    return json({ success: false, error: 'Gemini returned invalid JSON' }, 500);
  }
}

