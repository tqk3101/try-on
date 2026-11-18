import { useRef } from 'react';

export const SWIPE_THRESHOLD_PX = 50;

/**
 * Vuốt ngang bằng Pointer Events (không thư viện). Gắn kết quả lên phần tử có `touch-action: pan-y`
 * (class `touch-pan-y`) để trình duyệt vẫn cuộn dọc; khi cuộn dọc bắt đầu trình duyệt phát
 * `pointercancel` nên không bị hiểu nhầm là vuốt. Vuốt trái = tiếp theo, vuốt phải = trước đó;
 * cần |dx| >= 50 px và |dx| > |dy|.
 */
export function useSwipe({ onNext, onPrev }) {
  const startRef = useRef(null);

  return {
    onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      startRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    },
    onPointerUp(event) {
      const start = startRef.current;
      startRef.current = null;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) onNext();
      else onPrev();
    },
    onPointerCancel() {
      startRef.current = null;
    },
  };
}
