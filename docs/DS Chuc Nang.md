**AI-ADVISOR**, được chia theo **4 lớp hệ thống: Frontend (FE), Backend
(BE), API, AI**.

**1. Bảng tổng hợp chức năng FE: hệ thống AI-ADVISOR**

| **Layer**    | **Module**         | **Chức năng cụ thể**     | **Mô tả**                              | **Người dùng** |
|--------------|--------------------|--------------------------|----------------------------------------|----------------|
| **Frontend** | Authentication UI  | Login / Logout           | Đăng nhập, đăng xuất hệ thống          | All            |
| **Frontend** | Profile Page       | View / Edit profile      | Xem và chỉnh sửa thông tin cá nhân     | All            |
| **Frontend** | Student Dashboard  | Risk Score Display       | Hiển thị Risk Score do AI dự đoán      | Student        |
| **Frontend** | Student Dashboard  | Academic Progress Chart  | Biểu đồ GPA và kết quả học tập         | Student        |
| **Frontend** | Student Dashboard  | Sentiment Trend          | Biểu đồ cảm xúc theo thời gian         | Student        |
| **Frontend** | Student Input Form | Submit academic data     | Sinh viên nhập GPA, stress, motivation | Student        |
| **Frontend** | Feedback Form      | Submit advising feedback | Gửi phản hồi sau buổi SHCVHT           | Student        |
| **Frontend** | Chatbot Interface  | Ask academic questions   | Giao diện hỏi đáp chatbot học vụ       | Student        |
| **Frontend** | Advisor Dashboard  | Student Risk Table       | Bảng danh sách SV và Risk Score        | Advisor        |
| **Frontend** | Advisor Dashboard  | Risk Alerts              | Hiển thị cảnh báo SV nguy cơ           | Advisor        |
| **Frontend** | Advisor Dashboard  | Sentiment Alerts         | Hiển thị phản hồi tiêu cực             | Advisor        |
| **Frontend** | Meeting Management | Upload meeting notes     | Nhập biên bản SHCVHT                   | Advisor        |
| **Frontend** | Meeting Management | View summarized notes    | Xem biên bản tóm tắt                   | Advisor        |
| **Frontend** | Faculty Dashboard  | Risk Distribution Chart  | Biểu đồ phân bố Risk Score             | Faculty        |
| **Frontend** | Faculty Dashboard  | KPI Monitoring           | Theo dõi KPI cố vấn học tập            | Faculty        |
| **Frontend** | Admin Panel        | Manage Users             | Quản lý tài khoản hệ thống             | Admin          |
| **Frontend** | Admin Panel        | System Configuration     | Cấu hình hệ thống                      | Admin          |

**2. Bảng tổng hợp chức năng BE: hệ thống AI-ADVISOR**

| **Layer**   | **Module**             | **Chức năng cụ thể**     | **Mô tả**                   | **Người dùng** |
|-------------|------------------------|--------------------------|-----------------------------|----------------|
| **Backend** | Authentication Service | Verify login credentials | Xác thực đăng nhập          | All            |
| **Backend** | Token Service          | Generate JWT token       | Tạo token xác thực          | All            |
| **Backend** | User Management        | Create / Update user     | Quản lý người dùng          | Admin          |
| **Backend** | Student Data Service   | Store academic records   | Lưu dữ liệu học tập         | System         |
| **Backend** | Feedback Service       | Store feedback data      | Lưu phản hồi SV             | System         |
| **Backend** | Meeting Notes Service  | Save advising notes      | Lưu biên bản SHCVHT         | Advisor        |
| **Backend** | Dashboard Service      | Aggregate statistics     | Tính toán dữ liệu dashboard | System         |
| **Backend** | Notification Service   | Send alerts              | Gửi cảnh báo cho CVHT       | System         |
| **Backend** | Recommendation Engine  | Generate suggestions     | Gợi ý cải thiện học tập     | Student        |

**3. DS API End Points cần phát triển**

| **Layer** | **API Endpoint**       | **Method** | **Mô tả**              |
|-----------|------------------------|------------|------------------------|
| **API**   | /api/auth/login        | POST       | Đăng nhập hệ thống     |
| **API**   | /api/auth/logout       | POST       | Đăng xuất              |
| **API**   | /api/users             | GET        | Lấy danh sách user     |
| **API**   | /api/students          | GET        | Lấy danh sách SV       |
| **API**   | /api/students/{id}     | GET        | Lấy thông tin SV       |
| **API**   | /api/academic/submit   | POST       | Lưu dữ liệu học tập    |
| **API**   | /api/feedback          | POST       | Gửi phản hồi           |
| **API**   | /api/feedback/list     | GET        | Lấy danh sách phản hồi |
| **API**   | /api/meeting           | POST       | Lưu biên bản SHCVHT    |
| **API**   | /api/dashboard/student | GET        | Dashboard sinh viên    |
| **API**   | /api/dashboard/advisor | GET        | Dashboard CVHT         |
| **API**   | /api/dashboard/faculty | GET        | Dashboard khoa         |
| **API**   | /api/chatbot/query     | POST       | Hỏi chatbot học vụ     |

# 4. DS AI Modules

| **Layer** | **AI Module**            | **Chức năng**                | **Input**                          | **Output**      | **Model**        |
|-----------|--------------------------|------------------------------|------------------------------------|-----------------|------------------|
| **AI**    | Academic Risk Prediction | Dự đoán nguy cơ học vụ       | GPA, attendance, stress, sentiment | Risk Score      | XGBoost          |
| **AI**    | Sentiment Analysis       | Phân tích cảm xúc phản hồi   | Feedback text                      | Sentiment label | PhoBERT          |
| **AI**    | Meeting Summarization    | Tóm tắt biên bản SHCVHT      | Meeting notes                      | Summary text    | T5               |
| **AI**    | Anomaly Detection        | Phát hiện học tập bất thường | Academic history                   | Anomaly alerts  | Isolation Forest |
| **AI**    | Academic Chatbot         | Chatbot học vụ               | Student question                   | AI response     | RAG + LLM        |

Sơ đồ BFD – Hệ thống AI-Advisor

<img src="media/image1.png" style="width:6.5in;height:3.1747in" />

**3. Product Backlog (Mapping từ chức năng)**

| **PBI ID** | **Feature / User Story**            | **Description**                                                                                                   | **User** | **Priority** |
|------------|-------------------------------------|-------------------------------------------------------------------------------------------------------------------|----------|--------------|
| PB01       | User login                          | User can login to the system                                                                                      | All      | High         |
| PB02       | User logout                         | User can logout from system                                                                                       | All      | High         |
| PB03       | Manage user profile                 | View and edit profile information                                                                                 | All      | Medium       |
| PB04       | Submit academic data                | Student enters GPA, stress, motivation                                                                            | Student  | High         |
| PB05       | Submit advising feedback            | Student sends feedback after advising session                                                                     | Student  | High         |
| PB06       | View student dashboard              | Student views risk score and progress charts                                                                      | Student  | High         |
| PB07       | Monitor students                    | Advisor views list of students with risk scores                                                                   | Advisor  | High         |
| PB08       | Receive risk alerts                 | Advisor receives alerts for high-risk students                                                                    | Advisor  | High         |
| PB09       | View sentiment alerts               | Advisor sees negative sentiment feedback                                                                          | Advisor  | Medium       |
| PB10       | Create & Update Meeting Notes       | Cho phép Cố vấn tạo mới hoặc chỉnh sửa các ghi chú sau mỗi buổi tư vấn với sinh viên                            | Advisor  | High         |
| PB11       | View & Search Meeting History       | Cho phép Cố vấn xem lại toàn bộ lịch sử các buổi tư vấn cũ, hỗ trợ tìm kiếm theo tên sinh viên hoặc ngày tháng | Advisor  | Medium       |
| PB12       | Delete or Archive Meeting Notes     | Cho phép quản lý vòng đời của ghi chú (xóa các ghi chú sai hoặc lưu trữ các ghi chú cũ)                         | Advisor  | Medium       |
| PB13       | Admin dashboard analytics           | Admin monitors risk distribution and KPI across the system                                                        | Admin    | Medium       |
| PB14       | Manage system users                 | Admin manages user accounts                                                                                       | Admin    | Medium       |
| PB15       | Configure system settings           | Admin configures system parameters                                                                                | Admin    | Low          |
| PB16       | Risk prediction analysis            | System predicts academic risk                                                                                     | System   | High         |
| PB17       | Sentiment analysis processing       | System analyzes student feedback                                                                                  | System   | High         |
| PB18       | Anomaly detection                   | System detects abnormal academic behavior                                                                         | System   | Medium       |
| PB19       | Dashboard analytics processing      | Aggregate statistics for dashboards                                                                               | System   | High         |
| PB20       | Notification alerts                 | System sends alerts to advisors                                                                                   | System   | Medium       |
| PB21       | Recommendation engine               | Suggest improvement actions to students                                                                           | System   | Medium       |

mapping chi tiết cho AI-ADVISOR

| **PBI** | **Frontend Feature**             | **Backend Service**    | **API Endpoint**       | **AI Module**            |
|---------|----------------------------------|------------------------|------------------------|--------------------------|
| PB01    | Login UI                         | Authentication Service | /api/auth/login        | —                        |
| PB02    | Logout button                    | Token Service          | /api/auth/logout       | —                        |
| PB03    | Profile page                     | User Management        | /api/users             | —                        |
| PB04    | Academic data form               | Student Data Service   | /api/academic/submit   | —                        |
| PB05    | Feedback form                    | Feedback Service       | /api/feedback          | Sentiment Analysis       |
| PB06    | Student dashboard charts         | Dashboard Service      | /api/dashboard/student | Risk Prediction          |
| PB07    | Student risk table               | Dashboard Service      | /api/dashboard/advisor | Risk Prediction          |
| PB08    | Risk alerts panel                | Notification Service   | /api/dashboard/advisor | Risk Prediction          |
| PB09    | Sentiment alerts panel           | Feedback Service       | /api/feedback/list     | Sentiment Analysis       |
| PB10    | Create & edit meeting notes UI   | Meeting Notes Service  | /api/meeting           | —                        |
| PB11    | Meeting history & search UI      | Meeting Notes Service  | /api/meeting           | —                        |
| PB12    | Delete / archive meeting notes   | Meeting Notes Service  | /api/meeting           | —                        |
| PB13    | Admin analytics dashboard        | Dashboard Service      | /api/dashboard/admin   | Risk Prediction          |
| PB14    | Admin user management            | User Management        | /api/users             | —                        |
| PB15    | Admin configuration panel        | System Config Service  | /api/config            | —                        |
| PB16    | Risk score calculation           | Analytics Engine       | internal service       | Academic Risk Prediction |
| PB17    | Feedback sentiment analysis      | Feedback Service       | /api/feedback/list     | Sentiment Analysis       |
| PB18    | Academic anomaly detection       | Analytics Engine       | internal service       | Anomaly Detection        |
| PB19    | Dashboard statistics             | Dashboard Service      | /api/dashboard/\*      | Risk Prediction          |
| PB20    | Alert notification system        | Notification Service   | internal API           | Anomaly Detection        |
| PB21    | Recommendation system            | Recommendation Engine  | internal API           | Risk Prediction          |

Tóm tắt

| **Layer**       | **Modules**  |
|-----------------|--------------|
| Frontend        | 15 features  |
| Backend         | 9 services   |
| API             | 11 endpoints |
| AI              | 3 models     |
| Product Backlog | 21 PB        |

**Cấu trúc Epic tương ứng với PBI (cho Scrum)**

| **Epic**          | **PBI**   |
|-------------------|-----------|
| Authentication    | PB01–PB03 |
| Student Portal    | PB04–PB06 |
| Advisor Portal    | PB07–PB12 |
| Admin Management  | PB13–PB15 |
| AI Analytics      | PB16–PB21 |

**Sprint Plan**

| **Sprint** | **PBI**                              | **Mô tả nhóm công việc**                                                    |
|------------|--------------------------------------|-----------------------------------------------------------------------------|
| Sprint 1   | PB01, PB02, PB03, PB04, PB05, PB10  | Authentication, profile, nhập liệu học tập, feedback, tạo/sửa meeting notes |
| Sprint 2   | PB06, PB07, PB13, PB14, PB15, PB16, PB17, PB18, PB19 | Dashboard sinh viên & cố vấn, admin panel, các AI service (Risk, Sentiment, Anomaly, Dashboard analytics) |
| Sprint 3   | PB08, PB09, PB11, PB12, PB20, PB21  | Alerts, lịch sử & xóa/archive meeting notes, notification, recommendation   |

**Project Timeline**

| **Phase**          | **Description**|
|--------------------|---------------|
| Sprint 1           |Backend & APIs |
| Sprint 3           |Frontend UI    |


kế hoạch thực hiện dự án AI-ADVISOR
