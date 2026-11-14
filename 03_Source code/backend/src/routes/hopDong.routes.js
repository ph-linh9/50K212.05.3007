import { Router } from 'express';
import * as c from '../controllers/hopDong.controller.js';
import { yeuCauDangNhap } from '../middlewares/auth.js';
const r = Router();
r.use(yeuCauDangNhap);
r.get('/', c.danhSach);               // UC5.2 Xem danh sách, UC5.7 Tra cứu (?tuKhoa=&maToaNha=)
r.get('/tuy-chon', c.tuyChon);        // dữ liệu chọn phòng/khách/dịch vụ cho biểu mẫu Tạo/Sửa
r.get('/:id', c.chiTiet);             // UC5.3 Xem chi tiết (và dữ liệu cho form Sửa, xuất PDF UC5.8)
r.post('/', c.tao);                   // UC5.1 Thêm
r.put('/:id', c.sua);                 // UC5.4 Sửa
r.post('/:id/gia-han', c.giaHan);     // UC5.5 Gia hạn
r.post('/:id/cham-dut', c.chamDut);   // UC5.6 Chấm dứt
export default r;
