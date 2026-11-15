# Hệ thống quản lý và vận hành nhà trọ

Đồ án môn Phân tích thiết kế hệ thống thông tin, lớp **50K212.05.3007**.

Ứng dụng web giúp **chủ trọ** quản lý nhà trọ, phòng, dịch vụ, người thuê, hợp đồng, hóa đơn và xem báo cáo thống kê. Hệ thống chỉ có một tài khoản dùng chung cho chủ trọ.

## Truy cập hệ thống

- **Web đã triển khai:** https://nha-tro-a26w.onrender.com
- **Tài khoản đăng nhập:** `chutrodemo@gmail.com` / `chutrodemo`

> Hệ thống chạy trên gói miễn phí nên có thể ngủ khi lâu không ai truy cập. Lần mở đầu tiên có thể phải chờ khoảng 50 giây.

## Chức năng

| Mã UC | Chức năng | Màn hình trên web |
|---|---|---|
| UC1 | Đăng nhập | Trang đăng nhập |
| UC1.1 | Quên mật khẩu (xác thực bằng mã gửi qua email) | Liên kết "Quên mật khẩu" |
| UC2 | Quản lý nhà trọ (thêm, xem, sửa, xóa) | Quản lý nhà trọ |
| UC3 | Quản lý phòng trọ (thêm, xem danh sách, xem chi tiết, sửa, xóa, tra cứu) | Quản lý phòng trọ |
| UC4 | Quản lý người thuê (thêm, xem danh sách, xem chi tiết, sửa, xóa, tra cứu, xuất Excel) | Quản lý người thuê |
| UC5 | Quản lý hợp đồng (thêm, xem danh sách, xem chi tiết,, chỉnh sửa, gia hạn, chấm dứt, tra cứu, xuất hợp đồng) | Quản lý hợp đồng |
| UC6 | Quản lý mẫu hợp đồng (thêm, sửa, xóa) | Quản lý mẫu hợp đồng |
| UC7 | Quản lý dịch vụ (thêm, sửa, xóa, xem danh sách, tra cứu) | Quản lý dịch vụ |
| UC8 | Quản lý tài chính (tạo, xem danh sách, xem chi tiết, chỉnh sửa, xóa hóa đơn, xác nhận thanh toán, gửi hóa đơn qua email, nhắc thanh toán quá hạn) | Quản lý tài chính |
| UC9 | Báo cáo (xem, lọc, tra cứu) | Báo cáo |

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Giao diện (frontend) | React 18, Vite, React Router |
| Máy chủ (backend) | Node.js, Express (ES Modules) |
| Cơ sở dữ liệu | PostgreSQL (Neon) |
| Gửi email | Brevo API (khi chạy trên Render) hoặc SMTP (khi chạy trên máy) |
| Mã QR thanh toán | VietQR |
| Triển khai | Render (một dịch vụ phục vụ cả API và giao diện) |

## Cấu trúc thư mục

```
03_Source code
├── backend/          Máy chủ Node.js + Express
│   └── src/          config, controllers, middlewares, routes, services, scripts, utils
├── frontend/         Giao diện React + Vite
│   └── src/          pages, components, services, styles, utils
├── database/         Các file SQL tạo bảng (001 đến 008)
└── README.md
```

## Chạy trên máy

Yêu cầu: Node.js 18 trở lên và một cơ sở dữ liệu PostgreSQL (cài sẵn hoặc dùng chuỗi kết nối Neon).

**1. Backend**

```bash
cd backend
cp .env.example .env      # Windows: copy .env.example .env
```

Mở file `.env` và điền: `DATABASE_URL`, `JWT_SECRET`, `SEED_EMAIL`, `SEED_PASSWORD`. Nếu dùng Neon thì đặt `DB_SSL=true`.

```bash
npm install
npm run db:init           # tạo các bảng và tài khoản chủ trọ
npm run dev               # chạy ở http://localhost:4000
```

**2. Frontend** (mở một cửa sổ terminal khác)

```bash
cd frontend
cp .env.example .env      # Windows: copy .env.example .env
npm install
npm run dev               # chạy ở http://localhost:5173
```

Mở http://localhost:5173 và đăng nhập bằng tài khoản đã đặt ở `SEED_EMAIL` và `SEED_PASSWORD`.

**Gửi email (tùy chọn).** Nếu chưa cấu hình `SMTP_*` hoặc `BREVO_API_KEY` thì hệ thống không gửi email thật. Mã xác thực quên mật khẩu và nội dung hóa đơn được in ra cửa sổ terminal của backend.

## Biến môi trường (backend)

| Biến | Ý nghĩa |
|---|---|
| `PORT` | Cổng chạy backend (mặc định 4000) |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `DB_SSL` | `true` khi dùng Neon hoặc dịch vụ yêu cầu SSL |
| `JWT_SECRET` | Chuỗi bí mật ký phiên đăng nhập |
| `CORS_ORIGIN` | Địa chỉ giao diện được phép gọi API |
| `SEED_EMAIL`, `SEED_PASSWORD` | Tài khoản chủ trọ tạo bởi `npm run db:init` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Gửi email qua SMTP |
| `BREVO_API_KEY`, `BREVO_SENDER` | Gửi email qua Brevo API |

File `.env` chứa thông tin bí mật nên **không** được đưa lên GitHub (đã được chặn trong `.gitignore`).

## Triển khai

Hệ thống chạy trên một dịch vụ Web Service của Render:

- **Build:** cài thư viện, build giao diện (`frontend/dist`).
- **Start:** chạy backend. Backend phục vụ cả API (`/api/...`) lẫn giao diện đã build.
- Mỗi lần đẩy code lên nhánh `main`, Render tự triển khai lại.
- Cơ sở dữ liệu chạy trên Neon; email gửi qua Brevo vì Render chặn cổng SMTP ở gói miễn phí.
