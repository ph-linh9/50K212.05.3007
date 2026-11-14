import { useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import Flash from '../components/Flash.jsx';
import { hopDongApi } from '../services/api.js';
import { congThang } from '../utils/hopDong.js';

function Truong({ nhan, batBuoc, loi, children }) {
  return (
    <div className="f-group">
      <label className="f-label">{nhan}{batBuoc ? <b> *</b> : null}</label>
      {children}
      {loi && <p className="f-err">{loi}</p>}
    </div>
  );
}

// UC5.5 Gia hạn hợp đồng. Ngày bắt đầu mặc định = ngày kết thúc hiện tại; Ngày kết thúc tự tính theo thời hạn gia hạn
export default function HopDongGiaHanModal({ token, hd, onClose, onSaved, onUnauthorized }) {
  const [f, setF] = useState({ thoiHanThang: 3, ngayBatDau: hd.ngayKetThuc, ngayKetThuc: congThang(hd.ngayKetThuc, 3) });
  const [loi, setLoi] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  const doiThoiHan = (n) => { setF({ ...f, thoiHanThang: n, ngayKetThuc: congThang(f.ngayBatDau, n) }); setLoi({}); };
  const doiBatDau = (e) => { const bd = e.target.value; setF({ ...f, ngayBatDau: bd, ngayKetThuc: bd ? congThang(bd, f.thoiHanThang) : f.ngayKetThuc }); setLoi({ ...loi, ngayBatDau: undefined, ngayKetThuc: undefined }); };
  const cls = (k) => 'f-input' + (loi[k] !== undefined ? ' err' : '');

  async function submit(e) {
    e.preventDefault(); setLoi({}); setBanner(''); setBusy(true);
    try {
      await hopDongApi.giaHan(token, hd.maHopDong, f);
      onSaved(null, 'Gia hạn hợp đồng thành công');
    } catch (er) {
      if (er.status === 401) return onUnauthorized();
      if (er.loi) setLoi(er.loi);
      else setBanner('Gia hạn hợp đồng không thành công. Vui lòng thử lại!');
    } finally { setBusy(false); }
  }

  return (
    <Modal title="Gia hạn hợp đồng" width={520}>
      <form onSubmit={submit} noValidate>
        {banner && <Flash kieu="loi">{banner}</Flash>}
        <div className="f-row">
          <Truong nhan="Số hợp đồng"><input className="f-input ro" value={hd.soHopDong} readOnly /></Truong>
          <Truong nhan="Phòng"><input className="f-input ro" value={hd.tenPhong} readOnly /></Truong>
        </div>
        <Truong nhan="Thời hạn gia hạn" batBuoc loi={loi.thoiHanThang}>
          <div className="hd-chips">
            {[3, 4, 5, 6].map((n) => (
              <button type="button" key={n} className={'hd-chip' + (f.thoiHanThang === n ? ' on' : '')} onClick={() => doiThoiHan(n)}>{n} tháng</button>
            ))}
          </div>
        </Truong>
        <div className="f-row">
          <Truong nhan="Ngày bắt đầu" batBuoc loi={loi.ngayBatDau && loi.ngayBatDau}>
            <input type="date" className={cls('ngayBatDau')} value={f.ngayBatDau} onChange={doiBatDau} />
          </Truong>
          <Truong nhan="Ngày kết thúc" batBuoc loi={loi.ngayKetThuc}>
            <input type="date" className={cls('ngayKetThuc')} value={f.ngayKetThuc}
              onChange={(e) => { setF({ ...f, ngayKetThuc: e.target.value }); setLoi({ ...loi, ngayKetThuc: undefined }); }} />
          </Truong>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>Hủy</button>
          <button className="btn-fill" disabled={busy}>Cập nhật</button>
        </div>
      </form>
    </Modal>
  );
}
