import ExcelJS from 'exceljs';
import { pool } from '../config/db.js';
import { LoiNhap, KhongTimThay } from './toaNha.service.js';
import { capNhatHetHan } from './hopDong.service.js';
import { kiemTraAnh } from '../utils/anh.js';

export { LoiNhap, KhongTimThay };
export class DanhSachRong extends Error {}
export const SO_NGUOI_TOI_DA = 2; // BR-UC4-06
const BAT_BUOC = 'Trường bắt buộc, không được để trống';

const COT = `n.*, to_char(n.ngay_sinh,'YYYY-MM-DD') AS ngay_sinh_s, to_char(n.ngay_cap_cccd,'YYYY-MM-DD') AS ngay_cap_s,
  p.ten_phong, p.ma_toa_nha`;
const TU = 'FROM nguoi_thue n JOIN phong_tro p ON p.ma_phong = n.ma_phong';

const toDto = (r, kemAnh = true) => ({
  maNguoiThue: r.ma_nguoi_thue, maPhong: r.ma_phong, tenPhong: r.ten_phong, maToaNha: r.ma_toa_nha,
  hoTen: r.ho_ten, soDienThoai: r.so_dien_thoai, ngaySinh: r.ngay_sinh_s, gioiTinh: r.gioi_tinh, diaChi: r.dia_chi,
  soCCCD: r.so_cccd, email: r.email, zalo: r.zalo ?? '', ngayCapCCCD: r.ngay_cap_s ?? '', noiCapCCCD: r.noi_cap_cccd ?? '',
  tinhTrangDangKyTamTru: r.da_dang_ky_tam_tru, ...(kemAnh ? { anhCCCD: r.anh_cccd ?? null } : { coAnhCCCD: !!r.anh_cccd }),
});

const ngayHopLe = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const EMAIL = /^[A-Za-z0-9]+([._%+-][A-Za-z0-9]+)*@[A-Za-z0-9]+([.-][A-Za-z0-9]+)*\.[A-Za-z]{2,}$/;

// UC4.1 bước 5 / UC4.4 bước 6
async function kiemTra(b, maHienTai) {
  const loi = {};
  const v = (k) => String(b[k] ?? '').trim();
  for (const k of ['hoTen', 'soDienThoai', 'ngaySinh', 'gioiTinh', 'diaChi', 'soCCCD', 'email', 'maPhong']) if (!v(k)) loi[k] = BAT_BUOC;
  const ma = maHienTai ?? null;
  const trung = async (cot, gt, bieuThuc = cot) =>
    (await pool.query(`SELECT 1 FROM nguoi_thue WHERE ${bieuThuc}=$1 AND ma_nguoi_thue <> COALESCE($2,-1)`, [gt, ma])).rowCount > 0;

  if (v('soDienThoai') && !loi.soDienThoai) {
    if (!/^\d{10}$/.test(v('soDienThoai'))) loi.soDienThoai = 'Số điện thoại phải gồm đúng 10 chữ số. Vui lòng kiểm tra lại.';
    else if (await trung('so_dien_thoai', v('soDienThoai'))) loi.soDienThoai = 'Số điện thoại phải gồm đúng 10 chữ số. Vui lòng kiểm tra lại.';
  }
  if (v('soCCCD') && !loi.soCCCD) {
    if (!/^\d{12}$/.test(v('soCCCD')) || await trung('so_cccd', v('soCCCD'))) loi.soCCCD = 'Số CCCD phải gồm đúng 12 chữ số. Vui lòng kiểm tra lại.';
  }
  if (v('email') && !loi.email) {
    if (!EMAIL.test(v('email'))) loi.email = 'Email không đúng định dạng. Vui lòng kiểm tra lại.';
    else if (await trung('email', v('email').toLowerCase(), 'lower(email)')) loi.email = 'Email không đúng định dạng. Vui lòng kiểm tra lại.';
  }
  if (v('ngaySinh') && !ngayHopLe(v('ngaySinh'))) loi.ngaySinh = BAT_BUOC;
  if (v('ngayCapCCCD') && !ngayHopLe(v('ngayCapCCCD'))) loi.ngayCapCCCD = 'Ngày cấp CCCD không hợp lệ';
  // BR: ảnh CCCD tải lên dạng PNG, giới hạn dung lượng để không phình cột lưu trữ
  const loiAnh = kiemTraAnh(b.anhCCCD, { reDinhDang: /^data:image\/png[;,]/, tenLoi: 'Ảnh CCCD phải ở định dạng PNG' });
  if (loiAnh) loi.anhCCCD = loiAnh;

  // Phòng được chọn từ danh sách; phòng phải tồn tại và còn chỗ (BR-UC4-06). Giao diện đã ngăn chọn phòng đủ người.
  let maPhong = null;
  if (v('maPhong') && !loi.maPhong) {
    const ph = (await pool.query('SELECT ma_phong FROM phong_tro WHERE ma_phong=$1', [Number(v('maPhong')) || -1])).rows[0];
    const dem = ph ? (await pool.query('SELECT count(*)::int c FROM nguoi_thue WHERE ma_phong=$1 AND ma_nguoi_thue <> COALESCE($2,-1)', [ph.ma_phong, ma])).rows[0].c : 0;
    if (!ph || dem >= SO_NGUOI_TOI_DA) loi.maPhong = BAT_BUOC;
    else maPhong = ph.ma_phong;
  }
  if (Object.keys(loi).length) throw new LoiNhap(loi);
  return [v('hoTen'), v('soDienThoai'), v('ngaySinh'), v('gioiTinh'), v('diaChi'), v('soCCCD'), v('email'),
    v('zalo') || null, v('ngayCapCCCD') || null, v('noiCapCCCD') || null, b.anhCCCD || null, !!b.tinhTrangDangKyTamTru, maPhong];
}

// Số người đang thuê = người thuê thuộc hợp đồng "Hoạt động" (BR-UC4-07).
async function demDangThue() {
  await capNhatHetHan();
  return (await pool.query(`SELECT count(*)::int c FROM nguoi_thue n
    WHERE EXISTS (SELECT 1 FROM hop_dong h WHERE h.ma_phong = n.ma_phong AND h.trang_thai='Hoạt động')`)).rows[0].c;
}

// UC4.2 + UC4.6: danh sách, tìm theo Tên phòng, lọc theo Tòa nhà. Thanh tổng quan tính trên toàn bộ người thuê.
export async function layDanhSach({ tuKhoa, maToaNha }) {
  const tg = []; const dk = [];
  if (tuKhoa && String(tuKhoa).trim()) { tg.push(`%${String(tuKhoa).trim().replace(/[\\%_]/g, '\\$&')}%`); dk.push(`p.ten_phong ILIKE $${tg.length}`); }
  if (maToaNha) { tg.push(Number(maToaNha)); dk.push(`p.ma_toa_nha = $${tg.length}`); }
  const ds = await pool.query(`SELECT ${COT} ${TU} ${dk.length ? 'WHERE ' + dk.join(' AND ') : ''} ORDER BY n.ma_nguoi_thue`, tg);
  const q = (await pool.query(`SELECT count(*)::int tong, count(*) FILTER (WHERE NOT da_dang_ky_tam_tru)::int chua FROM nguoi_thue`)).rows[0];
  return {
    tongQuan: { tongNguoiThue: q.tong, soNguoiDangThue: await demDangThue(), soNguoiChuaDangKyTamTru: q.chua },
    nguoiThue: ds.rows.map((r) => toDto(r, false)),
  };
}
export async function layChiTiet(id) {
  const r = (await pool.query(`SELECT ${COT} ${TU} WHERE n.ma_nguoi_thue=$1`, [id])).rows[0];
  if (!r) throw new KhongTimThay();
  return toDto(r);
}
const INS = `INSERT INTO nguoi_thue (ho_ten, so_dien_thoai, ngay_sinh, gioi_tinh, dia_chi, so_cccd, email, zalo, ngay_cap_cccd, noi_cap_cccd, anh_cccd, da_dang_ky_tam_tru, ma_phong)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING ma_nguoi_thue`;
export async function tao(b) {
  const p = await kiemTra(b, null);
  return layChiTiet((await pool.query(INS, p)).rows[0].ma_nguoi_thue);
}
export async function sua(id, b) {
  await layChiTiet(id);
  const p = await kiemTra(b, id);
  await pool.query(`UPDATE nguoi_thue SET ho_ten=$1, so_dien_thoai=$2, ngay_sinh=$3, gioi_tinh=$4, dia_chi=$5, so_cccd=$6, email=$7, zalo=$8,
    ngay_cap_cccd=$9, noi_cap_cccd=$10, anh_cccd=$11, da_dang_ky_tam_tru=$12, ma_phong=$13 WHERE ma_nguoi_thue=$14`, [...p, id]);
  return layChiTiet(id);
}
export async function xoa(id) {
  const { rowCount } = await pool.query('DELETE FROM nguoi_thue WHERE ma_nguoi_thue=$1', [id]);
  if (!rowCount) throw new KhongTimThay();
}

// UC4.7: xuất toàn bộ danh sách người thuê hiện có ra Excel; không xuất khi danh sách trống
const dmy = (s) => (s ? s.split('-').reverse().join('/') : '');
export async function xuatExcel() {
  const rows = (await pool.query(`SELECT ${COT} ${TU} ORDER BY n.ma_nguoi_thue`)).rows;
  if (!rows.length) throw new DanhSachRong();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Người thuê');
  const tieuDe = ['Họ tên', 'Số điện thoại', 'Ngày sinh', 'Giới tính', 'Địa chỉ', 'Số CCCD', 'Email', 'Zalo', 'Ngày cấp CCCD', 'Nơi cấp CCCD', 'Ảnh CCCD', 'Tình trạng đăng ký tạm trú', 'Tên phòng'];
  ws.columns = tieuDe.map((k) => ({ header: k, key: k, width: k === 'Ảnh CCCD' ? 24 : Math.max(k.length + 2, 16) }));
  ws.getRow(1).font = { bold: true };
  rows.forEach((r, i) => {
    const hang = ws.addRow({
      'Họ tên': r.ho_ten, 'Số điện thoại': r.so_dien_thoai, 'Ngày sinh': dmy(r.ngay_sinh_s), 'Giới tính': r.gioi_tinh, 'Địa chỉ': r.dia_chi,
      'Số CCCD': r.so_cccd, 'Email': r.email, 'Zalo': r.zalo ?? '', 'Ngày cấp CCCD': dmy(r.ngay_cap_s), 'Nơi cấp CCCD': r.noi_cap_cccd ?? '',
      'Ảnh CCCD': '', 'Tình trạng đăng ký tạm trú': r.da_dang_ky_tam_tru ? 'Đã đăng ký' : 'Chưa đăng ký', 'Tên phòng': r.ten_phong,
    });
    // Ảnh CCCD: chèn ảnh thật vào ô (lưu dạng data URI base64)
    const m = String(r.anh_cccd || '').match(/^data:image\/(png|jpe?g)[^,]*;base64,(.+)$/s);
    if (m) {
      const id = wb.addImage({ base64: m[2], extension: m[1] === 'png' ? 'png' : 'jpeg' });
      hang.height = 90;
      ws.addImage(id, { tl: { col: 10, row: i + 1 }, ext: { width: 160, height: 115 } });
    } else if (r.anh_cccd) {
      hang.getCell('Ảnh CCCD').value = 'Có ảnh';
    }
    hang.alignment = { vertical: 'middle' };
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
