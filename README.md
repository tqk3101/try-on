# Try-on (GenAI4Dev K1)

## Giới thiệu

Dự án "Try-on" là ứng dụng thử đồ (virtual try-on) theo hướng GenAI.

- Backlog tổng quan: xem `PB.md`
- Sprint 1 backlog: xem `sprints/sprint1.md`
- User stories chi tiết: xem `sprints/US-01.md` và `sprints/US-02.md`

## Tech stack

- Frontend: React + Vite + TailwindCSS v4, React Router
- Backend: Node.js + Express 5 (REST API, prefix `/api`)
- Database & Storage: Supabase (PostgreSQL + Storage)
- Auth: JWT (backend tự phát hành), mật khẩu hash bằng bcrypt

## Yêu cầu

- Node.js >= 22 (đã kiểm tra trên Node 26) và npm
- Một Supabase project (tạo miễn phí tại https://supabase.com)

## Thiết lập

### 1. Tạo Supabase project

1. Đăng nhập Supabase, tạo project mới.
2. Vào **Project Settings > API** (hoặc **API Keys**) và lấy:
   - **Project URL** -> `SUPABASE_URL`
   - **service_role key** -> `SUPABASE_SERVICE_ROLE_KEY`

> **Cảnh báo bảo mật:** `service_role key` có toàn quyền trên database (bỏ qua RLS). Chỉ đặt trong `backend/.env`, **tuyệt đối không** đưa vào frontend, không commit lên repo. Không commit bất kỳ file `.env` nào (chỉ commit `.env.example`).

### 2. Cấu hình biến môi trường

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Điền giá trị thật vào `backend/.env`:

| Biến                        | Ý nghĩa                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| `PORT`                      | Cổng backend (mặc định 3000)                                     |
| `CLIENT_URL`                | Origin của frontend được phép gọi API (CORS), ví dụ `http://localhost:5173` |
| `JWT_SECRET`                | Chuỗi bí mật ngẫu nhiên dài để ký JWT                            |
| `JWT_EXPIRES_IN`            | Thời hạn token, ví dụ `7d`                                       |
| `SUPABASE_URL`              | Project URL của Supabase                                         |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (chỉ backend)                                   |

Phòng thử đồ (tuỳ chọn, đều có mặc định; xem `backend/.env.example`):

| Biến                     | Ý nghĩa                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `TRY_ON_PROVIDER`        | `stub` (mặc định: trả lại ảnh toàn thân, nhãn "Ảnh mô phỏng", không gọi mạng) hoặc `gemini`    |
| `GEMINI_API_KEY`         | Chỉ cần khi `TRY_ON_PROVIDER=gemini`; thiếu key thì backend vẫn chạy, `POST /api/try-on` trả 503 |
| `GEMINI_IMAGE_MODEL`     | Trống = `gemini-3.1-flash-image`                                                                |
| `TRY_ON_DAILY_LIMIT`     | Số lượt tạo ảnh / user / ngày giờ Việt Nam (mặc định 30; cache hit và job lỗi không tính)        |
| `TRY_ON_TIMEOUT_MS`      | Thời gian tối đa mỗi lần tạo ảnh (mặc định 90000)                                               |
| `TRY_ON_MAX_CONCURRENCY` | Số job tạo ảnh chạy đồng thời (mặc định 3)                                                      |
| `TRY_ON_STUB_MODE`       | Chỉ cho `stub`: `success` (mặc định), `fail`, `slow` (vượt timeout)                          |
| `TRY_ON_STUB_DELAY_MS`   | Độ trễ giả lập của `stub` (mặc định 2000)                                                      |

Frontend (`frontend/.env`): `VITE_API_URL` (mặc định `http://localhost:3000/api`). Mọi biến `VITE_*` đều lộ ra trình duyệt, không đặt secret ở đây.

Backend sẽ không khởi động và báo rõ biến nào còn thiếu nếu cấu hình chưa đủ.

### 3. Cài đặt dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Chạy dự án

Mở hai terminal:

```bash
# Backend (auto-reload) - http://localhost:3000/api
cd backend && npm run dev

# Frontend - http://localhost:5173
cd frontend && npm run dev
```

Kiểm tra backend: `curl http://localhost:3000/api/health` -> `{"success":true,"data":{"status":"ok","supabase":"up"}}`. Nếu không kết nối được Supabase, API trả `503`. Trang chủ frontend hiển thị trạng thái gọi `/api/health`.

## Lint, format, build

```bash
# Backend
cd backend && npm run lint && npm run format

# Frontend
cd frontend && npm run lint && npm run format && npm run build
```

Production: backend `npm start`; frontend `npm run build` rồi `npm run preview`.

## Test tự động

```bash
# Backend: Vitest + supertest
cd backend && npm test            # chạy một lần
cd backend && npm run test:watch  # chạy liên tục

# Frontend: Vitest + jsdom + Testing Library
cd frontend && npm test
cd frontend && npm run test:watch
```

Test **không cần mạng, không cần `.env`, không chạm Supabase thật và không gọi Gemini thật**:

- Backend (`backend/test/`): env giả và provider thử đồ `stub` đặt trong `backend/vitest.config.js`; `config/supabase.js` được mock bằng client giả trong bộ nhớ (`test/helpers/fakeSupabase.js`, `memoryTables.js`); provider Gemini chỉ được kiểm tra qua mock `editImage`. `test/setup.js` làm `fetch` ném lỗi, nên test lỡ dùng client thật sẽ thất bại ngay thay vì gọi mạng.
- Frontend (`frontend/test/`): `VITE_API_URL` giả trong `vite.config.js`, `fetch` được stub trong từng test.
- Test tự động không thay thế kiểm thử trên trình duyệt + DB/Storage thật theo Definition of Done của sprint.

## Cấu trúc repo

- `backend/`: Express API
  - `src/config/` (env, Supabase client, JWT), `routes/`, `controllers/`, `services/`, `middlewares/`
- `frontend/`: React app
  - `src/components/`, `pages/`, `features/`, `services/` (API client), `routes/`
- `design/`: PRD, flows, schema, screens
- `migrations/`: SQL migration và seed cho Supabase
- `sprints/`: user stories + sprint backlog
- `PB.md`: product backlog
- `CLAUDE.md`: hướng dẫn cho Claude Code
- `README.md`: tài liệu dự án

## Hướng dẫn vibe code

- Bám theo các tasks liệt kê trong sprint backlog, hãy ra lệnh cho AI thực hiện từng task một. Nhớ @ các files liên quan tới tasks khi ra lệnh.
- Sử dụng các commands hợp lý trong quá trình vibe code.
- Prompt mẫu hoàn thành task 1:

```
Hãy triển khai Task 1 trong @sprints/sprint1.md: Thiết lập Project.
```

- Prompt mẫu hoàn thành task 2:

```
@PB.md, @US-01.md, @US-02.md, @sprints/sprint1.md: Hãy triển khai Task 2 trong @sprints/sprint1.md: Tạo Landing Page.
```
