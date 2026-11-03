/** GET /api/admin/ping: chỉ dùng kiểm tra phân quyền admin. */
export function getAdminPing(req, res) {
  res.json({ success: true, data: { ok: true } });
}
