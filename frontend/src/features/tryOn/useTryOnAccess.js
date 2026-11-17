import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchProfile, giveConsent as giveConsentApi } from './tryOnApi.js';

const FIELD_LABELS = {
  avatar: 'Ảnh toàn thân',
  heightCm: 'Chiều cao',
  weightKg: 'Cân nặng',
};

/**
 * Điều kiện vào phòng thử đồ (design/flows/try-on-room.md mục 5): ảnh toàn thân + chiều cao + cân nặng
 * (màn "Hoàn thiện hồ sơ") và đã đồng ý xử lý ảnh (hộp thoại đồng ý).
 * status: 'loading' | 'error' | 'ready'.
 * `markProfileIncomplete(fields)` / `markConsentMissing()`: server trả 409 dù client tưởng đã đủ
 * (server là nguồn sự thật) -> hiện lại màn / hộp thoại tương ứng.
 */
export function useTryOnAccess() {
  const [state, setState] = useState({ status: 'loading', profile: null, error: '' });
  const [serverMissing, setServerMissing] = useState(null);
  const [consentRevoked, setConsentRevoked] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { profile } = await fetchProfile({ signal: controller.signal });
        setState({ status: 'ready', profile, error: '' });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setState({
          status: 'error',
          profile: null,
          error: error.message || 'Không thể tải hồ sơ. Vui lòng thử lại.',
        });
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading', profile: null, error: '' });
    setServerMissing(null);
    setConsentRevoked(false);
    setAttempt((n) => n + 1);
  }, []);

  const missing = useMemo(() => {
    const profile = state.profile;
    if (!profile) return [];
    const fields = [];
    if (!profile.avatarUrl || serverMissing?.includes('avatar')) fields.push('avatar');
    if (profile.heightCm == null || serverMissing?.includes('heightCm')) fields.push('heightCm');
    if (profile.weightKg == null || serverMissing?.includes('weightKg')) fields.push('weightKg');
    return fields.map((key) => ({ key, label: FIELD_LABELS[key] }));
  }, [state.profile, serverMissing]);

  const markProfileIncomplete = useCallback((fields) => {
    const keys = Object.keys(fields ?? {}).filter((k) => k in FIELD_LABELS);
    setServerMissing(keys.length > 0 ? keys : ['avatar']);
  }, []);

  const markConsentMissing = useCallback(() => setConsentRevoked(true), []);

  /** POST consent; ném lại ApiError cho hộp thoại hiển thị. Thành công thì cập nhật profile. */
  const giveConsent = useCallback(async () => {
    const { profile } = await giveConsentApi();
    setState((prev) => ({ ...prev, profile }));
    setConsentRevoked(false);
    return profile;
  }, []);

  const profile = state.profile;
  return {
    status: state.status,
    error: state.error,
    profile,
    reload,
    missing,
    complete: state.status === 'ready' && missing.length === 0,
    hasConsent: Boolean(profile?.tryOnConsentAt) && !consentRevoked,
    markProfileIncomplete,
    markConsentMissing,
    giveConsent,
  };
}
