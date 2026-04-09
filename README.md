# BACKEND-ADVISOR

Backend API cho hệ thống Advisor, xây dựng bằng Node.js + Express + MongoDB.

## Mô tả ngắn

Dự án cung cấp các API chính:
- Xác thực người dùng (auth, JWT)
- Quản lý user, student
- Học tập/điểm số (academic)
- Feedback, meeting, notification
- Dashboard tổng hợp

## Công nghệ

- Node.js
- Express
- MongoDB (Mongoose)
- JWT, bcryptjs

## Chuẩn bị trước khi chạy

1. Cài Node.js (khuyên nghị bản LTS).
2. Tạo file `.env` tại thư mục gốc (có thể copy từ `.env.example`).
3. Điền các biến tối thiểu:

```env
PORT=3000
MONGO_URI=<your_mongodb_uri>
JWT_SECRET=<your_secret>
JWT_EXPIRES_IN=7d
```


## Lưu ý khi chạy dự án

**Bạn cần khởi động AI server (FastAPI AI) trước khi chạy backend nếu muốn sử dụng các chức năng phân tích AI (risk, sentiment, anomaly).**

- Xem hướng dẫn chi tiết tại: `ai-services/fastapi-ai/README.md`
- Hoặc chạy nhanh:

```bash
cd ai-services/fastapi-ai
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Sau khi AI server đã chạy (thường ở http://localhost:8001), bạn mới chạy backend như hướng dẫn bên dưới.

---

## Cách chạy dự án

```bash
npm i
npm run dev
```

Nếu chạy thành công, terminal sẽ hiển thị:
- `MongoDB connected`
- `Server running on port 3000`
