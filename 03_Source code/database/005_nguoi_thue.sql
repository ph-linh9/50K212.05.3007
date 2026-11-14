CREATE TABLE IF NOT EXISTS nguoi_thue (
  ma_nguoi_thue SERIAL PRIMARY KEY,
  ma_phong INT NOT NULL REFERENCES phong_tro(ma_phong) ON DELETE CASCADE,
  ho_ten VARCHAR(100) NOT NULL,
  so_dien_thoai CHAR(10) NOT NULL UNIQUE,
  ngay_sinh DATE NOT NULL,
  gioi_tinh VARCHAR(20) NOT NULL,
  dia_chi VARCHAR(255) NOT NULL,
  so_cccd CHAR(12) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  zalo VARCHAR(30),
  ngay_cap_cccd DATE,
  noi_cap_cccd VARCHAR(255),
  anh_cccd TEXT,
  da_dang_ky_tam_tru BOOLEAN NOT NULL DEFAULT FALSE
);
-- BR-UC4-05: email không trùng với người thuê khác (không phân biệt hoa thường)
CREATE UNIQUE INDEX IF NOT EXISTS ux_nguoi_thue_email ON nguoi_thue (lower(email));
CREATE INDEX IF NOT EXISTS ix_nguoi_thue_phong ON nguoi_thue (ma_phong);
