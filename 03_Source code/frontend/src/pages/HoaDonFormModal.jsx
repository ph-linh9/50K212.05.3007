import React, { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import Flash from '../components/Flash.jsx';
import { hoaDonApi } from '../services/api.js';
import { tien } from '../utils/hopDong.js';

const DON_GIA_NUOC = 50000; // BR-UC8-05
function Truong({ nhan, batBuoc, loi, children }) {
  return (
    <div className="f-group">
      <label className="f-label">{nhan}{batBuoc ? <b> *</b> : null}</label>
      {children}
      {loi && <p className="f-err">{loi}</p>}
    </div>
  );
}
const so = (x) => { const s = String(x ?? '').trim().replace(/[.\s]/g, '').replace(',', '.'); return s !== '' && /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN; };

// UC8.1 Tạo hóa đơn (che = null) và UC8.3 Chỉnh sửa hóa đơn (che = hóa đơn đang sửa)
export default function HoaDonFormModal({ token, che, onClose, onSaved, onUnauthorized, onLoiTai, onKhongCoHopDong }) {
  const sua = !!che;
  const [f, setF] = useState({ maHopDong: '', ngayBatDau: '', ngayKetThuc: '', ngayPhatHanh: '', hanThanhToan: '', tinhNuoc: true, dv: {} });
  const [dsHd, setDsHd] = useState([]);
  const [ct, setCt] = useState(null); // dữ liệu hóa đơn khi sửa
  const [loi, setLoi] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [dangTai, setDangTai] = useState(true);

  useEffect(() => {
    (sua ? hoaDonApi.chiTiet(token, che.maHoaDon) : hoaDonApi.tuyChon(token)).then((r) => {
      if (sua) {
        setCt(r);
        const dv = {}; r.dichVu.filter((d) => d.chon).forEach((d) => { dv[d.maDichVu] = String(d.chiSoMoi ?? ''); });
        setF({ maHopDong: r.maHopDong, ngayBatDau: r.ngayBatDau, ngayKetThuc: r.ngayKetThuc, ngayPhatHanh: r.ngayPhatHanh, hanThanhToan: r.hanThanhToan, tinhNuoc: r.coNuoc, dv });
      } else {
        if (!r.hopDong.length) return onKhongCoHopDong();
        setDsHd(r.hopDong);
      }
    }).catch((e) => (e.status === 401 ? onUnauthorized() : onLoiTai())).finally(() => setDangTai(false));
  }, []); // eslint-disable-line

  const hd = sua ? (ct && { tenPhong: ct.tenPhong, tenToaNha: ct.tenToaNha, giaThue: ct.giaThue, soNguoi: ct.soNguoi, dichVu: ct.dichVu })
    : dsHd.find((h) => String(h.maHopDong) === String(f.maHopDong));
  const cls = (k) => 'f-input' + (loi[k] !== undefined ? ' err' : '');
  const xoaLoi = (...ks) => setLoi((l) => { const n = { ...l }; ks.forEach((k) => delete n[k]); return n; });
  const set = (k) => (e) => { const v = e.target.value; if (/^\d{5,}-/.test(v)) return; setF({ ...f, [k]: v }); xoaLoi(k); };
  const doiHd = (e) => { setF({ ...f, maHopDong: e.target.value, dv: {} }); setLoi({}); };
  const batDv = (d, bat) => {
    const dv = { ...f.dv }; if (bat) dv[d.maDichVu] = ''; else delete dv[d.maDichVu];
    setF({ ...f, dv }); xoaLoi('chiSo_' + d.maDichVu);
  };

  // Bước 6: tự tính tiền phòng, điện, nước, dịch vụ khác, tổng
  const tinh = { phong: hd?.giaThue || 0, dien: 0, nuoc: 0, khac: 0 };
  if (hd) {
    if (f.tinhNuoc) tinh.nuoc = hd.soNguoi * DON_GIA_NUOC;
    for (const d of hd.dichVu) {
      if (f.dv[d.maDichVu] === undefined) continue;
      let t = 0;
      if (d.kieuTinhGia === 'Theo đồng hồ') { const m = so(f.dv[d.maDichVu]); t = Number.isNaN(m) ? 0 : Math.max(0, m - d.chiSoCu) * d.donGia; }
      else t = hd.soNguoi * d.donGia;
      tinh[d.loai === 'dien' ? 'dien' : 'khac'] += Math.round(t);
    }
  }
  const tong = tinh.phong + tinh.dien + tinh.nuoc + tinh.khac;

  async function submit(e) {
    e.preventDefault(); setLoi({}); setBanner(''); setBusy(true);
    const body = { ...f, dichVu: Object.entries(f.dv).map(([maDichVu, chiSoMoi]) => ({ maDichVu: Number(maDichVu), chiSoMoi })) };
    try {
      const res = sua ? await hoaDonApi.sua(token, che.maHoaDon, body) : await hoaDonApi.tao(token, body);
      onSaved(res, sua ? 'Cập nhật hóa đơn thành công!' : 'Tạo hóa đơn thành công!');
    } catch (er) {
      if (er.status === 401) return onUnauthorized();
      if (er.loi) {
        const l = { ...er.loi };
        const ks = ['maHopDong', 'ngayBatDau', 'ngayKetThuc', 'ngayPhatHanh', 'hanThanhToan'].filter((k) => l[k] === '');
        if (er.message) ks.forEach((k) => { l[k] = er.message; });
        setLoi(l);
        if (!Object.keys(l).length || (!ks.length && Object.values(l).some((v) => v === ''))) setBanner(er.message);
      } else if (er.status === 502) setBanner(er.message);
      else setBanner(sua ? 'Cập nhật hóa đơn không thành công. Vui lòng thử lại' : 'Tạo hóa đơn không thành công. Vui lòng thử lại');
    } finally { setBusy(false); }
  }

  const dien = hd?.dichVu.filter((d) => d.loai === 'dien') || [];
  const khac = hd?.dichVu.filter((d) => d.loai === 'khac') || [];
  const the = (d) => {
    const bat = f.dv[d.maDichVu] !== undefined;
    return (
      <div className={'tc-dv-item' + (loi['chiSo_' + d.maDichVu] ? ' err' : '')}>
        <div className="tc-dv-top"><b>{d.tenDichVu}</b><span>{tien(d.donGia)} đ</span></div>
        <div className="tc-dv-bot">
          {d.kieuTinhGia === 'Theo đồng hồ'
            ? <span>Chỉ số mới <input value={f.dv[d.maDichVu] ?? ''} disabled={!bat} onChange={(e) => { setF({ ...f, dv: { ...f.dv, [d.maDichVu]: e.target.value } }); xoaLoi('chiSo_' + d.maDichVu); }} /> <small>(cũ: {tien(d.chiSoCu)})</small></span>
            : <span>Số người: {hd.soNguoi}</span>}
          <label className="sw"><input type="checkbox" checked={bat} onChange={(e) => batDv(d, e.target.checked)} /><i /></label>
        </div>
        {loi['chiSo_' + d.maDichVu] && <p className="f-err" style={{ margin: 0 }}>{loi['chiSo_' + d.maDichVu]}</p>}
      </div>
    );
  };

  return (
    <Modal title={sua ? 'Chỉnh sửa hóa đơn' : 'Tạo hóa đơn'} width={720}>
      <form onSubmit={submit} noValidate>
        {banner && <Flash kieu="loi">{banner}</Flash>}
        <Truong nhan="Hợp đồng thuê" batBuoc loi={typeof loi.maHopDong === 'string' && loi.maHopDong ? loi.maHopDong : null}>
          {sua
            ? <input className="f-input ro" readOnly value={hd ? `${hd.tenToaNha} – ${hd.tenPhong} (${ct.soHopDong})` : ''} />
            : (
              <select className={cls('maHopDong') + ' f-select'} value={f.maHopDong} onChange={doiHd} disabled={dangTai}>
                <option value=""hidden>Chọn hợp đồng thuê</option>
                {dsHd.map((h) => <option key={h.maHopDong} value={h.maHopDong}>{h.tenToaNha} – {h.tenPhong} – {h.tenKhach} ({h.soHopDong})</option>)}
              </select>
            )}
        </Truong>
        <div className="f-row">
          <Truong nhan="Kỳ tiền phòng: ngày bắt đầu" batBuoc loi={loi.ngayBatDau}><input type="date" className={cls('ngayBatDau')} value={f.ngayBatDau} onChange={set('ngayBatDau')} /></Truong>
          <Truong nhan="Kỳ tiền phòng: ngày kết thúc" batBuoc loi={loi.ngayKetThuc}><input type="date" className={cls('ngayKetThuc')} value={f.ngayKetThuc} onChange={set('ngayKetThuc')} /></Truong>
        </div>
        <div className="f-row">
          <Truong nhan="Ngày phát hành" batBuoc loi={loi.ngayPhatHanh}><input type="date" className={cls('ngayPhatHanh')} value={f.ngayPhatHanh} onChange={set('ngayPhatHanh')} /></Truong>
          <Truong nhan="Hạn thanh toán" batBuoc loi={loi.hanThanhToan}><input type="date" className={cls('hanThanhToan')} value={f.hanThanhToan} onChange={set('hanThanhToan')} /></Truong>
        </div>
        <div className="f-group">
          <label className="f-label">Dịch vụ bổ sung</label>
          {hd ? (
            <div className="tc-dv">
              {dien.map((d) => <React.Fragment key={d.maDichVu}>{the(d)}</React.Fragment>)}
              <div className="tc-dv-item">
                <div className="tc-dv-top"><b>Nước</b><span>{tien(DON_GIA_NUOC)} đ</span></div>
                <div className="tc-dv-bot"><span>Số người: {hd.soNguoi}</span>
                  <label className="sw"><input type="checkbox" checked={f.tinhNuoc} onChange={(e) => setF({ ...f, tinhNuoc: e.target.checked })} /><i /></label></div>
              </div>
              {khac.length ? khac.map((d) => <React.Fragment key={d.maDichVu}>{the(d)}</React.Fragment>)
                : <div className="tc-dv-item"><div className="tc-dv-top"><b>Dịch vụ khác (nếu có)</b><span>0 đ</span></div><div className="tc-dv-bot"><span /><label className="sw"><input type="checkbox" disabled /><i /></label></div></div>}
            </div>
          ) : <p className="hd-dv-trong">Chọn hợp đồng thuê để hiển thị dịch vụ.</p>}
        </div>
        <div className="f-group"><label className="f-label">Trạng thái thanh toán</label><div><i className="pill pill-chua">Chưa thanh toán</i></div></div>
        <div className="f-group"><label className="f-label">Chi tiết thanh toán</label>
          <div className="tc-sum">
            <div>Tiền phòng<b>{tien(tinh.phong)} VNĐ</b></div><div>Tiền điện<b>{tien(tinh.dien)} VNĐ</b></div>
            <div>Tiền nước<b>{tien(tinh.nuoc)} VNĐ</b></div><div>Dịch vụ khác<b>{tinh.khac ? tien(tinh.khac) + ' VNĐ' : ''}</b></div>
            <div className="tong">Tổng tiền<b>{tien(tong)} VNĐ</b></div>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>Hủy</button>
          <button className="btn-fill" disabled={busy || dangTai}>{sua ? 'Lưu' : 'Tạo hóa đơn'}</button>
        </div>
      </form>
    </Modal>
  );
}
