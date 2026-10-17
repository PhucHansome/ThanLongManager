# Thiết Kế Kiến Trúc & Kế Hoạch Triển Khai: Web App Quản Lý Thần Long Mobile Auto Pro

> Bản tài liệu kiến trúc toàn diện giải quyết 6 bước đánh giá kỹ thuật trước khi triển khai code cho hệ thống quản lý giấy phép (license) và thanh toán tự động VietQR / Sepay.vn cho tool Thần Long Mobile Auto Pro.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Các quyết định cốt lõi đã được xác nhận:
> 1. **Cổng Webhook**: Tích hợp **Sepay.vn** sử dụng API Key & Webhook Signature Token.
> 2. **Phong cách giao diện**: **Modern Dark SaaS** tinh gọn, chuyên nghiệp, tối giản, tuân thủ kỷ luật typography & không dùng badge/pill rườm rà.
> 3. **Quản lý phiên đăng nhập (Session Auth)**: **JWT Token** lưu tại `LocalStorage`, truyền qua `Authorization: Bearer <token>` trên mỗi request API route.

---

## Bước 1: Xác Nhận Yêu Cầu & Bối Cảnh Hệ Thống

### 1.1. Hiện trạng & Ràng buộc
- **Desktop App (Python/PyQt5)**: Đang chạy trên Windows, kết nối trực tiếp hoặc qua RPC tới Supabase Postgres. **Giữ nguyên 100%, không thay đổi cấu trúc bảng hiện tại**.
- **Cơ sở dữ liệu Supabase (PostgreSQL)**:
  - `users`: Tài khoản, password hash bcrypt, role (`user`/`admin`), status (`1`: active, `0`: locked), `delflag`.
  - `licenses`: Khóa bản quyền gắn với `user_id`, ngày bắt đầu (`start_date`), ngày kết thúc (`end_date`), trạng thái.
  - `user_machine_mappings`: Định danh máy tính (HWID/machine_id, IP) kết nối tool.
  - `login_logs`: Nhật ký đăng nhập kèm số lần thử (đã dedup).
  - `pricing`: Bảng cấu hình gói gia hạn (`months`, `price`, `discount_pct`, `label`, `is_active`).
  - `payment_orders`: Đơn gia hạn (`order_code`, `user_id`, `months`, `amount`, `status`, `qr_url`, `expires_at`, `license_before`, `license_after`...).
  - `bank_transactions`: Ghi nhận biến động số dư từ Sepay/ngân hàng.
  - `revenue_ledger`: Sổ cái tài chính (`gross`, `commission_pct`, `commission_amt`, `net_amount`, `month`, `year`).

### 1.2. Phân hệ 2 Role
1. **Role User**:
   - Dashboard thông tin tài khoản: Tên, email, trạng thái, ngày hết hạn license, đếm ngược số ngày còn lại, IP & thời điểm login gần nhất.
   - Đổi mật khẩu qua RPC `fn_change_password` (kiểm tra mật khẩu cũ, mật khẩu mới >= 6 ký tự).
   - Gia hạn license: Chọn gói (1/3/6/12 tháng), xem trước ngày hết hạn mới (còn hạn: cộng dồn từ `end_date`; hết hạn: tính từ ngày hiện tại), tạo đơn QR VietQR, đếm ngược 15 phút, tự động poll trạng thái thanh toán mỗi 5s và thông báo thành công tức thì.
2. **Role Admin**:
   - Thống kê doanh thu thực tế (đã trừ phí hoa hồng sàn/gateway), số lượng user theo trạng thái, số đơn hàng.
   - Biểu đồ doanh thu 12 tháng gần nhất, bảng xếp hạng Top 10 khách hàng chi tiêu nhiều nhất.
   - Quản lý danh sách User: Tìm kiếm, lọc, tạo tài khoản mới (`fn_create_account`), sửa thông tin, gia hạn thủ công (`fn_extend_license`), khóa/mở khóa kèm lý do, xóa mềm (`delflag=true`).
   - Quản lý Đơn hàng: Lọc trạng thái (`pending`, `paid`, `expired`, `cancelled`), tra cứu mã giao dịch ngân hàng.
   - Quản lý Sổ cái doanh thu: Xem chi tiết gross/commission/net, lọc theo tháng/năm, xuất báo cáo CSV.

---

## Bước 2: Đề Xuất Cấu Trúc Thư Mục Project Next.js 14

Dự án áp dụng Next.js 14 App Router kết hợp TypeScript, TailwindCSS và kiến trúc phân lớp sạch (Clean Layered Architecture):

```
tlbb-admin-web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                 # Trang đăng nhập cho cả User & Admin
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── user/
│   │   │   ├── page.tsx                 # Trang chủ User: thông tin bản quyền & máy
│   │   │   └── renew/
│   │   │       └── page.tsx             # Trang/Modal tạo đơn & thanh toán QR
│   │   ├── admin/
│   │   │   ├── page.tsx                 # Dashboard số liệu, biểu đồ, Top 10
│   │   │   ├── users/
│   │   │   │   └── page.tsx             # Quản lý User (CRUD, gia hạn, khoá)
│   │   │   ├── orders/
│   │   │   │   └── page.tsx             # Quản lý lịch sử đơn hàng thanh toán
│   │   │   └── revenue/
│   │   │       └── page.tsx             # Sổ cái doanh thu & Export CSV
│   │   └── layout.tsx                   # Layout chung: Sidebar + Header + Auth Guard
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts           # POST: Xác thực qua fn_login_v2, sinh JWT
│   │   │   ├── me/route.ts              # GET: Lấy thông tin user hiện tại
│   │   │   └── change-password/route.ts # POST: Gọi fn_change_password
│   │   ├── pricing/route.ts             # GET: Lấy danh sách gói cước gia hạn
│   │   ├── orders/
│   │   │   ├── create/route.ts          # POST: Tạo đơn gia hạn, gọi fn_create_renewal_order
│   │   │   └── [orderCode]/
│   │   │       └── status/route.ts      # GET: Polling kiểm tra trạng thái đơn hàng
│   │   ├── webhook/
│   │   │   └── sepay/route.ts           # POST: Webhook nhận tiền từ Sepay.vn
│   │   └── admin/
│   │       ├── stats/route.ts           # GET: Số liệu dashboard thống kê
│   │       ├── users/
│   │       │   ├── route.ts             # GET: Danh sách user (phân trang), POST: Thêm mới
│   │       │   └── [id]/
│   │       │       ├── route.ts         # PATCH: Sửa user, DELETE: Xoá mềm
│   │       │       ├── status/route.ts  # PATCH: Khoá / Mở khoá
│   │       │       └── extend/route.ts  # POST: Gia hạn license thủ công
│   │       ├── orders/route.ts          # GET: Danh sách đơn hàng
│   │       └── revenue/
│   │           ├── route.ts             # GET: Sổ cái doanh thu
│   │           └── export/route.ts      # GET: Xuất dữ liệu CSV
│   ├── globals.css                      # Tailwind v4/v3, CSS variables tông Slate/Neutral
│   └── layout.tsx                       # Root layout (Font, Theme provider, Toaster)
├── components/
│   ├── ui/                              # Primitives (Button, Modal, Input, Table...)
│   ├── common/
│   │   ├── Navbar.tsx                   # Header tối giản chuẩn Top Bar Contract
│   │   ├── Sidebar.tsx                  # Menu điều hướng cho User / Admin
│   │   └── ConfirmDialog.tsx            # Popup xác nhận chung
│   ├── user/
│   │   ├── LicenseStatusCard.tsx        # Thẻ thông tin hạn dùng & đếm ngày
│   │   ├── ChangePasswordModal.tsx      # Popup đổi mật khẩu
│   │   ├── RenewalModal.tsx             # Popup chọn gói, tính ngày, preview giá
│   │   └── QRPaymentModal.tsx           # VietQR, countdown 15p, auto-polling
│   └── admin/
│       ├── StatWidget.tsx               # Card chỉ số KPI doanh thu, user
│       ├── RevenueChart.tsx             # Biểu đồ doanh thu 12 tháng gần nhất
│       ├── UserTable.tsx                # Bảng người dùng có filter, search, phân trang
│       ├── UserFormModal.tsx            # Modal tạo / sửa thông tin tài khoản
│       ├── AdminExtendModal.tsx         # Modal admin gia hạn nhanh cho user
│       └── OrderFilterBar.tsx           # Bộ lọc trạng thái đơn hàng
├── hooks/
│   ├── useAuth.ts                       # Hook xác thực, quyền hạn & logout
│   ├── usePolling.ts                    # Hook polling mỗi 5 giây có tự hủy
│   └── useCountdown.ts                  # Hook đếm ngược 15 phút
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # Supabase anon client
│   │   └── server.ts                    # Supabase admin client (Service Role Key)
│   ├── auth/
│   │   ├── jwt.ts                       # Ký và verify JWT token
│   │   └── middleware.ts                # Helper kiểm tra token và quyền (RBAC)
│   ├── vietqr.ts                        # Generator URL VietQR chuẩn
│   └── utils.ts                         # Định dạng tiền tệ VND, định dạng ngày tháng
├── types/
│   ├── database.ts                      # Supabase TypeScript schema types
│   ├── auth.ts                          # JWT payload, User session
│   └── payment.ts                       # Sepay payload, Order, Pricing
├── middleware.ts                        # Next.js Edge Middleware bảo vệ route
├── tailwind.config.ts
└── tsconfig.json
```

---

## Bước 3: Danh Sách & Đặc Tả Tất Cả Các Hàm RPC Supabase

### 3.1. Các hàm RPC đã có sẵn (Cần xác thực & hoàn thiện tham số)
1. `fn_login_v2(p_username text, p_password text, p_ip text, p_machine_id text)`
   - **Input**: `p_username` (text), `p_password` (text), `p_ip` (text), `p_machine_id` (text, tùy chọn trên web).
   - **Output**: JSON object `{ status: boolean, message: text, user: { id, username, full_name, email, role, status, locked_reason }, license: { start_date, end_date, days_left, status } }`.
   - **Logic**: Kiểm tra tồn tại và `delflag = false`; dùng `crypt(p_password, password_hash) == password_hash`; kiểm tra tài khoản bị khóa (`status = 0`); cập nhật `last_login_at`, `last_login_ip`; ghi log vào `login_logs` (tăng `attempt_count`).
2. `fn_change_password(p_username text, p_old_pass text, p_new_pass text)`
   - **Input**: `p_username` (text), `p_old_pass` (text), `p_new_pass` (text).
   - **Output**: JSON object `{ status: boolean, message: text }`.
   - **Logic**: So khớp hash mật khẩu cũ; nếu khớp thì sinh hash mới bằng `crypt(p_new_pass, gen_salt('bf', 10))` và update `users.password_hash`, `updtime = now()`.
3. `fn_get_my_license(p_user_id bigint / uuid)`
   - **Input**: `p_user_id`.
   - **Output**: JSON object `{ license_id, start_date, end_date, days_left, is_expired, status }`.
   - **Logic**: Truy vấn bảng `licenses` của user; tính `days_left = GREATEST(0, (end_date::date - CURRENT_DATE))`; xác định `is_expired = (end_date < CURRENT_TIMESTAMP)`.
4. `fn_create_account(p_username text, p_password text, p_full_name text, p_email text, p_role text, p_initial_months int)`
   - **Input**: Thông tin đăng ký và số tháng bản quyền ban đầu.
   - **Output**: JSON `{ status: boolean, user_id: ..., message: text }`.
   - **Logic**: Kiểm tra trùng username/email; insert `users`; insert `licenses` với `start_date = now()`, `end_date = now() + (p_initial_months || ' month')::interval`.
5. `fn_extend_license(p_user_id bigint / uuid, p_months int, p_note text)`
   - **Input**: `p_user_id`, `p_months`, `p_note`.
   - **Output**: JSON `{ status: boolean, new_end_date: timestamptz, message: text }`.
   - **Logic**: Áp dụng quy tắc 2 trường hợp (nếu `end_date >= now()` thì cộng dồn từ `end_date`; ngược lại lấy `now() + p_months`).

### 3.2. Các hàm RPC CẦN BỔ SUNG MỚI (Quan trọng)

#### A. `fn_create_renewal_order(p_user_id bigint/uuid, p_months int)`
- **Input**: `p_user_id`, `p_months` (1, 3, 6, hoặc 12).
- **Output**: JSON `{ status: boolean, order_code: text, amount: numeric, months: int, qr_url: text, expires_at: timestamptz, license_before: timestamptz, license_after: timestamptz }`.
- **Mô tả logic**:
  1. Kiểm tra gói tháng `p_months` trong bảng `pricing` với `is_active = true`. Lấy số tiền `price`.
  2. Lấy `end_date` hiện tại từ `licenses` của `p_user_id`:
     - Nếu `end_date >= CURRENT_TIMESTAMP`: `license_after = end_date + (p_months || ' month')::interval`.
     - Nếu `end_date < CURRENT_TIMESTAMP` hoặc chưa có: `license_after = CURRENT_TIMESTAMP + (p_months || ' month')::interval`.
  3. Sinh mã `order_code` duy nhất: tiền tố `TLBB` + chuỗi ngẫu nhiên 6 ký tự số/chữ (Ví dụ: `TLBB839201`).
  4. Tạo URL VietQR: `https://img.vietqr.io/image/{ADMIN_BANK}-{ADMIN_ACCOUNT}-compact2.png?amount={price}&addInfo={order_code}&accountName={ADMIN_NAME}`.
  5. Đặt `expires_at = CURRENT_TIMESTAMP + INTERVAL '15 minutes'`.
  6. Insert bản ghi vào `payment_orders` với `status = 'pending'`.
  7. Trả về thông tin đầy đủ để giao diện hiển thị cho người dùng.

#### B. `fn_confirm_payment(p_order_code text, p_bank_txn_id text, p_amount numeric, p_description text, p_raw_payload jsonb)`
- **Input**: Các thông tin do Webhook gửi sang.
- **Output**: JSON `{ status: boolean, code: text, message: text, order_id: bigint/uuid }`.
- **Mô tả logic (Chống Race Condition & Transaction An toàn)**:
  1. **Lock hàng để chống đồng thời**:
     `SELECT * FROM payment_orders WHERE order_code = p_order_code FOR UPDATE;`
  2. **Kiểm tra trạng thái**:
     - Nếu đơn hàng không tồn tại: Ghi vào `bank_transactions` trạng thái `unmatched` và trả lỗi.
     - Nếu đơn hàng đã có `status = 'paid'`: Đã thanh toán trước đó (idempotent), trả thành công ngay mà không xử lý lại.
     - Nếu `expires_at < CURRENT_TIMESTAMP`: Trả lỗi đơn hàng quá hạn (chuyển `status = 'expired'`).
     - Nếu `p_amount < order.amount`: Trả lỗi số tiền không đủ (đánh dấu `underpaid`).
  3. **Dedup giao dịch ngân hàng**:
     - Insert vào `bank_transactions (bank_txn_id, amount, description, raw_payload, created_at)`. Nếu vi phạm khóa chính/unique `bank_txn_id`, rollback hoặc bỏ qua.
  4. **Cập nhật đơn hàng**:
     - `UPDATE payment_orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP, bank_txn_id = p_bank_txn_id WHERE order_code = p_order_code;`
  5. **Gia hạn license**:
     - `UPDATE licenses SET end_date = order.license_after, status = 1, updtime = CURRENT_TIMESTAMP WHERE user_id = order.user_id;`
  6. **Ghi sổ cái doanh thu (`revenue_ledger`)**:
     - Lấy cấu hình `%` hoa hồng (ví dụ `commission_pct = 0.5%` hoặc `0.0%`).
     - Tính `commission_amt = ROUND(p_amount * commission_pct / 100, 2)`.
     - Tính `net_amount = p_amount - commission_amt`.
     - Insert vào `revenue_ledger (order_id, gross, commission_pct, commission_amt, net_amount, month, year, created_at)`.
  7. Trả về kết quả thành công (`status = true`).

#### C. `fn_admin_get_dashboard_stats()`
- **Input**: Không.
- **Output**: JSON chứa:
  - `revenue_this_month`: Tổng `net_amount` trong tháng hiện tại từ `revenue_ledger`.
  - `revenue_this_year`: Tổng `net_amount` trong năm hiện tại.
  - `users_count`: `{ total, active, locked, expired }`.
  - `orders_count`: `{ pending_this_month, paid_this_month, total_this_month }`.
  - `monthly_revenue_12m`: Mảng 12 tháng gần nhất `[{ month_label: 'T05/26', gross: ..., net: ... }]`.
  - `top_10_spenders`: Danh sách 10 user chi tiêu nhiều nhất `[{ username, full_name, total_spent, orders_count }]`.

#### D. `fn_admin_list_users(p_search text, p_status int, p_role text, p_page int, p_limit int)`
- **Input**: Bộ lọc tìm kiếm theo username/email, trạng thái (`1`/`0`/`-1`), vai trò (`admin`/`user`), phân trang.
- **Output**: JSON `{ total_rows: int, page: int, limit: int, users: [...] }` kèm thông tin `licenses` (`end_date`, `days_left`).

#### E. `fn_admin_set_user_status(p_user_id bigint/uuid, p_status int, p_locked_reason text)`
- **Input**: ID user, trạng thái mới (`1`: mở, `0`: khóa), lý do khóa.
- **Output**: JSON `{ status: boolean, message: text }`.

#### F. `fn_admin_soft_delete_user(p_user_id bigint/uuid)`
- **Input**: ID user.
- **Output**: JSON `{ status: boolean, message: text }`.
- **Logic**: Set `users.delflag = true`, `licenses.delflag = true`, `updtime = now()`.

---

## Bước 4: Danh Sách Tất Cả API Routes Ở Next.js 14

| Phương thức | Endpoint | Phân quyền | Mục đích & Logic |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Gọi RPC `fn_login_v2`. Nếu thành công, sinh JWT Token chứa `{ userId, username, role }` có hạn 7 ngày. Trả về `{ token, user }`. |
| `GET` | `/api/auth/me` | User / Admin | Đọc `Authorization: Bearer <token>`, giải mã JWT, lấy thông tin license mới nhất từ DB. |
| `POST` | `/api/auth/change-password` | User / Admin | Đọc token, validate mật khẩu >= 6 ký tự, gọi `fn_change_password`. |
| `GET` | `/api/pricing` | Public / Auth | Truy vấn bảng `pricing` với `is_active = true`, sắp xếp theo `months`. |
| `POST` | `/api/orders/create` | User / Admin | Đọc token, nhận `{ months }`, gọi `fn_create_renewal_order`, trả URL VietQR & `order_code`. |
| `GET` | `/api/orders/[orderCode]/status` | User / Admin | Polling nhẹ: Đọc trạng thái đơn hàng từ `payment_orders`. |
| `POST` | `/api/webhook/sepay` | Public (Secret) | **Cổng nhận tiền**: Verify `Authorization: Apikey <SEPAY_API_KEY>` trong headers, trích xuất `order_code` từ chuỗi mô tả, gọi `fn_confirm_payment`. |
| `GET` | `/api/admin/stats` | Admin only | Kiểm tra role admin, gọi `fn_admin_get_dashboard_stats`. |
| `GET` | `/api/admin/users` | Admin only | Lấy danh sách users kèm phân trang, tìm kiếm qua `fn_admin_list_users`. |
| `POST` | `/api/admin/users` | Admin only | Tạo tài khoản mới bằng cách gọi `fn_create_account`. |
| `PATCH` | `/api/admin/users/[id]` | Admin only | Cập nhật `full_name`, `email`, `role`, `note`. |
| `PATCH` | `/api/admin/users/[id]/status` | Admin only | Khóa/Mở khóa tài khoản qua `fn_admin_set_user_status`. |
| `POST` | `/api/admin/users/[id]/extend` | Admin only | Gia hạn thủ công license cho user qua `fn_extend_license`. |
| `DELETE` | `/api/admin/users/[id]` | Admin only | Xóa mềm tài khoản qua `fn_admin_soft_delete_user`. |
| `GET` | `/api/admin/orders` | Admin only | Lấy danh sách `payment_orders` có filter trạng thái, ngày tạo. |
| `GET` | `/api/admin/revenue` | Admin only | Lấy dữ liệu sổ cái tài chính từ `revenue_ledger`. |
| `GET` | `/api/admin/revenue/export` | Admin only | Stream file CSV doanh thu theo tháng/năm cho Admin tải về. |

---

## Bước 5: Sơ Đồ Luồng Thanh Toán QR (ASCII Sequence Diagram)

```
┌──────────┐          ┌──────────────┐         ┌──────────────┐        ┌─────────────┐        ┌──────────────┐
│   User   │          │  Next.js Web │         │   Supabase   │        │   Ngân Hàng │        │   Sepay.vn   │
│ (Client) │          │ (App Router) │         │ (Postgres)   │        │   & VietQR  │        │  (Gateway)   │
└────┬─────┘          └──────┬───────┘         └──────┬───────┘        └──────┬──────┘        └──────┬───────┘
     │                       │                        │                       │                      │
     │ 1. Chọn gói & Xác nhận│                        │                       │                      │
     ├──────────────────────>│                        │                       │                      │
     │                       │ 2. Gọi fn_create_order │                       │                      │
     │                       ├───────────────────────>│                       │                      │
     │                       │                        │- Sinh order_code      │                      │
     │                       │                        │- Tính new_end_date    │                      │
     │                       │                        │- Tạo link VietQR      │                      │
     │                       │<───────────────────────┤- Insert payment_orders│                      │
     │ 3. Nhận QR + Mã Đơn   │   Trả QR URL & mã đơn  │  (status='pending')   │                      │
     │<──────────────────────┤                        │                       │                      │
     │                       │                        │                       │                      │
     │ 4. Quét mã VietQR     │                        │                       │                      │
     │    (App Ngân Hàng)    │                        │                       │                      │
     ├───────────────────────────────────────────────────────────────────────>│                      │
     │    Nội dung: TLBB839201                        │                       │                      │
     │    Số tiền: 200,000đ                           │                       │                      │
     │                       │                        │                       │ 5. Tiền vào TK       │
     │                       │                        │                       │    biến động số dư   │
     │                       │                        │                       ├─────────────────────>│
     │                       │                        │                       │                      │
     │ 6. Polling mỗi 5 giây │                        │                       │                      │ 7. POST Webhook
     ├──────────────────────>│ 8. Kiểm tra status     │                       │                      │    kèm API Key &
     │    /orders/status     ├───────────────────────>│                       │                      │    payload JSON
     │<──────────────────────┤<───────────────────────┤                       │                      │
     │    Status='pending'   │                        │                       │                      │
     │                       │ 9. POST /api/webhook/sepay <──────────────────────────────────────────┤
     │                       │    - Kiểm tra Secret/API Key                   │                      │
     │                       │    - Trích xuất order_code từ description      │                      │
     │                       │                        │                       │                      │
     │                       │ 10. fn_confirm_payment │                       │                      │
     │                       ├───────────────────────>│                       │                      │
     │                       │                        │- SELECT FOR UPDATE    │                      │
     │                       │                        │- Dedup bank_txn_id    │                      │
     │                       │                        │- So khớp số tiền      │                      │
     │                       │                        │- Update order = paid  │                      │
     │                       │                        │- Update license end   │                      │
     │                       │                        │- Ghi revenue_ledger   │                      │
     │                       │<───────────────────────┤                       │                      │
     │                       │ 11. Trả 200 OK         │                       │                      │
     │                       ├──────────────────────────────────────────────────────────────────────>│
     │                       │                        │                       │                      │
     │ 12. Polling kế tiếp   │                        │                       │                      │
     ├──────────────────────>│ 13. Query status       │                       │                      │
     │                       ├───────────────────────>│                       │                      │
     │                       │<───────────────────────┤                       │                      │
     │ 14. Status='paid'     │   Status='paid'        │                       │                      │
     │<──────────────────────┤                        │                       │                      │
     │                       │                        │                       │                      │
     │ 15. Hiển thị Popup:   │                        │                       │                      │
     │ "Thanh toán thành công│                        │                       │                      │
     │  Hạn mới: dd/mm/yyyy" │                        │                       │                      │
     │                       │                        │                       │                      │
```

---

## Bước 6: Phân Tích Các Rủi Ro Bảo Mật & Giải Pháp Kỹ Thuật

| # | Nguy Cơ Tiềm Ẩn | Bản Chất Kỹ Thuật | Giải Pháp Xử Lý Triệt Để |
| :--- | :--- | :--- | :--- |
| **1** | **Race Condition / Concurrency** | Nhiều webhook gửi đồng thời hoặc user spam request gây cộng dồn license 2 lần. | Áp dụng khóa bi quan `SELECT ... FOR UPDATE` trên dòng `payment_orders`. Kiểm tra nếu `status = 'paid'` thì dừng ngay lập tức. |
| **2** | **Replay Attack (Tấn công gửi lại)** | Kẻ xấu bắt chước request webhook cũ để kích hoạt lại đơn hàng. | Sử dụng ràng buộc duy nhất `UNIQUE(bank_txn_id)` trên bảng `bank_transactions`. Nếu mã giao dịch ngân hàng đã tồn tại, RPC từ chối xử lý. |
| **3** | **Giả mạo Webhook (Fake Request)** | Kẻ tấn công tự gửi POST request tới `/api/webhook/sepay` giả lập nạp tiền. | Bắt buộc verify `Authorization: Apikey <SEPAY_SECRET>` được cấu hình trong biến môi trường `.env`. Nếu sai header, reject `401 Unauthorized` ngay lập tức. |
| **4** | **Sai lệch số tiền (Underpayment)** | Khách hàng chuyển thiếu tiền (ví dụ gói 200k nhưng chỉ chuyển 20k). | So khớp nghiêm ngặt `amount == order.amount`. Nếu thiếu tiền, đơn hàng giữ nguyên `pending`, ghi chú cảnh báo và không gia hạn license. |
| **5** | **Đơn hàng quá hạn (Expired Order)** | Khách hàng chuyển khoản sau khi đơn đã quá 15 phút và giá gói đã thay đổi. | Kiểm tra `expires_at > CURRENT_TIMESTAMP`. Nếu quá hạn, cập nhật trạng thái đơn `expired`, ghi nhận giao dịch vào hàng đợi khiếu nại thủ công. |
| **6** | **Nội dung chuyển khoản sai định dạng** | Người dùng gõ nhầm nội dung (ví dụ `TLBB123` thay vì `TLBB839201`). | Dùng Regex chuẩn `\b(TLBB[A-Z0-9]{4,10})\b` để bóc tách. Nếu không khớp bất kỳ đơn nào, lưu vào `bank_transactions` với trạng thái `unmatched` để Admin rà soát thủ công. |
| **7** | **Bảo mật JWT & Leo thang đặc quyền (RBAC)** | User thường can thiệp payload hoặc truy cập API quản trị của Admin. | Ký JWT bằng bí mật `JWT_SECRET` mạnh. Server Middleware kiểm tra `role === 'admin'` trên tất cả route `/api/admin/*`. Service Role Key của Supabase chỉ nằm ở server Next.js, không lộ ra client. |

---

## Bước 7: Kế Hoạch Triển Khai Tiếp Theo (Awaiting Confirmation)

Sau khi bạn duyệt qua tài liệu này, các bước thi công sẽ diễn ra theo trình tự:
1. **Thiết lập Server & Database Client**: Cấu hình kết nối Supabase, helper JWT, SQL Script cho toàn bộ RPC function mới.
2. **Xây dựng API Backend**: Webhook Sepay, xác thực Auth, quản lý đơn hàng VietQR, các route Admin.
3. **Phát triển Giao diện User**: Giao diện Modern Dark SaaS, tra cứu license, popup đổi mật khẩu, popup chọn gói cước và quét mã VietQR tự động polling.
4. **Phát triển Giao diện Admin**: Dashboard KPI thống kê, biểu đồ doanh thu, bảng quản lý tài khoản, quản lý đơn hàng và sổ cái doanh thu có xuất CSV.
5. **Kiểm thử end-to-end**: Giả lập webhook Sepay, kiểm tra luồng thanh toán và gia hạn thành công.
