// Điểm nối dữ liệu DUY NHẤT của phòng thử đồ: mọi thứ khác trong features/tryOn và pages chỉ import từ đây.
// Shape: design/flows/README.md mục 3, design/flows/try-on-room.md mục 4.
export { fetchCategories, fetchCategoryProducts } from '../../services/categoryApi.js';
export { getQuota, getTryOn, giveConsent, requestTryOn } from '../../services/tryOnApi.js';
export { fetchProfile } from '../../services/userApi.js';
