/**
 * migrate-notification-content.js
 * Cập nhật title và content của các thông báo cũ (chưa có mã số sinh viên)
 * cho cả advisor lẫn sinh viên.
 *
 * Chạy: node scripts/migrate-notification-content.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");

const Notification = require("../src/models/notification.model");
const Alert = require("../src/models/alert.model");
const User = require("../src/models/user.model");
// Phải require Term để mongoose đăng ký schema trước khi populate
require("../src/models/term.model");

function log(msg) {
    console.log(`[migrate-notif] ${msg}`);
}

// ─── Templates cho thông báo gửi đến ADVISOR ─────────────────────────────────
const ADVISOR_TEMPLATES = {
    RISK: {
        HIGH: (name, code) => ({
            title: `⚠️ Cảnh báo rủi ro cao: ${name}${code ? ` - ${code}` : ""}`,
            content: `Sinh viên ${name}${code ? ` - ${code}` : ""} có nguy cơ học tập cao trong học kỳ này. GPA thấp và có môn trượt. Cần can thiệp ngay.`,
        }),
        MEDIUM: (name, code) => ({
            title: `🔔 Cảnh báo rủi ro: ${name}${code ? ` - ${code}` : ""}`,
            content: `Sinh viên ${name}${code ? ` - ${code}` : ""} có dấu hiệu rủi ro học tập ở mức trung bình. Cần theo dõi và hỗ trợ kịp thời.`,
        }),
        LOW: (name, code) => ({
            title: `ℹ️ Theo dõi học tập: ${name}${code ? ` - ${code}` : ""}`,
            content: `Sinh viên ${name}${code ? ` - ${code}` : ""} có một số chỉ số học tập cần chú ý. Khuyến khích gặp gỡ tư vấn.`,
        }),
    },
    SENTIMENT: {
        HIGH: (name, code) => ({
            title: `🚨 Cảnh báo tâm lý: ${name}${code ? ` - ${code}` : ""}`,
            content: `Sinh viên ${name}${code ? ` - ${code}` : ""} có phản hồi tiêu cực nghiêm trọng. Cần gặp gỡ và hỗ trợ tâm lý ngay.`,
        }),
        MEDIUM: (name, code) => ({
            title: `💬 Phản hồi tiêu cực: ${name}${code ? ` - ${code}` : ""}`,
            content: `Sinh viên ${name}${code ? ` - ${code}` : ""} bày tỏ cảm xúc tiêu cực trong phản hồi. Cần quan tâm và lắng nghe.`,
        }),
        LOW: (name, code) => ({
            title: `📝 Phản hồi cần chú ý: ${name}${code ? ` - ${code}` : ""}`,
            content: `Sinh viên ${name}${code ? ` - ${code}` : ""} có phản hồi cần được xem xét thêm.`,
        }),
    },
    ANOMALY: {
        HIGH: (name, code) => ({
            title: `⚡ Bất thường học tập: ${name}${code ? ` - ${code}` : ""}`,
            content: `Phát hiện bất thường trong dữ liệu học tập của sinh viên ${name}${code ? ` - ${code}` : ""}. Cần kiểm tra ngay.`,
        }),
        MEDIUM: (name, code) => ({
            title: `📊 Bất thường nhẹ: ${name}${code ? ` - ${code}` : ""}`,
            content: `Có sự thay đổi bất thường trong kết quả học tập của sinh viên ${name}${code ? ` - ${code}` : ""}.`,
        }),
        LOW: (name, code) => ({
            title: `📈 Thay đổi học tập: ${name}${code ? ` - ${code}` : ""}`,
            content: `Ghi nhận thay đổi trong xu hướng học tập của sinh viên ${name}${code ? ` - ${code}` : ""}.`,
        }),
    },
};

// ─── Templates cho thông báo gửi đến SINH VIÊN ───────────────────────────────
const STUDENT_TEMPLATES = {
    RISK: (termLabel) => ({
        title: "Cảnh báo nguy cơ học tập",
        content: `Hệ thống phát hiện bạn có nguy cơ cao về kết quả học tập${termLabel}. Hãy liên hệ cố vấn học tập để được hỗ trợ sớm nhất.`,
    }),
    ANOMALY: (termLabel) => ({
        title: "Phát hiện dấu hiệu bất thường",
        content: `Hệ thống phát hiện một số chỉ số học tập của bạn có biến động bất thường${termLabel}. Hãy liên hệ cố vấn học tập nếu bạn đang gặp khó khăn.`,
    }),
    SENTIMENT: (termLabel) => ({
        title: "Ghi nhận cảm xúc tiêu cực",
        content: `Hệ thống ghi nhận phản hồi cảm xúc tiêu cực của bạn${termLabel}. Nếu bạn đang gặp khó khăn tâm lý, hãy chia sẻ với cố vấn học tập.`,
    }),
};

async function main() {
    await connectDB();
    log("Đã kết nối DB");

    // ── 1. Load tất cả notifications kèm alert ────────────────────────────────
    const notifications = await Notification.find({})
        .populate({
            path: "alert_id",
            select: "alert_type severity student_user_id term_id",
            populate: { path: "term_id", select: "term_name term_code" },
        })
        .lean();

    log(`Tổng số notifications: ${notifications.length}`);

    // ── 2. Lấy danh sách student_user_id từ alerts ────────────────────────────
    const studentIds = [
        ...new Set(
            notifications
                .map((n) => {
                    const a = n.alert_id;
                    return a && typeof a === "object" ? String(a.student_user_id) : null;
                })
                .filter(Boolean)
        ),
    ];

    const students = await User.find({ _id: { $in: studentIds } })
        .select("_id profile.full_name student_info.student_code role")
        .lean();

    const studentMap = new Map(
        students.map((s) => [
            String(s._id),
            {
                name: s.profile?.full_name || s.student_info?.student_code || String(s._id),
                code: s.student_info?.student_code || null,
                role: s.role,
            },
        ])
    );

    // ── 3. Lấy danh sách advisor để phân biệt recipient là advisor hay sinh viên
    const advisorIds = new Set(
        students.filter((s) => s.role !== "STUDENT").map((s) => String(s._id))
    );
    // Lấy thêm tất cả user có role ADVISOR để check recipient
    const advisors = await User.find({ role: "ADVISOR" }).select("_id").lean();
    advisors.forEach((a) => advisorIds.add(String(a._id)));

    // ── 4. Cập nhật từng notification ─────────────────────────────────────────
    let updatedAdvisor = 0;
    let updatedStudent = 0;
    let skipped = 0;

    const bulkOps = [];

    for (const notif of notifications) {
        const alert = notif.alert_id;
        if (!alert || typeof alert !== "object") {
            skipped++;
            continue;
        }

        const studentId = String(alert.student_user_id);
        const sv = studentMap.get(studentId);
        if (!sv) {
            skipped++;
            continue;
        }

        const recipientId = String(notif.recipient_user_id);
        const isAdvisorRecipient = advisorIds.has(recipientId) || recipientId !== studentId;

        const alertType = alert.alert_type || "RISK";
        const severity = alert.severity || "MEDIUM";

        let newTitle, newContent;

        if (isAdvisorRecipient) {
            // Thông báo gửi cho ADVISOR — cần có tên + mã số sinh viên
            const tplGroup = ADVISOR_TEMPLATES[alertType] || ADVISOR_TEMPLATES.RISK;
            const tpl = tplGroup[severity] || tplGroup.MEDIUM;
            const result = tpl(sv.name, sv.code);
            newTitle = result.title;
            newContent = result.content;
            updatedAdvisor++;
        } else {
            // Thông báo gửi cho chính SINH VIÊN — không cần mã số
            const termObj = alert.term_id;
            const termName =
                termObj && typeof termObj === "object"
                    ? termObj.term_name || termObj.term_code || null
                    : null;
            const termLabel = termName ? ` trong ${termName}` : "";
            const tpl = STUDENT_TEMPLATES[alertType] || STUDENT_TEMPLATES.RISK;
            const result = tpl(termLabel);
            newTitle = result.title;
            newContent = result.content;
            updatedStudent++;
        }

        bulkOps.push({
            updateOne: {
                filter: { _id: notif._id },
                update: { $set: { title: newTitle, content: newContent } },
            },
        });
    }

    // ── 5. Thực hiện bulk update ───────────────────────────────────────────────
    if (bulkOps.length > 0) {
        const result = await Notification.bulkWrite(bulkOps, { ordered: false });
        log(`Đã cập nhật: ${result.modifiedCount} notifications`);
        log(`  → Thông báo cho advisor: ${updatedAdvisor}`);
        log(`  → Thông báo cho sinh viên: ${updatedStudent}`);
        log(`  → Bỏ qua (không có alert/student): ${skipped}`);
    } else {
        log("Không có notifications nào cần cập nhật.");
    }

    log("Migration hoàn tất!");
    await mongoose.disconnect();
}

main().catch((e) => {
    console.error(e);
    mongoose.disconnect();
    process.exit(1);
});
