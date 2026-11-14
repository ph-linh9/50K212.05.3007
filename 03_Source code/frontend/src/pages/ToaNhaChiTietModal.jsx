import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { toaNhaApi } from '../services/api.js';

function Dong({ nhan, children, trong }) {
  return (<div className="ct-row"><span className="ct-label">{nhan}</span><span className={'ct-val' + (trong ? ' muted' : '')}>{children}</span></div>);
}
// UC2.2 Xem tòa nhà
export default function ToaNhaChiTietModal({ token, id, onClose, onLoi, onUnauthorized }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    toaNhaApi.chiTiet(token, id).then(setD).catch((e) => { if (e.status === 401) onUnauthorized(); else onLoi(); });
  }, []); // eslint-disable-line
  if (!d) return null;
  return (
    <Modal title="Chi tiết tòa nhà" onBackdrop={onClose}>
      <Dong nhan="Tên tòa nhà">{d.tenToaNha}</Dong>
      <Dong nhan="Địa chỉ">{d.diaChi}</Dong>
      <div className="ct-two">
        <Dong nhan="Ngân hàng">{d.nganHang}</Dong>
        <Dong nhan="Số tài khoản">{d.soTaiKhoan}</Dong>
      </div>
      <Dong nhan="Tên chủ tài khoản">{d.tenChuTaiKhoan}</Dong>
      <Dong nhan="Mô tả" trong={!d.moTa}>{d.moTa || 'Không có'}</Dong>
      <div className="ct-row"><span className="ct-label">Hình ảnh đính kèm</span></div>
      {d.duongDanHinhAnh
        ? <div className="ct-img"><img src={d.duongDanHinhAnh} alt={d.tenToaNha} /></div>
        : <div className="ct-noimg">Không có ảnh</div>}
    </Modal>
  );
}
