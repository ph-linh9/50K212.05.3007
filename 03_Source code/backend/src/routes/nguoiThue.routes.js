import { Router } from 'express';
import * as c from '../controllers/nguoiThue.controller.js';
import { yeuCauDangNhap } from '../middlewares/auth.js';
const r = Router();
r.use(yeuCauDangNhap);
r.get('/', c.danhSach);            // UC4.2 Xem danh sách, UC4.6 Tra cứu (?tuKhoa=&maToaNha=)
r.get('/xuat-excel', c.xuatExcel); // UC4.7 Xuất Excel
r.get('/:id', c.chiTiet);          // UC4.3 Xem chi tiết (và dữ liệu cho form Sửa)
r.post('/', c.tao);                // UC4.1 Thêm
r.put('/:id', c.sua);              // UC4.4 Sửa
r.delete('/:id', c.xoa);           // UC4.5 Xóa
export default r;
