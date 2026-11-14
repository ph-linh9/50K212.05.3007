import { Router } from 'express';
import * as c from '../controllers/phongTro.controller.js';
import { yeuCauDangNhap } from '../middlewares/auth.js';
const r = Router();
r.use(yeuCauDangNhap);
r.get('/', c.danhSach);        // UC3.2 Xem danh sách, UC3.6 Tra cứu (?tuKhoa=&maToaNha=)
r.get('/:id', c.chiTiet);      // UC3.3 Xem chi tiết
r.post('/', c.tao);            // UC3.1 Thêm
r.put('/:id', c.sua);          // UC3.4 Sửa
r.delete('/:id', c.xoa);       // UC3.5 Xóa
export default r;
