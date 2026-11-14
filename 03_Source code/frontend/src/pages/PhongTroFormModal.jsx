import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import Flash from '../components/Flash.jsx';
import { phongTroApi } from '../services/api.js';

const RONG = { maToaNha: '', tenPhong: '', tang: '', giaThue: '', chuKyThanhToan: '', trangThai: 'Trống', dienTich: '', tienCoc: '', moTa: '' };
const TRANG_THAI = ['Trống', 'Đang thuê', 'Đang sửa chữa'];
const CHU_KY = [1, 3, 6, 12];
// Hiển thị số có dấu chấm ngăn cách hàng nghìn (3.000.000)
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

// UC3.1 Thêm phòng (che = null) và UC3.4 Sửa thông tin phòng (che = phòng đang sửa)
export default function PhongTroFormModal({ token, che, toaNhas, onClose, onSaved, onUnauthorized, onLoiTai }) {
  const sua = !!che;
  const [f, setF] = useState(RONG);
  const [loi, setLoi] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [dangTai, setDangTai] = useState(sua);

  useEffect(() => {
    if (!sua) return;
    phongTroApi.chiTiet(token, che.maPhong)
      .then((d) => setF({
        maToaNha: String(d.maToaNha), tenPhong: d.tenPhong, tang: String(d.tang), giaThue: dinhDang(d.giaThue),
        chuKyThanhToan: String(d.chuKyThanhToan), trangThai: d.trangThai, dienTich: d.dienTich ?? '',
        tienCoc: dinhDang(d.tienCoc), moTa: d.moTa || '',
      }))
      .catch((e) => (e.status === 401 ? onUnauthorized() : onLoiTai()))
      .finally(() => setDangTai(false));
  }, []); // eslint-disable-line

  const dat = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setLoi({ ...loi, [k]: undefined }); };
  const tien = (k) => ({
    value: f[k],
    onChange: dat(k),
    onBlur: () => { const s = String(f[k]).replace(/\./g, ''); if (/^\d+$/.test(s)) setF((p) => ({ ...p, [k]: dinhDang(s) })); },
  });
  const cls = (k) => 'f-input' + (loi[k] !== undefined ? ' err' : '');

  async function submit(e) {
    e.preventDefault(); setLoi({}); setBanner(''); setBusy(true);
    try {
      const res = sua ? await phongTroApi.sua(token, che.maPhong, f) : await phongTroApi.tao(token, f);
      onSaved(res, sua ? 'Cập nhật thông tin phòng thành công' : 'Thêm phòng thành công');
    } catch (er) {
      if (er.status === 401) return onUnauthorized();
      if (er.loi) setLoi(er.loi);
      else setBanner(sua ? 'Không thể cập nhật thông tin phòng, vui lòng thử lại sau' : 'Không thể thêm phòng, vui lòng thử lại sau');
    } finally { setBusy(false); }
  }

  return (
    <Modal title={sua ? 'Sửa thông tin phòng' : 'Thêm phòng'}>
      <form onSubmit={submit} noValidate>
        {banner && <Flash kieu="loi">{banner}</Flash>}
        <Truong nhan="Tòa nhà" batBuoc loi={loi.maToaNha}>
          <select className={cls('maToaNha') + ' f-select'} value={f.maToaNha} onChange={dat('maToaNha')} disabled={dangTai || sua}>
            <option value=""hidden>Chọn tòa nhà</option>
            {toaNhas.map((t) => <option key={t.maToaNha} value={t.maToaNha}>{t.tenToaNha}</option>)}
          </select>
        </Truong>
        <div className="f-row">
          <Truong nhan="Tên phòng" batBuoc loi={loi.tenPhong}>
            <input className={cls('tenPhong')} placeholder="Ví dụ: P101" value={f.tenPhong} onChange={dat('tenPhong')} disabled={dangTai} />
          </Truong>
          <Truong nhan="Tầng" batBuoc loi={loi.tang}>
            <input className={cls('tang')} placeholder="Ví dụ: 1" value={f.tang} onChange={dat('tang')} disabled={dangTai} />
          </Truong>
        </div>
        <div className="f-row">
          <Truong nhan="Giá thuê" batBuoc loi={loi.giaThue}>
            <input className={cls('giaThue')} placeholder="Nhập giá thuê" {...tien('giaThue')} disabled={dangTai} />
          </Truong>
          <Truong nhan="Chu kỳ thanh toán" batBuoc loi={loi.chuKyThanhToan}>
            <select className={cls('chuKyThanhToan') + ' f-select'} value={f.chuKyThanhToan} onChange={dat('chuKyThanhToan')} disabled={dangTai}>
              <option value=""hidden>Chọn chu kỳ</option>
              {CHU_KY.map((c) => <option key={c} value={c}>{c} tháng</option>)}
            </select>
          </Truong>
        </div>
        <div className="f-row">
          <Truong nhan="Trạng thái" batBuoc loi={loi.trangThai}>
            <select className={cls('trangThai') + ' f-select'} value={f.trangThai} onChange={dat('trangThai')} disabled={dangTai}>
              <option value="" hidden>Chọn trạng thái</option>
              {TRANG_THAI.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Truong>
          <Truong nhan="Diện tích" loi={loi.dienTich}>
            <input className={cls('dienTich')} placeholder="Nhập diện tích" value={f.dienTich} onChange={dat('dienTich')} disabled={dangTai} />
          </Truong>
        </div>
        <div className="f-row">
          <Truong nhan="Tiền cọc" loi={loi.tienCoc}>
            <input className={cls('tienCoc')} placeholder="Nhập tiền cọc" {...tien('tienCoc')} disabled={dangTai} />
          </Truong>
          <Truong nhan="Số người ở tối đa">
            <input className="f-input" value="2" readOnly style={{ background: '#E7ECE9' }} />
          </Truong>
        </div>
        <Truong nhan="Mô tả">
          <textarea className="f-input f-area" placeholder="Nhập mô tả" rows={3} value={f.moTa} onChange={dat('moTa')} disabled={dangTai} />
        </Truong>
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>Hủy</button>
          <button className="btn-fill" disabled={busy || dangTai}>Lưu</button>
        </div>
      </form>
    </Modal>
  );
}
