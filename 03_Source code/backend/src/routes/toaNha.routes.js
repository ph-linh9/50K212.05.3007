import { Router } from 'express';
import * as c from '../controllers/toaNha.controller.js';
import { yeuCauDangNhap } from '../middlewares/auth.js';
const r = Router();
r.use(yeuCauDangNhap);
r.get('/ngan-hang', c.nganHang);
r.get('/', c.danhSach);        // danh sách tòa nhà
r.get('/:id', c.chiTiet);      // UC2.2 Xem
r.post('/', c.tao);            // UC2.1 Tạo
r.put('/:id', c.sua);          // UC2.3 Sửa
r.delete('/:id', c.xoa);       // UC2.4 Xóa
export default r;
