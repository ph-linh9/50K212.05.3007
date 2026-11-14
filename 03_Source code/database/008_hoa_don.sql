-- UC8.x - Hóa đơn (SRS BR-UC8-01..13)
CREATE SEQUENCE IF NOT EXISTS hoa_don_so_seq START 1;
CREATE TABLE IF NOT EXISTS hoa_don (
  ma_hoa_don      SERIAL PRIMARY KEY,
  so_hoa_don      VARCHAR(20) NOT NULL UNIQUE,                 -- HD0001... do hệ thống tự sinh (BR-UC8-02)
  ma_hop_dong     INT NOT NULL REFERENCES hop_dong(ma_hop_dong) ON DELETE CASCADE,
  ngay_bat_dau    DATE NOT NULL,                               -- kỳ tiền phòng
  ngay_ket_thuc   DATE NOT NULL,
  ngay_phat_hanh  DATE NOT NULL,
  han_thanh_toan  DATE NOT NULL,
  so_nguoi        INT NOT NULL DEFAULT 0,                      -- số người ở tại thời điểm lập (BR-UC8-05)
  tien_phong      NUMERIC(14,0) NOT NULL DEFAULT 0,
  tien_dien       NUMERIC(14,0) NOT NULL DEFAULT 0,
  tien_nuoc       NUMERIC(14,0) NOT NULL DEFAULT 0,
  tien_dich_vu_khac NUMERIC(14,0) NOT NULL DEFAULT 0,
  tong_cong       NUMERIC(14,0) NOT NULL DEFAULT 0,            -- BR-UC8-06
  trang_thai      VARCHAR(20) NOT NULL DEFAULT 'Chưa thanh toán' CHECK (trang_thai IN ('Chưa thanh toán','Đã thanh toán')), -- BR-UC8-12
  trang_thai_gui  VARCHAR(20) NOT NULL DEFAULT 'Chưa gửi' CHECK (trang_thai_gui IN ('Chưa gửi','Đã gửi','Gửi thất bại')),
  ma_qr           TEXT,                                        -- ảnh QR (data URI) lưu cùng hóa đơn (BR-UC2-10)
  ngay_nhac_cuoi  DATE,                                        -- lần nhắc quá hạn gần nhất (UC8.8)
  ngay_tao        TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (ngay_bat_dau <= ngay_ket_thuc),
  CHECK (han_thanh_toan >= ngay_phat_hanh)
);
CREATE INDEX IF NOT EXISTS ix_hoa_don_hop_dong ON hoa_don (ma_hop_dong);

-- Các khoản phí: lưu bản sao tên/đơn giá dịch vụ tại thời điểm lập (BR-UC7-07)
CREATE TABLE IF NOT EXISTS hoa_don_chi_tiet (
  ma_chi_tiet SERIAL PRIMARY KEY,
  ma_hoa_don  INT NOT NULL REFERENCES hoa_don(ma_hoa_don) ON DELETE CASCADE,
  thu_tu      INT NOT NULL,
  loai        VARCHAR(10) NOT NULL CHECK (loai IN ('phong','dien','nuoc','khac')),
  ma_dich_vu  INT,
  noi_dung    VARCHAR(150) NOT NULL,
  chi_so_cu   NUMERIC(12,2),
  chi_so_moi  NUMERIC(12,2),
  so_luong    NUMERIC(12,2) NOT NULL,
  don_vi      VARCHAR(30) NOT NULL,
  don_gia     NUMERIC(14,0) NOT NULL,
  thanh_tien  NUMERIC(14,0) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_hdct_hoa_don ON hoa_don_chi_tiet (ma_hoa_don);
