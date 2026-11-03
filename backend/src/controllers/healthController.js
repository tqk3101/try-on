import { checkSupabaseWithTimeout } from '../services/healthService.js';
import { HttpError } from '../middlewares/httpError.js';

export async function getHealth(req, res) {
  const supabaseUp = await checkSupabaseWithTimeout();
  if (!supabaseUp) {
    throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'Không kết nối được tới dịch vụ dữ liệu.');
  }
  res.json({ success: true, data: { status: 'ok', supabase: 'up' } });
}
