import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { toaNhaApi } from '../services/api.js';
import Flash from '../components/Flash.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import ToaNhaFormModal from './ToaNhaFormModal.jsx';
import ToaNhaChiTietModal from './ToaNhaChiTietModal.jsx';

export default function NhaTroPage() {
  const { token, dangXuat } = useAuth();
  const nav = useNavigate();
  const [ds, setDs] = useState([]);
  const [nganHangs, setNganHangs] = useState([]);
  const [flash, setFlash] = useState(null); // {kieu, nd}
  const [dialog, setDialog] = useState(null); // {loai: 'tao'|'sua'|'xem'|'xoa', tn}
  const [busy, setBusy] = useState(false);

  const hetPhien = () => { dangXuat(); nav('/dang-nhap'); };
  const tai = () => toaNhaApi.danhSach(token).then(setDs).catch((e) => {
    if (e.status === 401) return hetPhien();
    setFlash({ kieu: 'loi', nd: 'Có lỗi xảy ra, vui lòng thử lại' });
  });
  useEffect(() => { tai(); toaNhaApi.nganHang(token).then(setNganHangs).catch(() => {}); }, []); // eslint-disable-line

  const daLuu = (_, nd) => { setDialog(null); setFlash({ kieu: 'ok', nd }); tai(); };

  async function xoa() {
    setBusy(true);
    try {
      await toaNhaApi.xoa(token, dialog.tn.maToaNha);
      setDialog(null); setFlash({ kieu: 'ok', nd: 'Xóa tòa nhà thành công' }); tai();
    } catch (e) {
      if (e.status === 401) return hetPhien();
      setDialog(null); setFlash({ kieu: 'loi', nd: 'Xóa tòa nhà không thành công, vui lòng thử lại' });
    } finally { setBusy(false); }
  }
  const mo = (loai, tn) => { setFlash(null); setDialog({ loai, tn }); };

  return (
    <>
      <div className="page-head"><span>Quản lý nhà trọ</span></div>
      {flash && <Flash kieu={flash.kieu}>{flash.nd}</Flash>}
      <div className="tn-bar">
        <h3>DANH SÁCH TÒA NHÀ</h3>
        <button className="btn-create" onClick={() => mo('tao')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Tạo
        </button>
      </div>
      <div className="tn-table">
        <div className="tn-row tn-th"><span>TÊN TÒA NHÀ</span><span>ĐỊA CHỈ</span><span>NGÂN HÀNG</span><span>SỐ TÀI KHOẢN</span><span>THAO TÁC</span></div>
        {ds.map((t) => (
          <div className="tn-row tn-tr" key={t.maToaNha}>
            <b>{t.tenToaNha}</b><span>{t.diaChi}</span><span>{t.nganHang}</span><span>{t.soTaiKhoan}</span>
            <span className="tn-act">
              <button className="act" onClick={() => mo('xem', t)}>Xem</button>
              <button className="act" onClick={() => mo('sua', t)}>Sửa</button>
              <button className="act act-del" onClick={() => mo('xoa', t)}>Xóa</button>
            </span>
          </div>
        ))}
      </div>

      {dialog?.loai === 'tao' && <ToaNhaFormModal token={token} che={null} nganHangs={nganHangs} onClose={() => setDialog(null)} onSaved={daLuu} onUnauthorized={hetPhien} />}
      {dialog?.loai === 'sua' && <ToaNhaFormModal token={token} che={dialog.tn} nganHangs={nganHangs} onClose={() => setDialog(null)} onSaved={daLuu} onUnauthorized={hetPhien} />}
      {dialog?.loai === 'xem' && <ToaNhaChiTietModal token={token} id={dialog.tn.maToaNha} onClose={() => setDialog(null)}
        onLoi={() => { setDialog(null); setFlash({ kieu: 'loi', nd: 'Có lỗi xảy ra, vui lòng thử lại' }); }} onUnauthorized={hetPhien} />}
      {dialog?.loai === 'xoa' && (
        <ConfirmDialog title="Xác nhận xóa tòa nhà" ok="Xóa" danger onCancel={() => setDialog(null)} onOk={xoa} busy={busy}>
          Việc xóa tòa nhà sẽ xóa tất cả dữ liệu liên quan và không thể khôi phục lại.<br />Bạn có chắc chắn muốn xóa?
        </ConfirmDialog>
      )}
    </>
  );
}
