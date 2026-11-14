import * as s from '../services/hoaDon.service.js';
const id = (req) => Number.parseInt(req.params.id, 10);
const loiChung = (e, res) => {
  if (e instanceof s.LoiNhap) return res.status(400).json({ message: e.message, loi: e.loi });
  if (e instanceof s.KhongTimThay) return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
  if (e instanceof s.KhongChoPhep) return res.status(409).json({ message: 'Chỉ hóa đơn chưa thanh toán mới thực hiện được thao tác này' });
  if (e instanceof s.LoiQr || e instanceof s.LoiGuiMail) return res.status(502).json({ message: e.message });
  console.error(e); return res.status(500).json({ message: 'Lỗi hệ thống' });
};
const wrap = (fn, ok = 200) => async (req, res) => { try { res.status(ok).json(await fn(req)); } catch (e) { loiChung(e, res); } };
export const danhSach = wrap((r) => s.layDanhSach(r.query));
export const tuyChon = wrap(() => s.layTuyChon());
export const chiTiet = wrap((r) => s.layChiTiet(id(r)));
export const tao = wrap((r) => s.tao(r.body || {}), 201);
export const sua = wrap((r) => s.sua(id(r), r.body || {}));
export const xoa = wrap((r) => s.xoa(id(r)));
export const xacNhan = wrap((r) => s.xacNhanThanhToan(id(r)));
export const guiEmail = wrap((r) => s.guiEmail(id(r)));
