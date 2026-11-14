import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import TextField from '../components/TextField.jsx';
import OtpInput from '../components/OtpInput.jsx';
import { authApi } from '../services/api.js';

export default function ForgotPasswordPage() {
  const nav = useNavigate();
  const [buoc, setBuoc] = useState(1); // 1 email, 2 mã, 3 mật khẩu mới, 4 thành công
  const [email, setEmail] = useState('');
  const [ma, setMa] = useState('');
  const [mk, setMk] = useState('');
  const [loi, setLoi] = useState('');
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  const chay = (fn) => async (e) => {
    e.preventDefault(); setLoi(''); setBanner(''); setBusy(true);
    try { await fn(); } catch (err) { err.field === 'maXacThuc' ? setBanner(err.message) : setLoi(err.message); }
    finally { setBusy(false); }
  };
  const gui = chay(async () => { await authApi.quenMatKhau({ email }); setBuoc(2); });
  const xacThuc = chay(async () => { await authApi.xacThucMa({ email, maXacThuc: ma }); setBuoc(3); });
  const datLai = chay(async () => { await authApi.datLaiMatKhau({ email, maXacThuc: ma, matKhauMoi: mk }); setBuoc(4); });

  if (buoc === 4) return (
    <AuthCard>
      <div className="ok-circle"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2E8B67" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg></div>
      <h1 className="auth-title">Đặt mật khẩu mới thành công!</h1>
      <p className="auth-sub" style={{ marginBottom: 28 }}>Vui lòng đăng nhập bằng mật khẩu mới của bạn.</p>
      <button className="btn" onClick={() => nav('/dang-nhap')}>Về trang đăng nhập</button>
    </AuthCard>
  );
  const back = () => (buoc === 1 ? nav('/dang-nhap') : setBuoc(buoc - 1));
  if (buoc === 1) return (
    <AuthCard onBack={back} title="Quên mật khẩu" sub="Nhập email đã đăng ký để nhận mã xác thực">
      <form onSubmit={gui} noValidate style={{ marginTop: 18 }}>
        <TextField label="Email" icon="mail" value={email} placeholder="Nhập email của bạn" error={loi} onChange={(e) => setEmail(e.target.value)} />
        <div style={{ height: 14 }} /><button className="btn" disabled={busy}>Gửi yêu cầu</button>
      </form>
    </AuthCard>
  );
  if (buoc === 2) return (
    <AuthCard onBack={back} title="Nhập mã xác thực" sub="Mã xác thực đã được gửi đến email của bạn.">
      <form onSubmit={xacThuc} noValidate>
        {banner && <div className="banner" role="alert" style={{ marginTop: 14 }}>{banner}</div>}
        <OtpInput value={ma} onChange={setMa} error={!!banner} />
        <button className="btn" disabled={busy}>Xác nhận</button>
      </form>
    </AuthCard>
  );
  return (
    <AuthCard onBack={back} title="Đặt mật khẩu mới" sub="Nhập mật khẩu mới cho tài khoản của bạn">
      <form onSubmit={datLai} noValidate style={{ marginTop: 18 }}>
        <TextField label="Mật khẩu mới" icon="lock" type="password" value={mk} placeholder="Nhập mật khẩu mới" error={loi} onChange={(e) => setMk(e.target.value)} />
        <div style={{ height: 14 }} /><button className="btn" disabled={busy}>Xác nhận</button>
      </form>
    </AuthCard>
  );
}
