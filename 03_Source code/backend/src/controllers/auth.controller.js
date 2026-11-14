import * as s from '../services/auth.service.js';
const wrap = (fn) => async (req, res) => {
  try { res.json(await fn(req.body || {}, req)); }
  catch (e) {
    if (e instanceof s.LoiNghiepVu) return res.status(e.status).json({ message: e.message, field: e.field });
    console.error(e); res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};
export const dangNhap = wrap(s.dangNhap);
export const quenMatKhau = wrap(s.guiYeuCauQuenMatKhau);
export const xacThucMa = wrap(s.xacThucMa);
export const datLaiMatKhau = wrap(s.datLaiMatKhau);
export const me = (req, res) => res.json({ maTaiKhoan: req.user.sub, email: req.user.email });
