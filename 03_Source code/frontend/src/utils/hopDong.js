// Định dạng ngày/tiền và tính ngày kết thúc theo thời hạn (BR-UC5-05)
export const dmy = (s) => (s ? String(s).split('-').reverse().join('/') : '');
export const tien = (n) => Number(n || 0).toLocaleString('de-DE');
export const homNay = () => new Date().toLocaleDateString('sv-SE'); // yyyy-mm-dd theo giờ máy

// Cộng n tháng vào ngày yyyy-mm-dd (ngày 31 + 1 tháng -> cuối tháng sau)
export function congThang(iso, n) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const cuoi = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  const dt = new Date(Date.UTC(y, m - 1 + n, Math.min(d, cuoi)));
  return dt.toISOString().slice(0, 10);
}
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
