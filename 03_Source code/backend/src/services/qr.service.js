import QRCode from 'qrcode';

// Mã BIN (NAPAS) của các ngân hàng trong danh sách ngân hàng của hệ thống (BR-UC2-09)
const BIN = {
  Agribank: '970405', BIDV: '970418', VietinBank: '970415', Vietcombank: '970436', Techcombank: '970407',
  'MB Bank': '970422', ACB: '970416', Sacombank: '970403', VPBank: '970432', TPBank: '970423', VIB: '970441',
  HDBank: '970437', SHB: '970443', OCB: '970448', MSB: '970426', SeABank: '970440', Eximbank: '970431',
};
const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
function crc16(s) {
  let c = 0xFFFF;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
// UC8.1 bước 10: tạo QR qua API VietQR (img.vietqr.io); nếu API lỗi hoặc quá thời gian chờ thì dùng QR chuẩn VietQR tự tạo
async function taoQrQuaApi({ bin, soTaiKhoan, soTien, noiDung, tenChuTaiKhoan }) {
  const qs = new URLSearchParams({ amount: String(Math.round(soTien)), addInfo: noiDung });
  if (tenChuTaiKhoan) qs.set('accountName', tenChuTaiKhoan);
  const res = await fetch(`${process.env.VIETQR_API || 'https://img.vietqr.io'}/image/${bin}-${soTaiKhoan}-compact2.png?${qs}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok || !String(res.headers.get('content-type')).startsWith('image/')) throw new Error('API VietQR lỗi');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('API VietQR trả về dữ liệu không phải ảnh PNG'); // chỉ nhận ảnh PNG hợp lệ
  return `data:image/png;base64,${buf.toString('base64')}`;
}
// BR-UC8-07: QR chuẩn VietQR chứa ngân hàng, số tài khoản, số tiền = tổng hóa đơn, nội dung = số hóa đơn
export async function taoMaQr({ nganHang, soTaiKhoan, soTien, noiDung, tenChuTaiKhoan }) {
  const bin = BIN[nganHang];
  if (!bin || !soTaiKhoan) throw new Error('Thiếu thông tin tài khoản ngân hàng');
  try { return await taoQrQuaApi({ bin, soTaiKhoan, soTien, noiDung, tenChuTaiKhoan }); }
  catch (e) { console.warn('[QR] API VietQR không dùng được, dùng QR tự tạo:', e.message); }
  const tk = tlv('00', bin) + tlv('01', String(soTaiKhoan));
  const nganHangNhan = tlv('00', 'A000000727') + tlv('01', tk) + tlv('02', 'QRIBFTTA');
  let p = tlv('00', '01') + tlv('01', '12') + tlv('38', nganHangNhan) + tlv('53', '704')
    + tlv('54', String(Math.round(soTien))) + tlv('58', 'VN') + tlv('62', tlv('08', noiDung)) + '6304';
  p += crc16(p);
  return QRCode.toDataURL(p, { margin: 1, width: 280, errorCorrectionLevel: 'M' });
}
