import 'dotenv/config';

// An toàn: không cho phép chạy production với khóa JWT mặc định (ai cũng đoán được 'dev-secret').
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET chưa được cấu hình. Bắt buộc đặt biến môi trường JWT_SECRET khi chạy production.');
}

export const env = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: process.env.DB_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  seedEmail: process.env.SEED_EMAIL || 'chutro@gmail.com',
  seedPassword: process.env.SEED_PASSWORD || '12345678',
  smtp: {
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, from: process.env.SMTP_FROM,
  },
};
// Đề xuất cần phê duyệt (SRS chưa xác định):
export const HAN_MA_XAC_THUC_PHUT = 10;
