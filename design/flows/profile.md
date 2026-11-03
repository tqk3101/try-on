# Flow: Xem & cập nhật hồ sơ

> US-02 · Task 7 · `GET /api/user/profile`, `PUT /api/user/profile` · Upload ảnh: [avatar-upload.md](avatar-upload.md) · Quy ước: [README.md](README.md)

## Tóm tắt
User đã đăng nhập mở `/profile` → client gọi `GET` → hiển thị form (email chỉ đọc; tên hiển thị, chiều cao, cân nặng; ảnh toàn thân). Bấm **Lưu** → client gọi `PUT /api/user/profile` (JSON) nếu phần text thay đổi, rồi `PUT /api/user/profile/avatar` nếu có chọn ảnh mới (README D1, D2).

## 1. GET `/api/user/profile`

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as ProfilePage
    participant API as Express (requireAuth)
    participant DB as Supabase profiles
    participant ST as Supabase Storage avatars

    U->>FE: Mở /profile (qua RequireAuth)
    FE->>FE: Hiện skeleton
    FE->>API: GET /api/user/profile + Bearer
    alt Token thiếu / sai / hết hạn
        API-->>FE: 401 (xử lý chung, xem logout-protected-routes.md)
    else Token hợp lệ
        API->>DB: SELECT id, email, role, display_name, phone, height_cm, weight_kg, avatar_path, created_at, updated_at WHERE id = req.user.id
        alt Không có dòng
            API-->>FE: 401 INVALID_TOKEN
        else Có dòng
            opt avatar_path khác null
                API->>ST: createSignedUrl(avatar_path, 3600)
                alt Ký URL lỗi
                    API->>API: Log lỗi, avatarUrl = null (không fail request)
                else OK
                    ST-->>API: signedUrl
                end
            end
            API-->>FE: 200 { profile }
            FE-->>U: Điền form. Chưa có số đo → banner "Hoàn thiện hồ sơ để bắt đầu thử đồ"
        end
    end
    opt Lỗi mạng / 5xx
        FE-->>U: Khối lỗi thân thiện + nút Thử lại (không hiện form rỗng)
    end
```

- Signed URL hết hạn sau 1 giờ: nếu `<img>` báo `onError` khi đang mở trang lâu → gọi lại `GET` **một lần** để lấy URL mới; vẫn lỗi → hiện ảnh placeholder.
- `avatarUrl = null` do lỗi ký URL hiếm gặp; UI hiển thị như chưa có ảnh.

## 2. PUT `/api/user/profile`

**Request** `Content-Type: application/json`
```json
{ "displayName": "Lan Anh", "phone": "0912 345 678", "heightCm": 162, "weightKg": 50.5 }
```

**Validate** (client và server cùng quy tắc; server trả hết lỗi trong `fields`)

| Trường | Quy tắc | Message khi sai |
|--------|---------|-----------------|
| `displayName` | Tuỳ chọn. Thiếu / `null` / chuỗi rỗng sau trim → `null`. Nếu có: string, trim, 1–50 ký tự | "Tên hiển thị tối đa 50 ký tự." / "Tên hiển thị không hợp lệ." |
| `phone` | Tuỳ chọn. Thiếu / `null` / rỗng sau trim → `null`. Nếu có: phải là string; **chuẩn hoá** (bỏ khoảng trắng, `.`, `-`, `(`, `)`; đầu `+84` hoặc `84` → `0`) rồi khớp `^0[35789][0-9]{8}$` (số di động VN, 10 số). Lưu/trả dạng chuẩn hoá | "Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (ví dụ 0912345678)." |
| `heightCm` | **Bắt buộc**, JSON number hữu hạn (không nhận string). Làm tròn 1 chữ số thập phân **rồi** kiểm tra 100–250 | "Vui lòng nhập chiều cao." / "Chiều cao phải từ 100 đến 250 cm." |
| `weightKg` | **Bắt buộc**, JSON number hữu hạn. Làm tròn 1 chữ số thập phân rồi kiểm tra 30–250 | "Vui lòng nhập cân nặng." / "Cân nặng phải từ 30 đến 250 kg." |
| Trường khác | `email`, `role`, `avatarUrl`, `password`, `id`… **bị bỏ qua**, không báo lỗi | – |

- Client: ô số dùng `inputMode="decimal"`, chấp nhận dấu phẩy (`50,5` → `50.5`) rồi gửi **number**; ô rỗng → báo "Vui lòng nhập…" ở client.
- Body không phải JSON object → 400 `BAD_REQUEST`.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as ProfilePage
    participant API as Express (requireAuth)
    participant DB as Supabase profiles
    participant ST as Supabase Storage

    U->>FE: Sửa tên / chiều cao / cân nặng, bấm Lưu
    FE->>FE: Validate client
    alt Sai
        FE-->>U: Lỗi dưới từng trường, focus trường lỗi đầu tiên
    else Hợp lệ và phần text có thay đổi
        FE->>FE: Disable nút Lưu, hiện trạng thái đang lưu
        FE->>API: PUT /api/user/profile JSON
        API->>API: Validate, chuẩn hoá
        alt Sai
            API-->>FE: 400 VALIDATION_ERROR + fields
            FE-->>U: Map lỗi vào input
        else Hợp lệ
            API->>DB: UPDATE profiles SET display_name, phone, height_cm, weight_kg WHERE id = req.user.id RETURNING (cột tường minh)
            alt 0 dòng
                API-->>FE: 401 INVALID_TOKEN
            else Lỗi DB (23514 hoặc khác)
                API-->>FE: 500 INTERNAL_ERROR (23514 không xảy ra nếu validate đúng, chỉ log)
                FE-->>U: Toast lỗi, giữ dữ liệu đã nhập
            else OK
                API->>ST: createSignedUrl(avatar_path) nếu có
                API-->>FE: 200 { profile }
                FE->>FE: Cập nhật form + AuthContext.user.displayName
                Note over FE: Nếu có ảnh mới đã chọn → chạy tiếp avatar-upload.md
                FE-->>U: Toast "Đã lưu hồ sơ." (khi không có ảnh mới cần tải)
            end
        end
    end
```

- `updated_at` do trigger DB tự cập nhật.
- Không thay đổi gì (form text không đổi và không chọn ảnh) → nút Lưu disabled, không gọi API.

## 3. Kết hợp với upload ảnh khi bấm Lưu (D2)

| PUT profile | PUT avatar | Thông báo UI |
|-------------|-----------|--------------|
| Không gọi (không đổi) | OK | "Đã cập nhật ảnh." |
| OK | Không gọi | "Đã lưu hồ sơ." |
| OK | OK | "Đã lưu hồ sơ." |
| OK | Lỗi | "Đã lưu thông tin, nhưng chưa tải được ảnh: {message}". Giữ ảnh đã chọn, nút "Thử lại tải ảnh" |
| Lỗi 400 | Không gọi | Lỗi dưới từng trường; ảnh đã chọn vẫn giữ |
| Lỗi 5xx / mạng | Không gọi | Toast lỗi chung; giữ toàn bộ dữ liệu |

Trong suốt quá trình: nút Lưu disabled, chặn submit lặp. 401 ở bất kỳ bước nào → xử lý chung (về `/login`).

**Xoá ảnh** (`DELETE /api/user/profile/avatar`, README D18) là hành động riêng, thực hiện ngay sau khi xác nhận, không nằm trong bảng trên và không phụ thuộc nút Lưu. Chi tiết và UI: [avatar-upload.md](avatar-upload.md) mục 4. Khi form text đang có thay đổi chưa lưu, xoá ảnh không làm mất các thay đổi đó (chỉ cập nhật phần ảnh của `profile`).
