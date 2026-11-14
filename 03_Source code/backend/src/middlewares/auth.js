import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export function yeuCauDangNhap(req, res, next) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    const p = jwt.verify(t, env.jwtSecret);
    if (p.loai !== 'access') throw new Error();
    req.user = p; next();
  } catch { res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ' }); }
}
