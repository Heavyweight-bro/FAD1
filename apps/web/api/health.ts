export const config = { runtime: 'nodejs' };

export default async function handler(_req: any, res: any): Promise<void> {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ success: true, ok: true, ts: new Date().toISOString() }));
}

