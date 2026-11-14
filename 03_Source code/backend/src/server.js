import nodePath from 'node:path';
import nodeFs from 'node:fs';
import { fileURLToPath as toDuongDan } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { gioiHanToc } from './middlewares/gioiHanToc.js';
import auth from './routes/auth.routes.js';
import toaNha from './routes/toaNha.routes.js';
import phongTro from './routes/phongTro.routes.js';
import dichVu from './routes/dichVu.routes.js';
import nguoiThue from './routes/nguoiThue.routes.js';
import mauHopDong from './routes/mauHopDong.routes.js';
import hopDong from './routes/hopDong.routes.js';
import hoaDon from './routes/hoaDon.routes.js';
import baoCao from './routes/baoCao.routes.js';
import { capNhatHetHan, nhacGiaHan } from './services/hopDong.service.js';
import { nhacQuaHan } from './services/hoaDon.service.js';
const app = express();
// contentSecurityPolicy tắt: trang dùng Google Fonts + ảnh QR từ img.vietqr.io, cấu hình CSP mặc định sẽ chặn nhầm.
// Các header còn lại (X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy...) vẫn được bật.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.corsOrigin }));
// Auth nhận payload rất nhỏ (email/mật khẩu/mã xác thực) nên giới hạn riêng, thấp hơn nhiều so với các route có upload ảnh.
app.use('/api/auth', express.json({ limit: '20kb' }));
app.use(express.json({ limit: '15mb' }));
app.get('/api/health', (_, res) => res.json({ ok: true }));
// Giới hạn tốc độ chung cho toàn bộ API nghiệp vụ (chống gọi dồn dập), nới hơn nhiều so với auth vì đã yêu cầu JWT hợp lệ.
app.use('/api', gioiHanToc(300, 60 * 1000));
app.use('/api/auth', auth);
app.use('/api/toa-nha', toaNha);
app.use('/api/phong-tro', phongTro);
app.use('/api/dich-vu', dichVu);
app.use('/api/nguoi-thue', nguoiThue);
app.use('/api/mau-hop-dong', mauHopDong);
app.use('/api/hop-dong', hopDong);
app.use('/api/hoa-don', hoaDon);
app.use('/api/bao-cao', baoCao);
const dist = nodePath.resolve(nodePath.dirname(toDuongDan(import.meta.url)), '../../frontend/dist');
if (nodeFs.existsSync(nodePath.join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_, res) => res.sendFile(nodePath.join(dist, 'index.html')));
}

// BR-UC5-11: hợp đồng đến hạn chuyển "Hết hạn"; UC5.5: nhắc gia hạn khi còn đúng 30 ngày (chạy khi khởi động và mỗi giờ)
const chayDinhKy = () => capNhatHetHan().then(nhacGiaHan).then(nhacQuaHan).catch((e) => console.error('Tác vụ định kỳ hợp đồng lỗi:', e.message));
chayDinhKy(); setInterval(chayDinhKy, 60 * 60 * 1000);
app.listen(env.port, () => console.log(`Backend chạy tại http://localhost:${env.port}`));
