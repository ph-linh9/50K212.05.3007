import { useEffect, useRef, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import Flash from '../components/Flash.jsx';
import RichEditor from '../components/RichEditor.jsx';
import { hopDongApi, mauHopDongApi, toaNhaApi } from '../services/api.js';
import { congThang, dmy, esc, homNay, tien } from '../utils/hopDong.js';

const RONG = {
  maToaNha: '', maPhong: '', maNguoiThue: '', thoiHanThang: '', ngayBatDau: '', ngayKetThuc: '',
  giaThue: 0, tienCoc: 0, chuKyThanhToan: 1, noiDung: '', hinhAnh: null, dichVu: {}, // dichVu: {maDichVu: chiSo ('' nếu chưa nhập)}
};
const tenTep = (uri) => (uri && (uri.match(/^data:[^;,]*;name=([^;]*);/) || [])[1]) || (uri ? 'Hình ảnh đã chọn' : '');

function Truong({ nhan, batBuoc, loi, children }) {
  return (
    <div className="f-group">
      <label className="f-label">{nhan}{batBuoc ? <b> *</b> : null}</label>
      {children}
      {loi && <p className="f-err">{loi}</p>}
    </div>
  );
}

// Bản nháp nội dung hợp đồng ("Soạn thảo mới") điền sẵn theo thông tin đang chọn
function banNhap({ tenPhong, tenKhach, bd, kt, gia, coc }) {
  return `<p>HỢP ĐỒNG THUÊ PHÒNG</p><p>Hôm nay, chúng tôi gồm:</p><p><b>Bên cho thuê:</b></p><p><b>Bên thuê: ${esc(tenKhach)}</b></p>`
    + `<p><b>Phòng: ${esc(tenPhong)}</b></p><p><b>Thời hạn: từ ${dmy(bd)} đến ${dmy(kt)}</b></p><p><b>Giá thuê: ${tien(gia)} / tháng</b></p>`
    + `<p><b>Tiền cọc: ${tien(coc)}</b></p><p>Các bên cam kết thực hiện đúng các điều khoản đã thỏa thuận.</p>`;
}

// UC5.1 Thêm hợp đồng mới (che = null) và UC5.4 Chỉnh sửa hợp đồng (che = hợp đồng đang sửa)
export default function HopDongFormModal({ token, che, onClose, onSaved, onUnauthorized, onLoiTai, maToaNhaMacDinh }) {
  const sua = !!che;
  const [f, setF] = useState({ ...RONG, ngayBatDau: homNay(), maToaNha: maToaNhaMacDinh || '' });
  const [loi, setLoi] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [dangTai, setDangTai] = useState(true);
  const [toaNhas, setToaNhas] = useState([]);
  const [tc, setTc] = useState({ phong: [], dichVu: [] });
  const [mau, setMau] = useState([]);
  const [maMau, setMaMau] = useState('');
  const [tuDong, setTuDong] = useState(!sua); // nội dung đang là bản nháp tự sinh (chưa bị chủ trọ chỉnh/chọn mẫu)
  const tepRef = useRef();

  useEffect(() => {
    const p = [toaNhaApi.danhSach(token), hopDongApi.tuyChon(token, che?.maHopDong), mauHopDongApi.danhSach(token).catch(() => [])];
    if (sua) p.push(hopDongApi.chiTiet(token, che.maHopDong));
    Promise.all(p).then(([tn, t, m, d]) => {
      setToaNhas(tn); setTc(t); setMau(m);
      if (d) {
        const dv = {}; d.dichVu.forEach((x) => { dv[x.maDichVu] = x.chiSoBanDau === null ? '' : String(x.chiSoBanDau); });
        setF({ ...RONG, maToaNha: d.maToaNha, maPhong: d.maPhong, maNguoiThue: d.maNguoiThue ?? '', thoiHanThang: d.thoiHanThang,
          ngayBatDau: d.ngayBatDau, ngayKetThuc: d.ngayKetThuc, giaThue: d.giaThue, tienCoc: d.tienCoc, chuKyThanhToan: d.chuKyThanhToan,
          noiDung: d.noiDung, hinhAnh: d.hinhAnh, dichVu: dv });
      }
    }).catch((e) => (e.status === 401 ? onUnauthorized() : onLoiTai())).finally(() => setDangTai(false));
  }, []); // eslint-disable-line

  const phongs = tc.phong.filter((p) => String(p.maToaNha) === String(f.maToaNha));
  const phong = tc.phong.find((p) => String(p.maPhong) === String(f.maPhong));
  const khach = phong?.nguoiThue.find((n) => String(n.maNguoiThue) === String(f.maNguoiThue));
  const dichVus = tc.dichVu.filter((d) => d.maToaNha === null || String(d.maToaNha) === String(f.maToaNha));

  // Bản nháp tự cập nhật theo thông tin đang chọn cho đến khi chủ trọ tự chỉnh nội dung hoặc chọn mẫu
  useEffect(() => {
    if (!tuDong || dangTai) return;
    setF((p) => ({ ...p, noiDung: banNhap({ tenPhong: phong?.tenPhong ?? '', tenKhach: khach?.hoTen ?? '', bd: f.ngayBatDau, kt: f.ngayKetThuc, gia: f.giaThue, coc: f.tienCoc }) }));
  }, [tuDong, dangTai, f.maPhong, f.maNguoiThue, f.ngayBatDau, f.ngayKetThuc, f.giaThue, f.tienCoc]); // eslint-disable-line

  const xoaLoi = (...ks) => setLoi((l) => { const n = { ...l }; ks.forEach((k) => delete n[k]); return n; });
  const cls = (k) => 'f-input' + (loi[k] !== undefined ? ' err' : '');

  const doiToaNha = (e) => { setF({ ...f, maToaNha: e.target.value, maPhong: '', maNguoiThue: '', giaThue: 0, tienCoc: 0, dichVu: {} }); xoaLoi('maToaNha', 'maPhong', 'maNguoiThue', 'dichVu'); };
  const doiPhong = (e) => {
    const p = tc.phong.find((x) => String(x.maPhong) === e.target.value);
    setF({ ...f, maPhong: e.target.value, maNguoiThue: p?.nguoiThue.length === 1 ? p.nguoiThue[0].maNguoiThue : '',
      giaThue: p?.giaThue ?? 0, tienCoc: p?.tienCoc ?? 0, chuKyThanhToan: p?.chuKyThanhToan ?? 1 });
    xoaLoi('maPhong', 'maNguoiThue');
  };
  const tinhKetThuc = (bd, n) => (bd && n ? congThang(bd, Number(n)) : '');
  const doiThoiHan = (n) => { setF({ ...f, thoiHanThang: n, ngayKetThuc: tinhKetThuc(f.ngayBatDau, n) || f.ngayKetThuc }); xoaLoi('thoiHanThang', 'ngayKetThuc'); };
  const doiBatDau = (e) => { const bd = e.target.value; setF({ ...f, ngayBatDau: bd, ngayKetThuc: tinhKetThuc(bd, f.thoiHanThang) || f.ngayKetThuc }); xoaLoi('ngayBatDau', 'ngayKetThuc'); };
  const batDichVu = (d, bat) => {
    const dv = { ...f.dichVu };
    if (bat) dv[d.maDichVu] = ''; else delete dv[d.maDichVu];
    setF({ ...f, dichVu: dv }); xoaLoi('dichVu', 'chiSo_' + d.maDichVu);
  };

  async function chonMau(e) {
    const v = e.target.value; setMaMau(v);
    if (!v) { setTuDong(true); return; }
    try {
      const m = await mauHopDongApi.chiTiet(token, v);
      setTuDong(false); setF((p) => ({ ...p, noiDung: m.noiDung })); xoaLoi('noiDung');
    } catch (er) { if (er.status === 401) onUnauthorized(); }
  }
  function chonTep(e) {
    const file = e.target.files[0];
    if (!file || !/^image\/(png|jpe?g)$/.test(file.type)) { e.target.value = ''; return; }
    const rd = new FileReader();
    rd.onload = () => {
      const m = String(rd.result).match(/^data:([^;]+);base64,(.*)$/);
      setF((p) => ({ ...p, hinhAnh: `data:${m[1]};name=${file.name.replace(/[;,]/g, '_')};base64,${m[2]}` })); xoaLoi('hinhAnh');
    };
    rd.readAsDataURL(file);
  }

  async function submit(e) {
    e.preventDefault(); setLoi({}); setBanner(''); setBusy(true);
    const body = { ...f, dichVu: Object.entries(f.dichVu).map(([maDichVu, chiSoBanDau]) => ({ maDichVu: Number(maDichVu), chiSoBanDau })) };
    try {
      const res = sua ? await hopDongApi.sua(token, che.maHopDong, body) : await hopDongApi.tao(token, body);
      onSaved(res, sua ? 'Cập nhật hợp đồng thành công!' : 'Tạo hợp đồng thành công!');
    } catch (er) {
      if (er.status === 401) return onUnauthorized();
      if (er.loi) setLoi(er.loi);
      else setBanner(sua ? 'Không thể cập nhật hợp đồng, vui lòng thử lại sau' : 'Không thể tạo hợp đồng, vui lòng thử lại sau');
    } finally { setBusy(false); }
  }

  return (
    <Modal title={sua ? `Cập nhật hợp đồng #${che.soHopDong}` : 'Tạo hợp đồng mới'} width={1060}>
      <p className="hd-sub">{sua ? 'Chỉnh sửa thông tin hợp đồng thuê phòng' : 'Điền thông tin hợp đồng thuê phòng'}</p>
      <form onSubmit={submit} noValidate>
        {banner && <Flash kieu="loi">{banner}</Flash>}
        <div className="hd-grid">
          <div>
            <div className="f-row">
              <Truong nhan="Tòa nhà" batBuoc loi={loi.maToaNha}>
                <select className={cls('maToaNha') + ' f-select'} value={f.maToaNha} onChange={doiToaNha} disabled={dangTai}>
                  <option value="" hidden>Chọn tòa nhà</option>
                  {toaNhas.map((t) => <option key={t.maToaNha} value={t.maToaNha}>{t.tenToaNha}</option>)}
                </select>
              </Truong>
              <Truong nhan="Phòng" batBuoc loi={loi.maPhong}>
                <select className={cls('maPhong') + ' f-select'} value={f.maPhong} onChange={doiPhong} disabled={dangTai || !f.maToaNha}>
                  <option value="" hidden>Chọn phòng</option>
                  {phongs.map((p) => <option key={p.maPhong} value={p.maPhong}>{p.tenPhong}</option>)}
                </select>
              </Truong>
            </div>
            <Truong nhan="Khách hàng" batBuoc loi={loi.maNguoiThue}>
              <select className={cls('maNguoiThue') + ' f-select'} value={f.maNguoiThue}
                onChange={(e) => { setF({ ...f, maNguoiThue: e.target.value }); xoaLoi('maNguoiThue'); }} disabled={dangTai || !f.maPhong}>
                <option value="" hidden>Chọn khách hàng</option>
                {phong?.nguoiThue.map((n) => <option key={n.maNguoiThue} value={n.maNguoiThue}>{n.hoTen}</option>)}
              </select>
            </Truong>
            <Truong nhan="Thời hạn hợp đồng" batBuoc loi={loi.thoiHanThang}>
              <div className={'hd-radios' + (loi.thoiHanThang !== undefined ? ' err' : '')}>
                {[3, 4, 5, 6].map((n) => (
                  <label key={n}><input type="radio" name="thoiHan" checked={Number(f.thoiHanThang) === n} onChange={() => doiThoiHan(n)} disabled={dangTai} />{n} tháng</label>
                ))}
              </div>
            </Truong>
            <div className="f-row">
              <Truong nhan="Ngày bắt đầu" batBuoc loi={loi.ngayBatDau}>
                <input type="date" className={cls('ngayBatDau')} value={f.ngayBatDau} onChange={doiBatDau} disabled={dangTai} />
              </Truong>
              <Truong nhan="Ngày kết thúc" batBuoc loi={loi.ngayKetThuc}>
                <input type="date" className={cls('ngayKetThuc')} value={f.ngayKetThuc}
                  onChange={(e) => { setF({ ...f, ngayKetThuc: e.target.value }); xoaLoi('ngayKetThuc'); }} disabled={dangTai} />
              </Truong>
            </div>
            <div className="f-row">
              <Truong nhan="Giá thuê (VND)"><input className="f-input ro" value={tien(f.giaThue)} readOnly /></Truong>
              <Truong nhan="Tiền cọc (VND)"><input className="f-input ro" value={tien(f.tienCoc)} readOnly /></Truong>
            </div>
            <Truong nhan="Chu kỳ thanh toán (tháng)" batBuoc loi={loi.chuKyThanhToan}>
              <select className={cls('chuKyThanhToan') + ' f-select'} value={f.chuKyThanhToan}
                onChange={(e) => { setF({ ...f, chuKyThanhToan: e.target.value }); xoaLoi('chuKyThanhToan'); }} disabled={dangTai}>
                {[1, 3, 6, 12].map((n) => <option key={n} value={n}>{n} tháng</option>)}
              </select>
            </Truong>
            <Truong nhan="Dịch vụ" batBuoc loi={loi.dichVu}>
              <div className={'hd-dv' + (loi.dichVu !== undefined ? ' err' : '')}>
                {dichVus.length === 0 && <p className="hd-dv-trong">{f.maToaNha ? 'Chưa có dịch vụ đang hoạt động' : 'Chọn tòa nhà để xem dịch vụ'}</p>}
                {dichVus.map((d) => {
                  const bat = f.dichVu[d.maDichVu] !== undefined;
                  const dong = d.kieuTinhGia === 'Theo đồng hồ';
                  return (
                    <div className="hd-dv-item" key={d.maDichVu}>
                      <div className="hd-dv-top">
                        <div><b>{d.tenDichVu}</b><small>Giá: {tien(d.donGia)} đ · Đơn vị: {d.donViTinh}</small></div>
                        <label className="sw"><input type="checkbox" checked={bat} onChange={(e) => batDichVu(d, e.target.checked)} disabled={dangTai} /><i /></label>
                      </div>
                      {bat && dong && (
                        <div className="hd-dv-cs">
                          <label className="f-label">Chỉ số {d.tenDichVu.toLowerCase()} ban đầu ({d.donViTinh})<b> *</b></label>
                          <input className={cls('chiSo_' + d.maDichVu)} inputMode="decimal" placeholder={`Nhập chỉ số ${d.tenDichVu.toLowerCase()}`} value={f.dichVu[d.maDichVu]}
                            onChange={(e) => { setF({ ...f, dichVu: { ...f.dichVu, [d.maDichVu]: e.target.value.replace(/[^\d.,]/g, '') } }); xoaLoi('chiSo_' + d.maDichVu); }} />
                          {loi['chiSo_' + d.maDichVu] && <p className="f-err">{loi['chiSo_' + d.maDichVu]}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Truong>
            <Truong nhan="Hình ảnh hợp đồng (không bắt buộc)" loi={loi.hinhAnh}>
              <div className={'hd-up' + (loi.hinhAnh !== undefined ? ' err' : '')} onClick={() => tepRef.current.click()}>
                {f.hinhAnh && <img src={f.hinhAnh} alt="" />}
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg> {f.hinhAnh ? tenTep(f.hinhAnh) : 'Tải ảnh hợp đồng lên'}</span>
                <input ref={tepRef} type="file" accept="image/png,image/jpeg" hidden onChange={chonTep} />
              </div>
            </Truong>
          </div>
          <div>
            <Truong nhan="Mẫu hợp đồng">
              <select className="f-input f-select" value={maMau} onChange={chonMau} disabled={dangTai}>
                <option value="">Soạn thảo mới</option>
                {mau.map((m) => <option key={m.maMau} value={m.maMau}>{m.tenMau}</option>)}
              </select>
            </Truong>
            <Truong nhan="Nội dung hợp đồng" batBuoc loi={loi.noiDung}>
              <RichEditor value={f.noiDung} loi={loi.noiDung} disabled={dangTai}
                onChange={(h) => { setTuDong(false); setF((p) => ({ ...p, noiDung: h })); xoaLoi('noiDung'); }} />
            </Truong>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>Hủy</button>
          <button className="btn-fill" disabled={busy || dangTai}>{sua ? 'Cập nhật hợp đồng' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
