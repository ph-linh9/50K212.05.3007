-- UC1, UC1.1 - bảng tai_khoan (SDD: TAIKHOAN), chuyển sang PostgreSQL, snake_case
CREATE TABLE IF NOT EXISTS tai_khoan (
  ma_tai_khoan     SERIAL PRIMARY KEY,
  email            VARCHAR(100) NOT NULL UNIQUE,
  mat_khau         VARCHAR(255) NOT NULL,
  ma_xac_thuc      VARCHAR(10)  NULL,
  han_ma_xac_thuc  TIMESTAMP    NULL
);
