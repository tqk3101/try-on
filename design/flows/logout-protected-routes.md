# Flow: Logout, bảo vệ route & phiên đăng nhập

> US-01, US-02 · Task 6 (middleware dùng lại ở Task 7) · Mã lỗi: [README.md](README.md)

## Mục lục
1. [Middleware `requireAuth` (backend)](#1-middleware-requireauth-backend)
2. [Trạng thái auth ở frontend](#2-trạng-thái-auth-ở-frontend)
3. [Route guard (frontend)](#3-route-guard-frontend)
4. [Xử lý 401 / token hết hạn trong `apiClient`](#4-xử-lý-401--token-hết-hạn-trong-apiclient)
5. [Logout](#5-logout)

## 1. Middleware `requireAuth` (backend)

Gắn cho mọi route `/api/user/*`. Không truy vấn DB (stateless); handler phía sau tự xử lý trường hợp user không còn tồn tại.

```mermaid
flowchart TD
    A[Request tới route bảo vệ] --> B{Header Authorization dạng Bearer token?}
    B -- Không --> E1[401 AUTH_REQUIRED]
    B -- Có --> C["verifyToken(token), algorithms HS256"]
    C --> D{Kết quả}
    D -- TokenExpiredError --> E2[401 TOKEN_EXPIRED]
    D -- "JsonWebTokenError / lỗi khác" --> E3[401 INVALID_TOKEN]
    D -- OK --> F{"payload.sub là UUID và role thuộc user, admin?"}
    F -- Không --> E3
    F -- Có --> G["req.user = { id: sub, role }"] --> H[next]
    H --> I{Handler: SELECT theo id = req.user.id có dòng?}
    I -- Không --> E3
    I -- Có --> J[Xử lý nghiệp vụ]
```

- Chỉ đọc header `Authorization`, không đọc token từ query/cookie.
- `requireRole('admin')` (dự phòng Epic 2): `req.user.role !== 'admin'` → 403 `FORBIDDEN`.
- Không log token.

## 2. Trạng thái auth ở frontend

`AuthProvider` (context) bọc router, giữ `{ status, user }`, `status ∈ checking | authenticated | guest | error`.

```mermaid
flowchart TD
    S([App khởi động]) --> T{Có token trong localStorage?}
    T -- Không --> GU[status = guest]
    T -- Có --> X{"Decode payload base64url: exp còn hạn?"}
    X -- "Hết hạn / decode lỗi" --> CL[tokenStorage.clear] --> GU
    X -- Còn hạn --> CK[status = checking, GET /api/user/profile]
    CK --> R{Kết quả}
    R -- 200 --> AU["status = authenticated, user = id, email, role, displayName"]
    R -- 401 --> GU2[apiClient đã xoá token] --> GU
    R -- "NETWORK_ERROR / 5xx" --> ER["status = error, giữ token, hiện màn lỗi + nút Thử lại"]
    ER -- Thử lại --> CK
```

- Decode `exp` ở client chỉ để tránh gọi API vô ích; **server mới là nơi verify**.
- Đồng bộ nhiều tab: lắng nghe `window` event `storage` với key `tryon_token`. `newValue === null` → logout cục bộ (mục 5, không gọi lại `clear`). Token mới → chạy lại bước `checking`.

## 3. Route guard (frontend)

| Guard | Áp dụng | Hành vi |
|-------|---------|---------|
| `RequireAuth` | `/profile` (và route cần đăng nhập sau này) | `checking` → spinner toàn trang; `error` → màn lỗi + Thử lại; `guest` → `<Navigate to="/login?redirect=<pathname+search>" replace />`; `authenticated` → render |
| `GuestOnly` | `/login`, `/register` | `checking` → spinner; `authenticated` → `<Navigate to={safeRedirect(redirect) hoặc /profile} replace />`; còn lại → render. Đăng ký thành công **không** tạo phiên: user vẫn `guest` và được chuyển sang `/login` (router state `registered`), không đi qua nhánh `authenticated` |

```mermaid
flowchart LR
    N[Điều hướng tới route] --> P{Loại route}
    P -- Public --> OK[Render]
    P -- RequireAuth --> Q{status}
    Q -- checking --> SP[Spinner]
    Q -- guest --> LG["/login?redirect=path hiện tại"]
    Q -- authenticated --> OK
    P -- GuestOnly --> W{status}
    W -- authenticated --> PR["safeRedirect hoặc /profile"]
    W -- "guest / error" --> OK
    W -- checking --> SP
```

Route guard chỉ là UX; dữ liệu luôn được bảo vệ ở backend bằng `requireAuth`.

## 4. Xử lý 401 / token hết hạn trong `apiClient`

Sửa `frontend/src/services/apiClient.js` (Task 6):

```mermaid
sequenceDiagram
    autonumber
    participant P as Trang (vd ProfilePage)
    participant C as apiClient
    participant API as Express
    participant A as AuthProvider

    P->>C: apiClient.get('/user/profile')
    C->>API: Request + Authorization Bearer token
    API-->>C: 401 TOKEN_EXPIRED / INVALID_TOKEN / AUTH_REQUIRED
    alt Request có gửi token (hadToken = true)
        C->>C: tokenStorage.clear()
        C->>A: unauthorizedHandler({ code })
        A->>A: Nếu đang xử lý rồi thì bỏ qua (chống gọi lặp khi nhiều request 401 cùng lúc)
        A->>A: status = guest, user = null, xoá dữ liệu cache
        A->>P: navigate tới /login?redirect=(path hiện tại)&reason=expired, replace
    else Không có token (vd login sai mật khẩu)
        C-->>P: throw ApiError(401, code) như lỗi thường
    end
```

- `reason=expired` dùng cho cả `TOKEN_EXPIRED` và `INVALID_TOKEN` (cùng một banner).
- Form đang nhập dở trên trang bị đá ra sẽ mất: chấp nhận ở Sprint 1 (profile form ngắn).

## 5. Logout

**Quyết định:** chỉ phía client, **không** có endpoint `/api/auth/logout`, **không** blacklist token (README D6). Lý do: JWT stateless, chưa có bảng phiên; blacklist cần thêm bảng + 1 truy vấn mỗi request. Hệ quả: token đã bị lộ vẫn dùng được tới `exp`. Hướng nâng cấp: `token_version` (README mục 8).

```mermaid
flowchart TD
    A([User bấm Đăng xuất ở header]) --> B[tokenStorage.clear]
    B --> C["AuthProvider: status = guest, user = null"]
    C --> D[Xoá state/cache hồ sơ, revokeObjectURL ảnh preview nếu có]
    D --> E["navigate('/', replace)"]
    E --> F[Toast: Bạn đã đăng xuất.]
    B -. sự kiện storage .-> G[Các tab khác: logout cục bộ, trang bảo vệ chuyển /login]
```

- Không cần hộp thoại xác nhận (thao tác an toàn, đăng nhập lại dễ).
- Nút "Đăng xuất" hiển thị ở header khi `status = authenticated` (vị trí cụ thể do agent-uiux chốt trong `screens.md`).
- Bấm Back sau logout về `/profile` → `RequireAuth` chuyển `/login`.
