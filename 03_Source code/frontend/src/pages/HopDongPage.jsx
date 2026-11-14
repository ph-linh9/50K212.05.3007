import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { hopDongApi, toaNhaApi } from '../services/api.js';
import { dmy, tien } from '../utils/hopDong.js';
import Flash from '../components/Flash.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import HopDongFormModal from './HopDongFormModal.jsx';
import HopDongChiTietModal from './HopDongChiTietModal.jsx';
import HopDongGiaHanModal from './HopDongGiaHanModal.jsx';

const TT_CLASS = { 'Hoạt động': 'pill-thue', 'Hết hạn': 'pill-het', 'Chấm dứt': 'pill-off' };

export default function HopDongPage() {
  const { token, dangXuat } = useAuth();
  const nav = useNavigate();
  const [ds, setDs] = useState([]);
  const [tq, setTq] = useState(null); // null: chưa tải được -> hiện "—"
  const [toaNhas, setToaNhas] = useState([]);
  const [tuKhoa, setTuKhoa] = useState('');
  const [maToaNha, setMaToaNha] = useState('');
  const [flash, setFlash] = useState(null);
  const [dialog, setDialog] = useState(null); // {loai: 'tao'|'sua'|'xem'|'giahan'|'chamdut', hd}
  const [loiDialog, setLoiDialog] = useState('');
  const [busy, setBusy] = useState(false);
  const [daTai, setDaTai] = useState(false);
  const lanTai = useRef(0);

  const hetPhien = () => { dangXuat(); nav('/dang-nhap'); };
  const tai = (kw = tuKhoa, tn = maToaNha) => {
    const lan = ++lanTai.current;
    return hopDongApi.danhSach(token, { tuKhoa: kw, maToaNha: tn }).then((r) => {
      if (lan !== lanTai.current) return;
      setDs(r.hopDong); setTq(r.tongQuan); setDaTai(true);
    }).catch((e) => {
      if (e.status === 401) return hetPhien();
      if (lan !== lanTai.current) return;
      setDs([]);
      setFlash({ kieu: 'loi', nd: (kw || tn) ? 'Không tìm thấy hợp đồng, vui lòng thử lại sau' : 'Không thể tải danh sách hợp đồng, vui lòng thử lại sau' });
    });
  };
  useEffect(() => { tai(); toaNhaApi.danhSach(token).then(setToaNhas).catch(() => {}); }, []); // eslint-disable-line
  useEffect(() => { if (daTai) { const h = setTimeout(() => tai(tuKhoa, maToaNha), 250); return () => clearTimeout(h); } }, [tuKhoa, maToaNha]); // eslint-disable-line

  const daLuu = (_, nd) => { setDialog(null); setFlash({ kieu: 'ok', nd }); tai(); };
  const mo = (loai, hd) => { setFlash(null); setLoiDialog(''); setDialog({ loai, hd }); };
  const loiTai = () => { setDialog(null); setFlash({ kieu: 'loi', nd: 'Không thể tải thông tin hợp đồng, vui lòng thử lại sau' }); };

  async function chamDut() {
    setBusy(true); setLoiDialog('');
    try {
      await hopDongApi.chamDut(token, dialog.hd.maHopDong);
      setDialog(null); setFlash({ kieu: 'ok', nd: 'Chấm dứt hợp đồng thành công!' }); tai();
    } catch (e) {
      if (e.status === 401) return hetPhien();
      setLoiDialog('Không thể chấm dứt hợp đồng, vui lòng thử lại sau');
    } finally { setBusy(false); }
  }

  const Chi = ({ nhan, so }) => (<div className="pt-stat"><i /><div><span>{nhan}</span><b>{so ?? '—'}</b></div></div>);
  return (
    <>
      <div className="page-head"><span>Quản lý hợp đồng</span></div>
      {flash && <Flash kieu={flash.kieu}>{flash.nd}</Flash>}
      <div className="pt-stats tri">
        <Chi nhan="Tổng số hợp đồng" so={tq?.tongSoHopDong} />
        <Chi nhan="Số hợp đồng đang hoạt động" so={tq?.soHopDongDangHoatDong} />
        <Chi nhan="Số hợp đồng sắp hết hạn" so={tq?.soHopDongSapHetHan} />
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Tạo hợp đồng mới
        </button>
      </div>
      <div className="tn-table">
        <div className="hd-row tn-th"><span>SỐ HỢP ĐỒNG</span><span>TÊN PHÒNG</span><span>KHÁCH HÀNG</span><span>GIÁ THUÊ</span><span>THỜI HẠN</span><span>TRẠNG THÁI</span><span>THAO TÁC</span></div>
        {ds.map((h) => (
          <div className="hd-row tn-tr hd-tr" key={h.maHopDong}>
            <b>{h.soHopDong}</b><span>{h.tenPhong}</span><span>{h.tenKhachThue}</span><span>{tien(h.giaThue)} đ</span>
            <span className="hd-han">
              <span>{dmy(h.ngayBatDau)} – {dmy(h.ngayKetThuc)}</span>
              {h.sapHetHan && (
                <span className="hd-badges">
                  <i className="pill pill-sap">Sắp hết hạn</i>
                  <button className="pill pill-gh" onClick={() => mo('giahan', h)}>Gia hạn</button>
                </span>
              )}
            </span>
            <span><i className={'pill ' + (TT_CLASS[h.trangThai] || 'pill-off')}>{h.trangThai}</i></span>
            <span className="tn-act">
              <button className="act" onClick={() => mo('xem', h)}>Xem</button>
              {h.trangThai === 'Hoạt động' && <>
                <button className="act" onClick={() => mo('sua', h)}>Sửa</button>
                <button className="act act-del" onClick={() => mo('chamdut', h)}>Chấm dứt</button>
              </>}
            </span>
          </div>
        ))}
      </div>

      {(dialog?.loai === 'tao' || dialog?.loai === 'sua') && (
        <HopDongFormModal token={token} che={dialog.loai === 'sua' ? dialog.hd : null} onClose={() => setDialog(null)} onSaved={daLuu}
          onUnauthorized={hetPhien} maToaNhaMacDinh={maToaNha}
          onLoiTai={() => { setDialog(null); setFlash({ kieu: 'loi', nd: dialog.loai === 'sua' ? 'Không thể tải thông tin hợp đồng, vui lòng thử lại sau' : 'Không thể tạo hợp đồng, vui lòng thử lại sau' }); }} />
      )}
      {dialog?.loai === 'xem' && <HopDongChiTietModal token={token} id={dialog.hd.maHopDong} onClose={() => setDialog(null)} onUnauthorized={hetPhien} onLoi={loiTai} />}
      {dialog?.loai === 'giahan' && <HopDongGiaHanModal token={token} hd={dialog.hd} onClose={() => setDialog(null)} onSaved={daLuu} onUnauthorized={hetPhien} />}
      {dialog?.loai === 'chamdut' && (
        <ConfirmDialog title="Chấm dứt hợp đồng" danger ok="Chấm dứt hợp đồng" loi={loiDialog} onCancel={() => setDialog(null)} onOk={chamDut} busy={busy}>
          Bạn có chắc chắn muốn chấm dứt hợp đồng? Hành động này không thể hoàn tác.
        </ConfirmDialog>
      )}
    </>
  );
}
