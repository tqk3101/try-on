const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, Việt Nam không có giờ mùa hè
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ngày hạn mức tính theo giờ Việt Nam: [00:00 hôm nay, 00:00 hôm sau) (ISO UTC).
 * @param {number} nowMs
 */
export function getQuotaWindow(nowMs) {
  const startMs = Math.floor((nowMs + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
  return {
    startsAt: new Date(startMs).toISOString(),
    resetsAt: new Date(startMs + DAY_MS).toISOString(),
    secondsUntilReset: Math.max(1, Math.ceil((startMs + DAY_MS - nowMs) / 1000)),
  };
}
