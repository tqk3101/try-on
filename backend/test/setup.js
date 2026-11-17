// Chặn mọi lời gọi fetch ra ngoài: supabase-js và @google/genai đều dùng fetch, nên nếu một test
// vô tình dùng client thật thì sẽ thất bại ngay thay vì âm thầm gọi mạng (supertest dùng http cục bộ).
globalThis.fetch = async (input) => {
  throw new Error(`Test không được gọi mạng: fetch(${String(input?.url ?? input)})`);
};
