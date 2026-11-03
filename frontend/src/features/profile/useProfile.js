import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteAvatar, getProfile, updateProfile, uploadAvatar } from './profileApi.js';

/**
 * Trạng thái và hành động của trang hồ sơ. Chỉ nói chuyện với ./profileApi.js.
 * status: 'loading' | 'error' | 'ready'. Hành động ném lại ApiError cho nơi gọi hiển thị
 * (toast / lỗi trường), hook không tự hiện thông báo.
 */
export function useProfile() {
  const [state, setState] = useState({ status: 'loading', profile: null, error: '' });
  const mountedRef = useRef(true);
  const loadIdRef = useRef(0);
  const urlRefreshedRef = useRef(false);

  const load = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setState({ status: 'loading', profile: null, error: '' });
    try {
      const { profile } = await getProfile();
      if (mountedRef.current && loadId === loadIdRef.current) {
        urlRefreshedRef.current = false;
        setState({ status: 'ready', profile, error: '' });
      }
    } catch (error) {
      if (mountedRef.current && loadId === loadIdRef.current) {
        setState({
          status: 'error',
          profile: null,
          error: error.message || 'Không thể tải hồ sơ. Vui lòng thử lại.',
        });
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu khi vào trang
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const applyProfile = useCallback((profile) => {
    if (mountedRef.current) setState({ status: 'ready', profile, error: '' });
    return profile;
  }, []);

  /** PUT phần text; trả về profile mới. */
  const saveText = useCallback(
    async (payload) => applyProfile((await updateProfile(payload)).profile),
    [applyProfile],
  );

  /** PUT ảnh; trả về profile mới. */
  const saveAvatar = useCallback(
    async (file) => {
      const profile = applyProfile((await uploadAvatar(file)).profile);
      urlRefreshedRef.current = false;
      return profile;
    },
    [applyProfile],
  );

  /** DELETE ảnh ngay; chỉ thay phần ảnh, không đụng giá trị đang nhập trong form. */
  const removeAvatar = useCallback(async () => {
    const profile = applyProfile((await deleteAvatar()).profile);
    urlRefreshedRef.current = false;
    return profile;
  }, [applyProfile]);

  /**
   * Signed URL hết hạn (ảnh onError): gọi lại GET một lần để lấy URL mới.
   * Trả về true nếu đã lấy được URL mới; false nếu đã thử rồi hoặc lỗi (UI hiện placeholder).
   */
  const refreshAvatarUrl = useCallback(async () => {
    if (urlRefreshedRef.current) return false;
    urlRefreshedRef.current = true;
    try {
      const { profile } = await getProfile();
      if (!mountedRef.current) return false;
      setState((prev) =>
        prev.profile
          ? { ...prev, profile: { ...prev.profile, avatarUrl: profile.avatarUrl } }
          : prev,
      );
      return Boolean(profile.avatarUrl);
    } catch {
      return false;
    }
  }, []);

  return { ...state, reload: load, saveText, saveAvatar, removeAvatar, refreshAvatarUrl };
}
