-- UC5.x - Hợp đồng (SRS BR-UC5-01..14)
CREATE TABLE IF NOT EXISTS hop_dong (
  ma_hop_dong       SERIAL PRIMARY KEY,
  so_hop_dong       VARCHAR(40) NOT NULL UNIQUE,                                  -- HD + yyyymm + số phòng (BR-UC5-07)
  ma_phong          INT NOT NULL REFERENCES phong_tro(ma_phong) ON DELETE CASCADE,
  ma_nguoi_thue     INT REFERENCES nguoi_thue(ma_nguoi_thue) ON DELETE SET NULL,
  ten_khach_thue    VARCHAR(100) NOT NULL,                                        -- bản sao tên khách để giữ lịch sử khi xóa người thuê
  thoi_han_thang    INT NOT NULL CHECK (thoi_han_thang IN (3,4,5,6)),             -- BR-UC5-04
  ngay_bat_dau      DATE NOT NULL,
  ngay_ket_thuc     DATE NOT NULL CHECK (ngay_ket_thuc > ngay_bat_dau),           -- BR-UC5-05
  gia_thue          NUMERIC(14,0) NOT NULL,                                       -- lấy theo phòng (BR-UC5-03)
  tien_coc          NUMERIC(14,0) NOT NULL DEFAULT 0,
  chu_ky_thanh_toan INT NOT NULL CHECK (chu_ky_thanh_toan IN (1,3,6,12)),
  noi_dung          TEXT NOT NULL,
  hinh_anh          TEXT,
  trang_thai        VARCHAR(20) NOT NULL DEFAULT 'Hoạt động' CHECK (trang_thai IN ('Hoạt động','Hết hạn','Chấm dứt')), -- BR-UC5-09
  da_gui_mail_gia_han BOOLEAN NOT NULL DEFAULT FALSE,
  ngay_tao          TIMESTAMP NOT NULL DEFAULT NOW()
);
-- BR-UC5-08: mỗi phòng chỉ có một hợp đồng "Hoạt động"
CREATE UNIQUE INDEX IF NOT EXISTS ux_hop_dong_phong_hoat_dong ON hop_dong (ma_phong) WHERE trang_thai = 'Hoạt động';
CREATE INDEX IF NOT EXISTS ix_hop_dong_phong ON hop_dong (ma_phong);

-- Dịch vụ áp dụng cho hợp đồng; chỉ số điện ban đầu (BR-UC5-06)
CREATE TABLE IF NOT EXISTS hop_dong_dich_vu (
  ma_hop_dong   INT NOT NULL REFERENCES hop_dong(ma_hop_dong) ON DELETE CASCADE,
  ma_dich_vu    INT NOT NULL REFERENCES dich_vu(ma_dich_vu) ON DELETE CASCADE,
  chi_so_ban_dau NUMERIC(12,2),
  PRIMARY KEY (ma_hop_dong, ma_dich_vu)
);

-- UC5.5: lịch sử gia hạn
CREATE TABLE IF NOT EXISTS gia_han_hop_dong (
  ma_gia_han     SERIAL PRIMARY KEY,
  ma_hop_dong    INT NOT NULL REFERENCES hop_dong(ma_hop_dong) ON DELETE CASCADE,
  thoi_han_thang INT NOT NULL CHECK (thoi_han_thang IN (3,4,5,6)),
  ngay_bat_dau   DATE NOT NULL,
  ngay_ket_thuc  DATE NOT NULL,
  ngay_tao       TIMESTAMP NOT NULL DEFAULT NOW()
);
