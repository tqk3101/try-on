import { useState } from 'react';
import { ImageIcon } from './icons.jsx';

/**
 * Thumbnail flat lay 3:4 (`object-contain`, không méo). `src` null hoặc ảnh lỗi -> ô giữ chỗ có chữ.
 * `widthClass` đặt chiều rộng (vd. "w-20"); `placeholderText` mặc định "Không có ảnh".
 */
export default function ProductThumb({
  src,
  widthClass = 'w-16',
  placeholderText = 'Không có ảnh',
}) {
  const [brokenSrc, setBrokenSrc] = useState(null);
  const broken = !src || src === brokenSrc;
  return (
    <div className={`${widthClass} aspect-[3/4] shrink-0 overflow-hidden rounded-xl bg-sand`}>
      {broken ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 px-1 text-center text-muted">
          <ImageIcon width={20} height={20} />
          <span className="text-[10px] leading-tight">{placeholderText}</span>
        </div>
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          onError={() => setBrokenSrc(src)}
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}
