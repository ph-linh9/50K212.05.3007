import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { nguoiThueApi, toaNhaApi } from '../services/api.js';
import Flash from '../components/Flash.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import NguoiThueFormModal from './NguoiThueFormModal.jsx';
import NguoiThueChiTietModal from './NguoiThueChiTietModal.jsx';

const TQ0 = { tongNguoiThue: 0, soNguoiDangThue: 0, soNguoiChuaDangKyTamTru: 0 };

export default function NguoiThuePage() {
  const { token, dangXuat } = useAuth();
  const nav = useNavigate();
  const [ds, setDs] = useState([]);
  const [tq, setTq] = useState(TQ0);
  const [toaNhas, setToaNhas] = useState([]);
  const [tuKhoa, setTuKhoa] = useState('');
  const [maToaNha, setMaToaNha] = useState('');
  const [flash, setFlash] = useState(null);
  const [dialog, setDialog] = useState(null); // {loai: 'tao'|'sua'|'xem'|'xoa', nt}
  const [busy, setBusy] = useState(false);
  const [daTai, setDaTai] = useState(false);
  const lanTai = useRef(0);

  const hetPhien = () => { dangXuat(); nav('/dang-nhap'); };
  const tai = (kw = tuKhoa, tn = maToaNha) => {
    const lan = ++lanTai.current;
    return nguoiThueApi.danhSach(token, { tuKhoa: kw, maToaNha: tn }).then((r) => {
      if (lan !== lanTai.current) return;
      setDs(r.nguoiThue); setTq(r.tongQuan); setDaTai(true);
    }).catch((e) => {
      if (e.status === 401) return hetPhien();
      setDs([]);
      setFlash({ kieu: 'loi', nd: (kw || tn) ? 'Không tìm thấy người thuê, vui lòng thử lại sau' : 'Không thể tải danh sách người thuê, vui lòng thử lại sau' });
    });
  };
  useEffect(() => { tai(); toaNhaApi.danhSach(token).then(setToaNhas).catch(() => {}); }, []); // eslint-disable-line
  useEffect(() => { if (daTai) { const h = setTimeout(() => tai(tuKhoa, maToaNha), 250); return () => clearTimeout(h); } }, [tuKhoa, maToaNha]); // eslint-disable-line

  const daLuu = (_, nd) => { setDialog(null); setFlash({ kieu: 'ok', nd }); tai(); };
  const mo = (loai, nt) => { setFlash(null); setDialog({ loai, nt }); };

  async function xoa() {
    setBusy(true);
    try {
      await nguoiThueApi.xoa(token, dialog.nt.maNguoiThue);
      setDialog(null); setFlash({ kieu: 'ok', nd: 'Xóa người thuê thành công!' }); tai();
    } catch (e) {
      if (e.status === 401) return hetPhien();
      setDialog(null); setFlash({ kieu: 'loi', nd: 'Không thể xóa người thuê, vui lòng thử lại sau' });
    } finally { setBusy(false); }
  }
  async function xuat() {
    setFlash(null);
    try { await nguoiThueApi.xuatExcel(token); setFlash({ kieu: 'ok', nd: 'Xuất danh sách thành công!' }); }
    catch (e) {
      if (e.status === 401) return hetPhien();
      setFlash({ kieu: 'loi', nd: 'Không thể xuất danh sách người thuê, vui lòng thử lại sau' });
    }
  }

  const Chi = ({ nhan, so }) => (<div className="pt-stat"><i /><div><span>{nhan}</span><b>{so}</b></div></div>);
  return (
    <>
      <div className="page-head"><span>Quản lý người thuê</span></div>
      {flash && <Flash kieu={flash.kieu}>{flash.nd}</Flash>}
      <div className="pt-stats tri">
        <Chi nhan="Tổng người thuê" so={tq.tongNguoiThue} />
        <Chi nhan="Số người đang thuê" so={tq.soNguoiDangThue} />
        <Chi nhan="Số người chưa đăng ký tạm trú" so={tq.soNguoiChuaDangKyTamTru} />
      </div>
      <div className="pt-tools">
        <label className="pt-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input placeholder="Tìm theo tên phòng" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} />
        </label>
        <select className="pt-filter f-select" value={maToaNha} onChange={(e) => setMaToaNha(e.target.value)}>
          <option value="">Tất cả tòa nhà</option>
          {toaNhas.map((t) => <option key={t.maToaNha} value={t.maToaNha}>{t.tenToaNha}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn-excel" onClick={xuat} disabled={tq.tongNguoiThue === 0}>Xuất Excel</button>
        <button className="btn-create" onClick={() => mo('tao')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Thêm người thuê mới
        </button>
      </div>
      <div className="tn-table">
        <div className="nt-row tn-th"><span>HỌ TÊN</span><span>SỐ ĐIỆN THOẠI</span><span>THÔNG TIN CCCD</span><span>TÊN PHÒNG</span><span>THAO TÁC</span></div>
        {ds.map((n) => (
          <div className="nt-row tn-tr" key={n.maNguoiThue}>
            <b>{n.hoTen}</b><span>{n.soDienThoai}</span><span>{n.soCCCD}</span><span>{n.tenPhong}</span>
            <span className="tn-act">
              <button className="act" onClick={() => mo('xem', n)}>Xem</button>
              <button className="act" onClick={() => mo('sua', n)}>Sửa</button>
              <button className="act act-del" onClick={() => mo('xoa', n)}>Xóa</button>
            </span>
          </div>
        ))}
      </div>

      {(dialog?.loai === 'tao' || dialog?.loai === 'sua') && (
        <NguoiThueFormModal token={token} che={dialog.loai === 'sua' ? dialog.nt : null} onClose={() => setDialog(null)} onSaved={daLuu} onUnauthorized={hetPhien}
          onLoiTai={() => { setDialog(null); setFlash({ kieu: 'loi', nd: 'Không thể tải thông tin người thuê, vui lòng thử lại sau' }); }} />
      )}
      {dialog?.loai === 'xem' && <NguoiThueChiTietModal token={token} id={dialog.nt.maNguoiThue} onClose={() => setDialog(null)} onUnauthorized={hetPhien}
        onLoi={() => { setDialog(null); setFlash({ kieu: 'loi', nd: 'Không thể tải thông tin người thuê, vui lòng thử lại sau' }); }} />}
      {dialog?.loai === 'xoa' && (
        <ConfirmDialog ok="Xác nhận" onCancel={() => setDialog(null)} onOk={xoa} busy={busy}>Bạn có chắc chắn muốn xóa người thuê này?</ConfirmDialog>
      )}
    </>
  );
}
