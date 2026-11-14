import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { hoaDonApi, toaNhaApi } from '../services/api.js';
import { dmy, tien } from '../utils/hopDong.js';
import Flash from '../components/Flash.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import HoaDonFormModal from './HoaDonFormModal.jsx';
import HoaDonChiTietModal from './HoaDonChiTietModal.jsx';

const TT = { 'Chưa thanh toán': 'pill-chua', 'Đã thanh toán': 'pill-thue', 'Quá hạn': 'pill-qua' };
const GUI = { 'Chưa gửi': 'pill-off', 'Đã gửi': 'pill-thue', 'Gửi thất bại': 'pill-gui-loi' };

// UC8.1–8.7: Quản lý tài chính
export default function TaiChinhPage() {
  const { token, dangXuat } = useAuth();
  const nav = useNavigate();
  const [ds, setDs] = useState([]);
  const [tq, setTq] = useState(null);
  const [toaNhas, setToaNhas] = useState([]);
  const [tuKhoa, setTuKhoa] = useState('');
  const [maToaNha, setMaToaNha] = useState('');
  const [flash, setFlash] = useState(null);
  const [dialog, setDialog] = useState(null); // {loai: 'tao'|'sua'|'xem'|'xoa'|'xacnhan', hd}
  const [loiDialog, setLoiDialog] = useState('');
  const [busy, setBusy] = useState(false);
  const [daTai, setDaTai] = useState(false);
  const lanTai = useRef(0);

  const hetPhien = () => { dangXuat(); nav('/dang-nhap'); };
  const tai = (kw = tuKhoa, tn = maToaNha) => {
    const lan = ++lanTai.current;
    return hoaDonApi.danhSach(token, { tuKhoa: kw, maToaNha: tn }).then((r) => {
      if (lan !== lanTai.current) return;
      setDs(r.hoaDon); setTq(r.tongQuan); setDaTai(true);
    }).catch((e) => {
      if (e.status === 401) return hetPhien();
      if (lan !== lanTai.current) return;
      setDs([]); setFlash({ kieu: 'loi', nd: 'Không thể tải danh sách hóa đơn, vui lòng thử lại sau' }); // 7 / 4a
    });
  };
  useEffect(() => { tai(); toaNhaApi.danhSach(token).then(setToaNhas).catch(() => {}); }, []); // eslint-disable-line
  useEffect(() => { if (daTai) { const h = setTimeout(() => tai(tuKhoa, maToaNha), 250); return () => clearTimeout(h); } }, [tuKhoa, maToaNha]); // eslint-disable-line

  const daLuu = (_, nd) => { setDialog(null); setFlash({ kieu: 'ok', nd }); tai(); };
  const mo = (loai, hd) => { setFlash(null); setLoiDialog(''); setDialog({ loai, hd }); };

  async function chay(fn, okMsg, loiMsg) {
    setBusy(true); setLoiDialog('');
    try { await fn(); setDialog(null); setFlash({ kieu: 'ok', nd: okMsg }); tai(); }
    catch (e) { if (e.status === 401) return hetPhien(); setLoiDialog(loiMsg); }
    finally { setBusy(false); }
  }
  async function guiEmail(h) {
    setFlash(null);
    try { await hoaDonApi.guiEmail(token, h.maHoaDon); setFlash({ kieu: 'ok', nd: 'Gửi hóa đơn thành công!' }); }
    catch (e) {
      if (e.status === 401) return hetPhien();
      setFlash({ kieu: 'loi', nd: e.status === 400 || e.status === 502 ? e.message : 'Không thể gửi hóa đơn, vui lòng thử lại sau' });
    }
    tai();
  }

  const Chi = ({ nhan, so }) => (<div className="pt-stat"><i /><div><span>{nhan}</span><b>{so ?? '—'}</b></div></div>);
  return (
    <>
      <div className="page-head"><span>Quản lý tài chính</span></div>
      {flash && <Flash kieu={flash.kieu}>{flash.nd}</Flash>}
      <div className="pt-stats tri">
        <Chi nhan="Tổng hóa đơn" so={tq?.tongHoaDon} />
        <Chi nhan="Số hóa đơn đã thanh toán" so={tq?.soHoaDonDaThanhToan} />
        <Chi nhan="Số hóa đơn chưa thanh toán" so={tq?.soHoaDonChuaThanhToan} />
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Tạo hóa đơn mới
        </button>
      </div>
      <div className="tn-table">
        <div className="tc-row tn-th"><span>SỐ HÓA ĐƠN</span><span>TÒA NHÀ – PHÒNG</span><span>KỲ THU</span><span>THÀNH TIỀN</span><span>TRẠNG THÁI</span><span>TRẠNG THÁI GỬI</span><span>THAO TÁC</span></div>
        {ds.map((h) => (
          <div className="tc-row tn-tr tc-tr" key={h.maHoaDon}>
            <b>{h.soHoaDon}</b><span>{h.tenToaNha} – {h.tenPhong}</span><span>{dmy(h.ngayBatDau)} – {dmy(h.ngayKetThuc)}</span><span>{tien(h.tongCong)} đ</span>
            <span><i className={'pill ' + (TT[h.trangThai] || 'pill-off')}>{h.trangThai}</i></span>
            <span><i className={'pill ' + (GUI[h.trangThaiGui] || 'pill-off')}>{h.trangThaiGui}</i></span>
            <span className="tc-act">
              <button className="act" onClick={() => mo('xem', h)}>Xem</button>
              <button className="act" disabled={h.daThanhToan} onClick={() => mo('sua', h)}>Sửa</button>
              <button className="act act-del" onClick={() => mo('xoa', h)}>Xóa</button>
              <button className="act" disabled={h.daThanhToan} onClick={() => guiEmail(h)}>Gửi email</button>
              <button className="act" disabled={h.daThanhToan} onClick={() => mo('xacnhan', h)}>Xác nhận thanh toán</button>
            </span>
          </div>
        ))}
      </div>

      {(dialog?.loai === 'tao' || dialog?.loai === 'sua') && (
        <HoaDonFormModal token={token} che={dialog.loai === 'sua' ? dialog.hd : null} onClose={() => setDialog(null)} onSaved={daLuu} onUnauthorized={hetPhien}
          onKhongCoHopDong={() => { setDialog(null); setFlash({ kieu: 'loi', nd: 'Không có hợp đồng thuê còn hiệu lực để tạo hóa đơn' }); }}
          onLoiTai={() => { setDialog(null); setFlash({ kieu: 'loi', nd: dialog.loai === 'sua' ? 'Không thể tải thông tin hóa đơn' : 'Không thể tạo hóa đơn. Vui lòng thử lại' }); }} />
      )}
      {dialog?.loai === 'xem' && <HoaDonChiTietModal token={token} id={dialog.hd.maHoaDon} onClose={() => setDialog(null)} onUnauthorized={hetPhien}
        onLoi={() => { setDialog(null); setFlash({ kieu: 'loi', nd: 'Không thể tải thông tin hóa đơn' }); }} />}
      {dialog?.loai === 'xoa' && (
        <ConfirmDialog title="Xóa hóa đơn" danger ok="Xác nhận" loi={loiDialog} onCancel={() => setDialog(null)} busy={busy}
          onOk={() => chay(() => hoaDonApi.xoa(token, dialog.hd.maHoaDon), 'Xóa hóa đơn thành công!', 'Không thể xóa hóa đơn, vui lòng thử lại sau')}>
          Bạn có chắc chắn muốn xóa hóa đơn này?
        </ConfirmDialog>
      )}
      {dialog?.loai === 'xacnhan' && (
        <ConfirmDialog ok="Xác nhận" loi={loiDialog} onCancel={() => setDialog(null)} busy={busy}
          onOk={() => chay(() => hoaDonApi.xacNhan(token, dialog.hd.maHoaDon), 'Xác nhận thanh toán thành công!', 'Không thể xác nhận thanh toán, vui lòng thử lại sau')}>
          Bạn có chắc chắn muốn xác nhận đã thanh toán cho hóa đơn {dialog.hd.soHoaDon}? Hành động này sẽ cập nhật trạng thái hóa đơn thành "Đã thanh toán" và không thể hoàn tác.
        </ConfirmDialog>
      )}
    </>
  );
}
