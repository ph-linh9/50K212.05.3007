import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Gửi thư: ưu tiên Brevo qua HTTPS (Render gói miễn phí chặn cổng SMTP), nếu không có thì dùng SMTP, nếu không có nữa thì in ra console
async function guiThu({ to, subject, text, html, qr }) {
  const { host, port, user, pass, from } = env.smtp;
  const nguoiGui = process.env.BREVO_SENDER || from || user;
  if (process.env.BREVO_API_KEY) {
    const body = {
      sender: { email: String(nguoiGui).replace(/^.*<|>.*$/g, '').trim(), name: 'Room Rental' },
      to: [{ email: to }], subject,
    };
    if (html) body.htmlContent = html.replace(/<img src="cid:maqr"[^>]*>/, '<i>(Mã QR thanh toán được đính kèm trong email này: qr.png)</i>');
    else body.textContent = text;
    if (qr) body.attachment = [{ name: 'qr.png', content: qr.toString('base64') }];
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return true;
  }
  if (!host) return false;
  const t = nodemailer.createTransport({
    host, port, secure: port === 465, auth: user ? { user, pass } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  await t.sendMail({
    from: nguoiGui, to, subject, text, html,
    attachments: qr ? [{ filename: 'qr.png', content: qr, cid: 'maqr', contentType: 'image/png', contentDisposition: 'inline' }] : [],
  });
  return true;
}
const coCauHinhMail = () => !!(process.env.BREVO_API_KEY || env.smtp.host);

export async function guiMaXacThuc(email, ma) {
  if (!coCauHinhMail()) { console.log(`[MAIL-DEV] Mã xác thực gửi tới ${email}: ${ma}`); return; }
  await guiThu({
    to: email, subject: 'Mã xác thực đặt lại mật khẩu - Room Rental',
    text: `Mã xác thực của bạn là: ${ma}. Mã có hiệu lực trong 10 phút.`,
  });
}

// UC5.5 (quy tắc nghiệp vụ): còn đúng 30 ngày đến hạn -> email đề nghị gia hạn gửi người thuê
export async function guiMailNhacGiaHan(email, soHopDong, ngayHetHan) {
  const noiDung = `Hợp đồng ${soHopDong} của bạn sẽ hết hạn vào ngày ${ngayHetHan} (còn 30 ngày). Nếu có nhu cầu gia hạn, vui lòng liên hệ chủ trọ.`;
  if (!coCauHinhMail()) { console.log(`[MAIL-DEV] Nhắc gia hạn gửi tới ${email}: ${noiDung}`); return; }
  await guiThu({ to: email, subject: `Đề nghị gia hạn hợp đồng ${soHopDong} - Room Rental`, text: noiDung });
}

// ---------- UC8.6 / UC8.8: email hóa đơn + mã QR ----------
const vnd = (n) => Number(n || 0).toLocaleString('de-DE');
const dmy = (s) => String(s || '').split('-').reverse().join('/');
const he = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function noiDungHoaDon(h, nhac) {
  const dong = h.chiTiet.map((c, i) => `<tr><td>${i + 1}</td><td>${he(c.noiDung)}</td><td style="text-align:right">${c.loai === 'dien' || (c.loai === 'khac' && c.chiSoMoi !== null) ? `${vnd(c.soLuong)}` : vnd(c.soLuong)}</td><td>${he(c.donVi)}</td><td style="text-align:right">${vnd(c.donGia)}</td><td style="text-align:right">${vnd(c.thanhTien)}</td></tr>`).join('');
  const dau = nhac ? `<p>Hóa đơn <b>${he(h.soHoaDon)}</b> đã quá hạn thanh toán. Vui lòng thanh toán sớm.</p>` : '';
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">${dau}
<h2 style="color:#1F7A55">Hóa đơn ${he(h.soHoaDon)}</h2>
<p><b>${he(h.tenToaNha)}</b> – ${he(h.diaChi)}<br>Ngày lập: ${dmy(h.ngayPhatHanh)}</p>
<p>Phòng: <b>${he(h.tenPhong)}</b><br>Kỳ tiền phòng: ${dmy(h.ngayBatDau)} – ${dmy(h.ngayKetThuc)}<br>Khách hàng: ${he(h.tenKhach)}${h.soDienThoai ? ' - ' + he(h.soDienThoai) : ''}</p>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;border-color:#ccc"><tr><th>STT</th><th>Nội dung</th><th>Chỉ số/Số lượng</th><th>Đơn vị</th><th>Đơn giá</th><th>Thành tiền</th></tr>${dong}</table>
<p style="font-size:16px"><b>Tổng cộng: ${vnd(h.tongCong)} VNĐ</b></p>
<p>Hạn thanh toán: <b>${dmy(h.hanThanhToan)}</b><br>Trạng thái thanh toán: ${he(h.trangThai)}</p>
<p>Mã QR thanh toán:<br><img src="cid:maqr" width="200" alt="QR"></p></div>`;
}
export async function guiMailHoaDon(email, h, nhac = false) {
  const thang = String(h.ngayBatDau).slice(5, 7);
  const subject = nhac ? `Nhắc thanh toán hóa đơn tháng ${Number(thang)} - Phòng ${h.tenPhong}` : `Hóa đơn ${h.soHoaDon} - Phòng ${h.tenPhong}`;
  if (!coCauHinhMail()) { console.log(`[MAIL-DEV] ${subject} -> ${email} (tổng ${vnd(h.tongCong)} VNĐ, hạn ${dmy(h.hanThanhToan)})`); return; }
  const qr = h.maQr ? Buffer.from(String(h.maQr).split(',')[1], 'base64') : null;
  await guiThu({ to: email, subject, html: noiDungHoaDon(h, nhac), qr });
}