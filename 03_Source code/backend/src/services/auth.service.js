import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { pool } from '../config/db.js';
import { env, HAN_MA_XAC_THUC_PHUT } from '../config/env.js';
import { guiMaXacThuc } from './mail.service.js';

export class LoiNghiepVu extends Error {
  constructor(message, status = 400, field) { super(message); this.status = status; this.field = field; }
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const kyToken = (tk, loai, hanDung) =>
  jwt.sign({ sub: tk.ma_tai_khoan, email: tk.email, loai }, env.jwtSecret, { expiresIn: hanDung });
const layTaiKhoan = async (email) =>
  (await pool.query('SELECT * FROM tai_khoan WHERE lower(email)=lower($1)', [email])).rows[0];

// UC1 - bước 6 (6a, 6b, 6c)
export async function dangNhap({ email, matKhau, rememberToken, ghiNho }) {
  email = (email || '').trim();
  if (!email) throw new LoiNghiepVu('Email không được để trống', 400, 'email');
  if (!EMAIL_RE.test(email)) throw new LoiNghiepVu('Email không đúng định dạng', 400, 'email');
  const tk = await layTaiKhoan(email);
  const sai = new LoiNghiepVu('Email hoặc mật khẩu không chính xác', 401);
  if (rememberToken && !matKhau) {
    try {
      const p = jwt.verify(rememberToken, env.jwtSecret);
      if (p.loai !== 'remember' || !tk || p.sub !== tk.ma_tai_khoan) throw sai;
    } catch { throw sai; }
  } else {
    if (!matKhau) throw new LoiNghiepVu('Mật khẩu không được để trống', 400, 'matKhau');
    if (!tk || !(await bcrypt.compare(matKhau, tk.mat_khau))) throw sai;
  }
  return {
    token: kyToken(tk, 'access', '12h'),
    rememberToken: ghiNho ? kyToken(tk, 'remember', '30d') : undefined,
    taiKhoan: { maTaiKhoan: tk.ma_tai_khoan, email: tk.email },
  };
}

// UC1.1 - bước 4, 5
export async function guiYeuCauQuenMatKhau({ email }) {
  email = (email || '').trim();
  if (!email) throw new LoiNghiepVu('Email không được để trống', 400, 'email');
  if (!EMAIL_RE.test(email)) throw new LoiNghiepVu('Email không đúng định dạng', 400, 'email');
  const tk = await layTaiKhoan(email);
  if (!tk) throw new LoiNghiepVu('Email chưa được đăng ký.', 404, 'email'); // 4a
  const ma = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await pool.query(
    `UPDATE tai_khoan SET ma_xac_thuc=$1, han_ma_xac_thuc = now() + ($2 || ' minutes')::interval WHERE ma_tai_khoan=$3`,
    [ma, String(HAN_MA_XAC_THUC_PHUT), tk.ma_tai_khoan]);
  await guiMaXacThuc(tk.email, ma);
  return { message: 'Đã gửi mã xác thực đến email.' };
}

async function kiemTraMa(email, maXacThuc) {
  // So sánh hạn ngay trong SQL để không lệch múi giờ giữa database và server
  const tk = (await pool.query(
    `SELECT * FROM tai_khoan WHERE lower(email)=lower($1) AND ma_xac_thuc=$2 AND han_ma_xac_thuc > now()`,
    [(email || '').trim(), String(maXacThuc || '').trim()])).rows[0];
  if (!tk) throw new LoiNghiepVu('Mã xác thực sai/hết hạn.', 400, 'maXacThuc'); // 7a
  return tk;
}
// UC1.1 - bước 7
export async function xacThucMa({ email, maXacThuc }) {
  await kiemTraMa(email, maXacThuc);
  return { message: 'Mã xác thực hợp lệ.' };
}
// UC1.1 - bước 10, 11
export async function datLaiMatKhau({ email, maXacThuc, matKhauMoi }) {
  const tk = await kiemTraMa(email, maXacThuc);
  if (!matKhauMoi || !matKhauMoi.trim())
    throw new LoiNghiepVu('Mật khẩu không hợp lệ.', 400, 'matKhauMoi'); // 10a
  const hash = await bcrypt.hash(matKhauMoi, 10);
  await pool.query('UPDATE tai_khoan SET mat_khau=$1, ma_xac_thuc=NULL, han_ma_xac_thuc=NULL WHERE ma_tai_khoan=$2',
    [hash, tk.ma_tai_khoan]);
  return { message: 'Đặt lại mật khẩu thành công.' };
}
