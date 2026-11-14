import { Router } from 'express';
import { baoCao } from '../controllers/baoCao.controller.js';
import { yeuCauDangNhap } from '../middlewares/auth.js';
const r = Router();
r.use(yeuCauDangNhap);
r.get('/', baoCao); // UC9.1 Xem, UC9.2 Lọc (?thang=1..12|all&nam=), UC9.3 Tra cứu (?maToaNha=)
export default r;
