import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import Flash from '../components/Flash.jsx';
import { hopDongApi } from '../services/api.js';
import { dmy, tien } from '../utils/hopDong.js';

const Khoi = ({ nhan, children }) => (<div className="hd-ct-box"><span className="ct-label">{nhan}</span><div>{children}</div></div>);

// UC5.3 Xem chi tiết hợp đồng (tab "Thông tin & hình ảnh", tab "Nội dung hợp đồng") và UC5.8 Xuất hợp đồng PDF
export default function HopDongChiTietModal({ token, id, onClose, onUnauthorized, onLoi }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('thongtin');
  const [loiPdf, setLoiPdf] = useState('');
  const [dangXuat, setDangXuat] = useState(false);

  useEffect(() => {
    hopDongApi.chiTiet(token, id).then(setD).catch((e) => (e.status === 401 ? onUnauthorized() : onLoi()));
  }, [id]); // eslint-disable-line

  async function taiPdf() {
    setLoiPdf(''); setDangXuat(true);
    let hd;
    try { hd = await hopDongApi.chiTiet(token, id); } // bước 2: truy xuất nội dung đã lưu
    catch (e) { setDangXuat(false); return e.status === 401 ? onUnauthorized() : setLoiPdf('Không thể tải nội dung hợp đồng, vui lòng thử lại sau'); }
    let blob;
    try { // bước 3: tạo file PDF
      const html2pdf = (await import('html2pdf.js')).default;
      const el = document.createElement('div');
      el.className = 'hd-pdf';
      el.style.cssText = 'width:700px;padding:0;font:14px/1.6 "Times New Roman",serif;color:#000;background:#fff';
      el.innerHTML = hd.noiDung;
      blob = await html2pdf().from(el).set({
        margin: [15, 15, 15, 15], image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'] },
      }).outputPdf('blob');
    } catch { setDangXuat(false); return setLoiPdf('Không thể tạo file PDF hợp đồng, vui lòng thử lại sau'); }
    try { // bước 4: cung cấp file cho trình duyệt tải về
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `${hd.soHopDong}.pdf` });
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch { setLoiPdf('Không thể tải file hợp đồng, vui lòng thử lại sau'); }
    setDangXuat(false);
  }

  return (
    <Modal width={560} onBackdrop={onClose}>
      {!d ? <p className="pt-empty">Đang tải…</p> : (
        <>
          <div className="hd-tabs">
            <button className={tab === 'thongtin' ? 'on' : ''} onClick={() => setTab('thongtin')}>Thông tin &amp; hình ảnh</button>
            <button className={tab === 'noidung' ? 'on' : ''} onClick={() => setTab('noidung')}>Nội dung hợp đồng</button>
          </div>
          {tab === 'thongtin' ? (
            <>
              <div className="hd-ct-top">
                <div className="hd-ct-head">
                  <h3>Thông tin hợp đồng {d.soHopDong}</h3>
                  <span className="hd-ct-tags"><i className="pill pill-gia">Thuê: {tien(d.giaThue)} đ</i><i className="pill pill-gia">Cọc: {tien(d.tienCoc)} đ</i></span>
                </div>
                <div className="hd-ct-sub">
                  <i className={'pill ' + (d.trangThai === 'Hoạt động' ? 'pill-thue' : d.trangThai === 'Hết hạn' ? 'pill-het' : 'pill-off')}>{d.trangThai}</i>
                  <i className="pill pill-chuky">Chu kỳ TT: {d.chuKyThanhToan} tháng</i>
                </div>
                <div className="ct-two">
                  <Khoi nhan="Phòng">{d.tenPhong}</Khoi>
                  <Khoi nhan="Tòa nhà">{d.tenToaNha}</Khoi>
                  <Khoi nhan="Thời gian">{dmy(d.ngayBatDau)} → {dmy(d.ngayKetThuc)}</Khoi>
                </div>
              </div>
              <div className="ct-two" style={{ marginTop: 12 }}>
                <div className="hd-ct-card"><b>Khách thuê (1)</b><span className="pill pill-chuky">{d.tenKhachThue}</span></div>
                <div className="hd-ct-card"><b>Dịch vụ ({d.dichVu.length})</b>
                  {d.dichVu.map((x) => (
                    <div key={x.maDichVu}>{x.tenDichVu}{x.chiSoBanDau !== null && <> · chỉ số đầu {x.chiSoBanDau} {x.donViTinh}</>}</div>
                  ))}
                </div>
              </div>
              <div className="hd-ct-img">
                {d.hinhAnh ? <img src={d.hinhAnh} alt="Hình ảnh hợp đồng" /> : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A9A93" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>
                )}
              </div>
            </>
          ) : (
            <>
              {loiPdf && <Flash kieu="loi">{loiPdf}</Flash>}
              <div className="hd-nd-head"><b>Nội dung hợp đồng</b>
                <button className="btn-outline hd-pdf-btn" onClick={taiPdf} disabled={dangXuat}>Tải PDF hợp đồng</button>
              </div>
              <div className="hd-nd" dangerouslySetInnerHTML={{ __html: d.noiDung }} />
            </>
          )}
        </>
      )}
    </Modal>
  );
}
