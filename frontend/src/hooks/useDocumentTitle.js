import { useEffect } from 'react';

export const APP_NAME = 'Try-on';

/** Đặt document.title theo định dạng "<Tên trang> — Try-on" cho route đang hiển thị. */
export default function useDocumentTitle(pageTitle) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} — ${APP_NAME}` : APP_NAME;
  }, [pageTitle]);
}
