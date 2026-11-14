import { pool } from '../config/db.js';
import { LoiNhap, KhongTimThay } from './toaNha.service.js';
import { capNhatHetHan } from './hopDong.service.js';
import { taoMaQr } from './qr.service.js';
import { guiMailHoaDon } from './mail.service.js';

export { LoiNhap, KhongTimThay };
export class KhongChoPhep extends Error {}      // thao tác không áp dụng cho hóa đơn đã thanh toán
export class LoiQr extends Error {}              // 10a / 8a
export class LoiGuiMail extends Error {}         // 4a (UC8.6)
const BAT_BUOC = 'Vui lòng nhập đầy đủ thông tin bắt buộc'; // SRS 8.1 9a / 8.3 7a
const DON_GIA_NUOC = 50000;                                  // BR-UC8-05
const HOM_NAY = `(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;
const NHAC_CACH_NGAY = Number(process.env.NHAC_CACH_NGAY || 3); // "lịch cấu hình" nhắc nợ (UC8.8)
const ngayHopLe = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const so = (x) => { const s = String(x ?? '').trim().replace(/[.\s]/g, '').replace(',', '.'); return s !== '' && /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN; };
const emailHopLe = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ''));

const TT = `CASE WHEN h.trang_thai='Chưa thanh toán' AND h.han_thanh_toan < ${HOM_NAY} THEN 'Quá hạn' ELSE h.trang_thai END`; // BR-UC8-09
const SELECT = `SELECT h.*, to_char(h.ngay_bat_dau,'YYYY-MM-DD') AS bd, to_char(h.ngay_ket_thuc,'YYYY-MM-DD') AS kt,
    to_char(h.ngay_phat_hanh,'YYYY-MM-DD') AS ph, to_char(h.han_thanh_toan,'YYYY-MM-DD') AS han, ${TT} AS tt_hien_thi,
    hd.ma_phong, hd.ma_nguoi_thue, hd.gia_thue, hd.so_hop_dong, to_char(hd.ngay_bat_dau,'YYYY-MM-DD') AS hd_bd, to_char(hd.ngay_ket_thuc,'YYYY-MM-DD') AS hd_kt,
    p.ten_phong, p.ma_toa_nha, t.ten_toa_nha, t.dia_chi, COALESCE(n.ho_ten, hd.ten_khach_thue) AS ten_khach, n.so_dien_thoai, n.email
  FROM hoa_don h JOIN hop_dong hd ON hd.ma_hop_dong = h.ma_hop_dong JOIN phong_tro p ON p.ma_phong = hd.ma_phong
  JOIN toa_nha t ON t.ma_toa_nha = p.ma_toa_nha LEFT JOIN nguoi_thue n ON n.ma_nguoi_thue = hd.ma_nguoi_thue`;

const dtoDong = (c) => ({ loai: c.loai, maDichVu: c.ma_dich_vu, noiDung: c.noi_dung, chiSoCu: c.chi_so_cu === null ? null : Number(c.chi_so_cu),
  chiSoMoi: c.chi_so_moi === null ? null : Number(c.chi_so_moi), soLuong: Number(c.so_luong), donVi: c.don_vi, donGia: Number(c.don_gia), thanhTien: Number(c.thanh_tien) });
const dtoDs = (r) => ({
  maHoaDon: r.ma_hoa_don, soHoaDon: r.so_hoa_don, maHopDong: r.ma_hop_dong, maPhong: r.ma_phong, tenPhong: r.ten_phong,
  maToaNha: r.ma_toa_nha, tenToaNha: r.ten_toa_nha, ngayBatDau: r.bd, ngayKetThuc: r.kt, tongCong: Number(r.tong_cong),
  trangThai: r.tt_hien_thi, daThanhToan: r.trang_thai === 'Đã thanh toán', trangThaiGui: r.trang_thai_gui,
});
const dtoCt = (r, dong) => ({
  ...dtoDs(r), tenNhaTro: r.ten_toa_nha, diaChi: r.dia_chi, ngayPhatHanh: r.ph, hanThanhToan: r.han, soHopDong: r.so_hop_dong,
  tenKhach: r.ten_khach, soDienThoai: r.so_dien_thoai || '', emailKhach: r.email || '', soNguoi: r.so_nguoi,
  tienPhong: Number(r.tien_phong), tienDien: Number(r.tien_dien), tienNuoc: Number(r.tien_nuoc), tienDichVuKhac: Number(r.tien_dich_vu_khac),
  maQr: r.ma_qr, chiTiet: dong.map(dtoDong), hopDongBatDau: r.hd_bd, hopDongKetThuc: r.hd_kt,
});

// ---------- Dịch vụ của hợp đồng + chỉ số cũ (BR-UC8-03) ----------
async function chiSoCu(maHopDong, maDichVu, truocNgay, boQua, db) {
  const t = await db.query(`SELECT ct.chi_so_moi FROM hoa_don_chi_tiet ct JOIN hoa_don h ON h.ma_hoa_don = ct.ma_hoa_don
    WHERE h.ma_hop_dong=$1 AND ct.ma_dich_vu=$2 AND ct.chi_so_moi IS NOT NULL AND h.ma_hoa_don <> $4 AND h.ngay_bat_dau < $3
    ORDER BY h.ngay_bat_dau DESC, h.ma_hoa_don DESC LIMIT 1`, [maHopDong, maDichVu, truocNgay, boQua || 0]);
  if (t.rowCount) return Number(t.rows[0].chi_so_moi);
  const b = await db.query('SELECT chi_so_ban_dau FROM hop_dong_dich_vu WHERE ma_hop_dong=$1 AND ma_dich_vu=$2', [maHopDong, maDichVu]);
  return b.rows[0]?.chi_so_ban_dau == null ? 0 : Number(b.rows[0].chi_so_ban_dau);
}
async function dsDichVu(maHopDong, truocNgay, boQua, db = pool) {
  const r = await db.query(`SELECT d.ma_dich_vu, d.ten_dich_vu, d.kieu_tinh_gia, d.don_gia, d.don_vi_tinh
    FROM hop_dong_dich_vu x JOIN dich_vu d ON d.ma_dich_vu = x.ma_dich_vu WHERE x.ma_hop_dong=$1 ORDER BY d.ma_dich_vu`, [maHopDong]);
  const out = [];
  for (const d of r.rows) {
    if (/nước/i.test(d.ten_dich_vu)) continue; // nước tính theo BR-UC8-05, không theo dịch vụ
    const dien = d.kieu_tinh_gia === 'Theo đồng hồ' && /điện/i.test(d.ten_dich_vu);
    out.push({ maDichVu: d.ma_dich_vu, tenDichVu: d.ten_dich_vu, kieuTinhGia: d.kieu_tinh_gia, donGia: Number(d.don_gia), donViTinh: d.don_vi_tinh,
      loai: dien ? 'dien' : 'khac', chiSoCu: d.kieu_tinh_gia === 'Theo đồng hồ' ? await chiSoCu(maHopDong, d.ma_dich_vu, truocNgay, boQua, db) : null });
  }
  return out;
}
const demNguoi = async (maPhong, db) => Number((await db.query('SELECT COUNT(*) FROM nguoi_thue WHERE ma_phong=$1', [maPhong])).rows[0].count);

// ---------- Kiểm tra + tính tiền (BR-UC8-01..06, 11) ----------
async function chuanBi(b, { maHoaDon = null, cu = null }, db) {
  const loi = {};
  const maHopDong = cu ? cu.ma_hop_dong : Number.parseInt(b.maHopDong, 10);
  if (!cu && !Number.isInteger(maHopDong)) loi.maHopDong = BAT_BUOC;
  const ng = {};
  for (const k of ['ngayBatDau', 'ngayKetThuc', 'ngayPhatHanh', 'hanThanhToan']) {
    ng[k] = String(b[k] ?? '').trim();
    if (!ng[k]) loi[k] = BAT_BUOC;
  }
  // chỉ số điện mới bắt buộc với dịch vụ theo đồng hồ đã chọn
  const chon = Array.isArray(b.dichVu) ? b.dichVu : [];
  if (Object.keys(loi).length) {
    // vẫn kiểm tra chỉ số trống để hiện luôn các lỗi bắt buộc cùng lúc
    for (const x of chon) if (String(x.chiSoMoi ?? '').trim() === '' && x.theoDongHo) loi['chiSo_' + x.maDichVu] = BAT_BUOC;
    throw new LoiNhap(loi, BAT_BUOC);
  }
  const hd = (await db.query(`SELECT hd.*, to_char(hd.ngay_bat_dau,'YYYY-MM-DD') AS bd, to_char(hd.ngay_ket_thuc,'YYYY-MM-DD') AS kt,
      p.ma_toa_nha, t.ngan_hang, t.so_tai_khoan, t.ten_chu_tai_khoan FROM hop_dong hd JOIN phong_tro p ON p.ma_phong=hd.ma_phong
      JOIN toa_nha t ON t.ma_toa_nha=p.ma_toa_nha WHERE hd.ma_hop_dong=$1`, [maHopDong])).rows[0];
  if (!hd || (!cu && hd.trang_thai !== 'Hoạt động')) throw new LoiNhap({ maHopDong: '' }, 'Không có hợp đồng thuê còn hiệu lực để tạo hóa đơn'); // 3a
  if (!Object.values(ng).every(ngayHopLe)) throw new LoiNhap({ ngayBatDau: '', ngayKetThuc: '', ngayPhatHanh: '', hanThanhToan: '' }, 'Thông tin ngày tháng không hợp lệ');
  if (ng.ngayBatDau > ng.ngayKetThuc || ng.ngayBatDau < hd.bd || ng.ngayKetThuc > hd.kt || ng.hanThanhToan < ng.ngayPhatHanh) {
    const l = {};
    if (ng.ngayBatDau > ng.ngayKetThuc || ng.ngayBatDau < hd.bd || ng.ngayKetThuc > hd.kt) { l.ngayBatDau = ''; l.ngayKetThuc = ''; }
    if (ng.hanThanhToan < ng.ngayPhatHanh) { l.ngayPhatHanh = ''; l.hanThanhToan = ''; }
    throw new LoiNhap(l, 'Thông tin ngày tháng không hợp lệ'); // 9b / 7c
  }
  // BR-UC8-01: mỗi phòng một hóa đơn trong kỳ (kỳ không được giao nhau)
  const trung = await db.query(`SELECT 1 FROM hoa_don h JOIN hop_dong x ON x.ma_hop_dong=h.ma_hop_dong
    WHERE x.ma_phong=$1 AND h.ma_hoa_don <> $2 AND h.ngay_bat_dau <= $4 AND h.ngay_ket_thuc >= $3`, [hd.ma_phong, maHoaDon || 0, ng.ngayBatDau, ng.ngayKetThuc]);
  if (trung.rowCount) throw new LoiNhap({ ngayBatDau: '', ngayKetThuc: '' }, 'Hóa đơn của phòng trong kỳ này đã tồn tại'); // 9d / 7d

  const dsDv = await dsDichVu(maHopDong, ng.ngayBatDau, maHoaDon, db);
  const soNguoi = cu ? cu.so_nguoi : await demNguoi(hd.ma_phong, db);
  const gia = {}; // giữ đơn giá đã lưu khi sửa (BR-UC7-07)
  if (maHoaDon) (await db.query('SELECT ma_dich_vu, don_gia FROM hoa_don_chi_tiet WHERE ma_hoa_don=$1 AND ma_dich_vu IS NOT NULL', [maHoaDon])).rows.forEach((r) => { gia[r.ma_dich_vu] = Number(r.don_gia); });
  const dong = [{ loai: 'phong', ma_dich_vu: null, noi_dung: 'Tiền phòng 1 tháng', chi_so_cu: null, chi_so_moi: null, so_luong: 1, don_vi: 'Tháng', don_gia: Number(hd.gia_thue), thanh_tien: Number(hd.gia_thue) }];
  if (b.tinhNuoc) dong.push({ loai: 'nuoc', ma_dich_vu: null, noi_dung: 'Dịch vụ nước', chi_so_cu: null, chi_so_moi: null, so_luong: soNguoi, don_vi: 'Người', don_gia: DON_GIA_NUOC, thanh_tien: soNguoi * DON_GIA_NUOC });
  const dien = [], khac = [];
  for (const x of chon) {
    const d = dsDv.find((v) => v.maDichVu === Number(x.maDichVu));
    if (!d) continue;
    const donGia = gia[d.maDichVu] ?? d.donGia;
    if (d.kieuTinhGia === 'Theo đồng hồ') {
      const raw = String(x.chiSoMoi ?? '').trim();
      if (raw === '') { loi['chiSo_' + d.maDichVu] = BAT_BUOC; continue; }
      const moi = so(raw);
      if (Number.isNaN(moi) || moi < 0) { loi['chiSo_' + d.maDichVu] = 'Chỉ số không hợp lệ'; continue; }
      if (moi < d.chiSoCu) { loi['chiSo_' + d.maDichVu] = 'Chỉ số điện mới không được nhỏ hơn chỉ số điện cũ'; continue; } // 9c / 7b
      const sl = moi - d.chiSoCu;
      (d.loai === 'dien' ? dien : khac).push({ loai: d.loai, ma_dich_vu: d.maDichVu, noi_dung: d.loai === 'dien' ? 'Dịch vụ điện' : d.tenDichVu, chi_so_cu: d.chiSoCu, chi_so_moi: moi, so_luong: sl, don_vi: d.donViTinh, don_gia: donGia, thanh_tien: Math.round(sl * donGia) });
    } else khac.push({ loai: 'khac', ma_dich_vu: d.maDichVu, noi_dung: d.tenDichVu, chi_so_cu: null, chi_so_moi: null, so_luong: soNguoi, don_vi: d.donViTinh, don_gia: donGia, thanh_tien: soNguoi * donGia });
  }
  if (Object.keys(loi).length) throw new LoiNhap(loi, Object.values(loi).every((v) => v === BAT_BUOC) ? BAT_BUOC : 'Dữ liệu không hợp lệ');
  dong.push(...dien, ...khac);
  const tong = (l) => dong.filter((d) => l.includes(d.loai)).reduce((s, d) => s + d.thanh_tien, 0);
  const tinh = { tienPhong: tong(['phong']), tienDien: tong(['dien']), tienNuoc: tong(['nuoc']), tienKhac: tong(['khac']) };
  return { hd, ng, dong, soNguoi, ...tinh, tongCong: tinh.tienPhong + tinh.tienDien + tinh.tienNuoc + tinh.tienKhac };
}

async function taoQr(hd, tongCong, soHoaDon) {
  try { return await taoMaQr({ nganHang: hd.ngan_hang, soTaiKhoan: hd.so_tai_khoan, soTien: tongCong, noiDung: soHoaDon, tenChuTaiKhoan: hd.ten_chu_tai_khoan }); }
  catch { throw new LoiQr('Không thể tạo mã QR thanh toán. Vui lòng thử lại'); }
}
async function ghiDong(db, maHoaDon, dong) {
  let i = 0;
  for (const d of dong) {
    await db.query(`INSERT INTO hoa_don_chi_tiet (ma_hoa_don,thu_tu,loai,ma_dich_vu,noi_dung,chi_so_cu,chi_so_moi,so_luong,don_vi,don_gia,thanh_tien) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [maHoaDon, ++i, d.loai, d.ma_dich_vu, d.noi_dung, d.chi_so_cu, d.chi_so_moi, d.so_luong, d.don_vi, d.don_gia, d.thanh_tien]);
  }
}

// ---------- UC8.7 danh sách + tra cứu ----------
export async function layDanhSach({ tuKhoa = '', maToaNha = '' } = {}) {
  const tq = (await pool.query(`SELECT COUNT(*)::int AS tong, COUNT(*) FILTER (WHERE trang_thai='Đã thanh toán')::int AS da, COUNT(*) FILTER (WHERE trang_thai='Chưa thanh toán')::int AS chua FROM hoa_don`)).rows[0];
  const p = []; const w = [];
  if (String(tuKhoa).trim()) { p.push(`%${String(tuKhoa).trim().replace(/[%_\\]/g, '\\$&')}%`); w.push(`p.ten_phong ILIKE $${p.length}`); }
  if (maToaNha !== '' && Number.isInteger(Number(maToaNha))) { p.push(Number(maToaNha)); w.push(`p.ma_toa_nha = $${p.length}`); }
  const r = await pool.query(`${SELECT} ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY h.ma_hoa_don DESC`, p);
  return { tongQuan: { tongHoaDon: tq.tong, soHoaDonDaThanhToan: tq.da, soHoaDonChuaThanhToan: tq.chua }, hoaDon: r.rows.map(dtoDs) };
}

// Hợp đồng còn hiệu lực + dịch vụ + chỉ số cũ cho biểu mẫu Tạo hóa đơn
export async function layTuyChon() {
  await capNhatHetHan();
  const r = await pool.query(`SELECT hd.ma_hop_dong, hd.so_hop_dong, hd.ma_phong, hd.gia_thue, COALESCE(n.ho_ten, hd.ten_khach_thue) AS ten_khach,
      to_char(hd.ngay_bat_dau,'YYYY-MM-DD') AS bd, to_char(hd.ngay_ket_thuc,'YYYY-MM-DD') AS kt, p.ten_phong, p.ma_toa_nha, t.ten_toa_nha
    FROM hop_dong hd JOIN phong_tro p ON p.ma_phong=hd.ma_phong JOIN toa_nha t ON t.ma_toa_nha=p.ma_toa_nha
    LEFT JOIN nguoi_thue n ON n.ma_nguoi_thue=hd.ma_nguoi_thue WHERE hd.trang_thai='Hoạt động' ORDER BY t.ten_toa_nha, p.ten_phong`);
  const hopDong = [];
  for (const h of r.rows) hopDong.push({ maHopDong: h.ma_hop_dong, soHopDong: h.so_hop_dong, maPhong: h.ma_phong, tenPhong: h.ten_phong, maToaNha: h.ma_toa_nha,
    tenToaNha: h.ten_toa_nha, tenKhach: h.ten_khach, giaThue: Number(h.gia_thue), ngayBatDau: h.bd, ngayKetThuc: h.kt,
    soNguoi: await demNguoi(h.ma_phong, pool), dichVu: await dsDichVu(h.ma_hop_dong, '9999-12-31', null) });
  return { hopDong };
}

async function layDayDu(id, db = pool) {
  const r = await db.query(`${SELECT} WHERE h.ma_hoa_don=$1`, [id]);
  if (!r.rowCount) throw new KhongTimThay();
  const dong = (await db.query('SELECT * FROM hoa_don_chi_tiet WHERE ma_hoa_don=$1 ORDER BY thu_tu', [id])).rows;
  return { row: r.rows[0], dong, dto: dtoCt(r.rows[0], dong) };
}
// UC8.2 xem chi tiết + dữ liệu cho form Sửa (UC8.3)
export async function layChiTiet(id) {
  const { row, dong, dto } = await layDayDu(id);
  const ds = await dsDichVu(row.ma_hop_dong, row.bd, row.ma_hoa_don);
  dto.dichVu = ds.map((d) => { const l = dong.find((x) => x.ma_dich_vu === d.maDichVu); return { ...d, chon: !!l, chiSoMoi: l && l.chi_so_moi !== null ? Number(l.chi_so_moi) : '' }; });
  dto.coNuoc = dong.some((x) => x.loai === 'nuoc');
  dto.giaThue = Number(row.gia_thue);
  return dto;
}

// ---------- UC8.1 tạo ----------
export async function tao(b) {
  await capNhatHetHan();
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const k = await chuanBi(b, {}, c);
    const so_hd = 'HD' + String((await c.query(`SELECT nextval('hoa_don_so_seq') AS n`)).rows[0].n).padStart(4, '0');
    const qr = await taoQr(k.hd, k.tongCong, so_hd);
    const r = await c.query(`INSERT INTO hoa_don (so_hoa_don,ma_hop_dong,ngay_bat_dau,ngay_ket_thuc,ngay_phat_hanh,han_thanh_toan,so_nguoi,tien_phong,tien_dien,tien_nuoc,tien_dich_vu_khac,tong_cong,ma_qr)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING ma_hoa_don`,
      [so_hd, k.hd.ma_hop_dong, k.ng.ngayBatDau, k.ng.ngayKetThuc, k.ng.ngayPhatHanh, k.ng.hanThanhToan, k.soNguoi, k.tienPhong, k.tienDien, k.tienNuoc, k.tienKhac, k.tongCong, qr]);
    await ghiDong(c, r.rows[0].ma_hoa_don, k.dong);
    await c.query('COMMIT');
    return { maHoaDon: r.rows[0].ma_hoa_don, soHoaDon: so_hd };
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
}

// ---------- UC8.3 sửa (chỉ hóa đơn "Chưa thanh toán") ----------
export async function sua(id, b) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const cu = (await c.query('SELECT * FROM hoa_don WHERE ma_hoa_don=$1 FOR UPDATE', [id])).rows[0];
    if (!cu) throw new KhongTimThay();
    if (cu.trang_thai !== 'Chưa thanh toán') throw new KhongChoPhep();
    const k = await chuanBi(b, { maHoaDon: id, cu }, c);
    const qr = await taoQr(k.hd, k.tongCong, cu.so_hoa_don);
    await c.query(`UPDATE hoa_don SET ngay_bat_dau=$2,ngay_ket_thuc=$3,ngay_phat_hanh=$4,han_thanh_toan=$5,tien_phong=$6,tien_dien=$7,tien_nuoc=$8,tien_dich_vu_khac=$9,tong_cong=$10,ma_qr=$11 WHERE ma_hoa_don=$1`,
      [id, k.ng.ngayBatDau, k.ng.ngayKetThuc, k.ng.ngayPhatHanh, k.ng.hanThanhToan, k.tienPhong, k.tienDien, k.tienNuoc, k.tienKhac, k.tongCong, qr]);
    await c.query('DELETE FROM hoa_don_chi_tiet WHERE ma_hoa_don=$1', [id]);
    await ghiDong(c, id, k.dong);
    await c.query('COMMIT');
    return { maHoaDon: id };
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
}

// ---------- UC8.4 xóa / UC8.5 xác nhận thanh toán ----------
export async function xoa(id) {
  const r = await pool.query('DELETE FROM hoa_don WHERE ma_hoa_don=$1', [id]);
  if (!r.rowCount) throw new KhongTimThay();
  return { ok: true };
}
export async function xacNhanThanhToan(id) {
  const r = await pool.query(`UPDATE hoa_don SET trang_thai='Đã thanh toán' WHERE ma_hoa_don=$1 AND trang_thai='Chưa thanh toán'`, [id]);
  if (!r.rowCount) {
    if (!(await pool.query('SELECT 1 FROM hoa_don WHERE ma_hoa_don=$1', [id])).rowCount) throw new KhongTimThay();
    throw new KhongChoPhep();
  }
  return { ok: true };
}

// ---------- UC8.6 gửi email / UC8.8 nhắc quá hạn ----------
async function guiVaGhiNhan(id, nhac) {
  const { row, dto } = await layDayDu(id);
  if (!emailHopLe(row.email)) {
    if (nhac) await pool.query(`UPDATE hoa_don SET trang_thai_gui='Gửi thất bại' WHERE ma_hoa_don=$1`, [id]);
    throw new LoiNhap({}, 'Người thuê chưa có địa chỉ email hợp lệ'); // 2a
  }
  try {
    await guiMailHoaDon(row.email, dto, nhac);
    await pool.query(`UPDATE hoa_don SET trang_thai_gui='Đã gửi' WHERE ma_hoa_don=$1`, [id]);
  } catch (e) {
    console.error('Không gửi được email hóa đơn', dto.soHoaDon, e.message);
    await pool.query(`UPDATE hoa_don SET trang_thai_gui='Gửi thất bại' WHERE ma_hoa_don=$1`, [id]);
    throw new LoiGuiMail('Không thể gửi hóa đơn, vui lòng thử lại sau'); // 4a
  }
}
export async function guiEmail(id) {
  const r = await pool.query('SELECT trang_thai FROM hoa_don WHERE ma_hoa_don=$1', [id]);
  if (!r.rowCount) throw new KhongTimThay();
  if (r.rows[0].trang_thai !== 'Chưa thanh toán') throw new KhongChoPhep();
  await guiVaGhiNhan(id, false);
  return { ok: true };
}
// UC8.8: tự động nhắc hóa đơn Chưa thanh toán đã quá hạn; không nhắc hóa đơn đã thanh toán/đã xóa (BR-UC8-10)
export async function nhacQuaHan() {
  const r = await pool.query(`SELECT ma_hoa_don FROM hoa_don WHERE trang_thai='Chưa thanh toán' AND han_thanh_toan < ${HOM_NAY}
    AND (ngay_nhac_cuoi IS NULL OR ngay_nhac_cuoi <= ${HOM_NAY} - $1::int)`, [NHAC_CACH_NGAY]);
  for (const { ma_hoa_don: id } of r.rows) {
    await pool.query(`UPDATE hoa_don SET ngay_nhac_cuoi=${HOM_NAY} WHERE ma_hoa_don=$1`, [id]);
    await guiVaGhiNhan(id, true).catch((e) => console.error('Nhắc quá hạn lỗi', id, e.message));
  }
}
