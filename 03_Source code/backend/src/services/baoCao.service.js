import { pool } from '../config/db.js';
import { LoiNhap } from './toaNha.service.js';
export { LoiNhap };

// UC9.1–9.3: thống kê doanh thu. Hóa đơn tính vào tháng/năm của kỳ hóa đơn (theo ngày bắt đầu kỳ) - BR-UC9-01
export async function layBaoCao({ thang, nam, maToaNha } = {}) {
  const homNay = (await pool.query(`SELECT EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::int AS n, EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::int AS t`)).rows[0];
  const n = nam === undefined || nam === '' ? homNay.n : Number.parseInt(nam, 10);
  const tatCa = thang === 'all';
  const t = thang === undefined || thang === '' ? homNay.t : (tatCa ? null : Number.parseInt(thang, 10));
  if (!Number.isInteger(n) || (!tatCa && !(t >= 1 && t <= 12))) throw new LoiNhap({}, 'Bộ lọc không hợp lệ');
  const p = [n]; const w = [`EXTRACT(YEAR FROM h.ngay_bat_dau) = $1`];
  if (!tatCa) { p.push(t); w.push(`EXTRACT(MONTH FROM h.ngay_bat_dau) = $${p.length}`); } // BR-UC9-04
  if (maToaNha !== undefined && maToaNha !== '') {
    const m = Number.parseInt(maToaNha, 10);
    if (!Number.isInteger(m)) throw new LoiNhap({}, 'Bộ lọc không hợp lệ');
    p.push(m); w.push(`pt.ma_toa_nha = $${p.length}`);
  }
  const r = (await pool.query(`SELECT
      COALESCE(SUM(h.tong_cong) FILTER (WHERE h.trang_thai='Đã thanh toán'),0) AS thu,
      COALESCE(SUM(h.tien_phong) FILTER (WHERE h.trang_thai='Đã thanh toán'),0) AS phong,
      COALESCE(SUM(h.tien_dien + h.tien_nuoc) FILTER (WHERE h.trang_thai='Đã thanh toán'),0) AS dien_nuoc,
      COALESCE(SUM(h.tien_dich_vu_khac) FILTER (WHERE h.trang_thai='Đã thanh toán'),0) AS khac,
      COALESCE(SUM(h.tong_cong) FILTER (WHERE h.trang_thai='Chưa thanh toán'),0) AS cho
    FROM hoa_don h JOIN hop_dong hd ON hd.ma_hop_dong=h.ma_hop_dong JOIN phong_tro pt ON pt.ma_phong=hd.ma_phong
    WHERE ${w.join(' AND ')}`, p)).rows[0];
  const thu = Number(r.thu), cho = Number(r.cho), kyVong = thu + cho;
  return {
    thang: tatCa ? 'all' : t, nam: n,
    tongDoanhThu: thu,
    coCauNguonThu: { tienPhong: Number(r.phong), dienNuoc: Number(r.dien_nuoc), dichVuKhac: Number(r.khac) },
    choThanhToan: cho,
    tyLeDaThu: kyVong === 0 ? 0 : Math.round((thu / kyVong) * 100), // BR-UC9-03
  };
}
