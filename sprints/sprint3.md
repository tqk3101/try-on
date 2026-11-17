# Sprint 3: Phòng thử đồ (GenAI virtual try-on)
## Mục tiêu Sprint
Người mua chọn danh mục và thấy ảnh chính mình mặc sản phẩm (sinh bằng GenAI, có cache), chuyển sản phẩm bằng mũi tên/vuốt; dev/test chạy được không tốn chi phí nhờ provider giả lập; có test tự động cho các luồng đã verify tay ở Sprint 1–2.
User Stories: US-05 (chọn danh mục → ảnh mình mặc sản phẩm đầu tiên), US-06 (mũi tên / vuốt → sản phẩm tiếp theo)

**Trạng thái:** PLANNED (lập kế hoạch 2026-11-17). Task 1 đã có bản thiết kế (flow, schema, migration `008`/`009` **đã áp qua MCP 2026-11-17**). **Q12 đã chốt 2026-11-17: provider thật = Gemini, `stub` mặc định.** **Q13–Q22 đã chốt 2026-11-17** (người dùng trả lời từng câu, `design/flows/README.md` mục 7): theo mặc định khuyến nghị, **trừ Q15 = không sinh trước (no prefetch)**. Q13 bắt buộc cả ảnh toàn thân + chiều cao + cân nặng, Q14 có hộp thoại đồng ý một lần, Q18 30 lượt/user/ngày.

**Quyết định phạm vi (2026-11-17; Q12–Q22 đã chốt 2026-11-17; nếu cần đổi thì cập nhật backlog trước):**
- Sinh ảnh **bất đồng bộ**: `POST /api/try-on` → 202 + poll `GET /api/try-on/:id`; job chạy trong tiến trình Express (1 instance), không thêm hàng đợi ngoài (D26)
- Cache `try_on_results` theo (user, sản phẩm, `input_key`), không TTL; dọn kết quả khi thay/xoá ảnh toàn thân hoặc thay ảnh/xoá sản phẩm (D27, D29)
- Provider qua adapter `TRY_ON_PROVIDER` = `stub` | `gemini`, **mặc định `stub`**. **Đã chốt (Q12, D28, 2026-11-17): provider thật = Gemini** qua adapter `gemini` tái sử dụng `backend/src/services/geminiImageService.js` (`editImage`, SDK `@google/genai`), model `GEMINI_IMAGE_MODEL` (mặc định `gemini-3.1-flash-image`), key `GEMINI_API_KEY`; prompt cố định ở backend có `promptVersion` (nằm trong `input_key`). Đo chất lượng/giá/chính sách dữ liệu ở Task 6. Phương án đã loại: FASHN `tryon-v1.6`, Vertex AI `virtual-try-on-001`
- Điều kiện: ảnh toàn thân + chiều cao + cân nặng (Q13) + đồng ý xử lý ảnh một lần (Q14, cột `profiles.try_on_consent_at`)
- Hạn mức 30 lượt/user/ngày (giờ VN), cache hit và lỗi không tính (Q18, D30)
- **Không sinh trước (Q15, đã chốt: không prefetch)**: chỉ gửi `POST /api/try-on` cho sản phẩm user dừng lại xem (debounce 400 ms); mỗi sản phẩm mới chưa có cache chờ ~8–12 s (Gemini) với trạng thái "đang tạo" rõ ràng, không chặn điều hướng. Lý do: tiết kiệm lượt và chi phí provider
- Cuối danh sách dừng, không quay vòng; lùi lại sản phẩm trước được (Q17)
- Lối vào: link "Phòng thử đồ" ở header/`AccountMenu`, CTA landing, link ở `/profile`; **đích mặc định sau đăng nhập = `/try-on`** (Q19)
- Tra danh mục theo `id` (Q11); một prompt chung, không thêm cột loại trang phục (Q16); không có nút "Thêm vào giỏ" (Q20, US-07 ở Sprint 4)
- Giữ ảnh kết quả tới khi đầu vào đổi, không TTL, **không có nút xoá toàn bộ ảnh thử đồ** (Q22); test tự động Vitest + supertest, mock Supabase và Gemini (Q21)
- Mang từ Sprint 2: test runner + test tự động (Task 5)

**Đọc trước khi làm (CLAUDE.md, từ Sprint 2):**
- Yêu cầu: `PB.md` (Epic 3), `sprints/US-05.md`, `sprints/US-06.md`, `sprints/sprint2.md` (Q8–Q11, mục chuyển sang Sprint 3).
- Thiết kế: `design/flows/try-on-room.md` (chính; mục 2: Gemini, prompt, ánh xạ lỗi, rủi ro), `design/flows/README.md` (mục 3–7: contract, mã lỗi, route, D24–D31, Q12–Q22), `product-management.md` mục 8 (API người mua), `avatar-upload.md` (luồng thay/xoá ảnh – nơi gắn dọn kết quả), `design/database/schema.md` mục 13–14, `design/screens.md` (`/profile`, quy ước chung), `design/design-system.md`.
- Code tái sử dụng: `requireAuth` (`middlewares/auth.js`), `rateLimiters.js` (`createLimiter` theo `req.user.id`), `storageService.js` (`uploadObject/removeObject/signUrl(s)` theo bucket), `utils/image.js` (`detectImageType`), `categoryService.listBuyerCategories/getBuyerCategory`, `productService.listBuyerProducts/deleteProduct/updateProduct`, `avatarService.js`; frontend `apiClient`, `routes/guards.jsx`, `AuthProvider` (`useAuth`, `updateUser`), `useProfile`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `ToastProvider` (`tone`), `useDocumentTitle`, `utils/format.js` (`formatVnd`).
- `common_errors.md`: 1.1 (GRANT `service_role` – đã có trong `008`), 1.2 (áp migration và verify **trước** khi code backend), 1.3 (xoá dữ liệu qua MCP do agent chính chạy), 3.5 (mock còn sót khi bàn giao UI), 4.3 (hợp đồng API – `Profile` thêm `tryOnConsentAt`, shape `TryOn`), 5.3/6.2/6.3 (cổng, không kill theo tên), 7.1/7.1b (dọn user/object test, thêm bucket `try-on-results`), 7.3 (limiter làm test dừng giữa chừng).
- **Điều kiện tiên quyết:** kết nối lại Supabase MCP (cuối Sprint 2 `execute_sql` báo `28P01`).

## Tasks
### 1. Thiết kế flow, DB/Storage và chọn nhà cung cấp GenAI (Priority: High) — agent-ba (+ agent chính áp migration)
**Mô tả:** Thiết kế phòng thử đồ, API, cache, hạn mức, quyền riêng tư; so sánh và chọn provider GenAI; mở rộng schema hiện có (không tạo bản song song).

**Công việc:**
- [x] `design/flows/try-on-room.md` (provider, kiến trúc bất đồng bộ, API, sequence server, activity frontend, dọn dữ liệu, hạn mức) và cập nhật `design/flows/README.md` (contract, mã lỗi, route, D26–D31, Q12–Q22)
- [x] `sprints/US-05.md`, `sprints/US-06.md`
- [x] `design/database/schema.md` mục 13–14; `migrations/008_create_try_on_results.sql`, `009_create_try_on_results_bucket.sql` (RLS bật, REVOKE anon/authenticated, GRANT `service_role`); `migrations/README.md`
- [x] Q12 đã chốt (2026-11-17): Gemini là provider thật (adapter `gemini`), `stub` mặc định; đã cập nhật `try-on-room.md` mục 2, README D27/D28/Q12/Q16, `schema.md`, comment `008`, `migrations/README.md`
- [x] Người dùng chốt Q13–Q22 (2026-11-17: mặc định, trừ Q15 = không prefetch); đã bỏ chữ "đề xuất" ở D26, D27, D29–D31; đã bỏ prefetch khỏi `try-on-room.md`, README, US-06, sprint backlog
- [x] Áp `008` → `009` qua Supabase MCP (đã áp và verify 2026-11-17) và verify (`list_migrations`, `role_table_grants`, RLS, 2 unique index một phần, cột `profiles.try_on_consent_at`, bucket `try-on-results` private 10MB jpeg/png/webp); cập nhật trạng thái ở `CLAUDE.md`, `migrations/README.md`, `schema.md`

**Acceptance Criteria:**
- Flow, contract, schema, migration khớp nhau và không mâu thuẫn tài liệu Sprint 1–2
- `service_role` truy cập được `try_on_results`; `anon`/`authenticated` không có quyền
- Provider đã chốt (Gemini, Q12) và có phương án `stub` mặc định cho dev/test; tài liệu không còn nhắc provider đã loại ngoài các dòng "phương án đã loại"

---

### 2. Thiết kế màn hình + UI layer phòng thử đồ (Priority: High) — agent-uiux
**Mô tả:** Mô tả màn hình và code UI (mock data, happy case + đủ trạng thái) cho `/try-on` và `/try-on/:categoryId`. Làm song song Task 3 sau khi Task 1 chốt contract.

**Công việc:**
- [x] Cập nhật `design/screens.md` (mục mới "Phòng thử đồ"): chọn danh mục; phòng thử đồ (ảnh 3:4, tên, giá, "n/N", flat lay thu nhỏ, mũi tên, nhãn "Ảnh mô phỏng"); màn "Hoàn thiện hồ sơ"; hộp thoại đồng ý xử lý ảnh; trạng thái đang tạo (skeleton/ảnh toàn thân mờ + "Đang thử đồ {tên}…" + bộ đếm giây; hiện ngay khi chuyển sang sản phẩm chưa có ảnh vì không prefetch – Q15; mũi tên/vuốt/phím vẫn hoạt động, không chặn), lỗi theo `error.code` + Thử lại, hết lượt, danh mục rỗng, cuối danh sách; responsive 375/768/1280; a11y (`aria-live`, phím ←/→, vùng chạm 44 px)
- [x] Cập nhật `design/design-system.md` nếu thêm component dùng chung (ví dụ khung ảnh 3:4 có lớp trạng thái, nút mũi tên nổi)
- [x] Code UI với mock (`src/mocks/tryOnMock.js`; đã chạy thử trình duyệt 1280/768/375 px với Playwright, mọi trạng thái bằng `?mock=<kịch bản>`; chưa test thiết bị cảm ứng thật, Safari/Firefox, trình đọc màn hình thật): trang, component, vuốt bằng Pointer Events (`touch-action: pan-y`), phím ←/→, giữ vị trí `?product=` (replace), route trong `router.jsx` + `PATHS`, link "Phòng thử đồ" ở header/`AccountMenu`, CTA landing cho user đã đăng nhập, link "Vào phòng thử đồ" ở `/profile` khi hồ sơ đủ
- [x] Ghi danh sách điểm TODO nối API cụ thể cho agent-coder (common_errors 3.5): cuối mục "Phòng thử đồ" ở `design/screens.md` ("Mock và điểm nối API") + `TODO(Task4)` trong `features/tryOn/tryOnApi.js`, `mocks/tryOnMock.js`

**Acceptance Criteria:** `screens.md` khớp `try-on-room.md` mục 9 và US-05/06; UI chạy được với mock ở mọi trạng thái; chuyển sang sản phẩm chưa có ảnh → tên/giá/flat lay đổi ngay (< 100 ms) và khung ảnh hiện trạng thái đang tạo, nút mũi tên vẫn bấm được trong lúc chờ; không render nút "Thêm vào giỏ" (Q20) và không có nút xoá toàn bộ ảnh thử đồ (Q22); lint + build sạch; router import trang mới (common_errors 5.2); 375px không cuộn ngang.

---

### 3. Backend API thử đồ + cache + hạn mức + bảo mật (Priority: High) — agent-coder
**Mô tả:** Cài đặt đúng `design/flows/try-on-room.md` mục 2–8 với provider `stub`. Chỉ bắt đầu sau khi `008`/`009` đã áp và verify (common_errors 1.2).

**Công việc (hoàn thành và verify 2026-11-18; ghi chú ở cuối mục):**
- [x] Provider adapter (`services/tryOn/providers/`) + `stub` (`TRY_ON_STUB_MODE` = `success | fail | slow`, `TRY_ON_STUB_DELAY_MS`, trả lại ảnh toàn thân, `simulated: true`); đọc env mới, cập nhật `backend/.env.example` (không giá trị thật) và README
- [x] `POST /api/try-on`, `GET /api/try-on/:id`, `GET /api/try-on/quota`, `POST /api/try-on/consent` (khai báo trước `/:id`); `Profile` thêm `tryOnConsentAt` (báo agent khác: thay đổi bổ sung contract)
- [x] Job runner trong tiến trình: semaphore `TRY_ON_MAX_CONCURRENCY`, timeout, chuyển trạng thái có điều kiện, kiểm tra magic bytes kết quả (mở rộng `detectImageType` cho webp nếu cần), upload `try-on-results`, dọn object khi UPDATE 0 dòng; phát hiện job treo
- [x] Cache theo `input_key` + xử lý `23505` khi request song song; hạn mức ngày giờ VN (429 `TRY_ON_QUOTA_EXCEEDED` + `Retry-After`); `tryOnLimiter` (POST 20/phút), `tryOnPollLimiter` (GET 120/phút)
- [x] Dọn kết quả: gắn vào `avatarService` (thay/xoá ảnh toàn thân) và `productService` (thay ảnh / xoá sản phẩm – SELECT `result_path` trước khi DELETE); không đổi hành vi API cũ
- [x] Adapter `gemini` (`services/tryOn/providers/gemini.js`) theo `try-on-room.md` mục 2.2–2.4: prompt **cố định ở backend** + hằng `promptVersion` (bản gốc: `PROMPT` trong `backend/scripts/gemini-try-on.js`), người dùng **không** nhập prompt, không chèn dữ liệu người dùng vào prompt; `input_key` gồm provider, model, `promptVersion`
- [x] Sửa `geminiImageService.editImage`: `GEMINI_IMAGE_MODEL` trống phải về mặc định (đang dùng `??` nên `''` thành model rỗng → dùng `||`); nhận `abortSignal`; trả thêm `finishReason`, `promptFeedback.blockReason`, `responseId`; phân biệt lỗi thiếu key. Giữ script `backend/scripts/gemini-*.js` chạy được
- [x] Ánh xạ lỗi Gemini → mã lỗi hiện có (mục 2.4): 404 model / 401-403 key → `PROVIDER_UNAVAILABLE` + đánh dấu provider không khả dụng (POST sau → 503 `TRY_ON_UNAVAILABLE`); 429 quota, 5xx, lỗi mạng → `PROVIDER_UNAVAILABLE`; abort → `GENERATION_TIMEOUT`; 400 ảnh vào, `blockReason`/`finishReason` an toàn → `INPUT_REJECTED`; không có ảnh trả về / ảnh không phải jpeg/png/webp / lỗi khác → `GENERATION_FAILED`. Test bằng mock, không gọi API thật
- [x] Ảnh kết quả lưu theo mime thực (magic bytes; Gemini có thể trả kích thước/mime khác ảnh vào)
- [x] Log không chứa ảnh/base64/URL ký/số đo/phản hồi thô provider/API key

**Acceptance Criteria:**
- Mọi mã lỗi và shape response đúng contract; không lộ `*_path`, `input_key`, provider
- Với `TRY_ON_PROVIDER=gemini`: thiếu `GEMINI_API_KEY` → backend vẫn khởi động, POST 503 `TRY_ON_UNAVAILABLE`; mỗi tình huống lỗi Gemini ở `try-on-room.md` mục 2.4 cho đúng `error_code` (test mock); không có endpoint/tham số nào cho người dùng truyền prompt
- Cache hit trả 200 không tăng `quota.used`; 2 POST song song → 1 row; user khác → 404
- Thay/xoá ảnh toàn thân, thay ảnh/xoá sản phẩm dọn sạch rows + object kết quả liên quan
- Restart backend khi job đang chạy → GET sau ngưỡng trả `failed`/`GENERATION_TIMEOUT`, Thử lại được
- Regression: API avatar, sản phẩm admin, API người mua Sprint 2 giữ nguyên hành vi; lint sạch

**Ghi chú verify Task 3 (2026-11-18):** lint backend sạch. Chạy backend thật (cổng 3100) với provider `stub` trên Supabase thật: 53 + 18 kiểm tra bằng script tạm ngoài repo đều đạt (401/400/404, 409 PROFILE_INCOMPLETE/TRY_ON_CONSENT_REQUIRED, 202 → poll → succeeded, cache hit 200 không tăng quota, 2 POST song song → 1 row, 429 quota + Retry-After, limiter POST/GET, user khác 404, stub fail/slow, restart giữa chừng → GENERATION_TIMEOUT sau ngưỡng, dọn rows + object khi thay/xoá ảnh toàn thân và thay ảnh/xoá sản phẩm, regression Sprint 1–2). Ánh xạ lỗi Gemini, semaphore, kiểm tra magic bytes/webp, khoá cache, cửa sổ ngày VN: 12 nhóm kiểm tra bằng mock (không gọi API). Gemini thật: đã chạy ĐÚNG 1 job qua toàn stack bằng ảnh tổng hợp (thành công ~12 s, kết quả JPEG lưu theo magic bytes). Dữ liệu test đã dọn (`try_on_results` = 0, `storage.objects` = 0, không còn user/sản phẩm test). **Chưa làm:** gọi `ai.models.get` khi khởi động (best-effort, mục 2.2 try-on-room.md); chưa có test tự động trong repo (Task 5 viết bằng Vitest). `promptVersion` hiện là `p2` (prompt đã tổng quát hoá khỏi áo vest).

---
### 4. Nối frontend – API phòng thử đồ (Priority: High) — agent-coder
**Mô tả:** Thay mock của Task 2 bằng API thật; polling, debounce, xử lý lỗi theo `error.code`. Không prefetch (Q15).

**Công việc:**
- [x] (code xong 2026-11-18; đã verify trình duyệt 2026-11-18) `services/tryOnApi.js` (`requestTryOn`, `getTryOn`, `getQuota`, `giveConsent`); `features/tryOn/` (hook quản lý `Map<productId, TryOn>`, poll 2 s tối đa 120 s, chỉ poll sản phẩm đang hiển thị – rời sản phẩm thì dừng poll của nó, job vẫn chạy ở server, quay lại thì GET ngay; `AbortController` khi rời trang)
- [x] (code + test hook; đã verify trình duyệt 2026-11-18) Debounce 400 ms: chỉ gửi POST cho sản phẩm user dừng lại ≥ 400 ms; **không prefetch** sản phẩm kế tiếp (Q15)
- [x] (code + test hook; đã verify trình duyệt 2026-11-18) `<img onError>` → GET lại một lần; 409 `PROFILE_INCOMPLETE` / `TRY_ON_CONSENT_REQUIRED`, 429, 503, `failed` hiển thị đúng màn/khối
- [x] (code + test guards/AuthProvider + docs; đã verify trình duyệt 2026-11-18) Đọc `tryOnConsentAt` từ profile; đích mặc định sau đăng nhập = `/try-on` (Q19 đã chốt): đổi fallback trong `GuestOnly`/`safeRedirect` từ `/profile` sang `/try-on` (vẫn ưu tiên `?redirect=` hợp lệ) và cập nhật tài liệu cùng lúc: `design/flows/login.md`, `logout-protected-routes.md`, `design/screens.md` (mục đăng nhập, `/profile` "Đến từ")
- [x] `grep` không còn mock (`tryOnMock`)

**Đã verify trình duyệt thật (agent chính, 2026-11-18; Chrome headless + Supabase thật, provider stub, backend 3100/frontend 5174):** guest -> `/login?redirect=%2Ftry-on`; đăng nhập có và không có `?redirect=` -> `/try-on` (Q19); hộp thoại đồng ý nêu Google Gemini API, chưa có POST trước khi đồng ý; ảnh đầu hiện kèm nhãn "Ảnh mô phỏng" và "1/4"; bấm mũi tên -> thông tin đổi sau 67 ms và "Đang thử đồ {tên}…" sau 72 ms, mũi tên vẫn bấm được; quay lại sản phẩm đã có -> 63 ms, 0 POST; bấm nhanh 3 lần A->D chỉ POST cho D, sản phẩm C chưa mở không bị POST (kiểm qua request thật); cuối danh sách mũi tên phải disabled + thẻ "Đã xem hết"; stub `fail` -> "Chưa tạo được ảnh thử đồ. Vui lòng thử lại." + Thử lại (1 POST mới, job lỗi không tính lượt); hết lượt (limit 2) -> server 429, khối "Lượt thử mới có lại từ 00:00 ngày mai", vẫn xem lại ảnh đã tạo; thiếu ảnh toàn thân -> màn "Hoàn thiện hồ sơ" không POST; 375px không cuộn ngang ở danh mục/phòng/hết lượt. Dữ liệu test đã dọn (results = 0, objects = 0, products = 0, consent/avatar về null, member 162/50.5). CHƯA verify: cảm ứng thật/Safari/Firefox (vuốt mới chạy bằng sự kiện tổng hợp ở Task 2), trình đọc màn hình, ảnh thử đồ Gemini thật (Task 6), mục 11 của try-on-room.md chỉ chạy một phần (đồng thời nhiều tab, restart giữa chừng đã được Task 3 verify ở API).

**Acceptance Criteria:** đạt Acceptance Criteria của US-05 và US-06 trên trình duyệt thật + DB/Storage thật với provider `stub` (desktop + mobile 375px); bấm mũi tên sang sản phẩm chưa có ảnh → POST gửi sau debounce, hiện trạng thái đang tạo rồi ảnh, cache hit hiện ngay; không có POST nào cho sản phẩm user chưa mở (kiểm tra tab Network); đăng nhập không có `?redirect=` → về `/try-on`; kịch bản trong `try-on-room.md` mục 11 chạy qua; dữ liệu test đã dọn (`try_on_results` = 0, `storage.objects` bucket `try-on-results` = 0, `avatars`/`products` về trạng thái trước test). **[Đã đạt 2026-11-18, trừ ghi chú CHƯA verify ở trên; 2 lỗi nhỏ phát hiện chuyển sang Task 7 (7a, 7b).]**

---

### 5. Test runner + test tự động (Priority: Medium) — agent-coder (mang từ Sprint 2)
**Mô tả:** Thêm hạ tầng test và test cho các luồng đã verify tay ở Sprint 1–2 và luồng mới Sprint 3. Có thể làm song song Task 2–3 (nên xong trước Task 4 để test luồng mới).

**Công việc:**
- [x] Backend: Vitest (bản mới nhất, tra Context7) + `supertest`; script `npm test`; mock lớp `config/supabase.js` và Gemini (`geminiImageService`) (Q21: không chạm DB thật, không gọi API Gemini thật trong test tự động) **Xong 2026-11-17:** Vitest 5.1.0 + supertest 7.3.2; `backend/vitest.config.js` (env giả, stub nhanh), `test/setup.js` chặn `fetch`; `npm test`, `npm run test:watch`
- [x] Backend test: validators (auth, profile, category, product), `utils/image.js` (magic bytes, kích thước PNG/JPEG), `requireAuth`/`requireAdmin` (401/403), envelope lỗi, limiter, multer map lỗi (413/415/400), try-on (khoá cache, hạn mức, chuyển trạng thái, stub success/fail/slow, 404 user khác) **Xong:** 286 test / 19 file (validators, image magic bytes + kích thước + WebP, requireAuth/requireAdmin role từ DB, errorHandler + Retry-After, limiter login chỉ tính 401 / register / avatar / try-on, multer 413/400/415, HTTP auth/profile/avatar/admin danh mục + sản phẩm/API người mua, try-on: khoá cache, hạn mức ngày giờ VN, chuyển trạng thái, stub success/fail/slow, ánh xạ lỗi Gemini bằng mock, 404 user khác, 2 POST song song -> 1 row, dọn kết quả khi thay/xoá ảnh toàn thân và thay ảnh/xoá sản phẩm, restart giữa chừng -> GENERATION_TIMEOUT)
- [x] Frontend: Vitest 5.1.0 + jsdom + Testing Library (`frontend/test/`); script `npm test`, `npm run test:watch`; test `safeRedirect`, `avatarCheck`/`productImageCheck`, `format`, `authValidation`, `profileValidation`, `apiClient` (401 chỉ khi đã gửi token), guards (`RequireAuth`, `GuestOnly`, `RequireAdmin`), `AuthProvider` (khôi phục phiên, đăng xuất, đăng nhập): 82 test. **Chưa làm:** hook polling try-on (fake timers) vì `useTryOnRoom` còn đang dùng mock (đợi Task 4)
- [x] Frontend: test hook polling/tải try-on với fake timers (làm sau khi Task 4 nối API thật vào `features/tryOn`)
- [x] Cập nhật mục **Commands** trong `CLAUDE.md` và README

**Acceptance Criteria:** `npm test` chạy được ở cả `backend/` và `frontend/`, pass, không cần mạng/DB thật; có test cho các luồng chính Sprint 1–3 liệt kê trên; lint sạch.

---

### 6. Tích hợp Gemini + đo chất lượng/độ trễ/chi phí (Priority: Medium) — agent-coder (+ agent-ba đánh giá)
**Mô tả:** Q12 đã chốt (Gemini). Bật `TRY_ON_PROVIDER=gemini` với `GEMINI_API_KEY` của người dùng (chỉ trong `backend/.env`, không commit), đo chất lượng trên bộ ảnh chuẩn trước khi coi là dùng được. Đã thử nghiệm sơ bộ 2026-11-17 (1 cặp ảnh người mẫu + áo vest, ~10–12 s/ảnh – `try-on-room.md` mục 2.1).

**Công việc:**
- [ ] Tra **giá chính thức** của `gemini-3.1-flash-image` (và model dự phòng `gemini-3-pro-image`, `gemini-2.5-flash-image`) và **chính sách dữ liệu tier trả phí vs miễn phí** (dùng để huấn luyện? thời gian lưu giữ?) trên trang chính thức của Google (Context7 / web); xác nhận project dùng tier trả phí
- [ ] Đo chất lượng trên bộ ảnh mẫu có giấy phép (không dùng ảnh người thật có danh tính), ≥ 10 cặp: người **toàn thân** (đầu tới chân) × **áo thun** flat lay, **sơ mi**, **váy**, **quần**, sản phẩm **hoa văn nhỏ**; tiêu chí: giữ mặt/tóc/tư thế/đồ khác/nền, đúng màu và hoạ tiết, không thêm đồ. Tổng quát hoá prompt (bỏ chi tiết riêng áo vest, nhấn mạnh giữ sắc độ màu), tăng `promptVersion` khi đổi
- [ ] **Chốt model** (mặc định `gemini-3.1-flash-image`; so sánh với `gemini-3-pro-image` nếu chất lượng chưa đạt) và `promptVersion`; kiểm tra danh sách model còn khả dụng (`ai.models.list()`)
- [ ] Ghi kết quả vào `design/flows/try-on-room.md` mục 2.1: p50/p95 độ trễ, tỉ lệ lỗi theo `error_code`, nhận xét chất lượng theo loại trang phục, giá/ảnh, chính sách dữ liệu, model + `promptVersion` chốt
- [ ] Thiếu key → 503 `TRY_ON_UNAVAILABLE`, backend vẫn khởi động

**Acceptance Criteria:** ảnh thử đồ Gemini hiển thị trong phòng thử đồ (`simulated: false`); p95 ≤ 30 s; giá/ảnh (nguồn chính thức), chính sách dữ liệu tier trả phí, model và `promptVersion` chốt được ghi trong `try-on-room.md` mục 2.1; bộ ảnh đủ 6 loại ở trên đã chạy và có nhận xét; model sai (vd tên bị gỡ) → job `PROVIDER_UNAVAILABLE` rồi POST 503 `TRY_ON_UNAVAILABLE`, không crash; không lộ API key, ảnh, base64 trong repo, log, response.

---

### 7. Nợ kỹ thuật & tài liệu (Priority: Low)
- [ ] Tạo `design/PRD.md` (chưa tồn tại dù là đầu ra của agent-ba): executive summary, danh sách tính năng US-01..US-09 + trạng thái, NFR, dependencies, chỉ mục API (trỏ tới `design/flows/README.md`, không chép lại) — agent-ba
- [ ] Landing: CTA hero "Thử ngay" cho user đã đăng nhập (`screens.md` landing ghi "để sprint sau"), thẻ danh mục mock dẫn tới `/try-on` — agent-uiux (gộp Task 2 nếu tiện)
- [ ] Chuyển `ConfirmDialog` từ `components/profile/` sang `components/` (design-system ghi "nên chuyển"), giữ hành vi `/profile` và admin — agent-coder
- [ ] Bổ sung `common_errors.md` 7.1b: bucket `try-on-results` trong danh sách kiểm tra dọn object — agent chính

- [ ] **7a (phát hiện khi verify Task 4)** Badge "Còn n lượt hôm nay" không được làm mới sau khi job `failed`: server báo còn 6 lượt (job lỗi không tính) nhưng giao diện vẫn hiện 5 vì lấy số "trừ 1" từ phản hồi POST 202. Sửa: khi job kết thúc `failed` (hoặc 429) gọi `getQuota()` cập nhật badge; thêm test hook (fake timers) + verify trình duyệt
- [ ] **7b (phát hiện khi verify Task 4)** Mất focus bàn phím ở cuối danh sách: khi nút "Sản phẩm tiếp theo" thành disabled thì focus rơi về `body`, phím ←/→ (gắn `onKeyDown` trên vùng phòng thử đồ theo `screens.md`) ngừng hoạt động cho tới khi Tab lại. Sửa: chuyển focus về khung ảnh (`tabIndex=0`) khi nút đang focus bị disabled (hoặc dùng `aria-disabled`); cập nhật `screens.md` mục a11y; test bằng Testing Library
- [ ] **7c (từ Task 5)** `TryOnProviderError` không lưu `finishReason` nên log job luôn in `finishReason=-`; lưu thuộc tính này (không lộ ra client) và thêm test
**Acceptance Criteria:** mỗi mục hoàn thành không phá tính năng cũ; lint + build sạch.

## Definition of Done
- Code được review; lint/build chạy không lỗi; `npm test` pass (từ khi Task 5 xong)
- Chức năng được test trên trình duyệt thật + DB/Storage thật (provider `stub`); dữ liệu test được dọn (`common_errors.md` 7.1/7.1b, thêm bucket `try-on-results`)
- Mỗi user story trên branch `feature/US-xx-<tên>`, chỉ merge `main` (`--no-ff`) sau khi đạt acceptance criteria
- Tài liệu (`schema.md`, flows, `screens.md`, `CLAUDE.md`, README, `.env.example`) cập nhật; lỗi mới ghi vào `common_errors.md`
- Không đưa `.env*`, `GEMINI_API_KEY`/API key provider, `.mcp.json`, mật khẩu plaintext vào repo public

## Notes
- Thứ tự: Task 1 (chốt Q + áp migration) → Task 2 và Task 3 song song → Task 4 → Task 6. Task 5 bắt đầu được ngay sau Task 1 và nên xong trước Task 4. Task 7 khi rảnh.
- US-06 phụ thuộc US-05 (cùng trang, cùng API); có thể làm chung một branch `feature/US-05-try-on-room`.
- Mọi phát sinh ngoài danh sách này phải được ghi vào đây trước khi làm
