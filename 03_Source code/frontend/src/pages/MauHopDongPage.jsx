import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { mauHopDongApi } from '../services/api.js';
import Flash from '../components/Flash.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import MauHopDongFormModal from './MauHopDongFormModal.jsx';

export default function MauHopDongPage() {
  const { token, dangXuat } = useAuth();
  const nav = useNavigate();
  const [ds, setDs] = useState([]);
  const [flash, setFlash] = useState(null);
  const [dialog, setDialog] = useState(null); // {loai: 'tao'|'sua'|'xoa', m}
  const [busy, setBusy] = useState(false);

  const hetPhien = () => { dangXuat(); nav('/dang-nhap'); };
  const tai = () => mauHopDongApi.danhSach(token).then(setDs).catch((e) => {
    if (e.status === 401) return hetPhien();
    setDs([]);
  });
  useEffect(() => { tai(); }, []); // eslint-disable-line

  const daLuu = (_, nd) => { setDialog(null); setFlash({ kieu: 'ok', nd }); tai(); };
  const mo = (loai, m) => { setFlash(null); setDialog({ loai, m }); };

  async function xoa() {
    setBusy(true);
    try {
      await mauHopDongApi.xoa(token, dialog.m.maMau);
      setDialog(null); setFlash({ kieu: 'ok', nd: 'Xóa mẫu hợp đồng thành công!' }); tai();
    } catch (e) {
      if (e.status === 401) return hetPhien();
      setDialog(null); setFlash({ kieu: 'loi', nd: 'Không thể xóa mẫu hợp đồng, vui lòng thử lại sau' });
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head"><span>Quản lý mẫu hợp đồng</span></div>
      {flash && <Flash kieu={flash.kieu}>{flash.nd}</Flash>}
      <div className="tn-bar">
        <h3>DANH SÁCH MẪU HỢP ĐỒNG</h3>
        <button className="btn-create" onClick={() => mo('tao')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Thêm mẫu
        </button>
      </div>
      <div className="tn-table">
        <div className="mh-row tn-th"><span>TÊN MẪU</span><span>MÔ TẢ</span><span>THAO TÁC</span></div>
        {ds.map((m) => (
          <div className="mh-row tn-tr" key={m.maMau}>
            <b>{m.tenMau}</b><span>{m.moTa}</span>
            <span className="tn-act">
              <button className="act" onClick={() => mo('sua', m)}>Chỉnh sửa</button>
              <button className="act act-del" onClick={() => mo('xoa', m)}>Xóa</button>
            </span>
          </div>
        ))}
      </div>

      {(dialog?.loai === 'tao' || dialog?.loai === 'sua') && (
        <MauHopDongFormModal token={token} che={dialog.loai === 'sua' ? dialog.m : null} onClose={() => setDialog(null)} onSaved={daLuu} onUnauthorized={hetPhien}
          onLoiTai={() => { setDialog(null); setFlash({ kieu: 'loi', nd: 'Không thể tải thông tin mẫu hợp đồng, vui lòng thử lại sau' }); }} />
      )}
      {dialog?.loai === 'xoa' && (
        <ConfirmDialog ok="Xóa" danger onCancel={() => setDialog(null)} onOk={xoa} busy={busy}>Bạn có chắc muốn xóa mẫu hợp đồng {dialog.m.tenMau}?</ConfirmDialog>
      )}
    </>
  );
}
