import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import TextField from '../components/TextField.jsx';
import { authApi } from '../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';

const KEY = 'ghi_nho_dang_nhap';
const doc = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const MASK = '••••••••••';

export default function LoginPage() {
  const nav = useNavigate();
  const { dangNhap } = useAuth();
  const saved = doc(); // UC1 - 2a: tự điền thông tin đã ghi nhớ
  const [email, setEmail] = useState(saved?.email || '');
  const [matKhau, setMatKhau] = useState(saved ? MASK : '');
  const [ghiNho, setGhiNho] = useState(!!saved);
  const [loi, setLoi] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBanner('');
    const l = {};
    if (!email.trim()) l.email = 'Email không được để trống';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) l.email = 'Email không đúng định dạng';
    if (!matKhau) l.matKhau = 'Mật khẩu không được để trống';
    if (Object.keys(l).length) { setLoi(l); return; }
    setLoi({}); setBusy(true);
    const dungToken = saved && matKhau === MASK && email === saved.email;
    try {
      const r = await authApi.dangNhap(dungToken
        ? { email, rememberToken: saved.rememberToken, ghiNho }
        : { email, matKhau, ghiNho });
      try {
        if (ghiNho && r.rememberToken) localStorage.setItem(KEY, JSON.stringify({ email, rememberToken: r.rememberToken }));
        else localStorage.removeItem(KEY);
      } catch { /* bỏ qua */ }
      dangNhap(r.token, r.taiKhoan.email);
      nav('/nha-tro', { replace: true });
    } catch (err) {
      if (err.field) setLoi({ [err.field]: err.message });
      else { setBanner(err.message); if (dungToken) { try { localStorage.removeItem(KEY); } catch {} } }
    } finally { setBusy(false); }
  }

  return (
    <AuthCard title="Đăng nhập tài khoản" sub="Hệ thống quản lý nhà trọ">
      <form onSubmit={submit} noValidate>
        {banner && <div className="banner" role="alert">{banner}</div>}
        <TextField label="Email" icon="mail" value={email} placeholder="Nhập email của bạn" error={loi.email}
          onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Mật khẩu" icon="lock" type="password" value={matKhau} placeholder="Nhập mật khẩu của bạn" error={loi.matKhau}
          onChange={(e) => setMatKhau(e.target.value)}
          action={<button type="button" className="link" onClick={() => nav('/quen-mat-khau')}>Quên mật khẩu?</button>} />
        <label className="check"><input type="checkbox" checked={ghiNho} onChange={(e) => setGhiNho(e.target.checked)} />Ghi nhớ đăng nhập</label>
        <button className="btn" disabled={busy}>Đăng nhập</button>
      </form>
    </AuthCard>
  );
}
