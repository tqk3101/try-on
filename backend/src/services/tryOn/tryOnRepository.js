import { supabase as defaultSupabase } from '../../config/supabase.js';

const ROW_COLUMNS =
  'id, profile_id, product_id, status, result_path, error_code, provider, created_at, updated_at, completed_at';
const ACTIVE_STATUSES = ['pending', 'processing'];

function dbError(action, error) {
  return new Error(`Supabase ${action} thất bại: ${error.code ?? 'unknown'}`);
}

/** Truy cập bảng try_on_results / profiles / products phục vụ thử đồ. `client` inject được để test. */
export function createTryOnRepository(client = defaultSupabase) {
  return {
    async findProduct(productId) {
      const { data, error } = await client
        .from('products')
        .select('id, image_path')
        .eq('id', productId)
        .maybeSingle();
      if (error) throw dbError('select products', error);
      return data;
    },

    async findProfile(userId) {
      const { data, error } = await client
        .from('profiles')
        .select('avatar_path, height_cm, weight_kg, try_on_consent_at')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw dbError('select profiles', error);
      return data;
    },

    /** Row mới nhất của khoá cache đang succeeded hoặc đang chạy (unique index một phần). */
    async findReusable(profileId, productId, inputKey) {
      const { data, error } = await client
        .from('try_on_results')
        .select(ROW_COLUMNS)
        .eq('profile_id', profileId)
        .eq('product_id', productId)
        .eq('input_key', inputKey)
        .in('status', ['succeeded', ...ACTIVE_STATUSES])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw dbError('select try_on_results', error);
      return data;
    },

    /** Trả { row } | { conflict: true } khi vi phạm unique (23505) | { missing: true } khi FK hỏng (23503). */
    async insertPending(values) {
      const { data, error } = await client
        .from('try_on_results')
        .insert({ ...values, status: 'pending' })
        .select(ROW_COLUMNS)
        .single();
      if (error?.code === '23505') return { conflict: true };
      if (error?.code === '23503') return { missing: true };
      if (error) throw dbError('insert try_on_results', error);
      return { row: data };
    },

    /** Chỉ chủ sở hữu (profile_id) đọc được. */
    async findOwned(id, profileId) {
      const { data, error } = await client
        .from('try_on_results')
        .select(ROW_COLUMNS)
        .eq('id', id)
        .eq('profile_id', profileId)
        .maybeSingle();
      if (error) throw dbError('select try_on_results', error);
      return data;
    },

    /** pending -> processing có điều kiện; trả row cần cho job hoặc null (đã bị xoá/đổi trạng thái). */
    async claimForProcessing(id) {
      const { data, error } = await client
        .from('try_on_results')
        .update({ status: 'processing' })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id, profile_id, product_id, avatar_path, product_image_path')
        .maybeSingle();
      if (error) throw dbError('update try_on_results (claim)', error);
      return data;
    },

    /** processing -> succeeded; true nếu cập nhật được 1 dòng. */
    async markSucceeded(id, { resultPath, providerJobId, completedAt }) {
      const { data, error } = await client
        .from('try_on_results')
        .update({
          status: 'succeeded',
          result_path: resultPath,
          provider_job_id: providerJobId ?? null,
          completed_at: completedAt,
        })
        .eq('id', id)
        .eq('status', 'processing')
        .select('id')
        .maybeSingle();
      if (error) throw dbError('update try_on_results (succeeded)', error);
      return Boolean(data);
    },

    /** pending/processing -> failed; true nếu cập nhật được 1 dòng. */
    async markFailed(id, { errorCode, providerJobId, completedAt }) {
      const { data, error } = await client
        .from('try_on_results')
        .update({
          status: 'failed',
          error_code: errorCode,
          provider_job_id: providerJobId ?? null,
          completed_at: completedAt,
        })
        .eq('id', id)
        .in('status', ACTIVE_STATUSES)
        .select('id')
        .maybeSingle();
      if (error) throw dbError('update try_on_results (failed)', error);
      return Boolean(data);
    },

    /** Số job KHÔNG failed tạo từ `sinceIso` (đầu ngày giờ VN). */
    async countUsedSince(profileId, sinceIso) {
      const { count, error } = await client
        .from('try_on_results')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('created_at', sinceIso)
        .neq('status', 'failed');
      if (error) throw dbError('count try_on_results', error);
      return count ?? 0;
    },

    /** Xoá rows của user, trả result_path (khác null) để caller xoá object. */
    async deleteByProfile(profileId) {
      const { data, error } = await client
        .from('try_on_results')
        .delete()
        .eq('profile_id', profileId)
        .select('result_path');
      if (error) throw dbError('delete try_on_results', error);
      return data.map((row) => row.result_path).filter(Boolean);
    },

    async deleteByProduct(productId) {
      const { data, error } = await client
        .from('try_on_results')
        .delete()
        .eq('product_id', productId)
        .select('result_path');
      if (error) throw dbError('delete try_on_results', error);
      return data.map((row) => row.result_path).filter(Boolean);
    },

    /** result_path của sản phẩm (trước khi xoá sản phẩm: FK CASCADE sẽ xoá rows). */
    async listResultPathsByProduct(productId) {
      const { data, error } = await client
        .from('try_on_results')
        .select('result_path')
        .eq('product_id', productId)
        .not('result_path', 'is', null);
      if (error) throw dbError('select try_on_results.result_path', error);
      return data.map((row) => row.result_path);
    },
  };
}
