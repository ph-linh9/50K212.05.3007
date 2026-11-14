import { pool } from '../config/db.js';
import { LoiNhap, KhongTimThay } from './toaNha.service.js';
import { capNhatHetHan } from './hopDong.service.js';

export { LoiNhap, KhongTimThay };
export const CHU_KY = [1, 3, 6, 12];
export const TRANG_THAI = ['Trống', 'Đang thuê', 'Đang sửa chữa'];
const BAT_BUOC = 'Trường bắt buộc, không được để trống';

const toDto = (r) => ({
  maPhong: r.ma_phong, maToaNha: r.ma_toa_nha, tenToaNha: r.ten_toa_nha,
  tenPhong: r.ten_phong, tang: r.tang, giaThue: Number(r.gia_thue),
  chuKyThanhToan: r.chu_ky_thanh_toan, trangThai: r.trang_thai,
  dienTich: r.dien_tich === null ? null : Number(r.dien_tich),
  tienCoc: r.tien_coc === null ? null : Number(r.tien_coc),
  soNguoiToiDa: r.so_nguoi_toi_da, soNguoiThucTe: r.so_nguoi ?? 0, moTa: r.mo_ta ?? '',
});

// Giá trị số: bỏ dấu chấm/khoảng trắng phân cách hàng nghìn
const so = (x) => {
  const s = String(x ?? '').trim().replace(/[.\s]/g, '').replace(',', '.');
  return s !== '' && /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};

async function kiemTra(b, maHienTai) {
  const loi = {};
  const v = (k) => String(b[k] ?? '').trim();
  for (const k of ['maToaNha', 'tenPhong', 'tang', 'giaThue', 'chuKyThanhToan', 'trangThai']) if (!v(k)) loi[k] = BAT_BUOC;
  if (v('maToaNha') && !loi.maToaNha) {
    const { rowCount } = await pool.query('SELECT 1 FROM toa_nha WHERE ma_toa_nha=$1', [Number(v('maToaNha')) || -1]);
    if (!rowCount) loi.maToaNha = BAT_BUOC;
  }
  if (v('tang') && !loi.tang && !Number.isInteger(so(b.tang))) loi.tang = 'Tầng phải là số nguyên';
  if (v('chuKyThanhToan') && !CHU_KY.includes(Number(v('chuKyThanhToan')))) loi.chuKyThanhToan = BAT_BUOC;
  if (v('trangThai') && !TRANG_THAI.includes(v('trangThai'))) loi.trangThai = BAT_BUOC;
  if (v('giaThue') && !(so(b.giaThue) > 0)) loi.giaThue = 'Giá thuê phải là số lớn hơn 0';
  if (v('dienTich') && !(so(b.dienTich) > 0)) loi.dienTich = 'Diện tích phải là số lớn hơn 0';
  if (v('tienCoc') && !(so(b.tienCoc) >= 0)) loi.tienCoc = 'Tiền cọc phải là số lớn hơn hoặc bằng 0';
  if (v('tenPhong') && v('maToaNha') && !loi.tenPhong && !loi.maToaNha) {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM phong_tro WHERE ma_toa_nha=$1 AND lower(ten_phong)=lower($2) AND ma_phong <> COALESCE($3,-1)',
      [Number(v('maToaNha')), v('tenPhong'), maHienTai ?? null]);
    if (rowCount) loi.tenPhong = 'Tên phòng đã tồn tại trong tòa nhà này';
  }
  if (Object.keys(loi).length) throw new LoiNhap(loi);
  return [
    Number(v('maToaNha')), v('tenPhong'), so(b.tang), so(b.giaThue), Number(v('chuKyThanhToan')), v('trangThai'),
    v('dienTich') ? so(b.dienTich) : null, v('tienCoc') ? so(b.tienCoc) : null, v('moTa') || null,
  ];
}

const SELECT = `SELECT p.*, t.ten_toa_nha, (SELECT count(*)::int FROM nguoi_thue n WHERE n.ma_phong = p.ma_phong) AS so_nguoi FROM phong_tro p JOIN toa_nha t ON t.ma_toa_nha = p.ma_toa_nha`;

// UC3.2 + UC3.6: danh sách (tìm theo tên phòng, lọc theo tòa nhà); thanh tổng quan tính trên toàn bộ phòng
export async function layDanhSach({ tuKhoa, maToaNha }) {
  const dk = []; const tg = [];
  if (tuKhoa && String(tuKhoa).trim()) { tg.push(`%${String(tuKhoa).trim().replace(/[\\%_]/g, '\\$&')}%`); dk.push(`p.ten_phong ILIKE $${tg.length}`); }
  if (maToaNha) { tg.push(Number(maToaNha)); dk.push(`p.ma_toa_nha = $${tg.length}`); }
  const ds = await pool.query(`${SELECT} ${dk.length ? 'WHERE ' + dk.join(' AND ') : ''} ORDER BY t.ten_toa_nha, p.tang, p.ten_phong`, tg);
  const q = (await pool.query(`SELECT count(*)::int tong,
      count(*) FILTER (WHERE trang_thai='Trống')::int trong,
      count(*) FILTER (WHERE trang_thai='Đang thuê')::int thue,
      count(*) FILTER (WHERE trang_thai='Đang sửa chữa')::int sua FROM phong_tro`)).rows[0];
  return {
    tongQuan: { tongSoPhong: q.tong, soPhongConTrong: q.trong, soPhongDangHoatDong: q.thue, soPhongDangSuaChua: q.sua },
    phong: ds.rows.map(toDto),
  };
}

// UC3.3: chi tiết. Người thuê / hợp đồng sẽ được nối vào ở module Người thuê & Hợp đồng.
export async function layChiTiet(id) {
  await capNhatHetHan();
  const r = (await pool.query(`${SELECT} WHERE p.ma_phong=$1`, [id])).rows[0];
  if (!r) throw new KhongTimThay();
  const nt = (await pool.query('SELECT ho_ten, so_dien_thoai FROM nguoi_thue WHERE ma_phong=$1 ORDER BY ma_nguoi_thue', [id])).rows;
  const hd = (await pool.query(`SELECT so_hop_dong, to_char(ngay_bat_dau,'YYYY-MM-DD') AS bd, to_char(ngay_ket_thuc,'YYYY-MM-DD') AS kt
    FROM hop_dong WHERE ma_phong=$1 AND trang_thai='Hoạt động'`, [id])).rows[0];
  return { ...toDto(r), nguoiThue: nt.map((n) => ({ hoTen: n.ho_ten, soDienThoai: n.so_dien_thoai })),
    hopDong: hd ? { soHopDong: hd.so_hop_dong, ngayBatDau: hd.bd, ngayKetThuc: hd.kt } : null };
}

export async function tao(b) {
  const p = await kiemTra(b, null);
  const r = await pool.query(
    `INSERT INTO phong_tro (ma_toa_nha, ten_phong, tang, gia_thue, chu_ky_thanh_toan, trang_thai, dien_tich, tien_coc, mo_ta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ma_phong`, p);
  return layChiTiet(r.rows[0].ma_phong);
}
export async function sua(id, b) {
  const hienTai = await layChiTiet(id);
  // BR-UC3-07 / BR-UC3-02: không được đổi "Tòa nhà" khi chỉnh sửa phòng
  const p = await kiemTra({ ...b, maToaNha: hienTai.maToaNha }, id);
  await pool.query(
    `UPDATE phong_tro SET ma_toa_nha=$1, ten_phong=$2, tang=$3, gia_thue=$4, chu_ky_thanh_toan=$5, trang_thai=$6, dien_tich=$7, tien_coc=$8, mo_ta=$9
     WHERE ma_phong=$10`, [...p, id]);
  return layChiTiet(id);
}

export class DangSuDung extends Error {}
// UC3.5 bước 2: phòng có người thuê hoặc hợp đồng thì không được xóa.
async function dangCoNguoiThueHoacHopDong(id) {
  return (await pool.query(`SELECT 1 FROM nguoi_thue WHERE ma_phong=$1
    UNION ALL SELECT 1 FROM hop_dong WHERE ma_phong=$1 LIMIT 1`, [id])).rowCount > 0;
}

export async function xoa(id) {
  await layChiTiet(id);
  if (await dangCoNguoiThueHoacHopDong(id)) throw new DangSuDung();
  await pool.query('DELETE FROM phong_tro WHERE ma_phong=$1', [id]);
}
