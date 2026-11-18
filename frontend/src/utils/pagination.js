/** Dãy số trang gọn: luôn có trang đầu/cuối và 1 trang mỗi bên trang hiện tại; `null` = dấu "…". */
export function pageWindow(page, totalPages) {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const result = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) result.push(null);
    result.push(n);
  });
  return result;
}
