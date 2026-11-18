/** Số hiển thị trên badge giỏ: "99+" khi quá lớn (ẩn khi 0 do nơi gọi quyết định). */
export const formatBadgeCount = (n) => (n > 99 ? '99+' : String(n));
