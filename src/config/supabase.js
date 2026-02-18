/**
 * Supabase client for Storage only (server-side, service-role key).
 * Do NOT use for database access.
 */
import { createClient } from '@supabase/supabase-js';
import env from './env.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export function getStorageBucket() {
  return env.STORAGE_BUCKET;
}

export default supabase;
