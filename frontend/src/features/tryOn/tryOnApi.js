// Điểm nối dữ liệu DUY NHẤT của phòng thử đồ. Mọi thứ khác trong features/tryOn và pages chỉ import từ đây.
//
// TODO(Task4): đổi sang API thật, giữ nguyên tên và chữ ký hàm (shape: design/flows/README.md mục 3,
// design/flows/try-on-room.md mục 4):
//   fetchProfile              <- services/userApi.js `fetchProfile` (đã có) -> { profile } (cần `tryOnConsentAt`)
//   fetchCategories           <- GET /api/categories                         -> { categories }
//   fetchCategoryProducts     <- GET /api/categories/:id/products            -> { category, products }
//   requestTryOn(productId)   <- POST /api/try-on { productId }              -> { tryOn, quota }
//   getTryOn(id)              <- GET /api/try-on/:id                         -> { tryOn }
//   getQuota                  <- GET /api/try-on/quota                       -> { quota }
//   giveConsent               <- POST /api/try-on/consent                    -> { profile }
// Tạo `services/tryOnApi.js` (+ `services/categoryApi.js`), mọi hàm nhận `{ signal }` (AbortController).
// Sau khi nối: xoá `src/mocks/tryOnMock.js` và `grep -r "tryOnMock\|?mock="` phải rỗng.
export {
  fetchCategories,
  fetchCategoryProducts,
  fetchProfile,
  getQuota,
  getTryOn,
  giveConsent,
  requestTryOn,
} from '../../mocks/tryOnMock.js';
