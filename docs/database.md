# Database Spec - Current Codebase (MongoDB)

Tài liệu này mô tả schema hiện tại đang chạy trong source.

## 1) Collections hiện có (13)

1. `users`
2. `departments`
3. `majors`
4. `terms`
5. `advisor_classes`
6. `class_members`
7. `academic_records`
8. `risk_predictions`
9. `alert`
10. `recommendations`
11. `meetings`
12. `feedbacks`
13. `notifications`

## 2) Schema chính

### 2.1 `users`

```json
{
  "_id": "ObjectId",
  "username": "sv220001",
  "email": "sv220001@uni.edu.vn",
  "password_hash": "...",
  "role": "STUDENT | ADVISOR | FACULTY | ADMIN",
  "status": "ACTIVE | INACTIVE | LOCKED",
  "profile": {
    "full_name": "Nguyễn Văn A",
    "phone": "...",
    "date_of_birth": "ISODate",
    "gender": "MALE | FEMALE | OTHER",
    "address": "...",
    "avatar_url": "..."
  },
  "org": {
    "department_id": "ObjectId",
    "major_id": "ObjectId"
  },
  "student_info": {
    "student_code": "SV220001",
    "cohort_year": 2022,
    "advisor_user_id": "ObjectId",
    "enrollment_status": "ENROLLED | ON_LEAVE | GRADUATED | DROPPED"
  },
  "advisor_info": {
    "staff_code": "GV001",
    "title": "ThS"
  },
  "token_version": 0,
  "last_login_at": "ISODate",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 2.2 `departments`

```json
{
  "_id": "ObjectId",
  "department_code": "CNTT",
  "department_name": "Công nghệ thông tin",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

### 2.3 `majors`

```json
{
  "_id": "ObjectId",
  "major_code": "KTPM",
  "major_name": "Kỹ thuật phần mềm",
  "department_id": "ObjectId",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

### 2.4 `terms`

```json
{
  "_id": "ObjectId",
  "term_code": "2026-1",
  "academic_year": "2026-2027",
  "term_name": "Học kỳ 1",
  "start_date": "ISODate",
  "end_date": "ISODate",
  "status": "ACTIVE | INACTIVE",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

Note: chỉ 1 term `ACTIVE` tại 1 thời điểm.

### 2.5 `advisor_classes`

```json
{
  "_id": "ObjectId",
  "class_code": "KTPM-K18-A",
  "class_name": "Lớp KTPM K18 A",
  "advisor_user_id": "ObjectId",
  "department_id": "ObjectId",
  "major_id": "ObjectId",
  "cohort_year": 2026,
  "status": "ACTIVE | INACTIVE",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 2.6 `class_members`

```json
{
  "_id": "ObjectId",
  "class_id": "ObjectId",
  "student_user_id": "ObjectId",
  "joined_at": "ISODate",
  "status": "ACTIVE | INACTIVE",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 2.7 `academic_records`

Collection này lưu **toàn bộ lịch sử cập nhật** dữ liệu học tập của sinh viên theo mô hình append-only.
Mỗi lần sinh viên nộp dữ liệu mới trong cùng một kỳ sẽ tạo ra một document mới, bản cũ được đánh dấu `is_latest: false`.

```json
{
  "_id": "ObjectId",
  "student_user_id": "ObjectId",
  "term_id": "ObjectId",
  "gpa_prev_sem": 2.75,
  "gpa_current": 2.4,
  "num_failed": 2,
  "attendance_rate": 0.785,
  "shcvht_participation": 3,
  "study_hours": 12.5,
  "motivation_score": 2,
  "stress_level": 4,
  "sentiment_score": 0.65,
  "recorded_at": "ISODate",
  "is_latest": true,
  "version": 1,
  "updated_by": "ObjectId (ref: users)",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

**Ghi chú:**
- `is_latest: true` — bản ghi mới nhất của sinh viên trong kỳ, dùng cho AI/dashboard query.
- `is_latest: false` — bản ghi lịch sử (audit trail), không bị xóa.
- `version` — số thứ tự lần cập nhật trong cùng 1 kỳ (bắt đầu từ 1).
- `updated_by` — ObjectId của user thực hiện cập nhật (sinh viên tự nộp hoặc advisor/admin nhập hộ).

### 2.8 `risk_predictions`

```json
{
  "_id": "ObjectId",
  "student_user_id": "ObjectId",
  "term_id": "ObjectId",
  "risk_score": 0.83,
  "risk_label": 1,
  "model_name": "XGBoost",
  "predicted_at": "ISODate",
  "is_latest": true,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 2.9 `alert`

```json
{
  "_id": "ObjectId",
  "student_user_id": "ObjectId",
  "term_id": "ObjectId",
  "alert_type": "RISK | SENTIMENT | ANOMALY",
  "source_ai": "AI01_RISK | AI02_SENTIMENT | AI04_ANOMALY",
  "severity": "LOW | MEDIUM | HIGH",
  "risk_prediction_id": "ObjectId | null",
  "feedback_id": "ObjectId | null",
  "detected_at": "ISODate",
  "status": "OPEN | ACKED | RESOLVED",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 2.10 `recommendations`

```json
{
  "_id": "ObjectId",
  "student_user_id": "ObjectId",
  "term_id": "ObjectId",
  "risk_prediction_id": "ObjectId",
  "title": "Tăng thời gian tự học",
  "content": "Học nhóm 2 buổi/tuần",
  "priority": "LOW | MEDIUM | HIGH",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 2.11 `meetings`

```json
{
  "_id": "ObjectId",
  "class_id": "ObjectId",
  "student_user_ids": ["ObjectId", "ObjectId"],
  "advisor_user_id": "ObjectId",
  "term_id": "ObjectId",
  "meeting_time": "ISODate",
  "meeting_end_time": "ISODate",
  "notes_raw": "Nội dung biên bản cần đủ mô tả, không quá ngắn",
  "notes_summary": "...",
  "summary_model": "T5",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 2.12 `feedbacks`

```json
{
  "_id": "ObjectId",
  "class_id": "ObjectId",
  "student_user_id": "ObjectId",
  "advisor_user_id": "ObjectId",
  "meeting_id": "ObjectId",
  "feedback_text": "...",
  "rating": 2,
  "submitted_at": "ISODate",
  "sentiment_label": "POSITIVE | NEUTRAL | NEGATIVE", // Được backend tự động gán sau khi gọi AI, client không nhập
  "feedback_score": 0.85, // Số thực [-1, 1], do AI backend tự động tính, client không nhập
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
// Ghi chú: sentiment_label và feedback_score được backend tự động gán sau khi gọi AI, client không nhập hai trường này khi gửi feedback.

### 2.13 `notifications`

```json
{
  "_id": "ObjectId",
  "recipient_user_id": "ObjectId",
  "alert_id": "ObjectId",
  "title": "...",
  "content": "...",
  "is_read": false,
  "sent_at": "ISODate",
  "read_at": "ISODate | null",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

## 3) Mapping API -> collection

- `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` -> `users` (token_version based)
- `/api/users/create`, `/api/users` -> `users`
- `/api/master-data/departments*` -> `departments`
- `/api/master-data/majors*` -> `majors`
- `/api/master-data/terms*` -> `terms`
- `/api/students`, `/api/students/:id` -> `users` (filter `role=STUDENT`)
- `/api/advisor-classes/*` -> `advisor_classes`
- `/api/class-members/*` -> `class_members`
- `/api/academic/submit` -> `academic_records` (có validate `term_id` tồn tại)
- `/api/feedback`, `/api/feedback/list` -> `feedbacks`
- `/api/meeting` -> `meetings` (có validate `term_id` tồn tại nếu gửi)
- `/api/dashboard/student` -> `academic_records` + `risk_predictions` + `feedbacks`
- `/api/dashboard/advisor` -> `advisor_classes` + `class_members` + `users` + `risk_predictions` + `alert` + `notifications`
- `/api/dashboard/faculty` -> `users` + `risk_predictions` + `alert`

## 4) Index quan trọng

- `users`: unique `username`, unique `email`, unique sparse `student_info.student_code`, index `org.department_id`, `org.major_id`, `role`.
- `departments`: unique `department_code`, index `department_name`.
- `majors`: unique `(department_id, major_code)`, index `major_name`.
- `terms`: unique `term_code`, unique partial `status=ACTIVE`, index `(start_date, end_date)`.
- `advisor_classes`: unique `advisor_user_id`, unique `class_code`, index `status`, `department_id`, `major_id`.
- `class_members`: unique `student_user_id`, unique `(class_id, student_user_id)`, index `(class_id, status)`.
- `academic_records`: **bỏ** unique `(student_user_id, term_id)` — thay bằng partial unique `(student_user_id, term_id)` where `is_latest=true` (đảm bảo mỗi sinh viên chỉ có 1 bản latest/kỳ), index `(student_user_id, term_id, recorded_at -1)`, index `(student_user_id, term_id, is_latest)`, index `(student_user_id, recorded_at -1)`.
- `risk_predictions`: unique partial `(student_user_id, term_id, is_latest)` where `is_latest=true`, index `(risk_label, predicted_at -1)`.
- `alert`: index `(student_user_id, detected_at -1)`, index `(status, severity)`.
- `recommendations`: index `(student_user_id, createdAt -1)`.
- `meetings`: index `(class_id, meeting_time -1)`, `(student_user_ids, meeting_time -1)`, `(advisor_user_id, meeting_time -1)`.
- `feedbacks`: index `(class_id, submitted_at -1)`, `(student_user_id, submitted_at -1)`, `(advisor_user_id, submitted_at -1)`, `sentiment_label`, unique `(meeting_id, student_user_id)`.
- `notifications`: index `(recipient_user_id, is_read, sent_at -1)`, index `(alert_id)`.

## 5) Rule nghiệp vụ đang enforce trong service

- Tạo user (`/api/users/create`) chỉ role `ADVISOR` hoặc `STUDENT`.
- `org.department_id` và `org.major_id` đi cùng nhau khi tạo user.
- Tạo class: advisor phải cùng `department_id` với class.
- Add class members: student phải cùng `department_id` với class; nếu class có `major_id` thì student phải cùng `major_id`.
- Auth:
  - login trả `access_token` + `refresh_token`
  - refresh token theo cơ chế rotate bằng `token_version` (không lưu refresh token vào DB)
  - logout tăng `token_version` để vô hiệu hóa refresh token hiện tại.
