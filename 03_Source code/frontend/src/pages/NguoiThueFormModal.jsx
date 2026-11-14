import { useEffect, useRef, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import Flash from '../components/Flash.jsx';
import { nguoiThueApi, phongTroApi } from '../services/api.js';

const RONG = {
  hoTen: '', soDienThoai: '', ngaySinh: '', gioiTinh: '', soCCCD: '', email: '', diaChi: '', maPhong: '',
  zalo: '', ngayCapCCCD: '', noiCapCCCD: '', anhCCCD: null, tinhTrangDangKyTamTru: false,
};
const tenTepTuUri = (uri) => (uri && (uri.match(/^data:[^;,]*;name=([^;]*);/) || [])[1]) || (uri ? 'Ảnh CCCD đã chọn' : '');

function Truong({ nhan, batBuoc, loi, children }) {
  return (
    <div className="f-group">
      <label className="f-label">{nhan}{batBuoc ? <b> *</b> : null}</label>
      {children}
      {loi && <p className="f-err">{loi}</p>}
    </div>
  );
}

// UC4.1 Thêm người thuê mới (che = null) và UC4.4 Sửa người thuê (che = người thuê đang sửa)
export default function NguoiThueFormModal({ token, che, onClose, onSaved, onUnauthorized, onLoiTai }) {
  const sua = !!che;
  const [f, setF] = useState(RONG);
  const [loi, setLoi] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [dangTai, setDangTai] = useState(sua);
  const [phongs, setPhongs] = useState([]);
  const tepRef = useRef();

  useEffect(() => { phongTroApi.danhSach(token).then((r) => setPhongs(r.phong)).catch(() => {}); }, []); // eslint-disable-line

  useEffect(() => {
    if (!sua) return;
    nguoiThueApi.chiTiet(token, che.maNguoiThue)
      .then((d) => setF({ ...RONG, ...d, maPhong: d.maPhong, anhCCCD: d.anhCCCD || null }))
      .catch((e) => (e.status === 401 ? onUnauthorized() : onLoiTai()))
      .finally(() => setDangTai(false));
  }, []); // eslint-disable-line

  const dat = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setLoi({ ...loi, [k]: undefined }); };
  const cls = (k) => 'f-input' + (loi[k] !== undefined ? ' err' : '');

  function chonTep(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'image/png') { e.target.value = ''; return; } // Ảnh CCCD chỉ nhận PNG
    const rd = new FileReader();
    rd.onload = () => {
      const m = String(rd.result).match(/^data:([^;]+);base64,(.*)$/);
      const ten = file.name.replace(/[;,]/g, '_');
      setF((p) => ({ ...p, anhCCCD: `data:${m[1]};name=${ten};base64,${m[2]}` }));
      setLoi((p) => ({ ...p, anhCCCD: undefined }));
    };
    rd.readAsDataURL(file);
  }

  async function submit(e) {
    e.preventDefault(); setLoi({}); setBanner(''); setBusy(true);
    try {
      const res = sua ? await nguoiThueApi.sua(token, che.maNguoiThue, f) : await nguoiThueApi.tao(token, f);
      onSaved(res, sua ? 'Cập nhật thông tin người thuê thành công!' : 'Thêm người thuê thành công!');
    } catch (er) {
      if (er.status === 401) return onUnauthorized();
      if (er.loi) setLoi(er.loi);
      else setBanner('Không thể thêm lưu thông tin người thuê, vui lòng thử lại sau');
    } finally { setBusy(false); }
  }

  const o = (k, nhan, ph, extra = {}) => (
    <Truong nhan={nhan} batBuoc={extra.batBuoc} loi={loi[k]}>
      <input className={cls(k)} placeholder={ph} value={f[k] ?? ''} onChange={dat(k)} disabled={dangTai} type={extra.type || 'text'} />
    </Truong>
  );
  return (
    <Modal title={sua ? 'Sửa người thuê' : 'Thêm người thuê mới'} width={760}>
      <form onSubmit={submit} noValidate>
        {banner && <Flash kieu="loi">{banner}</Flash>}
        <div className="f-row">{o('hoTen', 'Họ tên', 'Nhập họ tên', { batBuoc: true })}{o('soDienThoai', 'Số điện thoại', 'Nhập số điện thoại', { batBuoc: true })}</div>
        <div className="f-row">{o('ngaySinh', 'Ngày sinh', 'dd/mm/yyyy', { batBuoc: true, type: 'date' })}{o('gioiTinh', 'Giới tính', 'Nhập giới tính', { batBuoc: true })}</div>
        <div className="f-row">{o('soCCCD', 'Số CCCD', 'Nhập số CCCD', { batBuoc: true })}{o('email', 'Email', 'Nhập email', { batBuoc: true })}</div>
        <div className="f-row">{o('diaChi', 'Địa chỉ', 'Nhập địa chỉ', { batBuoc: true })}<Truong nhan="Tên phòng" batBuoc loi={loi.maPhong}>
            <select className={cls('maPhong') + ' f-select'} value={f.maPhong} onChange={dat('maPhong')} disabled={dangTai}>
              <option value=""hidden>Chọn tên phòng</option>
              {phongs.map((p) => {
                const day = p.soNguoiThucTe >= p.soNguoiToiDa && String(p.maPhong) !== String(f.maPhong);
            return <option key={p.maPhong} value={p.maPhong} disabled={day}>{p.tenPhong} - {p.tenToaNha}</option>;              })}
            </select>
          </Truong></div>
        <div className="f-row">{o('zalo', 'Zalo', 'Nhập số Zalo')}{o('ngayCapCCCD', 'Ngày cấp CCCD', 'dd/mm/yyyy', { type: 'date' })}</div>
        <div className="f-row">
          {o('noiCapCCCD', 'Nơi cấp CCCD', 'Nhập nơi cấp CCCD')}
          <Truong nhan="Ảnh CCCD" loi={loi.anhCCCD}>
            <div className={'f-file' + (loi.anhCCCD ? ' err' : '')} style={{ cursor: 'pointer' }} onClick={() => tepRef.current.click()}>
              <span>{tenTepTuUri(f.anhCCCD) || 'Tải ảnh lên'}</span>
              <input ref={tepRef} type="file" accept="image/png" hidden onChange={chonTep} />
            </div>
          </Truong>
        </div>
        <Truong nhan="Tình trạng đăng ký tạm trú">
          <label className="nt-check">
            <input type="checkbox" checked={!!f.tinhTrangDangKyTamTru} onChange={(e) => setF({ ...f, tinhTrangDangKyTamTru: e.target.checked })} disabled={dangTai} />
            Đã đăng ký tạm trú
          </label>
        </Truong>
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>Hủy</button>
          <button className="btn-fill" disabled={busy || dangTai}>Lưu</button>
        </div>
      </form>
    </Modal>
  );
}
