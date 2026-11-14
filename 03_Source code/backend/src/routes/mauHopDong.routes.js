import { Router } from 'express';
import * as c from '../controllers/mauHopDong.controller.js';
import { yeuCauDangNhap } from '../middlewares/auth.js';
const r = Router();
r.use(yeuCauDangNhap);
r.get('/', c.danhSach);     // danh sách mẫu
r.get('/:id', c.chiTiet);   // dữ liệu cho form Sửa (UC6.2 bước 2) và để chọn mẫu khi lập hợp đồng
r.post('/', c.tao);         // UC6.1 Thêm mẫu
r.put('/:id', c.sua);       // UC6.2 Sửa mẫu
r.delete('/:id', c.xoa);    // UC6.3 Xóa mẫu
export default r;
