const REQUIRED_VARS = [
  'CLIENT_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  throw new Error(
    `Thiếu biến môi trường bắt buộc: ${missing.join(', ')}. Hãy copy backend/.env.example thành backend/.env và điền giá trị.`,
  );
}

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error('PORT phải là số nguyên dương.');
}

export const env = Object.freeze({
  port,
  clientUrl: process.env.CLIENT_URL.trim(),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN.trim(),
  supabaseUrl: process.env.SUPABASE_URL.trim(),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
