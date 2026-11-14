import { pool } from '../config/db.js';
import { LoiNhap, KhongTimThay } from './toaNha.service.js';

export { LoiNhap, KhongTimThay };
export const KIEU = { 'Theo đồng hồ': 'kWh', 'Theo đầu người': 'Người' }; // BR-UC7-05/06
export const TRANG_THAI = ['Hoạt động', 'Không hoạt động'];
export const THIEU = 'Vui lòng điền đầy đủ thông tin bắt buộc';

const toDto = (r) => ({
  maDichVu: r.ma_dich_vu, maToaNha: r.ma_toa_nha, tenDichVu: r.ten_dich_vu, kieuTinhGia: r.kieu_tinh_gia,
  donGia: Number(r.don_gia), donViTinh: r.don_vi_tinh, trangThai: r.trang_thai,
});
const so = (x) => {
  const s = String(x ?? '').trim().replace(/[.\s]/g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};

// UC7.1 bước 6 / UC7.2 bước 7
// BR-UC7-04: "Tên dịch vụ" phải duy nhất trong TOÀN BỘ danh mục (kể cả dịch vụ "Không hoạt động"), bất kể tòa nhà nào.
async function kiemTra(b, maHienTai) {
  const loi = {}; let thieu = false;
  const v = (k) => String(b[k] ?? '').trim();
  for (const k of ['tenDichVu', 'kieuTinhGia', 'donGia', 'trangThai']) if (!v(k)) { loi[k] = ''; thieu = true; }
  if (v('kieuTinhGia') && !KIEU[v('kieuTinhGia')]) { loi.kieuTinhGia = ''; thieu = true; }
  if (v('trangThai') && !TRANG_THAI.includes(v('trangThai'))) { loi.trangThai = ''; thieu = true; }
  if (thieu) throw new LoiNhap(loi, THIEU); // 6a / 7a
  if (!(so(b.donGia) >= 0)) loi.donGia = 'Đơn giá không hợp lệ'; // 6c / 7c
  const { rowCount } = await pool.query(
    `SELECT 1 FROM dich_vu WHERE lower(ten_dich_vu)=lower($1) AND ma_dich_vu <> COALESCE($2,-1)`,
    [v('tenDichVu'), maHienTai ?? null]);
  if (rowCount) loi.tenDichVu = 'Tên dịch vụ đã tồn tại'; // 6b / 7b
  if (Object.keys(loi).length) throw new LoiNhap(loi);
  return [v('tenDichVu'), v('kieuTinhGia'), so(b.donGia), KIEU[v('kieuTinhGia')], v('trangThai')];
}

// UC7.4 + UC7.5: tìm theo tên dịch vụ, lọc theo tòa nhà (dịch vụ thuộc tòa đang được chọn khi thêm)
export async function layDanhSach({ tuKhoa, maToaNha }) {
  const tg = []; const dk = [];
  if (tuKhoa && String(tuKhoa).trim()) { tg.push(`%${String(tuKhoa).trim().replace(/[\\%_]/g, '\\$&')}%`); dk.push(`ten_dich_vu ILIKE $${tg.length}`); }
  if (maToaNha) { tg.push(Number(maToaNha)); dk.push(`ma_toa_nha = $${tg.length}`); }
  return (await pool.query(`SELECT * FROM dich_vu ${dk.length ? 'WHERE ' + dk.join(' AND ') : ''} ORDER BY ma_dich_vu`, tg)).rows.map(toDto);
}
export async function layChiTiet(id) {
  const r = (await pool.query('SELECT * FROM dich_vu WHERE ma_dich_vu=$1', [id])).rows[0];
  if (!r) throw new KhongTimThay();
  return toDto(r);
}
export async function tao(b) {
  let maToaNha = null;
  if (b.maToaNha) {
    const t = await pool.query('SELECT ma_toa_nha FROM toa_nha WHERE ma_toa_nha=$1', [Number(b.maToaNha) || -1]);
    maToaNha = t.rows[0]?.ma_toa_nha ?? null;
  }
  const p = await kiemTra(b, null);
  const r = await pool.query('INSERT INTO dich_vu (ten_dich_vu, kieu_tinh_gia, don_gia, don_vi_tinh, trang_thai, ma_toa_nha) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [...p, maToaNha]);
  return toDto(r.rows[0]);
}
export async function sua(id, b) {
  await layChiTiet(id);
  const p = await kiemTra(b, id);
  const r = await pool.query('UPDATE dich_vu SET ten_dich_vu=$1, kieu_tinh_gia=$2, don_gia=$3, don_vi_tinh=$4, trang_thai=$5 WHERE ma_dich_vu=$6 RETURNING *', [...p, id]);
  return toDto(r.rows[0]);
}
// Hóa đơn đã lập giữ nguyên thông tin dịch vụ (BR-UC7-07): module hóa đơn sẽ lưu bản sao tên/đơn giá tại thời điểm lập.
export class DangSuDung extends Error {}
// Chặn xóa khi dịch vụ đang áp dụng cho một hợp đồng "Hoạt động" (hop_dong_dich_vu ON DELETE CASCADE sẽ âm thầm
// gỡ dòng dịch vụ khỏi hợp đồng đó nếu không chặn ở đây).
async function dangApDungChoHopDongHoatDong(id) {
  return (await pool.query(
    `SELECT 1 FROM hop_dong_dich_vu hdv JOIN hop_dong h ON h.ma_hop_dong = hdv.ma_hop_dong
     WHERE hdv.ma_dich_vu=$1 AND h.trang_thai='Hoạt động' LIMIT 1`, [id])).rowCount > 0;
}
export async function xoa(id) {
  await layChiTiet(id);
  if (await dangApDungChoHopDongHoatDong(id)) throw new DangSuDung();
  const { rowCount } = await pool.query('DELETE FROM dich_vu WHERE ma_dich_vu=$1', [id]);
  if (!rowCount) throw new KhongTimThay();
}
