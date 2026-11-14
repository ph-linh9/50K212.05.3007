import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { dichVuApi, toaNhaApi } from '../services/api.js';
import Flash from '../components/Flash.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import DichVuFormModal from './DichVuFormModal.jsx';

const vnd = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';

export default function DichVuPage() {
  const { token, dangXuat } = useAuth();
  const nav = useNavigate();
  const [ds, setDs] = useState([]);
  const [toaNhas, setToaNhas] = useState([]);
  const [tuKhoa, setTuKhoa] = useState('');
  const [maToaNha, setMaToaNha] = useState('');
  const [flash, setFlash] = useState(null);
  const [dialog, setDialog] = useState(null); // {loai: 'tao'|'sua'|'xoa', dv}
  const [busy, setBusy] = useState(false);
  const [daTai, setDaTai] = useState(false);
  const lanTai = useRef(0);

  const hetPhien = () => { dangXuat(); nav('/dang-nhap'); };
  const tai = (kw = tuKhoa, tn = maToaNha) => {
    const lan = ++lanTai.current;
    return dichVuApi.danhSach(token, { tuKhoa: kw, maToaNha: tn }).then((r) => {
            if (lan !== lanTai.current) return;
      setDs(r); setDaTai(true);
      if ((kw || tn) && r.length === 0) setFlash({ kieu: 'loi', nd: 'Không tìm thấy dịch vụ, vui lòng thử lại sau' });
      else setFlash((f) => (f?.kieu === 'loi' ? null : f));
    }).catch((e) => {
      if (e.status === 401) return hetPhien();
      setDs([]);
      setFlash({ kieu: 'loi', nd: (kw || tn) ? 'Không tìm thấy dịch vụ, vui lòng thử lại sau' : 'Không thể tải danh sách dịch vụ, vui lòng thử lại sau' });
    });
  };
  useEffect(() => { tai(); toaNhaApi.danhSach(token).then(setToaNhas).catch(() => {}); }, []); // eslint-disable-line
  useEffect(() => { if (daTai) { const h = setTimeout(() => tai(tuKhoa, maToaNha), 250); return () => clearTimeout(h); } }, [tuKhoa, maToaNha]); // eslint-disable-line

  const daLuu = (_, nd) => { setDialog(null); setFlash({ kieu: 'ok', nd }); tai(); };
  const mo = (loai, dv) => { setFlash(null); setDialog({ loai, dv }); };

  async function xoa() {
    setBusy(true);
    try {
      await dichVuApi.xoa(token, dialog.dv.maDichVu);
      setDialog(null); setFlash({ kieu: 'ok', nd: 'Xóa dịch vụ thành công!' }); tai();
    } catch (e) {
      if (e.status === 401) return hetPhien();
      setDialog(null); setFlash({ kieu: 'loi', nd: e.status === 409 ? e.message : 'Xóa dịch vụ không thành công. Vui lòng thử lại!' });
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head"><span>Quản lý dịch vụ</span></div>
      {flash && <Flash kieu={flash.kieu}>{flash.nd}</Flash>}
      <div className="pt-tools">
        <label className="pt-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input placeholder="Tìm theo tên dịch vụ" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} />
        </label>
        <select className="pt-filter f-select" value={maToaNha} onChange={(e) => setMaToaNha(e.target.value)}>
          <option value="">Tất cả tòa nhà</option>
          {toaNhas.map((t) => <option key={t.maToaNha} value={t.maToaNha}>{t.tenToaNha}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn-create" onClick={() => mo('tao')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Thêm dịch vụ
        </button>
      </div>
      <div className="tn-table">
        <div className="dv-row tn-th"><span>TÊN DỊCH VỤ</span><span>KIỂU TÍNH GIÁ</span><span>ĐƠN GIÁ (VNĐ)</span><span>ĐƠN VỊ TÍNH</span><span>TRẠNG THÁI</span><span>THAO TÁC</span></div>
        {ds.map((d) => (
          <div className="dv-row tn-tr" key={d.maDichVu}>
            <b>{d.tenDichVu}</b><span>{d.kieuTinhGia}</span><span>{vnd(d.donGia)}</span><span>{d.donViTinh}</span>
            <span><span className={'pill ' + (d.trangThai === 'Hoạt động' ? 'pill-thue' : 'pill-off')}>{d.trangThai}</span></span>
            <span className="tn-act">
              <button className="act" onClick={() => mo('sua', d)}>Sửa</button>
              <button className="act act-del" onClick={() => mo('xoa', d)}>Xóa</button>
            </span>
          </div>
        ))}
      </div>

      {(dialog?.loai === 'tao' || dialog?.loai === 'sua') && (
        <DichVuFormModal token={token} che={dialog.loai === 'sua' ? dialog.dv : null} maToaNha={maToaNha} onClose={() => setDialog(null)} onSaved={daLuu} onUnauthorized={hetPhien}
          onLoiTai={() => { setDialog(null); setFlash({ kieu: 'loi', nd: 'Không thể tải thông tin dịch vụ, vui lòng thử lại sau' }); }} />
      )}
      {dialog?.loai === 'xoa' && (
        <ConfirmDialog title="Xác nhận xóa" ok="Xóa" danger onCancel={() => setDialog(null)} onOk={xoa} busy={busy}>
          Bạn có chắc chắn muốn xóa dịch vụ {dialog.dv.tenDichVu} không?
        </ConfirmDialog>
      )}
    </>
  );
}
