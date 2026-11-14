CREATE TABLE IF NOT EXISTS phong_tro (
  ma_phong SERIAL PRIMARY KEY,
  ma_toa_nha INT NOT NULL REFERENCES toa_nha(ma_toa_nha) ON DELETE CASCADE,
  ten_phong VARCHAR(50) NOT NULL,
  tang INT NOT NULL,
  gia_thue NUMERIC(12,0) NOT NULL CHECK (gia_thue > 0),
  chu_ky_thanh_toan INT NOT NULL CHECK (chu_ky_thanh_toan IN (1,3,6,12)),
  trang_thai VARCHAR(20) NOT NULL CHECK (trang_thai IN ('Trống','Đang thuê','Đang sửa chữa')),
  dien_tich NUMERIC(8,2) CHECK (dien_tich > 0),
  tien_coc NUMERIC(12,0) CHECK (tien_coc >= 0),
  so_nguoi_toi_da INT NOT NULL DEFAULT 2,
  mo_ta TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_phong_ten ON phong_tro (ma_toa_nha, lower(ten_phong));
