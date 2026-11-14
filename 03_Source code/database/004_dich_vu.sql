CREATE TABLE IF NOT EXISTS dich_vu (
  ma_dich_vu SERIAL PRIMARY KEY,
  ma_toa_nha INT REFERENCES toa_nha(ma_toa_nha) ON DELETE CASCADE, -- NULL: tạo khi đang chọn "Tất cả tòa nhà"
  ten_dich_vu VARCHAR(100) NOT NULL,
  kieu_tinh_gia VARCHAR(20) NOT NULL CHECK (kieu_tinh_gia IN ('Theo đồng hồ','Theo đầu người')),
  don_gia NUMERIC(12,0) NOT NULL CHECK (don_gia >= 0),
  don_vi_tinh VARCHAR(20) NOT NULL,
  trang_thai VARCHAR(20) NOT NULL CHECK (trang_thai IN ('Hoạt động','Không hoạt động'))
);
-- BR-UC7-04: tên dịch vụ duy nhất trong TOÀN BỘ danh mục (kể cả dịch vụ "Không hoạt động"), không phân biệt hoa thường,
-- bất kể thuộc tòa nhà nào. (Trước đây chỉ xét trùng trong từng tòa nhà — đã đổi lại cho đúng BR-UC7-04.)
DROP INDEX IF EXISTS ux_dich_vu_ten;
CREATE UNIQUE INDEX IF NOT EXISTS ux_dich_vu_ten ON dich_vu (lower(ten_dich_vu));
