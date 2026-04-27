export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any): Promise<void> {
  return safe(res, async () => {
    if (req.method !== 'POST') return sendJson(res, { success: false, error: 'Method not allowed' }, 405);
    const authz = await requireUser(req);
    if (!authz.ok) return sendJson(res, { success: false, error: authz.error }, 401);

    const body = await readJson<{ image_base64: string; mime_type: string }>(req);
    if (!body?.image_base64 || !body?.mime_type) return sendJson(res, { success: false, error: 'image_base64 and mime_type required' }, 400);

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return sendJson(res, { success: false, error: 'Missing GOOGLE_AI_API_KEY' }, 500);

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
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
      return sendJson(res, { success: true, analysis });
    } catch {
      return sendJson(res, { success: false, error: 'Gemini returned invalid JSON' }, 500);
    }
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
