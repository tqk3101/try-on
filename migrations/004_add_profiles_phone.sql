-- =============================================================================
-- 004_add_profiles_phone.sql
-- Sprint 1 – Task 7 (US-02): thêm số điện thoại vào hồ sơ
--
-- Thêm cột public.profiles.phone:
-- - Tuỳ chọn (null = chưa nhập), KHÔNG unique (nhiều tài khoản có thể dùng chung số).
-- - Lưu dạng chuẩn hoá: số di động Việt Nam 10 chữ số, bắt đầu 03/05/07/08/09,
--   ví dụ '0912345678'. Backend phải chuẩn hoá trước khi ghi: bỏ khoảng trắng,
--   '.', '-', '(', ')' và đổi đầu '+84'/'84' thành '0'.
-- - Idempotent: chạy lại nhiều lần không lỗi, không mất dữ liệu.
-- - Không sửa 001–003 (đã áp dụng). Không đổi seed 003.
--
-- Chạy sau 001. Xem migrations/README.md.
-- =============================================================================

alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  drop constraint if exists profiles_phone_format;

alter table public.profiles
  add constraint profiles_phone_format
  check (phone is null or phone ~ '^0[35789][0-9]{8}$');

comment on column public.profiles.phone is 'Số điện thoại di động VN đã chuẩn hoá (0xxxxxxxxx, 10 số), null khi chưa nhập. Không unique.';
