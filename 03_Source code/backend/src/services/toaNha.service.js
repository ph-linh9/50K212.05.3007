import { pool } from '../config/db.js';
import { DANH_SACH_NGAN_HANG } from '../config/nganHang.js';
import { kiemTraAnh } from '../utils/anh.js';

export class LoiNhap extends Error {
  constructor(loi, message = 'Dữ liệu không hợp lệ') { super(message); this.loi = loi; }
}
export class KhongTimThay extends Error {}

const NHAN = { tenToaNha: 'Tên tòa nhà', diaChi: 'Địa chỉ', nganHang: 'Ngân hàng', soTaiKhoan: 'Số tài khoản', tenChuTaiKhoan: 'Tên chủ tài khoản' };
const toDto = (r) => ({
  maToaNha: r.ma_toa_nha, tenToaNha: r.ten_toa_nha, diaChi: r.dia_chi, nganHang: r.ngan_hang,
  soTaiKhoan: r.so_tai_khoan, tenChuTaiKhoan: r.ten_chu_tai_khoan,
  moTa: r.mo_ta ?? '', duongDanHinhAnh: r.duong_dan_hinh_anh ?? null,
});

// UC2.1 bước 5 / UC2.3 bước 6: kiểm tra hợp lệ. Thông báo trống: tạo = "Vui lòng nhập [tên trường]", sửa = theo frame.
async function kiemTra(b, maHienTai) {
  const loi = {}; 
  const v = (k) => String(b[k] ?? '').trim();
  for (const k of Object.keys(NHAN)) {
    if (!v(k)) loi[k] = maHienTai ? 'Vui lòng nhập đầy đủ thông tin bắt buộc' : `Vui lòng nhập ${NHAN[k]}`;
  }
  if (v('nganHang') && !DANH_SACH_NGAN_HANG.includes(v('nganHang'))) loi.nganHang = maHienTai ? '' : 'Vui lòng nhập Ngân hàng';
  if (v('soTaiKhoan') && !/^\d+$/.test(v('soTaiKhoan'))) loi.soTaiKhoan = 'Số tài khoản chỉ được nhập chữ số';
  const loiAnh = kiemTraAnh(b.duongDanHinhAnh, { reDinhDang: /^data:image\/(png|jpe?g)[;,]/, tenLoi: 'Ảnh phải ở định dạng PNG hoặc JPEG' });
  if (loiAnh) loi.duongDanHinhAnh = loiAnh;
  if (v('tenToaNha') && !loi.tenToaNha) {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM toa_nha WHERE lower(ten_toa_nha)=lower($1) AND ma_toa_nha <> COALESCE($2,-1)', [v('tenToaNha'), maHienTai ?? null]);
    if (rowCount) loi.tenToaNha = 'Tên tòa nhà đã tồn tại';
  }
  if (Object.keys(loi).length) throw new LoiNhap(loi);
  return {
    ten: v('tenToaNha'), diaChi: v('diaChi'), nganHang: v('nganHang'), stk: v('soTaiKhoan'),
    chuTk: v('tenChuTaiKhoan'), moTa: v('moTa') || null, anh: b.duongDanHinhAnh || null,
  };
}

export const layDanhSach = async () =>
  (await pool.query('SELECT ma_toa_nha, ten_toa_nha, dia_chi, ngan_hang, so_tai_khoan, ten_chu_tai_khoan FROM toa_nha ORDER BY ma_toa_nha')).rows.map(toDto);

export async function layChiTiet(id) {
  const r = (await pool.query('SELECT * FROM toa_nha WHERE ma_toa_nha=$1', [id])).rows[0];
  if (!r) throw new KhongTimThay();
  return toDto(r);
}
export async function tao(b) {
  const d = await kiemTra(b, null);
  const r = await pool.query(
    `INSERT INTO toa_nha (ten_toa_nha, dia_chi, ngan_hang, so_tai_khoan, ten_chu_tai_khoan, mo_ta, duong_dan_hinh_anh)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [d.ten, d.diaChi, d.nganHang, d.stk, d.chuTk, d.moTa, d.anh]);
  return toDto(r.rows[0]);
}
export async function sua(id, b) {
  await layChiTiet(id);
  const d = await kiemTra(b, id);
  const r = await pool.query(
    `UPDATE toa_nha SET ten_toa_nha=$1, dia_chi=$2, ngan_hang=$3, so_tai_khoan=$4, ten_chu_tai_khoan=$5, mo_ta=$6, duong_dan_hinh_anh=$7
     WHERE ma_toa_nha=$8 RETURNING *`, [d.ten, d.diaChi, d.nganHang, d.stk, d.chuTk, d.moTa, d.anh, id]);
  return toDto(r.rows[0]);
}
// UC2.4: xóa trong một giao dịch (BR-UC2-07). Các bảng liên quan (phòng, người thuê, hợp đồng, hóa đơn) xóa theo ON DELETE CASCADE ở các module sau.
export async function xoa(id) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rowCount } = await c.query('DELETE FROM toa_nha WHERE ma_toa_nha=$1', [id]);
    if (!rowCount) throw new KhongTimThay();
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
