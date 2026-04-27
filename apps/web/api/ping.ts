import { sendJson } from './_shared';

export const config = { runtime: 'nodejs' };

export default async function handler(_req: any, res: any): Promise<void> {
  return sendJson(res, { success: true, pong: true }, 200);
}

