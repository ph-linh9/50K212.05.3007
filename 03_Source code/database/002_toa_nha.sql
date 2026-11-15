-- UC2.1-2.4 - bảng toa_nha 
CREATE TABLE IF NOT EXISTS toa_nha (
  ma_toa_nha          SERIAL PRIMARY KEY,
  ten_toa_nha         VARCHAR(100) NOT NULL,
  dia_chi             VARCHAR(255) NOT NULL,
  mo_ta               TEXT NULL,
  duong_dan_hinh_anh  TEXT NULL,
  ngan_hang           VARCHAR(100) NOT NULL,
  so_tai_khoan        VARCHAR(30)  NOT NULL,
  ten_chu_tai_khoan   VARCHAR(100) NOT NULL
);
-- BR-UC2-03: tên tòa nhà duy nhất, không phân biệt hoa thường
CREATE UNIQUE INDEX IF NOT EXISTS ux_toa_nha_ten ON toa_nha (lower(ten_toa_nha));
