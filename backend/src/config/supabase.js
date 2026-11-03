import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Client dùng service role key: bypass RLS, chỉ được dùng ở backend.
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
