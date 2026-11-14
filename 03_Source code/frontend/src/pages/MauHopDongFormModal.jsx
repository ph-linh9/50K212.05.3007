import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import Flash from '../components/Flash.jsx';
import RichEditor from '../components/RichEditor.jsx';
import { mauHopDongApi } from '../services/api.js';

const RONG = { tenMau: '', moTa: '', noiDung: '' };
function Truong({ nhan, batBuoc, loi, children }) {
  return (
    <div className="f-group">
      <label className="f-label">{nhan}{batBuoc ? <b> *</b> : null}</label>
      {children}
      {loi && <p className="f-err">{loi}</p>}
    </div>
  );
}

// UC6.1 Thêm mẫu hợp đồng mới (che = null) và UC6.2 Sửa mẫu hợp đồng (che = mẫu đang sửa)
export default function MauHopDongFormModal({ token, che, onClose, onSaved, onUnauthorized, onLoiTai }) {
  const sua = !!che;
  const [f, setF] = useState(RONG);
  const [loi, setLoi] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [dangTai, setDangTai] = useState(sua);

  useEffect(() => {
    if (!sua) return;
    mauHopDongApi.chiTiet(token, che.maMau)
      .then((d) => setF({ tenMau: d.tenMau, moTa: d.moTa || '', noiDung: d.noiDung }))
      .catch((e) => (e.status === 401 ? onUnauthorized() : onLoiTai()))
      .finally(() => setDangTai(false));
  }, []); // eslint-disable-line

  const dat = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setLoi({ ...loi, [k]: undefined }); };
  async function submit(e) {
    e.preventDefault(); setLoi({}); setBanner(''); setBusy(true);
    try {
      const res = sua ? await mauHopDongApi.sua(token, che.maMau, f) : await mauHopDongApi.tao(token, f);
      onSaved(res, sua ? 'Chỉnh sửa mẫu thành công' : 'Thêm mẫu thành công');
    } catch (er) {
      if (er.status === 401) return onUnauthorized();
      if (er.loi) setLoi(er.loi);
      else setBanner(sua ? 'Không thể cập nhật mẫu hợp đồng, vui lòng thử lại sau' : 'Không thể thêm mẫu hợp đồng, vui lòng thử lại sau');
    } finally { setBusy(false); }
  }

  return (
    <Modal title={sua ? 'Chỉnh sửa mẫu hợp đồng' : 'Thêm mẫu mới'} width={760}>
      <form onSubmit={submit} noValidate>
        {banner && <Flash kieu="loi">{banner}</Flash>}
        <Truong nhan="Tên mẫu" batBuoc loi={loi.tenMau}>
          <input className={'f-input' + (loi.tenMau !== undefined ? ' err' : '')} placeholder="Nhập tên mẫu" value={f.tenMau} onChange={dat('tenMau')} autoFocus disabled={dangTai} />
        </Truong>
        <Truong nhan="Mô tả">
          <textarea className="f-input f-area" placeholder="Nhập mô tả ngắn về mẫu" rows={2} value={f.moTa} onChange={dat('moTa')} disabled={dangTai} />
        </Truong>
        <Truong nhan="Nội dung mẫu" batBuoc loi={loi.noiDung}>
          <RichEditor value={f.noiDung} loi={loi.noiDung} disabled={dangTai} onChange={(h) => { setF((p) => ({ ...p, noiDung: h })); setLoi((p) => ({ ...p, noiDung: undefined })); }} />
        </Truong>
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>Hủy</button>
          <button className="btn-fill" disabled={busy || dangTai}>Lưu</button>
        </div>
      </form>
    </Modal>
  );
}
