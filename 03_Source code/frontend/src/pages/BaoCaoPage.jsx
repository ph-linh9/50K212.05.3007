import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { baoCaoApi, toaNhaApi } from '../services/api.js';
import { tien } from '../utils/hopDong.js';
import Flash from '../components/Flash.jsx';

const NAM_HT = new Date().getFullYear();
const NAMS = Array.from({ length: NAM_HT - 2013 + 1 }, (_, i) => NAM_HT - i);
const vnd = (n) => (n === null || n === undefined ? '—' : tien(n) + ' đ');

// UC9.1 Xem báo cáo, UC9.2 Lọc báo cáo (Tháng/Năm + nút "Lọc dữ liệu"), UC9.3 Tra cứu theo tòa nhà
export default function BaoCaoPage() {
  const { token, dangXuat } = useAuth();
  const nav = useNavigate();
  const [chon, setChon] = useState({ thang: String(new Date().getMonth() + 1), nam: String(NAM_HT), maToaNha: '' });
  const [toaNhas, setToaNhas] = useState([]);
  const [bc, setBc] = useState(null);
  const [loi, setLoi] = useState('');

  const tai = (b) => {
    setLoi('');
    return baoCaoApi.xem(token, b).then(setBc).catch((e) => {
      if (e.status === 401) { dangXuat(); nav('/dang-nhap'); return; }
      setBc(null); setLoi('Không thể tải báo cáo, vui lòng thử lại sau'); // 3a / 4a
    });
  };
  useEffect(() => { tai(chon); toaNhaApi.danhSach(token).then(setToaNhas).catch(() => {}); }, []); // eslint-disable-line

  const loc = () => tai(chon);
  const doiToaNha = (e) => setChon({ ...chon, maToaNha: e.target.value }); // UC9.1 bước 4: cả ba bộ lọc áp dụng khi nhấn "Lọc dữ liệu"

  const so = bc ? bc : null;
  return (
    <>
      <div className="page-head"><span>Báo cáo</span></div>
      <div className="bc-title">THỐNG KÊ DOANH THU</div>
      <div className="bc-filter">
        <label>Tháng
          <select className="pt-filter f-select" value={chon.thang} onChange={(e) => setChon({ ...chon, thang: e.target.value })}>
            <option value="all">Tất cả các tháng</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}
          </select>
        </label>
        <label>Năm
          <select className="pt-filter f-select" value={chon.nam} onChange={(e) => setChon({ ...chon, nam: e.target.value })}>
            {NAMS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Tòa nhà
          <select className="pt-filter f-select" value={chon.maToaNha} onChange={doiToaNha}>
            <option value="">Tất cả tòa nhà</option>
            {toaNhas.map((t) => <option key={t.maToaNha} value={t.maToaNha}>{t.tenToaNha}</option>)}
          </select>
        </label>
        <button className="btn-fill" onClick={loc}>Lọc dữ liệu</button>
      </div>
      {loi && <Flash kieu="loi">{loi}</Flash>}
      <div className="bc-card"><div className="bc-bar"><small>Tổng doanh thu</small><span className="bc-big">{vnd(so?.tongDoanhThu)}</span></div></div>
      <div className="bc-card bc-cc">
        <small>Cơ cấu nguồn thu</small>
        <div className="bc-cc-grid">
          <div><small>Tiền phòng</small><b>{vnd(so?.coCauNguonThu.tienPhong)}</b></div>
          <div><small>Điện &amp; Nước</small><b>{vnd(so?.coCauNguonThu.dienNuoc)}</b></div>
          <div><small>Dịch vụ khác</small><b>{vnd(so?.coCauNguonThu.dichVuKhac)}</b></div>
        </div>
      </div>
      <div className="bc-card">
        <div className="bc-bar cho"><small>Chờ thanh toán</small><span className="bc-big">{vnd(so?.choThanhToan)}</span></div>
        <div className="bc-sep"><small>Tỷ lệ đã thu / Tổng kỳ vọng</small><span className="bc-big">{so ? so.tyLeDaThu + '%' : '—'}</span></div>
      </div>
    </>
  );
}
