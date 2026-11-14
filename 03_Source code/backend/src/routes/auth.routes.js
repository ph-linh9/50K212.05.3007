import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { yeuCauDangNhap } from '../middlewares/auth.js';
import { gioiHanToc } from '../middlewares/gioiHanToc.js';
const r = Router();
// Chống brute-force: giới hạn số lần thử theo IP trong 10 phút (đăng nhập, quên mật khẩu, mã xác thực 6 số).
r.post('/dang-nhap', gioiHanToc(10, 10 * 60 * 1000), c.dangNhap);                 // UC1
r.post('/quen-mat-khau', gioiHanToc(5, 10 * 60 * 1000), c.quenMatKhau);          // UC1.1 bước 3-5
r.post('/xac-thuc-ma', gioiHanToc(10, 10 * 60 * 1000), c.xacThucMa);              // UC1.1 bước 6-7
r.post('/dat-lai-mat-khau', gioiHanToc(10, 10 * 60 * 1000), c.datLaiMatKhau);     // UC1.1 bước 9-11
r.get('/me', yeuCauDangNhap, c.me);
export default r;
