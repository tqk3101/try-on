# Flow: Upload ảnh toàn thân (avatar)

> US-02 · Task 7 · `PUT` và `DELETE /api/user/profile/avatar` · Storage: `design/database/schema.md` mục 4 · Quy ước: [README.md](README.md)

## Tóm tắt
Mỗi user có **đúng 1 ảnh**. Ảnh mới upload vào bucket private `avatars` với path có timestamp, cập nhật `profiles.avatar_path`, xoá ảnh cũ (best-effort), trả `profile` kèm signed URL mới. Upload thành công nhưng cập nhật DB lỗi → xoá file vừa upload. User cũng có thể **xoá ảnh** để về trạng thái chưa có ảnh (mục 4, README D18).

## Request

```
PUT /api/user/profile/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=...   (trình duyệt tự đặt, apiClient không set khi body là FormData)

field "avatar": 1 file image/jpeg hoặc image/png, ≤ 5 MB
```

Frontend: `const fd = new FormData(); fd.append('avatar', file); apiClient.put('/user/profile/avatar', fd)`.

**Response 200**: `{ "success": true, "data": { "profile": Profile } }`, `profile.avatarUrl` là signed URL của ảnh mới.

## 1. Kiểm tra phía client (khi chọn file, trước khi bấm Lưu)

```mermaid
flowchart TD
    A([User chọn ảnh hoặc chụp ảnh]) --> B{"Loại là image/jpeg hoặc image/png và đuôi .jpg, .jpeg, .png?"}
    B -- Không --> E1[Lỗi: Chỉ hỗ trợ ảnh JPG hoặc PNG. Bỏ file]
    B -- Có --> C{"Dung lượng ≤ 5 MB (5 * 1024 * 1024 byte)?"}
    C -- Không --> E2[Lỗi: Ảnh vượt quá 5MB. Bỏ file]
    C -- Có --> D["Tạo objectURL, đọc naturalWidth/naturalHeight (đã xoay theo EXIF)"]
    D --> D1{Đọc ảnh được?}
    D1 -- Không --> E3[Lỗi: Không đọc được ảnh, vui lòng chọn ảnh khác. Bỏ file]
    D1 -- Có --> F{"Ảnh dọc (cao > rộng), tỷ lệ rộng/cao gần 3:4 hoặc 9:16 (±0.05), cạnh ngắn ≥ 720px?"}
    F -- Đạt --> P[Hiện preview, đánh dấu có ảnh mới chờ lưu]
    F -- "Không đạt (bất kỳ điều kiện nào)" --> W["Cảnh báo + hướng dẫn chụp ảnh toàn thân: đứng thẳng, thấy từ đầu tới chân, ảnh dọc, nền đơn giản, đủ sáng"]
    W --> W1{User chọn}
    W1 -- Chọn ảnh khác --> A
    W1 -- Vẫn dùng ảnh này --> P
```

- Kiểm tra tỷ lệ/kích thước chỉ **cảnh báo** (README D14, câu hỏi Q3). Loại và dung lượng **chặn**.
- Chọn ảnh khác thay ảnh đang chờ; `URL.revokeObjectURL` ảnh preview cũ.
- Input: `accept="image/jpeg,image/png"`; trên mobile cho phép chụp trực tiếp.

## 2. Xử lý phía server

Thứ tự middleware: `requireAuth` → `avatarLimiter` (20 / 15 phút theo `req.user.id`) → kiểm tra `req.is('multipart/form-data')` (sai → 400 `INVALID_UPLOAD`, vì multer bỏ qua request không phải multipart) → `multer` → controller. `requireAuth` chạy **trước** multer để không nhận file của request chưa xác thực.

Ánh xạ lỗi multer (`err instanceof multer.MulterError`): `LIMIT_FILE_SIZE` → 413 `FILE_TOO_LARGE`; `LIMIT_UNEXPECTED_FILE`, `LIMIT_FILE_COUNT` và mã khác → 400 `INVALID_UPLOAD`; lỗi stream không phải MulterError → 400 `INVALID_UPLOAD`. Không trả `err.filename` (input không tin cậy).

```mermaid
sequenceDiagram
    autonumber
    participant FE as ProfilePage
    participant API as Express
    participant M as multer (memoryStorage)
    participant DB as Supabase profiles
    participant ST as Supabase Storage avatars

    FE->>API: PUT /api/user/profile/avatar multipart + Bearer
    API->>API: requireAuth (401 nếu lỗi), avatarLimiter (429 nếu vượt)
    API->>M: upload.single('avatar'), limits fileSize 5 MB, files 1
    alt Không phải multipart / sai field / hơn 1 file / multipart hỏng
        M-->>FE: 400 INVALID_UPLOAD
    else LIMIT_FILE_SIZE
        M-->>FE: 413 FILE_TOO_LARGE
    else Không có file
        API-->>FE: 400 AVATAR_REQUIRED
    else Có file trong req.file.buffer
        API->>API: Kiểm tra magic bytes: JPEG FF D8 FF, PNG 89 50 4E 47 0D 0A 1A 0A
        alt Không khớp jpeg/png (bất kể mimetype/tên file client gửi)
            API-->>FE: 415 UNSUPPORTED_FILE_TYPE
        else Khớp
            API->>API: ext = jpg hoặc png theo magic bytes, contentType tương ứng
            API->>DB: SELECT avatar_path WHERE id = req.user.id
            alt Không có dòng
                API-->>FE: 401 INVALID_TOKEN
            else oldPath (có thể null)
                API->>API: newPath = userId/avatar-Date.now().ext
                API->>ST: upload(newPath, buffer, contentType, upsert false)
                alt Upload lỗi (mạng, quota, bucket từ chối)
                    API->>API: Log lỗi (không log buffer)
                    API-->>FE: 502 UPLOAD_FAILED
                else Upload OK
                    API->>DB: UPDATE profiles SET avatar_path = newPath WHERE id = req.user.id RETURNING (cột tường minh)
                    alt UPDATE lỗi hoặc 0 dòng
                        API->>ST: remove([newPath]) best-effort (dọn rác, lỗi chỉ log)
                        API-->>FE: 500 INTERNAL_ERROR (0 dòng → 401 INVALID_TOKEN)
                    else UPDATE OK
                        opt oldPath khác null và khác newPath
                            API->>ST: remove([oldPath]) best-effort, lỗi chỉ log
                        end
                        API->>ST: createSignedUrl(newPath, 3600)
                        API-->>FE: 200 { profile } (avatarUrl = null nếu ký URL lỗi)
                    end
                end
            end
        end
    end
```

## 3. Phản hồi ở frontend

| Kết quả | UI |
|---------|----|
| 200 | Thay preview bằng `profile.avatarUrl`, revoke objectURL, bỏ trạng thái "ảnh chờ lưu", toast theo bảng ở `profile.md` mục 3 |
| 400 / 413 / 415 | Message của server dưới khu vực ảnh, giữ file để user chọn lại |
| 429 / 502 / 500 / `NETWORK_ERROR` | Message thân thiện + nút "Thử lại tải ảnh", giữ file đã chọn |
| 401 | Xử lý chung (về `/login`) |

Trong lúc upload: hiển thị trạng thái đang tải trên khung ảnh, disable chọn ảnh và nút Lưu.

## Ghi chú
- Đúng quy ước schema: path `{user_id}/avatar-{epoch_ms}.{jpg|png}`, thoả CHECK `profiles_avatar_path_owner`. Bucket đã giới hạn 5 MB và MIME jpeg/png ở mức Storage: là lớp phòng thủ thứ hai.
- Hai upload đồng thời của cùng user có thể để lại 1 file mồ côi (cả hai đọc cùng `oldPath`). Hiếm, chấp nhận ở Sprint 1; client đã chặn submit lặp.
- Không log ảnh, tên file gốc, kích thước cơ thể. `req.file.originalname` không được dùng cho path.

## 4. Xoá ảnh toàn thân (`DELETE /api/user/profile/avatar`)

Q5 đã chốt: có nút xoá ảnh (README D18). Xoá là hành động **riêng, thực hiện ngay**, không đi cùng nút Lưu.

```
DELETE /api/user/profile/avatar
Authorization: Bearer <token>        (không body)
```

**Response 200**: `{ "success": true, "data": { "profile": Profile } }` với `profile.avatarUrl = null`. Idempotent: user chưa có ảnh vẫn nhận 200.

Thứ tự middleware: `requireAuth` → `avatarLimiter` (dùng chung bộ đếm với PUT) → controller. Không cần multer.

```mermaid
sequenceDiagram
    autonumber
    participant FE as ProfilePage
    participant API as Express
    participant DB as Supabase profiles
    participant ST as Supabase Storage avatars

    FE->>API: DELETE /api/user/profile/avatar + Bearer
    API->>API: requireAuth (401 nếu lỗi), avatarLimiter (429 nếu vượt)
    API->>DB: SELECT avatar_path WHERE id = req.user.id
    alt Không có dòng
        API-->>FE: 401 INVALID_TOKEN
    else oldPath = null (chưa có ảnh)
        API-->>FE: 200 { profile } (avatarUrl = null), không gọi Storage
    else oldPath có giá trị
        API->>DB: UPDATE profiles SET avatar_path = null WHERE id = req.user.id RETURNING (cột tường minh)
        alt UPDATE lỗi
            API-->>FE: 500 INTERNAL_ERROR (ảnh giữ nguyên, file chưa bị đụng tới)
        else 0 dòng
            API-->>FE: 401 INVALID_TOKEN
        else UPDATE OK
            API->>ST: remove([oldPath]) best-effort, lỗi chỉ log (file mồ côi, không fail request)
            API-->>FE: 200 { profile } (avatarUrl = null)
        end
    end
```

**Vì sao cập nhật DB trước khi xoá file**: nếu xoá file trước rồi DB lỗi, `avatar_path` trỏ tới file không còn, ảnh hỏng vĩnh viễn. Làm ngược lại, lỗi xoá Storage chỉ để lại 1 file mồ côi (tốn dung lượng, không ảnh hưởng người dùng).

### Frontend

Hai hành động khác nhau, hiển thị theo trạng thái:

| Trạng thái khung ảnh | Nút | Hành vi |
|----------------------|-----|---------|
| Có ảnh đã lưu, chưa chọn ảnh mới | **Xoá ảnh** | Mở hộp thoại xác nhận (xem dưới) → gọi `DELETE` |
| Đã chọn ảnh mới, chưa Lưu | **Bỏ ảnh đã chọn** | Chỉ phía client: revoke objectURL, quay lại ảnh đã lưu (nếu có). Không gọi API |
| Chưa có ảnh, chưa chọn gì | (không hiện nút xoá) | – |

- **Xác nhận**: "Xoá ảnh toàn thân? Bạn cần tải ảnh mới để dùng tính năng thử đồ." với nút "Xoá ảnh" (nhấn mạnh hành động nguy hiểm) và "Huỷ".
- Trong lúc gọi API: disable nút Xoá, nút Lưu và chọn ảnh; hiện trạng thái đang xử lý.
- Khi đang có ảnh mới chờ lưu thì **không** hiện "Xoá ảnh" (tránh nhầm với ảnh đang chọn).

| Kết quả | UI |
|---------|----|
| 200 | Khung ảnh về trạng thái chưa có ảnh (placeholder + hướng dẫn chọn ảnh), toast "Đã xoá ảnh." |
| 429 / 500 / `NETWORK_ERROR` | Toast message thân thiện, giữ nguyên ảnh hiện tại, cho bấm lại |
| 401 | Xử lý chung (về `/login`) |

### Ảnh hưởng tới tính năng sau
Epic 3 (thử đồ) cần ảnh toàn thân: user chưa có ảnh (kể cả sau khi xoá) phải được hướng dẫn quay lại `/profile` để tải ảnh. Kết quả thử đồ đã cache theo `avatar_path` cũ hết hiệu lực khi ảnh bị xoá (xem `schema.md` mục 9).
