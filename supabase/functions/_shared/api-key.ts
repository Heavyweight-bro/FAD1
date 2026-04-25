import { getSupabaseAdmin } from './supabase.ts';
import { sha256Hex } from './crypto.ts';

export async function verify1cApiKey(req: Request): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { ok: false, error: 'Missing Authorization: Bearer <key>' };

  // Prefer api_keys table (multiple keys). Fallback to settings.api_key_1c (single key).
  const supabase = getSupabaseAdmin();

  const keyHash = await sha256Hex(token);

  const { data: keyRow, error: keyErr } = await supabase
    .from('api_keys')
    .select('id,is_active')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!keyErr && keyRow?.is_active) {
    await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRow.id);
    return { ok: true };
  }

  const { data: setting, error: settingErr } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'api_key_1c')
    .maybeSingle();

  if (settingErr) return { ok: false, error: 'Settings lookup failed' };
  if (!setting?.value) return { ok: false, error: '1C API key is not configured' };

  const settingHash = await sha256Hex(setting.value);
  if (settingHash !== keyHash) return { ok: false, error: 'Invalid API key' };

  return { ok: true };
}

