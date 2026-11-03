// Điểm nối duy nhất giữa UI hồ sơ và API. Mọi component/hook hồ sơ chỉ import từ file này.
// Mỗi hàm trả Promise<{ profile }> hoặc ném ApiError (xem services/userApi.js).
import { deleteAvatar, fetchProfile, updateProfile, uploadAvatar } from '../../services/userApi.js';

export { fetchProfile as getProfile, updateProfile, uploadAvatar, deleteAvatar };
