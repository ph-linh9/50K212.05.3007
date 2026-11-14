import { pool } from '../config/db.js';
import { LoiNhap, KhongTimThay } from './toaNha.service.js';
import { guiMailNhacGiaHan } from './mail.service.js';
import { kiemTraAnh } from '../utils/anh.js';
import { lamSachHtml, trongNoiDungHtml } from '../utils/lamSachHtml.js';

export { LoiNhap, KhongTimThay };
export class KhongChoPhep extends Error {} // thao tác không áp dụng cho hợp đồng không còn "Hoạt động" (BR-UC5-10, BR-UC5-12)
const BAT_BUOC = 'Vui lòng nhập đầy đủ thông tin bắt buộc';
const THOI_HAN = [3, 4, 5, 6];
const CHU_KY = [1, 3, 6, 12];
const HOM_NAY = `(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;

const so = (x) => {
  const s = String(x ?? '').trim().replace(/[.\s]/g, '').replace(',', '.');
  return s !== '' && /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};
const ngayHopLe = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const lamSach = lamSachHtml;
const trongNoiDung = trongNoiDungHtml;

// ---------- Trạng thái theo thời gian (BR-UC5-11) ----------
// Đồng bộ trạng thái phòng với hợp đồng: có hợp đồng "Hoạt động" -> "Đang thuê", không còn -> "Trống" (không đụng "Đang sửa chữa")
export async function dongBoPhong(maPhong, db = pool) {
  const co = (await db.query(`SELECT 1 FROM hop_dong WHERE ma_phong=$1 AND trang_thai='Hoạt động'`, [maPhong])).rowCount > 0;
  if (co) await db.query(`UPDATE phong_tro SET trang_thai='Đang thuê' WHERE ma_phong=$1 AND trang_thai='Trống'`, [maPhong]);
  else await db.query(`UPDATE phong_tro SET trang_thai='Trống' WHERE ma_phong=$1 AND trang_thai='Đang thuê'`, [maPhong]);
}
// Hợp đồng quá ngày kết thúc chuyển từ "Hoạt động" sang "Hết hạn".
// Được gọi lại trước mỗi lần xem danh sách/chi tiết (phòng, hợp đồng...) để dữ liệu luôn mới, nhưng tiết hạn hết
// hạn tính theo ngày lịch nên không cần chạy UPDATE này nhiều lần trong cùng một phút.
let lanCapNhatCuoi = 0;
export async function capNhatHetHan() {
  const bayGio = Date.now();
  if (bayGio - lanCapNhatCuoi < 60_000) return;
  lanCapNhatCuoi = bayGio;
  const r = await pool.query(`UPDATE hop_dong SET trang_thai='Hết hạn' WHERE trang_thai='Hoạt động' AND ngay_ket_thuc < ${HOM_NAY} RETURNING ma_phong`);
  for (const { ma_phong: p } of r.rows) await dongBoPhong(p);
}
// BR UC5.5: còn đúng 30 ngày đến hạn -> gửi một email đề nghị gia hạn tới người thuê
export async function nhacGiaHan() {
  const r = await pool.query(`SELECT h.ma_hop_dong, h.so_hop_dong, to_char(h.ngay_ket_thuc,'DD/MM/YYYY') AS han, n.email
    FROM hop_dong h JOIN nguoi_thue n ON n.ma_nguoi_thue = h.ma_nguoi_thue
    WHERE h.trang_thai='Hoạt động' AND NOT h.da_gui_mail_gia_han AND (h.ngay_ket_thuc - ${HOM_NAY}) = 30`);
  for (const h of r.rows) {
    try {
      await guiMailNhacGiaHan(h.email, h.so_hop_dong, h.han);
      await pool.query('UPDATE hop_dong SET da_gui_mail_gia_han=TRUE WHERE ma_hop_dong=$1', [h.ma_hop_dong]);
    } catch (e) { console.error('Không gửi được email nhắc gia hạn', h.so_hop_dong, e.message); }
  }
}

const SELECT = `SELECT h.*, to_char(h.ngay_bat_dau,'YYYY-MM-DD') AS bd, to_char(h.ngay_ket_thuc,'YYYY-MM-DD') AS kt,
    (h.ngay_ket_thuc - ${HOM_NAY}) AS con_lai,
    p.ten_phong, p.ma_toa_nha, t.ten_toa_nha, COALESCE(n.ho_ten, h.ten_khach_thue) AS ten_khach
  FROM hop_dong h JOIN phong_tro p ON p.ma_phong = h.ma_phong JOIN toa_nha t ON t.ma_toa_nha = p.ma_toa_nha
  LEFT JOIN nguoi_thue n ON n.ma_nguoi_thue = h.ma_nguoi_thue`;

const toDto = (r) => ({
  maHopDong: r.ma_hop_dong, soHopDong: r.so_hop_dong, maPhong: r.ma_phong, tenPhong: r.ten_phong,
  maToaNha: r.ma_toa_nha, tenToaNha: r.ten_toa_nha, maNguoiThue: r.ma_nguoi_thue, tenKhachThue: r.ten_khach,
  thoiHanThang: r.thoi_han_thang, ngayBatDau: r.bd, ngayKetThuc: r.kt,
  giaThue: Number(r.gia_thue), tienCoc: Number(r.tien_coc), chuKyThanhToan: r.chu_ky_thanh_toan, trangThai: r.trang_thai,
  // BR-UC5-14 / UC5.5: "Sắp hết hạn" = Hoạt động và còn không quá 30 ngày
  sapHetHan: r.trang_thai === 'Hoạt động' && Number(r.con_lai) <= 30,
});

// UC5.2 + UC5.7: danh sách, tìm theo Tên phòng, lọc theo Tòa nhà. Thanh tổng quan tính trên toàn bộ hợp đồng.
export async function layDanhSach({ tuKhoa, maToaNha }) {
  await capNhatHetHan();
  const tg = []; const dk = [];
  if (tuKhoa && String(tuKhoa).trim()) { tg.push(`%${String(tuKhoa).trim().replace(/[\\%_]/g, '\\$&')}%`); dk.push(`p.ten_phong ILIKE $${tg.length}`); }
  if (maToaNha) { tg.push(Number(maToaNha)); dk.push(`p.ma_toa_nha = $${tg.length}`); }
  const ds = await pool.query(`${SELECT} ${dk.length ? 'WHERE ' + dk.join(' AND ') : ''} ORDER BY h.ma_hop_dong DESC`, tg);
  const q = (await pool.query(`SELECT count(*)::int tong,
      count(*) FILTER (WHERE trang_thai='Hoạt động')::int hd,
      count(*) FILTER (WHERE trang_thai='Hoạt động' AND (ngay_ket_thuc - ${HOM_NAY}) <= 30)::int sap FROM hop_dong`)).rows[0];
  return {
    tongQuan: { tongSoHopDong: q.tong, soHopDongDangHoatDong: q.hd, soHopDongSapHetHan: q.sap },
    hopDong: ds.rows.map(toDto),
  };
}

// UC5.3: chi tiết (cũng là dữ liệu cho form Sửa)
export async function layChiTiet(id) {
  await capNhatHetHan();
  const r = (await pool.query(`${SELECT} WHERE h.ma_hop_dong=$1`, [id])).rows[0];
  if (!r) throw new KhongTimThay();
  const dv = (await pool.query(`SELECT d.ma_dich_vu, d.ten_dich_vu, d.kieu_tinh_gia, d.don_gia, d.don_vi_tinh, x.chi_so_ban_dau
    FROM hop_dong_dich_vu x JOIN dich_vu d ON d.ma_dich_vu = x.ma_dich_vu WHERE x.ma_hop_dong=$1 ORDER BY d.ten_dich_vu`, [id])).rows;
  return {
    ...toDto(r), noiDung: r.noi_dung, hinhAnh: r.hinh_anh ?? null,
    dichVu: dv.map((d) => ({
      maDichVu: d.ma_dich_vu, tenDichVu: d.ten_dich_vu, kieuTinhGia: d.kieu_tinh_gia, donGia: Number(d.don_gia), donViTinh: d.don_vi_tinh,
      chiSoBanDau: d.chi_so_ban_dau === null ? null : Number(d.chi_so_ban_dau),
    })),
  };
}

// Dữ liệu cho biểu mẫu Tạo/Sửa: phòng còn có thể lập hợp đồng (kèm người thuê của phòng) và dịch vụ đang hoạt động
export async function layTuyChon({ maHopDong }) {
  await capNhatHetHan();
  const cur = maHopDong ? (await pool.query('SELECT ma_phong FROM hop_dong WHERE ma_hop_dong=$1', [Number(maHopDong) || -1])).rows[0] : null;
  const phong = (await pool.query(`SELECT p.ma_phong, p.ma_toa_nha, p.ten_phong, p.gia_thue, p.tien_coc, p.chu_ky_thanh_toan,
      COALESCE((SELECT json_agg(json_build_object('maNguoiThue', n.ma_nguoi_thue, 'hoTen', n.ho_ten) ORDER BY n.ma_nguoi_thue)
                FROM nguoi_thue n WHERE n.ma_phong = p.ma_phong), '[]') AS nguoi_thue
    FROM phong_tro p
    WHERE (p.trang_thai <> 'Đang sửa chữa' AND NOT EXISTS (SELECT 1 FROM hop_dong h WHERE h.ma_phong = p.ma_phong AND h.trang_thai='Hoạt động'))
       OR p.ma_phong = $1
    ORDER BY p.ten_phong`, [cur?.ma_phong ?? -1])).rows;
  const dichVu = (await pool.query(`SELECT * FROM dich_vu WHERE trang_thai='Hoạt động'
      OR ma_dich_vu IN (SELECT ma_dich_vu FROM hop_dong_dich_vu WHERE ma_hop_dong=$1) ORDER BY ten_dich_vu`, [Number(maHopDong) || -1])).rows;
  return {
    phong: phong.map((p) => ({
      maPhong: p.ma_phong, maToaNha: p.ma_toa_nha, tenPhong: p.ten_phong, giaThue: Number(p.gia_thue),
      tienCoc: p.tien_coc === null ? 0 : Number(p.tien_coc), chuKyThanhToan: p.chu_ky_thanh_toan, nguoiThue: p.nguoi_thue,
    })),
    dichVu: dichVu.map((d) => ({
      maDichVu: d.ma_dich_vu, maToaNha: d.ma_toa_nha, tenDichVu: d.ten_dich_vu, kieuTinhGia: d.kieu_tinh_gia,
      donGia: Number(d.don_gia), donViTinh: d.don_vi_tinh,
    })),
  };
}

// UC5.1 bước 8 / UC5.4 bước 6: kiểm tra hợp lệ
async function kiemTra(b, maHienTai) {
  const loi = {};
  const v = (k) => String(b[k] ?? '').trim();
  for (const k of ['maToaNha', 'maPhong', 'maNguoiThue', 'thoiHanThang', 'ngayBatDau', 'ngayKetThuc', 'chuKyThanhToan']) if (!v(k)) loi[k] = BAT_BUOC;
  const noiDung = lamSach(b.noiDung);
  if (trongNoiDung(noiDung)) loi.noiDung = BAT_BUOC;
  if (v('thoiHanThang') && !THOI_HAN.includes(Number(v('thoiHanThang')))) loi.thoiHanThang = BAT_BUOC;
  if (v('chuKyThanhToan') && !CHU_KY.includes(Number(v('chuKyThanhToan')))) loi.chuKyThanhToan = BAT_BUOC;
  if (v('ngayBatDau') && !ngayHopLe(v('ngayBatDau'))) loi.ngayBatDau = BAT_BUOC;
  if (v('ngayKetThuc') && !ngayHopLe(v('ngayKetThuc'))) loi.ngayKetThuc = BAT_BUOC;
  const loiAnhHd = kiemTraAnh(b.hinhAnh, { reDinhDang: /^data:image\/(png|jpe?g)[;,]/, tenLoi: 'Ảnh phải ở định dạng PNG hoặc JPEG' });
  if (loiAnhHd) loi.hinhAnh = loiAnhHd;

  // Dịch vụ: bắt buộc chọn ít nhất một; dịch vụ tính theo đồng hồ (điện) phải có chỉ số ban đầu (BR-UC5-06)
  const dvChon = Array.isArray(b.dichVu) ? b.dichVu : [];
  if (!dvChon.length) loi.dichVu = BAT_BUOC;

  // Phòng thuộc tòa nhà, người thuê thuộc phòng (BR-UC5-02); giá thuê và tiền cọc lấy theo phòng (BR-UC5-03)
  let phong = null; let nguoi = null;
  if (!loi.maToaNha && !loi.maPhong) {
    phong = (await pool.query('SELECT * FROM phong_tro WHERE ma_phong=$1 AND ma_toa_nha=$2', [Number(v('maPhong')) || -1, Number(v('maToaNha')) || -1])).rows[0];
    if (!phong) loi.maPhong = BAT_BUOC;
    else {
      const dang = (await pool.query(`SELECT 1 FROM hop_dong WHERE ma_phong=$1 AND trang_thai='Hoạt động' AND ma_hop_dong <> COALESCE($2,-1)`, [phong.ma_phong, maHienTai ?? null])).rowCount > 0;
      if (dang || phong.trang_thai === 'Đang sửa chữa') loi.maPhong = ''; // BR-UC5-08 (giao diện đã không cho chọn phòng này)
    }
  } else if (!loi.maToaNha && v('maToaNha')) {
    if (!(await pool.query('SELECT 1 FROM toa_nha WHERE ma_toa_nha=$1', [Number(v('maToaNha')) || -1])).rowCount) loi.maToaNha = BAT_BUOC;
  }
  if (phong && !loi.maPhong && !loi.maNguoiThue) {
    nguoi = (await pool.query('SELECT ma_nguoi_thue, ho_ten FROM nguoi_thue WHERE ma_nguoi_thue=$1 AND ma_phong=$2', [Number(v('maNguoiThue')) || -1, phong.ma_phong])).rows[0];
    if (!nguoi) loi.maNguoiThue = BAT_BUOC;
  }

  const dichVu = [];
  if (phong) {
    for (const x of dvChon) {
      const d = (await pool.query(
        `SELECT * FROM dich_vu WHERE ma_dich_vu=$1 AND (ma_toa_nha IS NULL OR ma_toa_nha=$2)
          AND (trang_thai='Hoạt động' OR ma_dich_vu IN (SELECT ma_dich_vu FROM hop_dong_dich_vu WHERE ma_hop_dong=$3))`,
        [Number(x?.maDichVu) || -1, phong.ma_toa_nha, maHienTai ?? -1])).rows[0];
      if (!d) { loi.dichVu = BAT_BUOC; continue; }
      let chiSo = null;
      if (d.kieu_tinh_gia === 'Theo đồng hồ') {
        const t = String(x.chiSoBanDau ?? '').trim();
        if (!t) loi[`chiSo_${d.ma_dich_vu}`] = BAT_BUOC;
        else if (!(so(t) >= 0)) loi[`chiSo_${d.ma_dich_vu}`] = '';
        else chiSo = so(t);
      }
      dichVu.push([d.ma_dich_vu, chiSo]);
    }
  }
  // UC5.1 8c / UC5.4 6b
  if (!loi.ngayBatDau && !loi.ngayKetThuc && v('ngayBatDau') && v('ngayKetThuc') && !(v('ngayKetThuc') > v('ngayBatDau'))) {
    loi.ngayKetThuc = 'Ngày kết thúc phải sau ngày bắt đầu';
  }
  if (Object.keys(loi).length) throw new LoiNhap(loi);
  return { phong, nguoi, dichVu, noiDung, thoiHan: Number(v('thoiHanThang')), bd: v('ngayBatDau'), kt: v('ngayKetThuc'),
    chuKy: Number(v('chuKyThanhToan')), hinhAnh: b.hinhAnh || null };
}

// BR-UC5-07: HD + yyyymm (tháng tạo) + số phòng; nếu trùng (cùng phòng, cùng tháng) thêm hậu tố -2, -3...
async function sinhSoHopDong(tenPhong, db) {
  const ym = (await db.query(`SELECT to_char(${HOM_NAY},'YYYYMM') AS ym`)).rows[0].ym;
  const soPhong = (String(tenPhong).match(/\d+/g) || []).join('') || String(tenPhong).replace(/\s+/g, '');
  const goc = `HD${ym}-${soPhong}`;
  let so_ = goc; let i = 1;
  while ((await db.query('SELECT 1 FROM hop_dong WHERE so_hop_dong=$1', [so_])).rowCount) so_ = `${goc}-${++i}`;
  return so_;
}

// ux_hop_dong_phong_hoat_dong: phòng đã có hợp đồng "Hoạt động" khác (BR-UC5-08) — lỗi người dùng cần sửa.
// hop_dong_so_hop_dong_key: hai yêu cầu tạo hợp đồng cùng lúc sinh trùng số hợp đồng — lỗi nội bộ, tự thử lại, không phải lỗi của chủ trọ.
const RB_PHONG = 'ux_hop_dong_phong_hoat_dong';
const RB_SO_HD = 'hop_dong_so_hop_dong_key';
const loiTrungPhong = (e) =>
  (e.code === '23505' && e.constraint === RB_PHONG)
    ? new LoiNhap({ maPhong: 'Phòng này đã có hợp đồng thuê còn hiệu lực, vui lòng chọn phòng khác' })
    : e;

// UC5.1
export async function tao(b, _laiLan = 0) {
  await capNhatHetHan();
  const k = await kiemTra(b, null);
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const so_ = await sinhSoHopDong(k.phong.ten_phong, c);
    const id = (await c.query(
      `INSERT INTO hop_dong (so_hop_dong, ma_phong, ma_nguoi_thue, ten_khach_thue, thoi_han_thang, ngay_bat_dau, ngay_ket_thuc,
         gia_thue, tien_coc, chu_ky_thanh_toan, noi_dung, hinh_anh)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ma_hop_dong`,
      [so_, k.phong.ma_phong, k.nguoi.ma_nguoi_thue, k.nguoi.ho_ten, k.thoiHan, k.bd, k.kt,
        k.phong.gia_thue, k.phong.tien_coc ?? 0, k.chuKy, k.noiDung, k.hinhAnh])).rows[0].ma_hop_dong;
    for (const [dv, cs] of k.dichVu) await c.query('INSERT INTO hop_dong_dich_vu (ma_hop_dong, ma_dich_vu, chi_so_ban_dau) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [id, dv, cs]);
    await dongBoPhong(k.phong.ma_phong, c);
    await c.query('COMMIT');
    return layChiTiet(id);
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    if (e.code === '23505' && e.constraint === RB_SO_HD && _laiLan < 2) return tao(b, _laiLan + 1);
    throw loiTrungPhong(e);
  } finally { c.release(); }
}

// UC5.4: chỉ hợp đồng "Hoạt động" mới được sửa (BR-UC5-10)
export async function sua(id, b) {
  const cu = await layChiTiet(id);
  if (cu.trangThai !== 'Hoạt động') throw new KhongChoPhep();
  const k = await kiemTra(b, id);
  const doiPhong = k.phong.ma_phong !== cu.maPhong;
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(
      `UPDATE hop_dong SET ma_phong=$1, ma_nguoi_thue=$2, ten_khach_thue=$3, thoi_han_thang=$4, ngay_bat_dau=$5, ngay_ket_thuc=$6,
         gia_thue=$7, tien_coc=$8, chu_ky_thanh_toan=$9, noi_dung=$10, hinh_anh=$11, da_gui_mail_gia_han=FALSE WHERE ma_hop_dong=$12`,
      [k.phong.ma_phong, k.nguoi.ma_nguoi_thue, k.nguoi.ho_ten, k.thoiHan, k.bd, k.kt,
        doiPhong ? k.phong.gia_thue : cu.giaThue, doiPhong ? (k.phong.tien_coc ?? 0) : cu.tienCoc, k.chuKy, k.noiDung, k.hinhAnh, id]);
    await c.query('DELETE FROM hop_dong_dich_vu WHERE ma_hop_dong=$1', [id]);
    for (const [dv, cs] of k.dichVu) await c.query('INSERT INTO hop_dong_dich_vu (ma_hop_dong, ma_dich_vu, chi_so_ban_dau) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [id, dv, cs]);
    await dongBoPhong(k.phong.ma_phong, c);
    if (doiPhong) await dongBoPhong(cu.maPhong, c);
    await c.query('COMMIT');
    return layChiTiet(id);
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw loiTrungPhong(e); } finally { c.release(); }
}

// UC5.5: gia hạn. Ngày kết thúc mới phải sau ngày bắt đầu và sau ngày kết thúc hiện tại (BR-UC5-13)
export async function giaHan(id, b) {
  const cu = await layChiTiet(id);
  if (cu.trangThai !== 'Hoạt động') throw new KhongChoPhep();
  const loi = {};
  const v = (k) => String(b[k] ?? '').trim();
  if (!v('thoiHanThang') || !THOI_HAN.includes(Number(v('thoiHanThang')))) loi.thoiHanThang = BAT_BUOC;
  if (!v('ngayBatDau') || !ngayHopLe(v('ngayBatDau'))) loi.ngayBatDau = BAT_BUOC;
  if (!v('ngayKetThuc') || !ngayHopLe(v('ngayKetThuc'))) loi.ngayKetThuc = 'Vui lòng chọn ngày kết thúc'; // 6a
  if (!loi.ngayBatDau && !loi.ngayKetThuc && !(v('ngayKetThuc') > v('ngayBatDau') && v('ngayKetThuc') > cu.ngayKetThuc)) {
    loi.ngayKetThuc = 'Thời gian gia hạn không hợp lệ';
  }
  if (Object.keys(loi).length) throw new LoiNhap(loi);
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('UPDATE hop_dong SET ngay_ket_thuc=$1, da_gui_mail_gia_han=FALSE WHERE ma_hop_dong=$2', [v('ngayKetThuc'), id]);
    await c.query('INSERT INTO gia_han_hop_dong (ma_hop_dong, thoi_han_thang, ngay_bat_dau, ngay_ket_thuc) VALUES ($1,$2,$3,$4)',
      [id, Number(v('thoiHanThang')), v('ngayBatDau'), v('ngayKetThuc')]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
  return layChiTiet(id);
}

// UC5.6: chấm dứt (giữ lại dữ liệu để tra cứu)
export async function chamDut(id) {
  const cu = await layChiTiet(id);
  if (cu.trangThai !== 'Hoạt động') throw new KhongChoPhep();
  await pool.query(`UPDATE hop_dong SET trang_thai='Chấm dứt' WHERE ma_hop_dong=$1`, [id]);
  await dongBoPhong(cu.maPhong);
  return layChiTiet(id);
}
