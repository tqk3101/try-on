import ConfirmDialog from '../ConfirmDialog.jsx';

/**
 * Hộp thoại đồng ý xử lý ảnh (một lần, Q14). Nêu rõ ảnh được gửi tới Google (Gemini API).
 * `onAgree` gọi POST /api/try-on/consent; `onLater` ("Để sau") đưa người dùng về /try-on.
 */
export default function ConsentDialog({ open, busy, error, onAgree, onLater }) {
  return (
    <ConfirmDialog
      open={open}
      title="Cho phép xử lý ảnh của bạn?"
      description="Để tạo ảnh thử đồ, ảnh toàn thân của bạn và ảnh sản phẩm được gửi tới dịch vụ AI của Google (Gemini API). Ảnh kết quả chỉ mình bạn xem được, và bạn có thể xoá ảnh toàn thân trong Hồ sơ bất cứ lúc nào."
      confirmLabel="Đồng ý"
      cancelLabel="Để sau"
      confirmTone="primary"
      busy={busy}
      busyLabel="Đang lưu…"
      error={error}
      onConfirm={onAgree}
      onCancel={onLater}
    />
  );
}
