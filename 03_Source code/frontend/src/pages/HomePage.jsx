import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
const MENU = ['Quản lý nhà trọ', 'Quản lý phòng trọ', 'Quản lý người thuê', 'Quản lý hợp đồng', 'Quản lý mẫu hợp đồng', 'Quản lý dịch vụ', 'Quản lý tài chính', 'Báo cáo'];
export default function HomePage() {
    const { dangXuat } = useAuth();
  const nav = useNavigate();
  return (
    <div className="shell">
      <aside className="side">
        <div className="side-top"><img src="/logo.png" alt="" /><span>Hệ thống<br />quản lý trọ</span></div>
        <nav className="side-nav">
          {MENU.map((m, i) => <button key={m} className={'nav-item' + (i === 0 ? ' active' : '')}>{m}</button>)}  
          <button className="nav-item logout-side" onClick={() => { dangXuat(); nav('/dang-nhap'); }}>Đăng xuất</button>
        </nav>
      </aside>
      <main className="main">
          <div className="page-head"><span>Quản lý nhà trọ</span></div>
         
        <p className="empty">Chức năng Quản lý nhà trọ sẽ được bổ sung ở module tiếp theo.</p>
      </main>
    </div>
  );
}
