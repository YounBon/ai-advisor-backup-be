const { GoogleGenerativeAI } = require("@google/generative-ai");
const AcademicRecord = require("../models/academicRecord.model");
const RiskPrediction = require("../models/riskPrediction.model");
const Notification = require("../models/notification.model");
const ClassMember = require("../models/classMember.model");
const User = require("../models/user.model");
const throwError = require("../utils/throwError");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Model fallback — cùng thế hệ 2.5, nhẹ hơn, ít bị overload hơn
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite";

// Hỗ trợ N API key — key 1 dùng model chính, key 2+ dùng model fallback
// Thêm key bằng cách set GEMINI_API_KEY_3, GEMINI_API_KEY_4, ... trong .env
const GEMINI_API_KEYS = (() => {
    const entries = [];
    if (process.env.GEMINI_API_KEY) {
        entries.push({
            apiKey: process.env.GEMINI_API_KEY,
            modelName: GEMINI_MODEL,
            keyId: "key#1"
        });
    }
    let i = 2;
    while (process.env[`GEMINI_API_KEY_${i}`]) {
        entries.push({
            apiKey: process.env[`GEMINI_API_KEY_${i}`],
            modelName: GEMINI_FALLBACK_MODEL,
            keyId: `key#${i}`
        });
        i++;
    }
    return entries;
})();

// ============ USAGE TRACKER ============
// Theo dõi số request/ngày cho từng key
const usageTracker = {
    // { "key#1": { "2026-05-07": 42, "2026-05-08": 15 }, "key#2": { ... } }
    data: {},

    getToday() {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    },

    increment(keyId) {
        const today = this.getToday();
        if (!this.data[keyId]) this.data[keyId] = {};
        this.data[keyId][today] = (this.data[keyId][today] || 0) + 1;
    },

    getCount(keyId, date = null) {
        const targetDate = date || this.getToday();
        return this.data[keyId]?.[targetDate] || 0;
    },

    getSummary() {
        const today = this.getToday();
        const summary = {};
        GEMINI_API_KEYS.forEach(({ keyId }) => {
            summary[keyId] = this.getCount(keyId, today);
        });
        return summary;
    },

    logSummary() {
        const summary = this.getSummary();
        const today = this.getToday();
        console.log(`\n[Chatbot Usage] ${today}`);
        Object.entries(summary).forEach(([keyId, count]) => {
            console.log(`  ${keyId}: ${count} requests`);
        });
    }
};

// Các HTTP status code / message cần fallback sang key khác
const FALLBACK_STATUS_CODES = new Set([401, 403, 429, 500, 503, 504]);
const FALLBACK_MESSAGE_PATTERNS = [
    "401", "403", "429", "quota", "rate limit", "resource exhausted",
    "overloaded", "service unavailable", "internal error",
    "invalid api key", "api key not valid",
    "500", "503", "504",
];

function shouldFallback(err) {
    if (!err) return false;
    const status = err?.status ?? err?.statusCode ?? err?.response?.status;
    if (status && FALLBACK_STATUS_CODES.has(Number(status))) return true;
    const msg = (err?.message || "").toLowerCase();
    return FALLBACK_MESSAGE_PATTERNS.some(p => msg.includes(p));
}

// System prompt — giới hạn chatbot chỉ trả lời về học vụ và dữ liệu của sinh viên
const SYSTEM_PROMPT = `Bạn là trợ lý học vụ AI của hệ thống AI-Advisor, được triển khai tại Đại học Duy Tân (DTU), Đà Nẵng.

PHẠM VI TRẢ LỜI (chỉ trả lời các chủ đề sau):
1. Học vụ tại Đại học Duy Tân: quy chế học vụ, điều kiện tốt nghiệp, học lại, cải thiện điểm, học bổng, cảnh báo học vụ, tín chỉ, GPA, xếp loại học lực
2. Dữ liệu cá nhân của sinh viên: GPA, điểm rủi ro, lịch sử học tập, thông báo, số môn trượt, tỉ lệ tham dự
3. Tư vấn học tập: dựa trên dữ liệu thực tế của sinh viên để đưa ra lời khuyên cụ thể
4. Hướng dẫn sử dụng hệ thống AI-Advisor: cách nộp dữ liệu học tập, xem thông báo, gửi phản hồi
5. Quy chế học vụ đại học tín chỉ tại Việt Nam (học phần, tín chỉ, điểm trung bình tích lũy, v.v.)

QUY TẮC BẮT BUỘC:
- Nếu câu hỏi KHÔNG liên quan đến học vụ, hệ thống, hoặc dữ liệu sinh viên → từ chối lịch sự và nhắc lại phạm vi hỗ trợ
- Luôn trả lời bằng tiếng Việt, ngắn gọn, thân thiện nhưng lịch sự và phù hợp môi trường học thuật
- Khi có dữ liệu sinh viên trong context, ưu tiên dùng dữ liệu đó để trả lời cụ thể
- Không bịa đặt dữ liệu nếu không có trong context
- Không đưa ra lời khuyên y tế, pháp lý, tài chính cá nhân
- Xưng hô: gọi sinh viên là "bạn", tự xưng là "mình" hoặc "trợ lý"
- Giữ câu trả lời dưới 400 từ, luôn kết thúc bằng câu hoàn chỉnh — không được bỏ lửng giữa chừng
- TUYỆT ĐỐI không dùng markdown trong câu trả lời: không dùng **, __, ##, *, -, bullet dạng ký tự đặc biệt. Nếu cần liệt kê, dùng số thứ tự (1. 2. 3.) và xuống dòng thông thường
- Khi đề cập đến cố vấn học tập, dùng "thầy/cô [Họ tên]" hoặc "giảng viên cố vấn [Họ tên]" — không gọi là "bạn"

CÁCH ĐỀ CẬP QUY CHẾ HỌC VỤ:
- Khi trả lời về quy chế, điều kiện, chính sách học vụ → luôn gắn với "Đại học Duy Tân" hoặc "DTU"
- Ví dụ: "Theo quy chế học vụ tại Đại học Duy Tân..." hoặc "Tại DTU, sinh viên cần..."
- Không dùng cụm "các trường đại học Việt Nam nói chung" — thay bằng "Đại học Duy Tân" hoặc "DTU"
- Chỉ thêm ghi chú "*(Lưu ý: thông tin mang tính tham khảo — vui lòng xác nhận với Phòng Đào tạo DTU để có quy định chính xác nhất.)*" khi câu trả lời đề cập đến quy chế, chính sách, điều kiện học vụ mang tính tổng quát mà mình không chắc chắn 100%
- KHÔNG thêm ghi chú đó khi trả lời từ dữ liệu thực tế của sinh viên trong context (tên, GPA, điểm số, thông báo, thông tin lớp, cố vấn, v.v.) — những thông tin này đã chính xác, không cần disclaimer`;

/**
 * Lấy context dữ liệu học tập của sinh viên để nhét vào prompt
 */
async function buildStudentContext(studentUserId) {
    try {
        const [student, latestRecord, latestRisk, recentNotifs, membership] = await Promise.all([
            User.findById(studentUserId)
                .select("profile.full_name student_info.student_code org")
                .populate("org.department_id", "department_name")
                .populate("org.major_id", "major_name")
                .lean(),
            AcademicRecord.findOne({ student_user_id: studentUserId, is_latest: true })
                .sort({ recorded_at: -1 })
                .populate("term_id", "term_name term_code")
                .lean(),
            RiskPrediction.findOne({ student_user_id: studentUserId, is_latest: true })
                .sort({ predicted_at: -1 })
                .populate("term_id", "term_name term_code")
                .lean(),
            Notification.find({ recipient_user_id: studentUserId })
                .sort({ sent_at: -1 })
                .limit(3)
                .lean(),
            ClassMember.findOne({ student_user_id: studentUserId, status: "ACTIVE" })
                .populate({
                    path: "class_id",
                    select: "class_code class_name advisor_user_id",
                    populate: { path: "advisor_user_id", select: "profile.full_name email" },
                })
                .lean(),
        ]);

        const lines = [];

        if (student) {
            lines.push(`=== THÔNG TIN SINH VIÊN ===`);
            lines.push(`Họ tên: ${student.profile?.full_name || "Chưa cập nhật"}`);
            lines.push(`Mã SV: ${student.student_info?.student_code || "Chưa cập nhật"}`);
            if (student.org?.department_id?.department_name) {
                lines.push(`Khoa: ${student.org.department_id.department_name}`);
            }
            if (student.org?.major_id?.major_name) {
                lines.push(`Ngành: ${student.org.major_id.major_name}`);
            }
        }

        if (membership?.class_id) {
            const cls = membership.class_id;
            lines.push(`\n=== LỚP CỐ VẤN ===`);
            lines.push(`Lớp: ${cls.class_code || ""} - ${cls.class_name || ""}`);
            if (cls.advisor_user_id?.profile?.full_name) {
                lines.push(`Cố vấn học tập: ${cls.advisor_user_id.profile.full_name}`);
                if (cls.advisor_user_id.email) {
                    lines.push(`Email cố vấn: ${cls.advisor_user_id.email}`);
                }
            }
        }

        if (latestRecord) {
            const termLabel = latestRecord.term_id?.term_name || latestRecord.term_id?.term_code || "Học kỳ hiện tại";
            lines.push(`\n=== DỮ LIỆU HỌC TẬP MỚI NHẤT (${termLabel}) ===`);
            if (latestRecord.gpa_current != null) lines.push(`GPA hiện tại: ${Number(latestRecord.gpa_current).toFixed(2)}/4.0`);
            if (latestRecord.gpa_prev_sem != null) lines.push(`GPA kỳ trước: ${Number(latestRecord.gpa_prev_sem).toFixed(2)}/4.0`);
            if (latestRecord.num_failed != null) lines.push(`Số môn trượt: ${latestRecord.num_failed}`);
            if (latestRecord.attendance_rate != null) lines.push(`Tỉ lệ tham dự: ${(Number(latestRecord.attendance_rate) * 100).toFixed(0)}%`);
            if (latestRecord.stress_level != null) lines.push(`Mức stress: ${latestRecord.stress_level}/5`);
            if (latestRecord.motivation_score != null) lines.push(`Động lực học: ${latestRecord.motivation_score}/5`);
            if (latestRecord.study_hours != null) lines.push(`Giờ tự học/tuần: ${latestRecord.study_hours}`);
            if (latestRecord.sentiment_score != null) lines.push(`Điểm cảm xúc: ${Number(latestRecord.sentiment_score).toFixed(2)} (thang -1 đến 1)`);
        } else {
            lines.push(`\n=== DỮ LIỆU HỌC TẬP ===`);
            lines.push(`Chưa có dữ liệu học tập nào được nộp.`);
        }

        if (latestRisk) {
            const riskLabelMap = { "-1": "Cao", "0": "Trung bình", "1": "Thấp" };
            const riskLabel = riskLabelMap[String(latestRisk.risk_label)] || "Chưa xác định";
            lines.push(`\n=== ĐÁNH GIÁ RỦI RO HỌC TẬP ===`);
            lines.push(`Mức rủi ro: ${riskLabel}`);
            lines.push(`Điểm rủi ro: ${Number(latestRisk.risk_score).toFixed(3)} (0=thấp, 1=cao)`);
        }

        if (recentNotifs.length > 0) {
            lines.push(`\n=== THÔNG BÁO GẦN ĐÂY ===`);
            recentNotifs.forEach((n, i) => {
                lines.push(`${i + 1}. [${n.is_read ? "Đã đọc" : "Chưa đọc"}] ${n.title}: ${n.content}`);
            });
        }

        return lines.join("\n");
    } catch (err) {
        console.warn("[Chatbot] buildStudentContext error:", err?.message);
        return "Không thể tải dữ liệu sinh viên.";
    }
}

/**
 * Thực hiện 1 lần gọi Gemini với API key và model cụ thể
 */
async function callGemini({ apiKey, keyId, modelName, message, trimmedHistory, systemInstruction }) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
    });

    // thinkingConfig chỉ hỗ trợ trên gemini-2.5-x, bỏ qua cho các model khác
    const generationConfig = {
        maxOutputTokens: 2048,
        temperature: 0.7,
        ...(modelName.startsWith("gemini-2.5") && {
            thinkingConfig: { thinkingBudget: 0 },
        }),
    };

    const chat = model.startChat({
        history: trimmedHistory,
        generationConfig,
    });

    const startTime = Date.now();
    const result = await chat.sendMessage(message);
    const elapsed = Date.now() - startTime;
    const response = result.response;

    const usage = {
        prompt_tokens: response.usageMetadata?.promptTokenCount || null,
        completion_tokens: response.usageMetadata?.candidatesTokenCount || null,
        total_tokens: response.usageMetadata?.totalTokenCount || null,
    };

    // Track usage
    usageTracker.increment(keyId);
    const todayCount = usageTracker.getCount(keyId);
    const allSummary = usageTracker.getSummary();
    const summaryStr = Object.entries(allSummary)
        .map(([k, v]) => `${k}=${v}`)
        .join(' | ');

    console.log(
        `[Chatbot] ✓ ${keyId} (${modelName}) | ` +
        `${elapsed}ms | ` +
        `tokens: ${usage.total_tokens ?? '?'} (prompt=${usage.prompt_tokens ?? '?'}, completion=${usage.completion_tokens ?? '?'}) | ` +
        `today: ${keyId}=${todayCount} req | all: ${summaryStr}`
    );

    return { reply: response.text(), usage };
}

class ChatbotService {
    constructor() {
        if (GEMINI_API_KEYS.length === 0) {
            console.warn("[Chatbot] Không có GEMINI_API_KEY nào được cấu hình — chatbot sẽ không hoạt động");
        } else {
            console.log(`[Chatbot] Đã cấu hình ${GEMINI_API_KEYS.length} API key(s):`);
            GEMINI_API_KEYS.forEach((entry) => {
                console.log(`  ${entry.keyId}: model=${entry.modelName}`);
            });
        }
    }

    /**
     * Gửi tin nhắn với fallback tự động giữa các API key
     * @param {string} studentUserId
     * @param {string} message
     * @param {Array}  history - [{role: "user"|"model", parts: [{text}]}]
     */
    async chat(studentUserId, message, history = []) {
        if (GEMINI_API_KEYS.length === 0) {
            throwError("Chatbot chưa được cấu hình. Vui lòng liên hệ quản trị viên.", 503);
        }
        if (!message || typeof message !== "string" || message.trim().length === 0) {
            throwError("Tin nhắn không được để trống", 422);
        }
        if (message.trim().length > 1000) {
            throwError("Tin nhắn quá dài (tối đa 1000 ký tự)", 422);
        }

        const MAX_HISTORY = 20;
        const trimmedHistory = history.slice(-MAX_HISTORY);
        const studentContext = await buildStudentContext(studentUserId);
        const systemInstruction = `${SYSTEM_PROMPT}\n\n${studentContext}`;
        const trimmedMessage = message.trim();

        let lastError = null;

        // Thử lần lượt: key1(gemini-2.5-flash) → key2(gemini-2.0-flash)
        for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
            const { apiKey, keyId, modelName } = GEMINI_API_KEYS[i];
            const label = `${keyId}, model=${modelName}`;

            if (i > 0) {
                console.warn(`[Chatbot] ↪ Fallback → ${label}`);
            } else {
                console.log(`[Chatbot] → Gửi request với ${label}`);
            }

            try {
                const result = await callGemini({
                    apiKey,
                    keyId,
                    modelName,
                    message: trimmedMessage,
                    trimmedHistory,
                    systemInstruction,
                });

                return result;
            } catch (err) {
                lastError = err;
                const canFallback = shouldFallback(err) && i < GEMINI_API_KEYS.length - 1;

                console.warn(
                    `[Chatbot] ✗ ${label}: ${err?.message || err}` +
                    (canFallback ? ` → thử key tiếp theo` : " → hết lượt thử")
                );

                if (!canFallback) break;
            }
        }

        // Tất cả key đều thất bại — log chi tiết ở backend, trả message tiếng Việt cho frontend
        const rawMsg = (lastError?.message || "").toLowerCase();
        const status = lastError?.status ?? lastError?.statusCode ?? lastError?.response?.status;

        // Log đầy đủ thông tin kỹ thuật ra terminal backend
        console.error(
            `[Chatbot] Tất cả ${GEMINI_API_KEYS.length} key đều thất bại.\n` +
            `  Student: ${studentUserId}\n` +
            `  Lỗi cuối: ${lastError?.message || lastError}\n` +
            `  Status: ${status || "unknown"}`
        );

        // Phân loại lỗi → trả message tiếng Việt thân thiện cho frontend
        if (status === 429 || rawMsg.includes("quota") || rawMsg.includes("rate limit") || rawMsg.includes("resource exhausted")) {
            throwError("Trợ lý AI đang bận, vui lòng thử lại sau vài phút.", 429);
        }
        if (status === 503 || rawMsg.includes("503") || rawMsg.includes("service unavailable") || rawMsg.includes("overloaded") || rawMsg.includes("high demand")) {
            throwError("Dịch vụ AI tạm thời quá tải. Vui lòng thử lại sau ít phút.", 503);
        }
        if (status === 500 || rawMsg.includes("500") || rawMsg.includes("internal error")) {
            throwError("Trợ lý AI gặp sự cố kỹ thuật. Vui lòng thử lại sau.", 502);
        }

        // Lỗi không xác định
        throwError("Trợ lý AI hiện không khả dụng. Vui lòng thử lại sau.", 503);
    }

    /**
     * Trả về thống kê usage cho admin
     * @returns {{ today: string, keys: Array<{ keyId, model, todayCount, allDates }> }}
     */
    getUsageStats() {
        const today = usageTracker.getToday();
        const keys = GEMINI_API_KEYS.map(({ keyId, modelName }) => ({
            keyId,
            model: modelName,
            todayCount: usageTracker.getCount(keyId, today),
            allDates: usageTracker.data[keyId] || {},
        }));
        return { today, keys };
    }
}

module.exports = new ChatbotService();
