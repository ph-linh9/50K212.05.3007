import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export const MENU = [
  { ten: 'Quản lý nhà trọ', to: '/nha-tro' },
  { ten: 'Quản lý phòng trọ', to: '/phong-tro' },
  { ten: 'Quản lý người thuê', to: '/nguoi-thue' },
  { ten: 'Quản lý hợp đồng', to: '/hop-dong' },
  { ten: 'Quản lý mẫu hợp đồng', to: '/mau-hop-dong' },
  { ten: 'Quản lý dịch vụ', to: '/dich-vu' },
  { ten: 'Quản lý tài chính', to: '/tai-chinh' },
  { ten: 'Báo cáo', to: '/bao-cao' },
];

export default function AppLayout() {
  const { dangXuat } = useAuth();
  const nav = useNavigate();
  return (
    <div className="shell">
      <aside className="side">
        <div className="side-top"><img src="/logo.png" alt="" /><span>Hệ thống<br />quản lý trọ</span></div>
        <nav className="side-nav">
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>{m.ten}</NavLink>
          ))}
          <button className="nav-item logout-side" onClick={() => { dangXuat(); nav('/dang-nhap'); }}>Đăng xuất</button>
        </nav>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
