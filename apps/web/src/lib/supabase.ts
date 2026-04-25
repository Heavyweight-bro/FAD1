import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

const url = getEnv('VITE_SUPABASE_URL');
const anon = getEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = url && anon ? createClient(url, anon) : null;

