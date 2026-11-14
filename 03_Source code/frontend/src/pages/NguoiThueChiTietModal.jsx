import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { nguoiThueApi } from '../services/api.js';

export const dmy = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '');
function Dong({ nhan, children, trong }) {
  return (<div className="ct-row"><span className="ct-label">{nhan}</span><span className={'ct-val' + (trong ? ' muted' : '')}>{children}</span></div>);
}
const co = (x) => x || 'Không có';

// UC4.3 Xem chi tiết người thuê (đóng bằng cách bấm ra ngoài vùng biểu mẫu)
export default function NguoiThueChiTietModal({ token, id, onClose, onLoi, onUnauthorized }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    nguoiThueApi.chiTiet(token, id).then(setD).catch((e) => { if (e.status === 401) onUnauthorized(); else onLoi(); });
  }, []); // eslint-disable-line
  if (!d) return null;
  return (
    <Modal title="Chi tiết người thuê" width={760} onBackdrop={onClose}>
      <div className="ct-two">
        <Dong nhan="Họ tên">{d.hoTen}</Dong><Dong nhan="Số điện thoại">{d.soDienThoai}</Dong>
        <Dong nhan="Ngày sinh">{dmy(d.ngaySinh)}</Dong><Dong nhan="Giới tính">{d.gioiTinh}</Dong>
        <Dong nhan="Số CCCD">{d.soCCCD}</Dong><Dong nhan="Ngày cấp CCCD" trong={!d.ngayCapCCCD}>{co(dmy(d.ngayCapCCCD))}</Dong>
        <Dong nhan="Nơi cấp CCCD" trong={!d.noiCapCCCD}>{co(d.noiCapCCCD)}</Dong><Dong nhan="Email">{d.email}</Dong>
        <Dong nhan="Zalo" trong={!d.zalo}>{co(d.zalo)}</Dong>
        <Dong nhan="Tình trạng đăng ký tạm trú" trong={!d.tinhTrangDangKyTamTru}>{d.tinhTrangDangKyTamTru ? 'Đã đăng ký' : 'Không có'}</Dong>
        <Dong nhan="Địa chỉ">{d.diaChi}</Dong><Dong nhan="Tên phòng">{d.tenPhong}</Dong>
      </div>
      <div className="ct-row"><span className="ct-label">Ảnh CCCD</span></div>
      {d.anhCCCD ? <div className="ct-img"><img src={d.anhCCCD} alt="Ảnh CCCD" /></div> : <div className="ct-noimg">Không có ảnh</div>}
    </Modal>
  );
}
