import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { phongTroApi } from '../services/api.js';

export const tienVnd = (n) => (n === null || n === undefined ? '' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ');
const ngay = (s) => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };

function Dong({ nhan, children }) {
  return (<div className="ct-row"><span className="ct-label">{nhan}</span><span className="ct-val">{children}</span></div>);
}
export function Pill({ t }) {
  const k = t === 'Đang sửa chữa' ? 'pill-sua' : t === 'Đang thuê' ? 'pill-thue' : 'pill-trong';
  return <span className={'pill ' + k}>{t}</span>;
}

// UC3.3 Xem chi tiết phòng
export default function PhongTroChiTietModal({ token, id, onClose, onLoi, onUnauthorized }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    phongTroApi.chiTiet(token, id).then(setD).catch((e) => { if (e.status === 401) onUnauthorized(); else onLoi(); });
  }, []); // eslint-disable-line
  if (!d) return null;
  return (
    <Modal title="Chi tiết phòng" onBackdrop={onClose}>
      <div className="ct-two">
        <Dong nhan="Tên phòng">{d.tenPhong}</Dong>
        <Dong nhan="Giá thuê">{tienVnd(d.giaThue)}</Dong>
        <Dong nhan="Diện tích">{d.dienTich ? `${d.dienTich} m²` : ''}</Dong>
        <Dong nhan="Tiền cọc">{tienVnd(d.tienCoc)}</Dong>
        <Dong nhan="Số người ở tối đa">{d.soNguoiToiDa}</Dong>
        <Dong nhan="Số người ở thực tế">{d.soNguoiThucTe}</Dong>
      </div>
      <Dong nhan="Mô tả">{d.moTa}</Dong>
      <Dong nhan="Trạng thái phòng"><Pill t={d.trangThai} /></Dong>
      {d.nguoiThue.length > 0 && (
        <>
          <h4 className="ct-sec">Người thuê</h4>
          <div className="ct-two">
            {d.nguoiThue.map((n, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <Dong nhan="Họ và tên">{n.hoTen}</Dong><Dong nhan="Số điện thoại">{n.soDienThoai}</Dong>
              </div>
            ))}
          </div>
        </>
      )}
      {d.hopDong && (
        <>
          <h4 className="ct-sec">Hợp đồng thuê</h4>
          <div className="ct-two">
            <Dong nhan="Ngày bắt đầu">{ngay(d.hopDong.ngayBatDau)}</Dong><Dong nhan="Ngày kết thúc">{ngay(d.hopDong.ngayKetThuc)}</Dong>
          </div>
        </>
      )}
    </Modal>
  );
}
