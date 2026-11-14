import { useEffect, useRef, useState } from 'react';
import { Modal, ConfirmDialog } from '../components/Modal.jsx';
import Flash from '../components/Flash.jsx';
import { toaNhaApi } from '../services/api.js';

const RONG = { tenToaNha: '', diaChi: '', nganHang: '', soTaiKhoan: '', tenChuTaiKhoan: '', moTa: '', duongDanHinhAnh: null };
const tenTepTuUri = (uri) => (uri && (uri.match(/^data:[^;,]*;name=([^;]*);/) || [])[1]) || (uri ? 'Hình ảnh đã chọn' : '');

function Truong({ nhan, batBuoc, loi, children }) {
  return (
    <div className="f-group">
      <label className="f-label">{nhan}{batBuoc ? <b> *</b> : null}</label>
      {children}
      {loi && <p className="f-err">{loi}</p>}
    </div>
  );
}

// UC2.1 Tạo (che = null) và UC2.3 Sửa (che = tòa nhà đang sửa)
export default function ToaNhaFormModal({ token, che, nganHangs, onClose, onSaved, onUnauthorized }) {
  const sua = !!che;
  const [f, setF] = useState(RONG);
  const [loi, setLoi] = useState({});
  const [banner, setBanner] = useState('');
  const [xacNhan, setXacNhan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dangTai, setDangTai] = useState(sua);
  const tepRef = useRef();

  useEffect(() => {
    if (!sua) return;
    toaNhaApi.chiTiet(token, che.maToaNha)
      .then((d) => setF({ ...RONG, ...d, moTa: d.moTa || '' }))
      .catch((e) => (e.status === 401 ? onUnauthorized() : setBanner('Có lỗi xảy ra, vui lòng thử lại')))
      .finally(() => setDangTai(false));
  }, []); // eslint-disable-line

  const dat = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setLoi({ ...loi, [k]: undefined }); };
  const cls = (k) => 'f-input' + (loi[k] !== undefined ? ' err' : '');

  function chonTep(e) {
    const file = e.target.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      const m = String(rd.result).match(/^data:([^;]+);base64,(.*)$/);
      const ten = file.name.replace(/[;,]/g, '_');
      setF((p) => ({ ...p, duongDanHinhAnh: `data:${m[1]};name=${ten};base64,${m[2]}` }));
      setLoi((p) => ({ ...p, duongDanHinhAnh: undefined }));
    };
    rd.readAsDataURL(file);
  }

  async function luu() {
    setBusy(true); setBanner('');
    try {
      const res = sua ? await toaNhaApi.sua(token, che.maToaNha, f) : await toaNhaApi.tao(token, f);
      onSaved(res, sua ? 'Cập nhật tòa nhà thành công' : 'Tạo tòa nhà thành công');
    } catch (e) {
      setXacNhan(false);
      if (e.status === 401) return onUnauthorized();
      if (e.loi) { setLoi(e.loi); if (sua && e.message.startsWith('Vui lòng nhập đầy đủ')) setBanner(e.message); }
      else setBanner(sua ? 'Cập nhật tòa nhà không thành công, vui lòng thử lại' : 'Có lỗi xảy ra, vui lòng thử lại');
    } finally { setBusy(false); }
  }
  const submit = (e) => { e.preventDefault(); setLoi({}); setBanner(''); sua ? luu() : setXacNhan(true); };

  return (
    <>
      <Modal title={sua ? 'Sửa tòa nhà' : 'Tạo tòa nhà'} onClose={onClose}>
        <form onSubmit={submit} noValidate>
          {banner && <Flash kieu="loi">{banner}</Flash>}
          <Truong nhan="Tên tòa nhà" batBuoc loi={loi.tenToaNha}>
            <input className={cls('tenToaNha')} placeholder="Ví dụ: Tòa A" value={f.tenToaNha} onChange={dat('tenToaNha')} autoFocus disabled={dangTai} />
          </Truong>
          <Truong nhan="Địa chỉ" batBuoc loi={loi.diaChi}>
            <input className={cls('diaChi')} placeholder="Số nhà, đường, phường, thành phố" value={f.diaChi} onChange={dat('diaChi')} disabled={dangTai} />
          </Truong>
          <div className="f-row">
            <Truong nhan="Ngân hàng" batBuoc loi={loi.nganHang}>
              <select className={cls('nganHang') + ' f-select'} value={f.nganHang} onChange={dat('nganHang')} disabled={dangTai}>
                <option value=""hidden>Chọn ngân hàng</option>
                {nganHangs.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Truong>
            <Truong nhan="Số tài khoản" batBuoc loi={loi.soTaiKhoan}>
              <input className={cls('soTaiKhoan')} placeholder="Chỉ nhập chữ số" value={f.soTaiKhoan} onChange={dat('soTaiKhoan')} disabled={dangTai} />
            </Truong>
          </div>
          <Truong nhan="Tên chủ tài khoản" batBuoc loi={loi.tenChuTaiKhoan}>
            <input className={cls('tenChuTaiKhoan')} placeholder="Họ và tên chủ tài khoản" value={f.tenChuTaiKhoan} onChange={dat('tenChuTaiKhoan')} disabled={dangTai} />
          </Truong>
          <Truong nhan="Mô tả (không bắt buộc)">
            <textarea className="f-input f-area" rows={3} value={f.moTa} onChange={dat('moTa')} disabled={dangTai} />
          </Truong>
          <Truong nhan="Hình ảnh đính kèm (không bắt buộc)" loi={loi.duongDanHinhAnh}>
            <div className="f-file">
              <button type="button" className="file-btn" onClick={() => tepRef.current.click()}>Chọn tệp</button>
              <span>{tenTepTuUri(f.duongDanHinhAnh) || 'Chưa chọn tệp'}</span>
              <input ref={tepRef} type="file" accept="image/png,image/jpeg" hidden onChange={chonTep} />
            </div>
          </Truong>
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>Hủy</button>
            <button className="btn-fill" disabled={busy || dangTai}>Lưu</button>
          </div>
        </form>
      </Modal>
      {xacNhan && (
        <ConfirmDialog title="Xác nhận tạo tòa nhà" ok="Lưu" onCancel={() => setXacNhan(false)} onOk={luu} busy={busy}>
          Bạn có chắc chắn muốn lưu tòa nhà này?
        </ConfirmDialog>
      )}
    </>
  );
}
