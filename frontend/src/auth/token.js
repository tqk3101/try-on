/**
 * Decode payload JWT (base64url) ở client CHỈ để bỏ qua token đã hết hạn, tránh gọi API vô ích.
 * Server mới là nơi verify chữ ký. Token hỏng / thiếu `exp` coi như hết hạn.
 */
export function isTokenExpired(token) {
  try {
    const segment = token.split('.')[1];
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const { exp } = JSON.parse(new TextDecoder().decode(bytes));
    return typeof exp !== 'number' || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
