import { supabase } from '../config/supabase.js';

const CHECK_TIMEOUT_MS = 5000;

/** Kiểm tra backend kết nối được Supabase bằng service role key. Trả về true/false. */
export async function isSupabaseUp() {
  try {
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    return !error;
  } catch {
    return false;
  }
}

export function checkSupabaseWithTimeout() {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), CHECK_TIMEOUT_MS));
  return Promise.race([isSupabaseUp(), timeout]);
}
