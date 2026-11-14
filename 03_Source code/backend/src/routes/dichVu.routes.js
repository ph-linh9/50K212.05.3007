import { Router } from 'express';
import * as c from '../controllers/dichVu.controller.js';
import { yeuCauDangNhap } from '../middlewares/auth.js';
const r = Router();
r.use(yeuCauDangNhap);
r.get('/', c.danhSach);     // UC7.4 Xem danh sách, UC7.5 Tra cứu (?tuKhoa=)
r.get('/:id', c.chiTiet);   // dữ liệu cho form Sửa (UC7.2 bước 2)
r.post('/', c.tao);         // UC7.1 Thêm
r.put('/:id', c.sua);       // UC7.2 Sửa
r.delete('/:id', c.xoa);    // UC7.3 Xóa
export default r;
