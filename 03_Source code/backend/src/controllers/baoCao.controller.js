import * as s from '../services/baoCao.service.js';
export const baoCao = async (req, res) => {
  try { res.json(await s.layBaoCao(req.query)); }
  catch (e) {
    if (e instanceof s.LoiNhap) return res.status(400).json({ message: e.message });
    console.error(e); res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};
