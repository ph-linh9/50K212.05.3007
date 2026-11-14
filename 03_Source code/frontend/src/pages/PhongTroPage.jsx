import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { phongTroApi, toaNhaApi } from '../services/api.js';
import Flash from '../components/Flash.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import PhongTroFormModal from './PhongTroFormModal.jsx';
import PhongTroChiTietModal, { Pill, tienVnd } from './PhongTroChiTietModal.jsx';

const TQ0 = { tongSoPhong: 0, soPhongConTrong: 0, soPhongDangHoatDong: 0, soPhongDangSuaChua: 0 };

export default function PhongTroPage() {
  const { token, dangXuat } = useAuth();
  const nav = useNavigate();
  const [ds, setDs] = useState([]);
  const [tq, setTq] = useState(TQ0);
  const [toaNhas, setToaNhas] = useState([]);
  const [tuKhoa, setTuKhoa] = useState('');
  const [maToaNha, setMaToaNha] = useState('');
  const [flash, setFlash] = useState(null);
  const [dialog, setDialog] = useState(null); // {loai: 'tao'|'sua'|'xem'|'xoa', p}
  const [busy, setBusy] = useState(false);
  const [daTai, setDaTai] = useState(false);
  const lanTai = useRef(0);

  const hetPhien = () => { dangXuat(); nav('/dang-nhap'); };
  const tai = (kw = tuKhoa, tn = maToaNha) => {
    const lan = ++lanTai.current;
    return phongTroApi.danhSach(token, { tuKhoa: kw, maToaNha: tn }).then((r) => {
      if (lan !== lanTai.current) return;
      setDs(r.phong); setTq(r.tongQuan); setDaTai(true);
    }).catch((e) => {
      if (e.status === 401) return hetPhien();
      setFlash({ kieu: 'loi', nd: 'Không thể tải danh sách phòng, vui lòng thử lại sau' });
    });
  };
  useEffect(() => { tai(); toaNhaApi.danhSach(token).then(setToaNhas).catch(() => {}); }, []); // eslint-disable-line
  useEffect(() => { if (daTai) { const h = setTimeout(() => tai(tuKhoa, maToaNha), 250); return () => clearTimeout(h); } }, [tuKhoa, maToaNha]); // eslint-disable-line

  const daLuu = (_, nd) => { setDialog(null); setFlash({ kieu: 'ok', nd }); tai(); };
  const mo = (loai, p) => { setFlash(null); setDialog({ loai, p }); };

  async function xoa() {
    setBusy(true);
    try {
      await phongTroApi.xoa(token, dialog.p.maPhong);
      setDialog(null); setFlash({ kieu: 'ok', nd: 'Xóa phòng thành công' }); tai();
    } catch (e) {
      if (e.status === 401) return hetPhien();
      setDialog(null);
      setFlash({ kieu: 'loi', nd: e.status === 409 ? e.message : 'Không thể xóa phòng, vui lòng thử lại sau' });
      tai();
    } finally { setBusy(false); }
  }

  const Chi = ({ nhan, so }) => (<div className="pt-stat"><i /><div><span>{nhan}</span><b>{so}</b></div></div>);

  return (
    <>
      <div className="page-head"><span>Quản lý phòng trọ</span></div>
      {flash && <Flash kieu={flash.kieu}>{flash.nd}</Flash>}
      <div className="pt-stats">
        <Chi nhan="Tổng số phòng" so={tq.tongSoPhong} />
        <Chi nhan="Số phòng còn trống" so={tq.soPhongConTrong} />
        <Chi nhan="Số phòng đang hoạt động" so={tq.soPhongDangHoatDong} />
        <Chi nhan="Số phòng đang sửa chữa" so={tq.soPhongDangSuaChua} />
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
        <button className="btn-create" onClick={() => mo('tao')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Thêm phòng
        </button>
      </div>
      <div className="tn-table">
        <div className="pt-row tn-th"><span>TÊN PHÒNG</span><span>GIÁ THUÊ</span><span>TIỀN CỌC</span><span>SỐ NGƯỜI Ở THỰC TẾ</span><span>TRẠNG THÁI PHÒNG</span><span>THAO TÁC</span></div>
        {ds.map((p) => (
          <div className="pt-row tn-tr" key={p.maPhong}>
            <b>{p.tenPhong}</b><span>{tienVnd(p.giaThue)}</span><span>{tienVnd(p.tienCoc)}</span>
            <span>{p.soNguoiThucTe}/{p.soNguoiToiDa}</span><span><Pill t={p.trangThai} /></span>
            <span className="tn-act">
              <button className="act" onClick={() => mo('xem', p)}>Xem</button>
              <button className="act" onClick={() => mo('sua', p)}>Sửa</button>
              <button className="act act-del" onClick={() => mo('xoa', p)}>Xóa</button>
            </span>
          </div>
        ))}
        {daTai && ds.length === 0 && !flash?.nd?.startsWith('Không thể tải') && <p className="pt-empty">Chưa có phòng nào</p>}
      </div>

      {(dialog?.loai === 'tao' || dialog?.loai === 'sua') && (
        <PhongTroFormModal token={token} che={dialog.loai === 'sua' ? dialog.p : null} toaNhas={toaNhas}
          onClose={() => setDialog(null)} onSaved={daLuu} onUnauthorized={hetPhien}
          onLoiTai={() => { setDialog(null); setFlash({ kieu: 'loi', nd: 'Không thể tải thông tin phòng, vui lòng thử lại sau' }); }} />
      )}
      {dialog?.loai === 'xem' && <PhongTroChiTietModal token={token} id={dialog.p.maPhong} onClose={() => setDialog(null)}
        onLoi={() => { setDialog(null); setFlash({ kieu: 'loi', nd: 'Không thể tải thông tin phòng, vui lòng thử lại sau' }); }} onUnauthorized={hetPhien} />}
      {dialog?.loai === 'xoa' && (
        <ConfirmDialog title="Xác nhận xóa phòng" ok="Xác nhận" onCancel={() => setDialog(null)} onOk={xoa} busy={busy} />
      )}
    </>
  );
}
