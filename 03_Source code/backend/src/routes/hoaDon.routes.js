import { Router } from 'express';
import * as c from '../controllers/hoaDon.controller.js';
import { yeuCauDangNhap } from '../middlewares/auth.js';
const r = Router();
r.use(yeuCauDangNhap);
r.get('/', c.danhSach);                    // UC8.7 Tra cứu (?tuKhoa=&maToaNha=)
r.get('/tuy-chon', c.tuyChon);             // hợp đồng còn hiệu lực cho biểu mẫu Tạo
r.get('/:id', c.chiTiet);                  // UC8.2 Xem (và dữ liệu form Sửa)
r.post('/', c.tao);                        // UC8.1
r.put('/:id', c.sua);                      // UC8.3
r.delete('/:id', c.xoa);                   // UC8.4
r.post('/:id/xac-nhan-thanh-toan', c.xacNhan); // UC8.5
r.post('/:id/gui-email', c.guiEmail);      // UC8.6
export default r;
