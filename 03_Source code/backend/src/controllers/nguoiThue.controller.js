import * as s from '../services/nguoiThue.service.js';
const id = (req) => Number.parseInt(req.params.id, 10);
const loiChung = (e, res) => {
  if (e instanceof s.LoiNhap) return res.status(400).json({ message: e.message, loi: e.loi });
  if (e instanceof s.KhongTimThay) return res.status(404).json({ message: 'Không tìm thấy người thuê' });
  console.error(e); return res.status(500).json({ message: 'Lỗi hệ thống' });
};
const wrap = (fn, ok = 200) => async (req, res) => {
  try { res.status(ok).json(await fn(req)); } catch (e) { loiChung(e, res); }
};
export const danhSach = wrap((r) => s.layDanhSach(r.query));
export const chiTiet = wrap((r) => s.layChiTiet(id(r)));
export const tao = wrap((r) => s.tao(r.body || {}), 201);
export const sua = wrap((r) => s.sua(id(r), r.body || {}));
export const xoa = wrap(async (r) => { await s.xoa(id(r)); return { message: 'Xóa người thuê thành công!' }; });
export async function xuatExcel(_req, res) {
  try {
    const buf = await s.xuatExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="danh-sach-nguoi-thue.xlsx"');
    res.send(buf);
  } catch (e) {
    if (e instanceof s.DanhSachRong) return res.status(400).json({ message: 'Danh sách người thuê trống, không xuất file' });
    loiChung(e, res);
  }
}
