const BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');
export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Lỗi hệ thống'), { field: data.field, loi: data.loi, status: res.status });
  return data;
}
export const authApi = {
  dangNhap: (b) => api('/auth/dang-nhap', { method: 'POST', body: b }),
  quenMatKhau: (b) => api('/auth/quen-mat-khau', { method: 'POST', body: b }),
  xacThucMa: (b) => api('/auth/xac-thuc-ma', { method: 'POST', body: b }),
  datLaiMatKhau: (b) => api('/auth/dat-lai-mat-khau', { method: 'POST', body: b }),
  me: (token) => api('/auth/me', { token }),
};

export const toaNhaApi = {
  danhSach: (t) => api('/toa-nha', { token: t }),
  nganHang: (t) => api('/toa-nha/ngan-hang', { token: t }),
  chiTiet: (t, id) => api(`/toa-nha/${id}`, { token: t }),
  tao: (t, b) => api('/toa-nha', { method: 'POST', body: b, token: t }),
  sua: (t, id, b) => api(`/toa-nha/${id}`, { method: 'PUT', body: b, token: t }),
  xoa: (t, id) => api(`/toa-nha/${id}`, { method: 'DELETE', token: t }),
};

export const phongTroApi = {
  danhSach: (t, { tuKhoa = '', maToaNha = '' } = {}) => api(`/phong-tro?tuKhoa=${encodeURIComponent(tuKhoa)}&maToaNha=${maToaNha}`, { token: t }),
  chiTiet: (t, id) => api(`/phong-tro/${id}`, { token: t }),
  tao: (t, b) => api('/phong-tro', { method: 'POST', body: b, token: t }),
  sua: (t, id, b) => api(`/phong-tro/${id}`, { method: 'PUT', body: b, token: t }),
  xoa: (t, id) => api(`/phong-tro/${id}`, { method: 'DELETE', token: t }),
};

export const dichVuApi = {
  danhSach: (t, { tuKhoa = '', maToaNha = '' } = {}) => api(`/dich-vu?tuKhoa=${encodeURIComponent(tuKhoa)}&maToaNha=${maToaNha}`, { token: t }),
  chiTiet: (t, id) => api(`/dich-vu/${id}`, { token: t }),
  tao: (t, b) => api('/dich-vu', { method: 'POST', body: b, token: t }),
  sua: (t, id, b) => api(`/dich-vu/${id}`, { method: 'PUT', body: b, token: t }),
  xoa: (t, id) => api(`/dich-vu/${id}`, { method: 'DELETE', token: t }),
};

export const nguoiThueApi = {
  danhSach: (t, { tuKhoa = '', maToaNha = '' } = {}) => api(`/nguoi-thue?tuKhoa=${encodeURIComponent(tuKhoa)}&maToaNha=${maToaNha}`, { token: t }),
  chiTiet: (t, id) => api(`/nguoi-thue/${id}`, { token: t }),
  tao: (t, b) => api('/nguoi-thue', { method: 'POST', body: b, token: t }),
  sua: (t, id, b) => api(`/nguoi-thue/${id}`, { method: 'PUT', body: b, token: t }),
  xoa: (t, id) => api(`/nguoi-thue/${id}`, { method: 'DELETE', token: t }),
  // UC4.7: tải file Excel
  async xuatExcel(t) {
    const res = await fetch(BASE + '/nguoi-thue/xuat-excel', { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) throw Object.assign(new Error('Xuất thất bại'), { status: res.status });
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: 'danh-sach-nguoi-thue.xlsx' });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  },
};

export const mauHopDongApi = {
  danhSach: (t) => api('/mau-hop-dong', { token: t }),
  chiTiet: (t, id) => api(`/mau-hop-dong/${id}`, { token: t }),
  tao: (t, b) => api('/mau-hop-dong', { method: 'POST', body: b, token: t }),
  sua: (t, id, b) => api(`/mau-hop-dong/${id}`, { method: 'PUT', body: b, token: t }),
  xoa: (t, id) => api(`/mau-hop-dong/${id}`, { method: 'DELETE', token: t }),
};

export const hopDongApi = {
  danhSach: (t, { tuKhoa = '', maToaNha = '' } = {}) => api(`/hop-dong?tuKhoa=${encodeURIComponent(tuKhoa)}&maToaNha=${maToaNha}`, { token: t }),
  tuyChon: (t, maHopDong = '') => api(`/hop-dong/tuy-chon?maHopDong=${maHopDong}`, { token: t }),
  chiTiet: (t, id) => api(`/hop-dong/${id}`, { token: t }),
  tao: (t, b) => api('/hop-dong', { method: 'POST', body: b, token: t }),
  sua: (t, id, b) => api(`/hop-dong/${id}`, { method: 'PUT', body: b, token: t }),
  giaHan: (t, id, b) => api(`/hop-dong/${id}/gia-han`, { method: 'POST', body: b, token: t }),
  chamDut: (t, id) => api(`/hop-dong/${id}/cham-dut`, { method: 'POST', token: t }),
};

export const hoaDonApi = {
  danhSach: (t, { tuKhoa = '', maToaNha = '' } = {}) => api(`/hoa-don?tuKhoa=${encodeURIComponent(tuKhoa)}&maToaNha=${maToaNha}`, { token: t }),
  tuyChon: (t) => api('/hoa-don/tuy-chon', { token: t }),
  chiTiet: (t, id) => api(`/hoa-don/${id}`, { token: t }),
  tao: (t, b) => api('/hoa-don', { method: 'POST', body: b, token: t }),
  sua: (t, id, b) => api(`/hoa-don/${id}`, { method: 'PUT', body: b, token: t }),
  xoa: (t, id) => api(`/hoa-don/${id}`, { method: 'DELETE', token: t }),
  xacNhan: (t, id) => api(`/hoa-don/${id}/xac-nhan-thanh-toan`, { method: 'POST', token: t }),
  guiEmail: (t, id) => api(`/hoa-don/${id}/gui-email`, { method: 'POST', token: t }),
};

export const baoCaoApi = {
  xem: (t, { thang = '', nam = '', maToaNha = '' } = {}) => api(`/bao-cao?thang=${thang}&nam=${nam}&maToaNha=${maToaNha}`, { token: t }),
};
