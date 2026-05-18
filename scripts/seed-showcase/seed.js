/**
 * seed-showcase/seed.js
 *
 * Tạo 3 tài khoản showcase đầy đủ dữ liệu:
 *   admin@gmail.com        / 123456  → ADMIN
 *   lehaikhoa@gmail.com    / 123456  → ADVISOR (lớp 50 SV, đầy đủ meetings/alerts/notifications)
 *   trandinhquan@gmail.com / 123456  → STUDENT (đầy đủ academic/risk/alert/feedback/notification)
 *
 * Run:
 *   node scripts/seed-showcase/seed.js
 *   node scripts/seed-showcase/seed.js --reset
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

require("../../src/models/term.model");
require("../../src/models/user.model");
require("../../src/models/advisorClass.model");
require("../../src/models/classMember.model");
require("../../src/models/meeting.model");
require("../../src/models/academicRecord.model");
require("../../src/models/riskPrediction.model");
require("../../src/models/feedback.model");
require("../../src/models/alert.model");
require("../../src/models/notification.model");
require("../../src/models/recommendation.model");
require("../../src/models/department.model");
require("../../src/models/major.model");

const Term = require("../../src/models/term.model");
const User = require("../../src/models/user.model");
const AdvisorClass = require("../../src/models/advisorClass.model");
const ClassMember = require("../../src/models/classMember.model");
const Meeting = require("../../src/models/meeting.model");
const AcademicRecord = require("../../src/models/academicRecord.model");
const RiskPrediction = require("../../src/models/riskPrediction.model");
const Feedback = require("../../src/models/feedback.model");
const Alert = require("../../src/models/alert.model");
const Notification = require("../../src/models/notification.model");
const Recommendation = require("../../src/models/recommendation.model");
const Department = require("../../src/models/department.model");
const Major = require("../../src/models/major.model");

// ── Hằng số ───────────────────────────────────────────────────────────────────
const PLAIN_PASSWORD = "123456";
const ADMIN_EMAIL = "admin@gmail.com";
const ADVISOR_EMAIL = "lehaikhoa@gmail.com";
const STUDENT_EMAIL = "trandinhquan@gmail.com";
const CLASS_CODE = "KHMT22A";
const MAX_TERMS = 8;
const CLASS_SIZE = 50; // số SV trong lớp (không tính showcase student)

// ── Dữ liệu tên tiếng Việt thực ──────────────────────────────────────────────
const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const TEN_NAM = ["Anh", "Bình", "Dũng", "Hùng", "Khoa", "Minh", "Nam", "Phúc", "Quân", "Thành", "Tuấn", "Việt", "Hải", "Long", "Đức", "Tùng", "Kiên", "Mạnh", "Trung", "Hiếu", "Khải", "Lâm", "Phong", "Quang", "Sơn", "Thắng", "Toàn", "Trí", "Uy", "Xuân"];
const TEN_NU = ["An", "Chi", "Giang", "Hoa", "Lan", "Linh", "Mai", "Ngọc", "Oanh", "Phương", "Thảo", "Vy", "Trang", "Hằng", "Nhung", "Yến", "Diệu", "Quỳnh", "Huyền", "Khánh", "Lệ", "My", "Nhi", "Như", "Thư", "Tiên", "Trâm", "Uyên", "Xuân", "Ý"];
const TEN_DEM_NAM = ["Văn", "Đình", "Quốc", "Minh", "Hữu", "Công", "Đức", "Trọng", "Xuân", "Thanh", "Bảo", "Chí", "Duy", "Gia", "Hoàng", "Hồng", "Khánh", "Nhật", "Phú", "Thế"];
const TEN_DEM_NU = ["Thị", "Ngọc", "Thanh", "Minh", "Bích", "Kim", "Thu", "Hồng", "Phương", "Thùy", "Diễm", "Hoàng", "Khánh", "Lan", "Mỹ", "Ngân", "Như", "Tú", "Xuân", "Ý"];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function r2(v) { return Math.round(v * 100) / 100; }

function randomViName(gender) {
    const ho = randomItem(HO);
    if (gender === "MALE") {
        return `${ho} ${randomItem(TEN_DEM_NAM)} ${randomItem(TEN_NAM)}`;
    }
    return `${ho} ${randomItem(TEN_DEM_NU)} ${randomItem(TEN_NU)}`;
}

/** Chuyển tên tiếng Việt → email dạng thật: vothimai@gmail.com */
function nameToEmail(fullName, suffix) {
    const map = {
        à: "a", á: "a", ả: "a", ã: "a", ạ: "a", ă: "a", ắ: "a", ặ: "a", ằ: "a", ẳ: "a", ẵ: "a",
        â: "a", ấ: "a", ầ: "a", ẩ: "a", ẫ: "a", ậ: "a",
        è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e", ê: "e", ế: "e", ề: "e", ể: "e", ễ: "e", ệ: "e",
        ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
        ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o", ô: "o", ố: "o", ồ: "o", ổ: "o", ỗ: "o", ộ: "o",
        ơ: "o", ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
        ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u", ư: "u", ứ: "u", ừ: "u", ử: "u", ữ: "u", ự: "u",
        ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y", đ: "d",
        À: "a", Á: "a", Ả: "a", Ã: "a", Ạ: "a", Ă: "a", Ắ: "a", Ặ: "a", Ằ: "a", Ẳ: "a", Ẵ: "a",
        Â: "a", Ấ: "a", Ầ: "a", Ẩ: "a", Ẫ: "a", Ậ: "a",
        È: "e", É: "e", Ẻ: "e", Ẽ: "e", Ẹ: "e", Ê: "e", Ế: "e", Ề: "e", Ể: "e", Ễ: "e", Ệ: "e",
        Ì: "i", Í: "i", Ỉ: "i", Ĩ: "i", Ị: "i",
        Ò: "o", Ó: "o", Ỏ: "o", Õ: "o", Ọ: "o", Ô: "o", Ố: "o", Ồ: "o", Ổ: "o", Ỗ: "o", Ộ: "o",
        Ơ: "o", Ớ: "o", Ờ: "o", Ở: "o", Ỡ: "o", Ợ: "o",
        Ù: "u", Ú: "u", Ủ: "u", Ũ: "u", Ụ: "u", Ư: "u", Ứ: "u", Ừ: "u", Ử: "u", Ữ: "u", Ự: "u",
        Ỳ: "y", Ý: "y", Ỷ: "y", Ỹ: "y", Ỵ: "y", Đ: "d",
    };
    const parts = fullName.trim().split(/\s+/);
    // email = tên + chữ cái đầu họ + chữ cái đầu đệm (nếu có)
    const ten = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map(p => p[0]).join("");
    const raw = (ten + initials).split("").map(c => map[c] || c).join("").toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${raw}${suffix ? suffix : ""}@gmail.com`;
}

// ── Dữ liệu học tập showcase student (8 kỳ, index 0 = xa nhất) ───────────────
// Pattern: ổn định → sụt giảm → cảnh báo đỉnh → dao động
const ACADEMIC_TIMELINE = [
    // gpa   failed  attend  stress  motiv  sentiment  sentLabel    rating
    [3.10, 0, 0.92, 2, 5, 0.72, "POSITIVE", 5],
    [2.85, 0, 0.85, 2, 4, 0.55, "POSITIVE", 4],
    [2.60, 1, 0.78, 3, 3, 0.15, "NEUTRAL", 3],
    [2.30, 2, 0.68, 4, 2, -0.28, "NEGATIVE", 2],
    [1.95, 3, 0.55, 5, 1, -0.65, "NEGATIVE", 1],
    [2.10, 2, 0.60, 4, 2, -0.42, "NEGATIVE", 2],
    [2.45, 1, 0.72, 3, 3, -0.10, "NEUTRAL", 3],
    [2.20, 2, 0.58, 5, 1, -0.72, "NEGATIVE", 1],
];

// ── Nội dung feedback tiếng Việt ─────────────────────────────────────────────
const FEEDBACK_TEXTS = {
    POSITIVE: [
        "Thầy hướng dẫn rất tận tình, em hiểu bài hơn sau buổi gặp.",
        "Buổi họp rất bổ ích, em được giải đáp nhiều thắc mắc về kế hoạch học tập.",
        "Em cảm thấy có động lực hơn sau khi gặp cố vấn, cảm ơn thầy rất nhiều.",
        "Thầy cho em nhiều lời khuyên thiết thực, em sẽ cố gắng thực hiện.",
    ],
    NEUTRAL: [
        "Buổi gặp bình thường, em vẫn chưa rõ hướng giải quyết một số vấn đề.",
        "Em đang cố gắng cải thiện, nhưng vẫn còn nhiều khó khăn cần vượt qua.",
        "Thầy có lắng nghe, nhưng chưa có giải pháp cụ thể cho tình huống của em.",
        "Em hiểu được một phần, nhưng vẫn cần thêm thời gian để suy nghĩ.",
    ],
    NEGATIVE: [
        "Em không muốn đi học nữa, cảm thấy rất chán nản và mệt mỏi.",
        "Em thấy mệt mỏi, không có động lực học, hay bỏ lỡ các buổi học.",
        "Em cảm thấy áp lực lắm, không biết phải làm sao để cải thiện.",
        "Em đang rất stress, khó tập trung vào việc học và các bài tập.",
        "Em lo lắng về kết quả học tập, sợ không đủ điều kiện thi.",
        "Mọi thứ đang rất khó khăn, em không biết có thể tiếp tục không.",
    ],
};

function pickText(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Nội dung ghi chú buổi họp chung cả lớp ───────────────────────────────────
const MEETING_NOTES = [
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn thông báo lịch học, lịch thi và các mốc quan trọng trong học kỳ. Sinh viên được nhắc nhở về tỷ lệ điểm danh tối thiểu và quy định nộp bài tập. Một số sinh viên phản ánh khó khăn trong việc sắp xếp thời gian học, cố vấn đã hướng dẫn cách lập kế hoạch học tập hiệu quả.`,
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn tổng kết tình hình học tập chung của lớp, biểu dương các sinh viên có kết quả tốt và động viên các sinh viên còn gặp khó khăn. Lớp thảo luận về các giải pháp cải thiện tỷ lệ điểm danh và chất lượng bài tập nhóm.`,
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn chia sẻ thông tin về các chương trình học bổng, hỗ trợ sinh viên và cơ hội thực tập trong học kỳ. Sinh viên được khuyến khích chủ động liên hệ cố vấn khi gặp khó khăn về học tập hoặc tâm lý.`,
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn nhắc nhở lớp về tiến độ đăng ký học phần cho kỳ tiếp theo và các môn học cần ưu tiên. Một số sinh viên trao đổi về định hướng chuyên ngành, cố vấn tư vấn lộ trình học tập phù hợp với từng nhóm sinh viên.`,
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn cập nhật các thay đổi về quy chế đào tạo và chính sách học vụ. Lớp thảo luận về kế hoạch ôn tập cuối kỳ, cố vấn hướng dẫn phương pháp ôn thi hiệu quả và nhắc nhở lịch thi chính thức.`,
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn trao đổi với lớp về tình hình học tập đầu kỳ, nhắc nhở sinh viên chú ý các môn học có yêu cầu cao. Lớp bầu ban cán sự mới và phân công nhiệm vụ hỗ trợ các bạn học yếu trong lớp.`,
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn giải đáp các thắc mắc của sinh viên về quy trình xét học vụ và điều kiện tốt nghiệp. Sinh viên được nhắc nhở hoàn thiện hồ sơ học vụ và cập nhật thông tin cá nhân trên hệ thống.`,
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn tổng kết học kỳ, đánh giá chung về kết quả học tập của lớp và đề ra phương hướng cải thiện cho kỳ tiếp theo. Sinh viên chia sẻ kinh nghiệm học tập và hỗ trợ lẫn nhau trong quá trình học.`,
];

// ── Notification templates — không icon, nội dung rõ ràng ────────────────────
// Format khớp với notification.service.js → generateAlerts()
const NOTIF_ADVISOR = {
    RISK: {
        HIGH: (n, c, riskScore) => ({
            title: `Cảnh báo rủi ro cao: ${n} - ${c}`,
            content: `Sinh viên ${n} - ${c} có nguy cơ học tập cao (điểm rủi ro=${riskScore}). Cần can thiệp ngay.`,
        }),
        MEDIUM: (n, c, riskScore) => ({
            title: `Cảnh báo rủi ro cao: ${n} - ${c}`,
            content: `Sinh viên ${n} - ${c} có nguy cơ học tập cao (điểm rủi ro=${riskScore}). Cần can thiệp ngay.`,
        }),
    },
    SENTIMENT: {
        HIGH: (n, c) => ({
            title: `Cảnh báo tâm lý: ${n} - ${c}`,
            content: `Sinh viên ${n} - ${c} có phản hồi tiêu cực nghiêm trọng. Cần gặp gỡ và hỗ trợ tâm lý ngay.`,
        }),
        MEDIUM: (n, c) => ({
            title: `Cảnh báo tâm lý: ${n} - ${c}`,
            content: `Sinh viên ${n} - ${c} có phản hồi tiêu cực nghiêm trọng. Cần gặp gỡ và hỗ trợ tâm lý ngay.`,
        }),
    },
    ANOMALY: {
        HIGH: (n, c) => ({
            title: `Bất thường học tập: ${n} - ${c}`,
            content: `Phát hiện bất thường trong dữ liệu học tập của sinh viên ${n} - ${c}. Cần kiểm tra ngay.`,
        }),
        MEDIUM: (n, c) => ({
            title: `Bất thường học tập: ${n} - ${c}`,
            content: `Phát hiện bất thường trong dữ liệu học tập của sinh viên ${n} - ${c}. Cần kiểm tra ngay.`,
        }),
    },
};

// Backend không gửi notification cho student, nhưng seed vẫn tạo để có dữ liệu demo
const NOTIF_STUDENT = {
    RISK: {
        HIGH: (termName) => ({
            title: "Cảnh báo rủi ro học tập",
            content: `Bạn có nguy cơ học tập cao trong ${termName}. Hãy liên hệ cố vấn học tập để được hỗ trợ ngay.`,
        }),
        MEDIUM: (termName) => ({
            title: "Cảnh báo rủi ro học tập",
            content: `Bạn có nguy cơ học tập cao trong ${termName}. Hãy liên hệ cố vấn học tập để được hỗ trợ ngay.`,
        }),
    },
    SENTIMENT: {
        HIGH: (termName) => ({
            title: "Ghi nhận phản hồi tiêu cực",
            content: `Hệ thống ghi nhận phản hồi tiêu cực nghiêm trọng của bạn trong ${termName}. Nếu bạn đang gặp khó khăn tâm lý, hãy chia sẻ với cố vấn học tập.`,
        }),
        MEDIUM: (termName) => ({
            title: "Ghi nhận phản hồi tiêu cực",
            content: `Hệ thống ghi nhận phản hồi tiêu cực nghiêm trọng của bạn trong ${termName}. Nếu bạn đang gặp khó khăn tâm lý, hãy chia sẻ với cố vấn học tập.`,
        }),
    },
    ANOMALY: {
        HIGH: (termName) => ({
            title: "Phát hiện bất thường học tập",
            content: `Phát hiện bất thường trong dữ liệu học tập của bạn trong ${termName}. Hãy liên hệ cố vấn học tập để được hỗ trợ.`,
        }),
        MEDIUM: (termName) => ({
            title: "Phát hiện bất thường học tập",
            content: `Phát hiện bất thường trong dữ liệu học tập của bạn trong ${termName}. Hãy liên hệ cố vấn học tập để được hỗ trợ.`,
        }),
    },
};

const RECO_TEMPLATES = {
    HIGH_RISK: [
        { title: "Đăng ký học lại các môn trượt", content: "Sinh viên cần đăng ký học lại các môn đã trượt trong học kỳ này để đảm bảo tiến độ tốt nghiệp. Liên hệ phòng đào tạo để được hỗ trợ thủ tục.", priority: "HIGH" },
        { title: "Tham gia chương trình hỗ trợ học tập", content: "Đăng ký tham gia nhóm học tập có hướng dẫn do nhà trường tổ chức. Gặp cố vấn học tập ít nhất 2 lần mỗi tháng để theo dõi tiến độ cải thiện.", priority: "HIGH" },
        { title: "Tư vấn tâm lý học đường", content: "Liên hệ trung tâm hỗ trợ sinh viên để được tư vấn tâm lý. Áp lực học tập cần được giải quyết kịp thời để tránh ảnh hưởng lâu dài đến kết quả học tập.", priority: "HIGH" },
    ],
    MEDIUM_RISK: [
        { title: "Cải thiện kế hoạch học tập", content: "Xây dựng thời gian biểu học tập cụ thể, ưu tiên các môn học yếu. Tham gia đầy đủ các buổi học và thực hành để cải thiện kết quả.", priority: "MEDIUM" },
        { title: "Theo dõi điểm danh và bài tập", content: "Đảm bảo tỷ lệ điểm danh trên 80%. Nộp bài tập đúng hạn và chủ động hỏi giảng viên khi gặp khó khăn trong quá trình học.", priority: "MEDIUM" },
    ],
    ANOMALY: [
        { title: "Can thiệp học tập khẩn cấp", content: "Hệ thống phát hiện sự sụt giảm đột ngột trong kết quả học tập. Cần gặp cố vấn ngay để xác định nguyên nhân và lập kế hoạch phục hồi cụ thể.", priority: "HIGH" },
    ],
};

// ── Danh sách 50 sinh viên với tên, email, mã SV thực ─────────────────────────
// Tên tiếng Việt đầy đủ dấu, email dạng thật
const STUDENT_LIST = [
    { name: "Nguyễn Thị Lan Anh", gender: "FEMALE", code: "22IT001", email: "lananhnt@gmail.com", dob: [2004, 0, 5] },
    { name: "Trần Minh Khoa", gender: "MALE", code: "22IT002", email: "khoatm@gmail.com", dob: [2004, 2, 12] },
    { name: "Lê Thị Phương Thảo", gender: "FEMALE", code: "22IT003", email: "thaoltp@gmail.com", dob: [2004, 5, 20] },
    { name: "Phạm Đức Hùng", gender: "MALE", code: "22IT004", email: "hungpd@gmail.com", dob: [2003, 8, 3] },
    { name: "Hoàng Ngọc Vy", gender: "FEMALE", code: "22IT005", email: "vyhn@gmail.com", dob: [2004, 1, 28] },
    { name: "Vũ Thanh Tùng", gender: "MALE", code: "22IT006", email: "tungvt@gmail.com", dob: [2003, 11, 15] },
    { name: "Đặng Thị Huyền", gender: "FEMALE", code: "22IT007", email: "huyendt@gmail.com", dob: [2004, 3, 7] },
    { name: "Bùi Quốc Nam", gender: "MALE", code: "22IT008", email: "nambq@gmail.com", dob: [2004, 6, 19] },
    { name: "Đỗ Thị Ngọc Linh", gender: "FEMALE", code: "22IT009", email: "linhdtn@gmail.com", dob: [2003, 9, 25] },
    { name: "Ngô Văn Trung", gender: "MALE", code: "22IT010", email: "trungnv@gmail.com", dob: [2004, 0, 30] },
    { name: "Dương Thị Mỹ Hoa", gender: "FEMALE", code: "22IT011", email: "hoadtm@gmail.com", dob: [2004, 4, 14] },
    { name: "Lý Minh Tuấn", gender: "MALE", code: "22IT012", email: "tuanlm@gmail.com", dob: [2003, 7, 8] },
    { name: "Phan Thị Thu Hằng", gender: "FEMALE", code: "22IT013", email: "hangptt@gmail.com", dob: [2004, 2, 22] },
    { name: "Huỳnh Văn Phúc", gender: "MALE", code: "22IT014", email: "phuchv@gmail.com", dob: [2004, 10, 1] },
    { name: "Võ Thị Diệu Linh", gender: "FEMALE", code: "22IT015", email: "linhvtd@gmail.com", dob: [2003, 6, 17] },
    { name: "Nguyễn Hoàng Duy", gender: "MALE", code: "22IT016", email: "duynhd@gmail.com", dob: [2004, 1, 9] },
    { name: "Trần Thị Khánh Ngân", gender: "FEMALE", code: "22IT017", email: "nganttkh@gmail.com", dob: [2004, 8, 26] },
    { name: "Lê Công Thắng", gender: "MALE", code: "22IT018", email: "thanglc@gmail.com", dob: [2003, 3, 4] },
    { name: "Phạm Thị Thanh Trúc", gender: "FEMALE", code: "22IT019", email: "trucptt@gmail.com", dob: [2004, 5, 11] },
    { name: "Hoàng Đức Mạnh", gender: "MALE", code: "22IT020", email: "manhhd@gmail.com", dob: [2004, 0, 23] },
    { name: "Vũ Thị Lan", gender: "FEMALE", code: "22IT021", email: "lanvt@gmail.com", dob: [2003, 11, 6] },
    { name: "Đặng Văn Kiên", gender: "MALE", code: "22IT022", email: "kiendv@gmail.com", dob: [2004, 7, 18] },
    { name: "Bùi Thị Quỳnh Như", gender: "FEMALE", code: "22IT023", email: "nhubqn@gmail.com", dob: [2004, 2, 2] },
    { name: "Đỗ Xuân Bình", gender: "MALE", code: "22IT024", email: "binhdx@gmail.com", dob: [2003, 9, 13] },
    { name: "Ngô Thị Hồng Nhung", gender: "FEMALE", code: "22IT025", email: "nhungnth@gmail.com", dob: [2004, 4, 29] },
    { name: "Dương Chí Khải", gender: "MALE", code: "22IT026", email: "khaidc@gmail.com", dob: [2004, 1, 16] },
    { name: "Lý Thị Uyên", gender: "FEMALE", code: "22IT027", email: "uyenlt@gmail.com", dob: [2003, 6, 24] },
    { name: "Phan Nhật Trí", gender: "MALE", code: "22IT028", email: "tripn@gmail.com", dob: [2004, 10, 7] },
    { name: "Huỳnh Thị Bảo Châu", gender: "FEMALE", code: "22IT029", email: "chauhbt@gmail.com", dob: [2004, 3, 19] },
    { name: "Võ Văn Lâm", gender: "MALE", code: "22IT030", email: "lamvv@gmail.com", dob: [2003, 8, 31] },
    { name: "Nguyễn Thị Tú Anh", gender: "FEMALE", code: "22IT031", email: "anhntt@gmail.com", dob: [2004, 0, 10] },
    { name: "Trần Gia Bảo", gender: "MALE", code: "22IT032", email: "baotg@gmail.com", dob: [2004, 5, 3] },
    { name: "Lê Thị Mỹ Duyên", gender: "FEMALE", code: "22IT033", email: "duyenltm@gmail.com", dob: [2003, 2, 21] },
    { name: "Phạm Hồng Quân", gender: "MALE", code: "22IT034", email: "quanph@gmail.com", dob: [2004, 7, 14] },
    { name: "Hoàng Thị Yến Nhi", gender: "FEMALE", code: "22IT035", email: "nhihty@gmail.com", dob: [2004, 1, 27] },
    { name: "Vũ Duy Thành", gender: "MALE", code: "22IT036", email: "thanhvd@gmail.com", dob: [2003, 10, 5] },
    { name: "Đặng Thị Ngọc Trâm", gender: "FEMALE", code: "22IT037", email: "tramdtn@gmail.com", dob: [2004, 4, 16] },
    { name: "Bùi Thế Vinh", gender: "MALE", code: "22IT038", email: "vinhbt@gmail.com", dob: [2004, 8, 8] },
    { name: "Đỗ Thị Phương Oanh", gender: "FEMALE", code: "22IT039", email: "oanhdtp@gmail.com", dob: [2003, 1, 20] },
    { name: "Ngô Minh Sơn", gender: "MALE", code: "22IT040", email: "sonnm@gmail.com", dob: [2004, 6, 1] },
    { name: "Dương Thị Hải Yến", gender: "FEMALE", code: "22IT041", email: "yendth@gmail.com", dob: [2004, 3, 13] },
    { name: "Lý Bảo Phú", gender: "MALE", code: "22IT042", email: "phulb@gmail.com", dob: [2003, 9, 25] },
    { name: "Phan Thị Tiên", gender: "FEMALE", code: "22IT043", email: "tienpt@gmail.com", dob: [2004, 0, 17] },
    { name: "Huỳnh Văn Toàn", gender: "MALE", code: "22IT044", email: "toanhv@gmail.com", dob: [2004, 5, 29] },
    { name: "Võ Thị Xuân", gender: "FEMALE", code: "22IT045", email: "xuanvt@gmail.com", dob: [2003, 2, 8] },
    { name: "Nguyễn Văn Quang", gender: "MALE", code: "22IT046", email: "quangnv@gmail.com", dob: [2004, 7, 20] },
    { name: "Trần Thị Diễm My", gender: "FEMALE", code: "22IT047", email: "mytttd@gmail.com", dob: [2004, 1, 4] },
    { name: "Lê Hoàng Uy", gender: "MALE", code: "22IT048", email: "uylh@gmail.com", dob: [2003, 10, 16] },
    { name: "Phạm Thị Khánh Linh", gender: "FEMALE", code: "22IT049", email: "linhptk@gmail.com", dob: [2004, 4, 28] },
    { name: "Hoàng Văn Phong", gender: "MALE", code: "22IT050", email: "phonghv@gmail.com", dob: [2004, 8, 10] },
];

// Tier phân bổ cho 50 SV: 10A, 20B, 12C, 8D
const TIER_MAP = {};
STUDENT_LIST.forEach((s, i) => {
    if (i < 10) TIER_MAP[s.code] = "A";
    else if (i < 30) TIER_MAP[s.code] = "B";
    else if (i < 42) TIER_MAP[s.code] = "C";
    else TIER_MAP[s.code] = "D";
});

function initialGPA(tier) {
    if (tier === "A") return r2(3.2 + Math.random() * 0.6);
    if (tier === "B") return r2(2.5 + Math.random() * 0.5);
    if (tier === "C") return r2(2.0 + Math.random() * 0.5);
    return r2(1.2 + Math.random() * 0.8);
}

function nextGPA(tier, prev) {
    let delta;
    if (tier === "A") delta = (Math.random() - 0.3) * 0.3;
    else if (tier === "B") delta = (Math.random() - 0.5) * 0.4;
    else if (tier === "C") delta = (Math.random() - 0.55) * 0.5;
    else delta = (Math.random() - 0.6) * 0.5;
    const bounds = { A: [2.8, 4.0], B: [2.0, 3.6], C: [1.5, 3.2], D: [0.5, 2.6] };
    const [lo, hi] = bounds[tier];
    return r2(Math.min(Math.max(prev + delta, lo), hi));
}

// ── Reset ─────────────────────────────────────────────────────────────────────
async function resetShowcaseData() {
    console.log("\n🗑️  Reset data showcase...");
    const users = await User.find({
        $or: [
            { email: { $in: [ADMIN_EMAIL, ADVISOR_EMAIL, STUDENT_EMAIL] } },
            { email: { $in: STUDENT_LIST.map(s => s.email) } },
        ],
    }).select("_id").lean();
    const userIds = users.map(u => u._id);

    const classes = await AdvisorClass.find({ class_code: CLASS_CODE }).select("_id").lean();
    const classIds = classes.map(c => c._id);
    const meetings = await Meeting.find({ class_id: { $in: classIds } }).select("_id").lean();
    const meetingIds = meetings.map(m => m._id);

    await Recommendation.deleteMany({ student_user_id: { $in: userIds } });
    await Notification.deleteMany({ recipient_user_id: { $in: userIds } });
    await Alert.deleteMany({ student_user_id: { $in: userIds } });
    await Feedback.deleteMany({ $or: [{ student_user_id: { $in: userIds } }, { meeting_id: { $in: meetingIds } }] });
    await AcademicRecord.deleteMany({ student_user_id: { $in: userIds } });
    await RiskPrediction.deleteMany({ student_user_id: { $in: userIds } });
    await Meeting.deleteMany({ class_id: { $in: classIds } });
    await ClassMember.deleteMany({ $or: [{ student_user_id: { $in: userIds } }, { class_id: { $in: classIds } }] });
    await AdvisorClass.deleteMany({ _id: { $in: classIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    console.log(`  Đã xóa ${userIds.length} users và lớp ${CLASS_CODE}`);
}

// ── Seed academic + risk + meeting + feedback + alerts + notifications + recos
// cho 1 sinh viên theo timeline ────────────────────────────────────────────────
async function seedStudentData(student, terms, advisorClass, advisor, svName, svCode, timeline) {
    const numTerms = terms.length;
    for (let i = 0; i < numTerms; i++) {
        const term = terms[i];
        const [gpa, numFailed, attendance, stress, motiv, sentScore, sentLabel, rating] = timeline[i];
        const prevGpa = i > 0 ? timeline[i - 1][0] : null;
        const termEnd = new Date(term.end_date);
        const termMid = new Date((new Date(term.start_date).getTime() + termEnd.getTime()) / 2);
        const recordedAt = new Date(termEnd.getTime() - 7 * 24 * 3600 * 1000);
        const isActiveTerm = term.status === "ACTIVE";
        const alertStatus = isActiveTerm ? "OPEN" : (i % 3 === 0 ? "RESOLVED" : "ACKED");

        // Academic record
        await AcademicRecord.updateMany(
            { student_user_id: student._id, term_id: term._id, is_latest: true },
            { $set: { is_latest: false } }
        );
        const academicRecord = await AcademicRecord.create({
            student_user_id: student._id,
            term_id: term._id,
            gpa_prev_sem: prevGpa,
            gpa_current: gpa,
            num_failed: numFailed,
            attendance_rate: attendance,
            shcvht_participation: Math.max(0, 4 - Math.floor(i / 2)),
            study_hours: Math.max(4, Math.round(gpa * 6)),
            motivation_score: motiv,
            stress_level: stress,
            sentiment_score: r2(sentScore),
            recorded_at: recordedAt,
            is_latest: true,
            version: 1,
            updated_by: null,
        });

        // Risk prediction
        let riskLabel, riskScore;
        if (gpa < 2.0) { riskLabel = -1; riskScore = r2(0.75 + Math.random() * 0.20); }
        else if (gpa < 2.5) { riskLabel = -1; riskScore = r2(0.60 + Math.random() * 0.20); }
        else if (gpa < 2.8) { riskLabel = 0; riskScore = r2(0.40 + Math.random() * 0.25); }
        else { riskLabel = 1; riskScore = r2(0.05 + Math.random() * 0.30); }

        await RiskPrediction.updateMany(
            { student_user_id: student._id, term_id: term._id, is_latest: true },
            { $set: { is_latest: false } }
        );
        const riskPred = await RiskPrediction.create({
            student_user_id: student._id,
            term_id: term._id,
            risk_score: riskScore,
            risk_label: riskLabel,
            model_name: "RandomForest",
            predicted_at: new Date(recordedAt.getTime() + 2 * 24 * 3600 * 1000),
            is_latest: true,
        });

        // Meeting — snap vào khung giờ học: sáng 7-11h, chiều 14-17h, tối 19-21h
        const SLOTS = [
            { startH: 7, startM: 0, durationMin: 90 },  // sáng:  7:00 → 8:30
            { startH: 7, startM: 30, durationMin: 90 },  // sáng:  7:30 → 9:00
            { startH: 8, startM: 0, durationMin: 90 },  // sáng:  8:00 → 9:30
            { startH: 9, startM: 0, durationMin: 90 },  // sáng:  9:00 → 10:30
            { startH: 9, startM: 30, durationMin: 90 },  // sáng:  9:30 → 11:00
            { startH: 14, startM: 0, durationMin: 90 },  // chiều: 14:00 → 15:30
            { startH: 14, startM: 30, durationMin: 90 },  // chiều: 14:30 → 16:00
            { startH: 15, startM: 0, durationMin: 90 },  // chiều: 15:00 → 16:30
            { startH: 15, startM: 30, durationMin: 90 },  // chiều: 15:30 → 17:00
            { startH: 19, startM: 0, durationMin: 90 },  // tối:   19:00 → 20:30
            { startH: 19, startM: 30, durationMin: 90 },  // tối:   19:30 → 21:00
        ];
        const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
        const baseDay = new Date(termMid.getTime() - 7 * 24 * 3600 * 1000);
        const meetingTime = new Date(baseDay);
        meetingTime.setHours(slot.startH, slot.startM, 0, 0);
        const meetingEndTime = new Date(meetingTime.getTime() + slot.durationMin * 60 * 1000);
        let meeting = await Meeting.findOne({ class_id: advisorClass._id, term_id: term._id });
        if (!meeting) {
            meeting = await Meeting.create({
                class_id: advisorClass._id,
                student_user_ids: [student._id],
                advisor_user_id: advisor._id,
                term_id: term._id,
                meeting_time: meetingTime,
                meeting_end_time: meetingEndTime,
                notes_raw: pickText(MEETING_NOTES)(term.term_name),
                status: "ACTIVE",
            });
        } else {
            // Thêm student vào meeting nếu chưa có
            await Meeting.updateOne(
                { _id: meeting._id },
                { $addToSet: { student_user_ids: student._id } }
            );
        }

        // Feedback
        let feedback = await Feedback.findOne({ meeting_id: meeting._id, student_user_id: student._id });
        if (!feedback) {
            const fbTexts = FEEDBACK_TEXTS[sentLabel] || FEEDBACK_TEXTS.NEUTRAL;
            feedback = await Feedback.create({
                class_id: advisorClass._id,
                student_user_id: student._id,
                advisor_user_id: advisor._id,
                meeting_id: meeting._id,
                feedback_text: pickText(fbTexts),
                rating,
                submitted_at: new Date(meetingEndTime.getTime() + 2 * 3600 * 1000),
                sentiment_label: sentLabel,
                feedback_score: r2(sentScore),
            });
        }

        // Alerts — dùng jitter ngẫu nhiên để detected_at không bị nhóm theo loại
        const detectedBase = new Date(riskPred.predicted_at.getTime() + 30 * 60 * 1000);
        const randJitter = () => Math.floor(Math.random() * 6 * 3600 * 1000); // 0–6 giờ ngẫu nhiên
        const createdAlerts = [];

        if (riskLabel <= 0) {
            const severity = riskLabel === -1 ? "HIGH" : "MEDIUM";
            const a = await Alert.create({
                student_user_id: student._id, term_id: term._id,
                alert_type: "RISK", source_ai: "AI01_RISK", severity,
                risk_prediction_id: riskPred._id, academic_record_id: academicRecord._id,
                metadata: { gpa, risk_score: riskScore, num_failed: numFailed },
                status: alertStatus, detected_at: new Date(detectedBase.getTime() + randJitter()),
            });
            createdAlerts.push({ alert: a, type: "RISK", severity, meta: { riskScore: riskScore.toFixed(2) } });
        }

        if (sentLabel === "NEGATIVE") {
            const severity = sentScore < -0.5 ? "HIGH" : "MEDIUM";
            const a = await Alert.create({
                student_user_id: student._id, term_id: term._id,
                alert_type: "SENTIMENT", source_ai: "AI02_SENTIMENT", severity,
                feedback_id: feedback._id, academic_record_id: academicRecord._id,
                metadata: { sentiment_label: sentLabel, feedback_score: r2(sentScore), stress_level: stress },
                status: alertStatus, detected_at: new Date(feedback.submitted_at.getTime() + 60 * 60 * 1000 + randJitter()),
            });
            createdAlerts.push({ alert: a, type: "SENTIMENT", severity, meta: {} });
        }

        const gpaDrop = prevGpa !== null ? prevGpa - gpa : 0;
        if (attendance < 0.65 || numFailed >= 3 || gpaDrop >= 0.5) {
            const severity = (attendance < 0.55 || numFailed >= 3) ? "HIGH" : "MEDIUM";
            const a = await Alert.create({
                student_user_id: student._id, term_id: term._id,
                alert_type: "ANOMALY", source_ai: "AI04_ANOMALY", severity,
                academic_record_id: academicRecord._id,
                metadata: { rule: "attendance/failed/gpa-drop", gpa_prev_sem: prevGpa, gpa_current: gpa, attendance_rate: attendance, num_failed: numFailed, gpa_drop: r2(gpaDrop) },
                status: alertStatus, detected_at: new Date(detectedBase.getTime() + randJitter()),
            });
            createdAlerts.push({ alert: a, type: "ANOMALY", severity, meta: {} });
        }

        // Notifications — shuffle để tránh thứ tự cố định RISK→SENTIMENT→ANOMALY
        const isOldTerm = !isActiveTerm;
        // Cap sent_at tối đa 2026-05-15 để notification demo AI (từ 2026-05-17+) luôn nổi lên đầu
        const NOTIF_CAP = new Date("2026-05-15T23:59:59.000Z");
        const shuffledAlerts = [...createdAlerts].sort(() => Math.random() - 0.5);
        for (const { alert, type, severity, meta } of shuffledAlerts) {
            const advTpl = (NOTIF_ADVISOR[type] || {})[severity] || (NOTIF_ADVISOR[type] || {}).MEDIUM;
            if (advTpl) {
                const { title, content } = advTpl(svName, svCode, meta?.riskScore);
                const rawSentAt = new Date(alert.detected_at.getTime() + (5 + Math.floor(Math.random() * 20)) * 60 * 1000);
                const sentAt = rawSentAt > NOTIF_CAP ? new Date(NOTIF_CAP.getTime() - Math.floor(Math.random() * 30 * 24 * 3600 * 1000)) : rawSentAt;
                await Notification.create({
                    recipient_user_id: advisor._id, alert_id: alert._id,
                    title, content, is_read: isOldTerm, sent_at: sentAt,
                    read_at: isOldTerm ? new Date(sentAt.getTime() + 3 * 3600 * 1000) : undefined,
                });
            }
            const stuTpl = (NOTIF_STUDENT[type] || {})[severity] || (NOTIF_STUDENT[type] || {}).MEDIUM;
            if (stuTpl) {
                const { title, content } = stuTpl(term.term_name);
                const rawSentAt = new Date(alert.detected_at.getTime() + (10 + Math.floor(Math.random() * 30)) * 60 * 1000);
                const sentAt = rawSentAt > NOTIF_CAP ? new Date(NOTIF_CAP.getTime() - Math.floor(Math.random() * 30 * 24 * 3600 * 1000)) : rawSentAt;
                await Notification.create({
                    recipient_user_id: student._id, alert_id: alert._id,
                    title, content, is_read: isOldTerm, sent_at: sentAt,
                    read_at: isOldTerm ? new Date(sentAt.getTime() + 6 * 3600 * 1000) : undefined,
                });
            }
        }

        // Recommendations
        if (riskLabel === -1) {
            const pool = [...RECO_TEMPLATES.HIGH_RISK].sort(() => Math.random() - 0.5).slice(0, 2);
            for (const reco of pool) {
                await Recommendation.create({ student_user_id: student._id, term_id: term._id, risk_prediction_id: riskPred._id, ...reco });
            }
        } else if (riskLabel === 0) {
            const reco = RECO_TEMPLATES.MEDIUM_RISK[i % RECO_TEMPLATES.MEDIUM_RISK.length];
            await Recommendation.create({ student_user_id: student._id, term_id: term._id, risk_prediction_id: riskPred._id, ...reco });
        }
        const gpaDrop2 = prevGpa !== null ? prevGpa - gpa : 0;
        if (attendance < 0.65 || numFailed >= 3 || gpaDrop2 >= 0.5) {
            await Recommendation.create({ student_user_id: student._id, term_id: term._id, risk_prediction_id: riskPred._id, ...RECO_TEMPLATES.ANOMALY[0] });
        }
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const isReset = process.argv.includes("--reset");
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required in .env");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    if (isReset) await resetShowcaseData();

    // 1. Load master data
    const activeTerm = await Term.findOne({ status: "ACTIVE" }).lean();
    if (!activeTerm) throw new Error("Không tìm thấy kỳ học ACTIVE trong DB");

    const allTerms = await Term.find({ start_date: { $lte: activeTerm.start_date } })
        .sort({ start_date: -1 }).limit(MAX_TERMS).lean();
    allTerms.reverse(); // cũ → mới
    const numTerms = allTerms.length;
    console.log(`\nSử dụng ${numTerms} kỳ: ${allTerms.map(t => t.term_code).join(", ")}`);

    const khmt = await Department.findOne({ department_code: "KHMT" }).lean();
    if (!khmt) throw new Error("Không tìm thấy department KHMT trong DB");
    // Tìm đúng ngành Khoa học Máy tính (major_code = "KHMT"), không lấy đại ngành đầu tiên
    const khmtMajor = await Major.findOne({ department_id: khmt._id, major_code: "KHMT" }).lean()
        ?? await Major.findOne({ department_id: khmt._id }).lean();
    if (!khmtMajor) throw new Error("Không tìm thấy major thuộc KHMT trong DB");

    const pwHash = await bcrypt.hash(PLAIN_PASSWORD, 10);

    // 2. Tạo 3 tài khoản showcase
    console.log("\n👤 Tạo tài khoản showcase...");

    await User.findOneAndUpdate(
        { email: ADMIN_EMAIL },
        { $set: { email: ADMIN_EMAIL, password_hash: pwHash, username: "admin_hethong", role: "ADMIN", status: "ACTIVE", profile: { full_name: "Quản trị viên hệ thống", gender: "OTHER" } } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ADMIN   : ${ADMIN_EMAIL}`);

    const advisor = await User.findOneAndUpdate(
        { email: ADVISOR_EMAIL },
        {
            $set: {
                email: ADVISOR_EMAIL, password_hash: pwHash, username: "lehaikhoa_cv",
                role: "ADVISOR", status: "ACTIVE",
                profile: { full_name: "Lê Hải Khoa", gender: "MALE", phone: "0901234568", date_of_birth: new Date(1985, 4, 12) },
                org: { department_id: khmt._id, major_id: khmtMajor._id },
                advisor_info: { staff_code: "GV_LHK01", title: "Thạc sĩ" },
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ADVISOR : ${ADVISOR_EMAIL}`);

    const student = await User.findOneAndUpdate(
        { email: STUDENT_EMAIL },
        {
            $set: {
                email: STUDENT_EMAIL, password_hash: pwHash, username: "trandinhquan_sv",
                role: "STUDENT", status: "ACTIVE",
                profile: { full_name: "Trần Đình Quân", gender: "MALE", phone: "0901234567", date_of_birth: new Date(2004, 0, 15) },
                org: { department_id: khmt._id, major_id: khmtMajor._id },
                student_info: { student_code: "22IT000", cohort_year: 2022, advisor_user_id: advisor._id, enrollment_status: "ENROLLED" },
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  STUDENT : ${STUDENT_EMAIL}`);

    // 3. Tạo lớp cố vấn
    console.log("\n🏫 Tạo lớp cố vấn...");
    const advisorClass = await AdvisorClass.findOneAndUpdate(
        { class_code: CLASS_CODE },
        {
            $set: {
                class_code: CLASS_CODE,
                class_name: "Khoa học Máy tính K22 - Nhóm A",
                advisor_user_id: advisor._id,
                department_id: khmt._id,
                major_id: khmtMajor._id,
                cohort_year: 2022,
                status: "ACTIVE",
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  Lớp: ${CLASS_CODE} — ${advisorClass.class_name}`);

    // Gán showcase student vào lớp
    await ClassMember.findOneAndUpdate(
        { student_user_id: student._id },
        { $set: { class_id: advisorClass._id, student_user_id: student._id, joined_at: new Date(2022, 8, 1), status: "ACTIVE" } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Seed dữ liệu showcase student (đầy đủ nhất)
    console.log(`\n📚 Seed dữ liệu showcase student (${numTerms} kỳ)...`);
    const showcaseTimeline = allTerms.map((_, i) => {
        const tIdx = Math.min(i, ACADEMIC_TIMELINE.length - 1);
        return ACADEMIC_TIMELINE[tIdx];
    });
    await seedStudentData(student, allTerms, advisorClass, advisor, "Trần Đình Quân", "22IT000", showcaseTimeline);
    console.log("  ✅ Showcase student hoàn tất");

    // 5. Tạo 50 sinh viên trong lớp + seed dữ liệu
    console.log(`\n👥 Tạo ${CLASS_SIZE} sinh viên trong lớp...`);
    const gpaState = {};

    for (let idx = 0; idx < STUDENT_LIST.length; idx++) {
        const s = STUDENT_LIST[idx];
        const tier = TIER_MAP[s.code];

        // Tìm theo email HOẶC student_code để tránh E11000 duplicate key
        let sv = await User.findOne({
            $or: [{ email: s.email }, { "student_info.student_code": s.code }],
        });
        const svData = {
            email: s.email,
            password_hash: pwHash,
            username: s.email.split("@")[0],
            role: "STUDENT", status: "ACTIVE",
            profile: { full_name: s.name, gender: s.gender, date_of_birth: new Date(...s.dob) },
            org: { department_id: khmt._id, major_id: khmtMajor._id },
            student_info: { student_code: s.code, cohort_year: 2022, advisor_user_id: advisor._id, enrollment_status: "ENROLLED" },
        };
        if (sv) {
            await User.updateOne({ _id: sv._id }, { $set: svData });
            sv = await User.findById(sv._id);
        } else {
            sv = await User.create(svData);
        }

        await ClassMember.findOneAndUpdate(
            { student_user_id: sv._id },
            { $set: { class_id: advisorClass._id, student_user_id: sv._id, joined_at: new Date(2022, 8, 1), status: "ACTIVE" } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Tạo timeline GPA cho SV này
        gpaState[s.code] = initialGPA(tier);
        const svTimeline = allTerms.map((_, i) => {
            if (i > 0) gpaState[s.code] = nextGPA(tier, gpaState[s.code]);
            const gpa = gpaState[s.code];
            const numFailed = gpa < 2.0 ? Math.floor(Math.random() * 3) + 1 : gpa < 2.5 ? (Math.random() < 0.3 ? 1 : 0) : 0;
            const attendance = gpa >= 3.0 ? r2(0.85 + Math.random() * 0.15) : gpa >= 2.5 ? r2(0.70 + Math.random() * 0.20) : gpa >= 2.0 ? r2(0.55 + Math.random() * 0.20) : r2(0.30 + Math.random() * 0.30);
            const stress = gpa >= 3.2 ? Math.ceil(Math.random() * 2) : gpa >= 2.5 ? 2 + Math.ceil(Math.random() * 2) : 3 + Math.ceil(Math.random() * 2);
            const motiv = gpa >= 3.2 ? 3 + Math.ceil(Math.random() * 2) : gpa >= 2.5 ? 2 + Math.ceil(Math.random() * 2) : 1 + Math.ceil(Math.random() * 2);
            const sentScore = gpa >= 3.0 ? r2(0.2 + Math.random() * 0.6) : gpa >= 2.5 ? r2(-0.1 + Math.random() * 0.5) : r2(-0.7 + Math.random() * 0.5);
            const sentLabel = sentScore > 0.2 ? "POSITIVE" : sentScore < -0.2 ? "NEGATIVE" : "NEUTRAL";
            const rating = sentLabel === "POSITIVE" ? 4 + Math.round(Math.random()) : sentLabel === "NEGATIVE" ? 1 + Math.round(Math.random()) : 3;
            return [r2(gpa), numFailed, attendance, stress, motiv, sentScore, sentLabel, rating];
        });

        await seedStudentData(sv, allTerms, advisorClass, advisor, s.name, s.code, svTimeline);

        if ((idx + 1) % 10 === 0) console.log(`  [${idx + 1}/${CLASS_SIZE}] đã xử lý...`);
    }

    // 6. Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 THỐNG KÊ:");
    const allSvIds = [student._id, ...(await User.find({ email: { $in: STUDENT_LIST.map(s => s.email) } }).select("_id").lean()).map(u => u._id)];
    const stats = [
        ["Sinh viên trong lớp", await ClassMember.countDocuments({ class_id: advisorClass._id, status: "ACTIVE" })],
        ["Academic records", await AcademicRecord.countDocuments({ student_user_id: { $in: allSvIds } })],
        ["Risk predictions", await RiskPrediction.countDocuments({ student_user_id: { $in: allSvIds } })],
        ["Meetings", await Meeting.countDocuments({ class_id: advisorClass._id })],
        ["Feedbacks", await Feedback.countDocuments({ student_user_id: { $in: allSvIds } })],
        ["Alerts tổng", await Alert.countDocuments({ student_user_id: { $in: allSvIds } })],
        ["  → RISK", await Alert.countDocuments({ student_user_id: { $in: allSvIds }, alert_type: "RISK" })],
        ["  → SENTIMENT", await Alert.countDocuments({ student_user_id: { $in: allSvIds }, alert_type: "SENTIMENT" })],
        ["  → ANOMALY", await Alert.countDocuments({ student_user_id: { $in: allSvIds }, alert_type: "ANOMALY" })],
        ["Notifications (SV)", await Notification.countDocuments({ recipient_user_id: student._id })],
        ["Notifications (CV)", await Notification.countDocuments({ recipient_user_id: advisor._id })],
        ["Recommendations", await Recommendation.countDocuments({ student_user_id: { $in: allSvIds } })],
    ];
    for (const [label, count] of stats) console.log(`  ${label.padEnd(22)} ${count}`);
    console.log("\n🔑 Tài khoản demo:");
    console.log(`  ADMIN   : ${ADMIN_EMAIL} / ${PLAIN_PASSWORD}`);
    console.log(`  ADVISOR : ${ADVISOR_EMAIL} / ${PLAIN_PASSWORD}`);
    console.log(`  STUDENT : ${STUDENT_EMAIL} / ${PLAIN_PASSWORD}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SEED SHOWCASE HOÀN TẤT");

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error("\n❌ SEED THẤT BẠI:", err.message);
    console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
});
