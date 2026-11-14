// Kiểm tra ảnh base64 (data URI): đúng định dạng cho phép và không vượt dung lượng tối đa.
// Dùng chung cho ảnh tòa nhà, ảnh CCCD, ảnh hợp đồng — tránh lưu blob tùy ý/quá khổ vào cột TEXT.
export function kiemTraAnh(duLieu, { reDinhDang, toiDaMB = 3, tenLoi = 'Ảnh không hợp lệ' } = {}) {
  if (!duLieu) return null;
  const s = String(duLieu);
  if (!reDinhDang.test(s)) return tenLoi;
  const base64 = s.slice(s.indexOf(',') + 1);
  const soByte = (base64.length * 3) / 4;
  if (soByte > toiDaMB * 1024 * 1024) return `Ảnh vượt quá dung lượng cho phép (tối đa ${toiDaMB}MB)`;
  return null;
}
