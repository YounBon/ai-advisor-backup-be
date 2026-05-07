# API cho vai trò ADMIN

Tài liệu được tổng hợp từ mã nguồn `src/routes` và `app.js` (tiền tố `/api/...`), có tham chiếu chéo tới `docs/admin-provisioning-flow.md` và `docs/DS Chuc Nang.md`.

Với các route cần bảo vệ: gửi header `Authorization: Bearer <access_token>` sau khi đăng nhập bằng `POST /api/auth/login`.

---

## 1. Xác thực (mọi vai trò, gồm ADMIN)

| Phương thức | Đường dẫn | Mô tả |
|-------------|-----------|-------|
| POST | `/api/auth/login` | Đăng nhập (xem bước 0 trong `admin-provisioning-flow.md`) |
| POST | `/api/auth/logout` | Đăng xuất (cần token) |

---

## 2. Chỉ vai trò `ADMIN`

| Phương thức | Đường dẫn | Mục đích |
|-------------|-----------|----------|
| POST | `/api/users/create` | Tạo người dùng (advisor, student, …; xem luồng provisioning) |
| POST | `/api/users/` | Danh sách người dùng (body theo validator) |
| POST | `/api/master-data/departments` | Tạo khoa |
| POST | `/api/master-data/majors` | Tạo ngành |
| POST | `/api/master-data/terms` | Tạo học kỳ |
| POST | `/api/advisor-classes/` | Tạo/cập nhật lớp cố vấn (upsert theo `class_code`; tối đa 3 lớp/cố vấn) |

Nguồn route: `user.route.js`, `masterData.route.js`, `advisorClass.route.js`.

---

## 3. `ADMIN` dùng chung với vai trò khác

ADMIN gọi được cùng endpoint với các role được liệt kê.

| Phương thức | Đường dẫn | Vai trò |
|-------------|-----------|---------|
| POST | `/api/advisor-classes/my` | `ADVISOR`, `ADMIN` — trả về **mảng** lớp (1–3 lớp) |
| POST | `/api/class-members/add` | `ADVISOR`, `ADMIN` |
| POST | `/api/class-members/list` | `ADVISOR`, `ADMIN` |
| POST | `/api/students/` | `ADVISOR`, `FACULTY`, `ADMIN` |
| POST | `/api/students/:id` | `ADVISOR`, `FACULTY`, `ADMIN` |
| POST | `/api/dashboard/faculty` | `FACULTY`, `ADMIN` |
| POST | `/api/notification/list` | `STUDENT`, `ADVISOR`, `FACULTY`, `ADMIN` |
| POST | `/api/notification/generate` | `ADVISOR`, `FACULTY`, `ADMIN` |
| POST | `/api/feedback/list` | `STUDENT`, `ADVISOR`, `FACULTY`, `ADMIN` |

---

## 4. Master data: mọi user đã đăng nhập

Các route này có `authMiddleware` nhưng **không** có `authorizeRoles` — bất kỳ user đã login đều gọi được (ADMIN thường dùng cho UI chọn khoa/ngành/học kỳ).

| Phương thức | Đường dẫn |
|-------------|-----------|
| POST | `/api/master-data/departments/list` |
| POST | `/api/master-data/majors/list` |
| POST | `/api/master-data/terms/list` |
| GET | `/api/master-data/terms/active` |

---

## 5. Endpoint **không** cho ADMIN (để nắm toàn cảnh)

| Phương thức | Đường dẫn | Vai trò |
|-------------|-----------|---------|
| POST | `/api/academic/submit` | chỉ `STUDENT` (trong code: scope ADMIN đang tắt) |
| POST | `/api/feedback/` | chỉ `STUDENT` (gửi phản hồi) |
| POST | `/api/meeting/` | chỉ `ADVISOR` |
| POST | `/api/dashboard/student` | chỉ `STUDENT` |
| POST | `/api/dashboard/advisor` | chỉ `ADVISOR` |

---

## 6. Liên kết tài liệu dự án

- **Luồng provisioning ADMIN từng bước:** `docs/admin-provisioning-flow.md` — `login`, `master-data/*`, `users/create`, `advisor-classes/`, `class-members/add`.
- **Tổng quan chức năng & backlog:** `docs/DS Chuc Nang.md` — PB14/PB15 (quản lý user & cấu hình); một số endpoint trong bảng tài liệu vẫn ở dạng kế hoạch (ví dụ `/api/config`, `/api/chatbot/query` có thể chưa có trong repo).

---

## 7. Ghi chú dịch vụ thông báo

Trong `notification.service.js`, với role `ADMIN`, khi gọi danh sách thông báo có thể truyền `recipient_user_id` trong body (các role khác mặc định là chính user đang đăng nhập). Chi tiết xem controller/validator notification.

---

## 8. Luồng UI gợi ý (Frontend) — tiếng Việt

Tài liệu này mô tả cách **màn hình và luồng người dùng** nên bám sát API ở các mục trên (FE gọi qua tiền tố `/api/...`, header `Authorization` khi đã đăng nhập).

### 8.1. Đăng nhập và bảo vệ trang

- **Màn hình đăng nhập:** form email/mật khẩu → gọi `POST /api/auth/login` → lưu `access_token` (và `refresh_token` nếu có) cùng thông tin `user` (đặc biệt `role`).
- **Sau khi đăng nhập:** mọi request tới API được bảo vệ phải gắn header `Bearer`.
- **Chưa đăng nhập:** chuyển hướng về trang đăng nhập; không gọi API dashboard/admin.
- **Đã đăng nhập nhưng không phải `ADMIN`:** ẩn menu và route dành riêng admin (mục §2). Nếu vẫn gọi nhầm, backend trả **403** — UI hiển thị thông báo lỗi thân thiện, không coi là lỗi hệ thống chung.

### 8.2. Menu / module gợi ý cho `ADMIN`

| Khu vực UI | API chính (tham chiếu mục tài liệu) |
|------------|-------------------------------------|
| **Cấu hình chung (master data)** | Tạo: §2 (`departments`, `majors`, `terms`). Load danh sách / học kỳ active: §4. |
| **Quản lý người dùng** | Tạo user: `POST /api/users/create` (§2). Bảng danh sách + lọc: `POST /api/users` (§2). |
| **Lớp cố vấn** | Upsert lớp: `POST /api/advisor-classes` (§2). Xem nhanh lớp của mình (kiểm tra): `POST /api/advisor-classes/my` (§3). |
| **Thành viên lớp** | Thêm: `POST /api/class-members/add` (§3). Danh sách: `POST /api/class-members/list` (§3). |
| **Sinh viên (tra cứu)** | Danh sách: `POST /api/students` (§3). Chi tiết: `POST /api/students/:id` (§3). |
| **Dashboard** | Nếu sản phẩm cho phép admin xem góc faculty: `POST /api/dashboard/faculty` (§3). |
| **Thông báo** | Danh sách: `POST /api/notification/list` (§3). Admin có thể truyền `recipient_user_id` (§7). Tạo/cảnh báo: `POST /api/notification/generate` (§3). |
| **Phản hồi (xem)** | `POST /api/feedback/list` (§3). **Lưu ý:** gửi phản hồi student là `POST /api/feedback/` (§5) — không dành cho ADMIN. |

### 8.3. Luồng provisioning (wizard) — khớp `admin-provisioning-flow.md`

Thứ tự gợi ý trên UI để tránh thiếu dữ liệu nền:

1. **Đăng nhập ADMIN** → lưu token.
2. **Tạo khoa** → lưu `_id` khoa để chọn khi tạo ngành.
3. **Tạo ngành** (chọn `department_id`).
4. **Tạo học kỳ** (có thể nhiều bản ghi; thường một bản `ACTIVE`).
5. Trên các form sau, dùng §4 để **dropdown**: danh sách khoa, ngành, học kỳ (và `GET terms/active` nếu cần mặc định học kỳ hiện hành).
6. **Tạo cố vấn** (`users/create`, role advisor — chi tiết body xem provisioning).
7. **Tạo/cập nhật lớp cố vấn** (`advisor-classes`).
8. **Tạo sinh viên** (`users/create`, role student).
9. **Thêm sinh viên vào lớp** (`class-members/add`).

Có thể triển khai **một wizard nhiều bước** hoặc **các trang riêng**; quan trọng là giữ thứ tự phụ thuộc dữ liệu (khoa → ngành → học kỳ → user → lớp → thành viên).

### 8.4. Pattern tương tác UI (đồng bộ quy ước dự án FE)

- **Thêm / sửa** dữ liệu qua API: dùng **modal** chứa form.
- **Xóa** (nếu sau này có API xóa): **popup xác nhận**.
- **Danh sách (GET/POST list):** hiển thị **bảng**; **xem chi tiết** một dòng → **modal** chỉ đọc (nếu áp dụng — xem tài liệu UI frontend dự án).

### 8.5. Xử lý lỗi thường gặp trên UI

| Mã | Ý nghĩa gợi ý cho UI |
|----|----------------------|
| **401** | Hết hạn / token không hợp lệ → xóa session, đưa về đăng nhập. |
| **403** | Sai quyền (ví dụ không phải ADMIN gọi mục §2) → thông báo rõ, không retry vô hạn. |
| **422** | Body không đúng validator → hiển thị `message` từ server; chỉnh form. |

### 8.6. Không đưa vào luồng UI của ADMIN

Các endpoint §5 (nộp học thuật student, gửi feedback student, meeting advisor-only, dashboard student/advisor) — **không** đặt trong menu ADMIN; tránh link chết hoặc lỗi 403 gây khó hiểu cho người quản trị.

