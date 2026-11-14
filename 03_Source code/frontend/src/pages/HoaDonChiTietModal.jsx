import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { hoaDonApi } from '../services/api.js';
import { dmy, tien } from '../utils/hopDong.js';

// UC8.2 Xem chi tiết hóa đơn: bấm ra ngoài hộp thoại để đóng
export default function HoaDonChiTietModal({ token, id, onClose, onUnauthorized, onLoi }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    hoaDonApi.chiTiet(token, id).then(setD).catch((e) => (e.status === 401 ? onUnauthorized() : onLoi()));
  }, []); // eslint-disable-line
  if (!d) return null;
  return (
    <Modal title="Chi tiết hóa đơn" width={900} onBackdrop={onClose}>
      <div className="tc-det">
        <h3>Thông tin chung</h3>
        <div className="g4">
          <div><span>Tên nhà trọ</span>{d.tenNhaTro}</div><div><span>Địa chỉ nhà trọ</span>{d.diaChi}</div>
          <div><span>Số hóa đơn</span>{d.soHoaDon}</div><div><span>Ngày lập</span>{dmy(d.ngayPhatHanh)}</div>
        </div>
        <h3>Thông tin phòng &amp; khách thuê</h3>
        <div className="g4">
          <div><span>Phòng</span>{d.tenPhong}</div><div><span>Kỳ tiền phòng</span>{dmy(d.ngayBatDau)} – {dmy(d.ngayKetThuc)}</div>
          <div style={{ gridColumn: 'span 2' }}><span>Khách hàng</span>{d.tenKhach}{d.soDienThoai ? ' - ' + d.soDienThoai : ''}</div>
        </div>
        <div className="tc-det-bot">
          <div>
            <h3 style={{ marginTop: 4 }}>Chi tiết các khoản phí</h3>
            <table>
              <thead><tr><th>STT</th><th>NỘI DUNG</th><th className="r">CHỈ SỐ/SỐ LƯỢNG</th><th>ĐƠN VỊ</th><th className="r">ĐƠN GIÁ</th><th className="r">THÀNH TIỀN</th></tr></thead>
              <tbody>{d.chiTiet.map((c, i) => (
                <tr key={i}><td>{i + 1}</td><td>{c.noiDung}</td><td className="r">{tien(c.soLuong)}</td><td>{c.donVi}</td><td className="r">{tien(c.donGia)}</td><td className="r"><b>{tien(c.thanhTien)}</b></td></tr>
              ))}</tbody>
            </table>
            <div className="tc-tong"><span>Tổng cộng</span><span>{tien(d.tongCong)} VNĐ</span></div>
          </div>
          <div>
            <h3 style={{ marginTop: 4 }}>Thông tin bổ sung</h3>
            <div style={{ fontSize: 13 }}>
              <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>Hạn thanh toán</div><div>{dmy(d.hanThanhToan)}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 8 }}>Trạng thái thanh toán</div>
              <div><i className={'pill ' + (d.trangThai === 'Đã thanh toán' ? 'pill-thue' : d.trangThai === 'Quá hạn' ? 'pill-qua' : 'pill-chua')}>{d.trangThai}</i></div>
              <div style={{ color: 'var(--muted)', fontSize: 11.5, margin: '8px 0 4px' }}>Mã QR thanh toán</div>
              {d.maQr && <img src={d.maQr} alt="Mã QR thanh toán" />}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
