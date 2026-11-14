// Giới hạn số lần gọi theo IP trong một khoảng thời gian (chống brute-force đăng nhập/mã xác thực).
// Lưu trong bộ nhớ: đủ dùng cho hệ thống một tiến trình, một chủ trọ; không cần Redis/DB riêng.
const bucket = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of bucket) {
    const con = arr.filter((t) => now - t < 30 * 60 * 1000);
    if (con.length) bucket.set(k, con); else bucket.delete(k);
  }
}, 10 * 60 * 1000).unref();

export function gioiHanToc(toiDa, cuaSoMs) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const arr = (bucket.get(key) || []).filter((t) => now - t < cuaSoMs);
    if (arr.length >= toiDa) {
      return res.status(429).json({ message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.' });
    }
    arr.push(now);
    bucket.set(key, arr);
    next();
  };
}
