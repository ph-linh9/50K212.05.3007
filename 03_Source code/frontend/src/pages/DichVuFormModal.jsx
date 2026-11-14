import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import Flash from '../components/Flash.jsx';
import { dichVuApi } from '../services/api.js';

const RONG = { tenDichVu: '', kieuTinhGia: '', donGia: '', trangThai: '' };
const DON_VI = { 'Theo đồng hồ': 'kWh', 'Theo đầu người': 'Người' };
const dinhDang = (n) => (n === null || n === undefined || n === '' ? '' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));

function Truong({ nhan, batBuoc, loi, children }) {
  return (
    <div className="f-group">
      <label className="f-label">{nhan}{batBuoc ? <b> *</b> : null}</label>
      {children}
      {loi && <p className="f-err">{loi}</p>}
    </div>
  );
}

// UC7.1 Thêm dịch vụ (che = null) và UC7.2 Sửa dịch vụ (che = dịch vụ đang sửa)
export default function DichVuFormModal({ token, che, maToaNha, onClose, onSaved, onUnauthorized, onLoiTai }) {
  const sua = !!che;
  const [f, setF] = useState(RONG);
  const [loi, setLoi] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [dangTai, setDangTai] = useState(sua);

  useEffect(() => {
    if (!sua) return;
    dichVuApi.chiTiet(token, che.maDichVu)
      .then((d) => setF({ tenDichVu: d.tenDichVu, kieuTinhGia: d.kieuTinhGia, donGia: dinhDang(d.donGia), trangThai: d.trangThai }))
      .catch((e) => (e.status === 401 ? onUnauthorized() : onLoiTai()))
      .finally(() => setDangTai(false));
  }, []); // eslint-disable-line

  const dat = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setLoi({ ...loi, [k]: undefined }); };
  const cls = (k) => 'f-input' + (loi[k] !== undefined ? ' err' : '');

  async function submit(e) {
    e.preventDefault(); setLoi({}); setBanner(''); setBusy(true);
    try {
      const res = sua ? await dichVuApi.sua(token, che.maDichVu, f) : await dichVuApi.tao(token, { ...f, maToaNha });
      onSaved(res, sua ? 'Cập nhật dịch vụ thành công' : 'Thêm dịch vụ thành công');
    } catch (er) {
      if (er.status === 401) return onUnauthorized();
            if (er.loi) {
        if (!er.message.startsWith('Vui lòng điền')) setLoi(er.loi);
        else {
          const ct = 'Vui lòng điền đầy đủ thông tin bắt buộc';
          const m = {};
          for (const k of Object.keys(er.loi)) m[k] = ct;
          if (m.kieuTinhGia) m.donViTinh = ct;
          setLoi(m);
        }
      }
      else setBanner(sua ? 'Cập nhật dịch vụ không thành công. Vui lòng thử lại!' : 'Thêm dịch vụ không thành công. Vui lòng thử lại!');
    } finally { setBusy(false); }
  }

  const donVi = DON_VI[f.kieuTinhGia] || '';
  return (
    <Modal title={sua ? 'Sửa dịch vụ' : 'Thêm dịch vụ'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {banner && <Flash kieu="loi">{banner}</Flash>}
        <Truong nhan="Tên dịch vụ" batBuoc loi={loi.tenDichVu}>
          <input className={cls('tenDichVu')} placeholder="Nhập tên dịch vụ" value={f.tenDichVu} onChange={dat('tenDichVu')} autoFocus disabled={dangTai} />
        </Truong>
        <div className="f-row">
          <Truong nhan="Kiểu tính giá" batBuoc loi={loi.kieuTinhGia}>
            <select className={cls('kieuTinhGia') + ' f-select'} value={f.kieuTinhGia} onChange={dat('kieuTinhGia')} disabled={dangTai}>
              <option value="" hidden>Chọn kiểu tính giá</option>
              <option value="Theo đồng hồ">Theo đồng hồ</option>
              <option value="Theo đầu người">Theo đầu người</option>
            </select>
          </Truong>
          <Truong nhan="Đơn giá (VNĐ)" batBuoc loi={loi.donGia}>
            <input className={cls('donGia')} placeholder="Nhập đơn giá" value={f.donGia} onChange={dat('donGia')} disabled={dangTai}
              onBlur={() => { const s = String(f.donGia).replace(/\./g, ''); if (/^\d+$/.test(s)) setF((p) => ({ ...p, donGia: dinhDang(s) })); }} />
          </Truong>
        </div>
        <div className="f-row">
          <Truong nhan="Đơn vị tính" batBuoc>
            <input className="f-input" style={{ background: '#E7ECE9' }} readOnly value={donVi} placeholder="Tự động theo Kiểu tính giá" />
          </Truong>
          <Truong nhan="Trạng thái" batBuoc loi={loi.trangThai}>
            <select className={cls('trangThai') + ' f-select'} value={f.trangThai} onChange={dat('trangThai')} disabled={dangTai}>
              <option value="" hidden>Chọn trạng thái</option>
              <option value="Hoạt động">Hoạt động</option>
              <option value="Không hoạt động">Không hoạt động</option>
            </select>
          </Truong>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>Hủy</button>
          <button className="btn-fill" disabled={busy || dangTai}>Lưu</button>
        </div>
      </form>
    </Modal>
  );
}
