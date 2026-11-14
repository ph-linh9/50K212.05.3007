import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

// Chạy lần lượt các file database/*.sql (đều dùng IF NOT EXISTS nên chạy lại an toàn)
const dir = new URL('../../../database/', import.meta.url);
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  await pool.query(fs.readFileSync(new URL(f, dir), 'utf8'));
  console.log('Đã chạy', f);
}
const { rowCount } = await pool.query('SELECT 1 FROM tai_khoan');
if (!rowCount) {
  await pool.query('INSERT INTO tai_khoan (email, mat_khau) VALUES ($1,$2)',
    [env.seedEmail, await bcrypt.hash(env.seedPassword, 10)]);
  console.log('Đã tạo tài khoản chủ trọ:', env.seedEmail);
} else console.log('Đã có tài khoản, bỏ qua seed.');
await pool.end();
