import * as s from '../services/toaNha.service.js';
import { DANH_SACH_NGAN_HANG } from '../config/nganHang.js';
const id = (req) => Number.parseInt(req.params.id, 10);
const wrap = (fn, ok = 200) => async (req, res) => {
  try { res.status(ok).json(await fn(req)); }
  catch (e) {
    if (e instanceof s.LoiNhap) return res.status(400).json({ message: e.message, loi: e.loi });
    if (e instanceof s.KhongTimThay) return res.status(404).json({ message: 'Không tìm thấy tòa nhà' });
    console.error(e); res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};
export const danhSach = wrap(() => s.layDanhSach());
export const chiTiet = wrap((r) => s.layChiTiet(id(r)));
export const tao = wrap((r) => s.tao(r.body || {}), 201);
export const sua = wrap((r) => s.sua(id(r), r.body || {}));
export const xoa = wrap(async (r) => { await s.xoa(id(r)); return { message: 'Xóa tòa nhà thành công' }; });
export const nganHang = (_, res) => res.json(DANH_SACH_NGAN_HANG);
