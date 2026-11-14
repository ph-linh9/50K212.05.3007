import { pool } from '../config/db.js';
import { LoiNhap, KhongTimThay } from './toaNha.service.js';
import { lamSachHtml, trongNoiDungHtml } from '../utils/lamSachHtml.js';

export { LoiNhap, KhongTimThay };
const BAT_BUOC = 'Trường bắt buộc, không được để trống';

const toDto = (r, kemNoiDung = true) => ({
  maMau: r.ma_mau, tenMau: r.ten_mau, moTa: r.mo_ta ?? '', ...(kemNoiDung ? { noiDung: r.noi_dung } : {}),
});
// Nội dung mẫu là HTML từ trình soạn thảo: loại bỏ thẻ/thuộc tính chạy mã
const lamSach = lamSachHtml;
const trongNoiDung = trongNoiDungHtml;

// UC6.1 bước 5 / UC6.2 bước 6
function kiemTra(b) {
  const loi = {};
  const ten = String(b.tenMau ?? '').trim();
  const noiDung = lamSach(b.noiDung);
  if (!ten) loi.tenMau = BAT_BUOC;
  else if (ten.length > 150) loi.tenMau = 'Tên mẫu không được vượt quá 150 ký tự';
  if (trongNoiDung(noiDung)) loi.noiDung = BAT_BUOC;
  if (Object.keys(loi).length) throw new LoiNhap(loi);
  return [ten, String(b.moTa ?? '').trim() || null, noiDung];
}

export const layDanhSach = async () =>
  (await pool.query('SELECT ma_mau, ten_mau, mo_ta FROM mau_hop_dong ORDER BY ma_mau')).rows.map((r) => toDto(r, false));
export async function layChiTiet(id) {
  const r = (await pool.query('SELECT * FROM mau_hop_dong WHERE ma_mau=$1', [id])).rows[0];
  if (!r) throw new KhongTimThay();
  return toDto(r);
}
export async function tao(b) {
  const p = kiemTra(b);
  return toDto((await pool.query('INSERT INTO mau_hop_dong (ten_mau, mo_ta, noi_dung) VALUES ($1,$2,$3) RETURNING *', p)).rows[0]);
}
export async function sua(id, b) {
  await layChiTiet(id);
  const p = kiemTra(b);
  return toDto((await pool.query('UPDATE mau_hop_dong SET ten_mau=$1, mo_ta=$2, noi_dung=$3 WHERE ma_mau=$4 RETURNING *', [...p, id])).rows[0]);
}
// UC6.3: hợp đồng đã tạo từ mẫu không bị ảnh hưởng (hợp đồng lưu bản sao nội dung riêng)
export async function xoa(id) {
  const { rowCount } = await pool.query('DELETE FROM mau_hop_dong WHERE ma_mau=$1', [id]);
  if (!rowCount) throw new KhongTimThay();
}
