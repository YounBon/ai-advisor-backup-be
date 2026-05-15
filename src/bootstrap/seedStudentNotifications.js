require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/user.model");
const Alert = require("../models/alert.model");
const Term = require("../models/term.model");
const Notification = require("../models/notification.model");

function log(msg) { console.log(`[seed-notif] ${msg}`); }

async function main() {
    await connectDB();
    log("Connected");

    const student = await User.findOne({ username: "sv_trandinhkhoa" }).select("_id");
    if (!student) { log("Student not found"); process.exit(1); }

    const alerts = await Alert.find({ student_user_id: student._id })
        .populate("term_id", "term_name term_code")
        .sort({ detected_at: 1 });

    log(`Found ${alerts.length} alerts for student`);

    for (const alert of alerts) {
        const termName = alert.term_id?.term_name || alert.term_id?.term_code || null;
        const termLabel = termName ? ` trong ${termName}` : "";

        const existing = await Notification.findOne({
            recipient_user_id: student._id,
            alert_id: alert._id,
        });
        if (existing) {
            log(`Notification for alert ${alert._id} (${alert.alert_type}) already exists — skip`);
            continue;
        }

        let title, content;
        if (alert.alert_type === "RISK") {
            title = "Cảnh báo nguy cơ học tập";
            content = `Hệ thống phát hiện bạn có nguy cơ cao về kết quả học tập${termLabel}. Hãy liên hệ cố vấn học tập để được hỗ trợ sớm nhất.`;
        } else if (alert.alert_type === "ANOMALY") {
            title = "Phát hiện dấu hiệu bất thường";
            content = `Hệ thống phát hiện một số chỉ số học tập của bạn có biến động bất thường${termLabel}. Hãy liên hệ cố vấn học tập nếu bạn đang gặp khó khăn.`;
        } else if (alert.alert_type === "SENTIMENT") {
            title = "Ghi nhận cảm xúc tiêu cực";
            content = `Hệ thống ghi nhận phản hồi cảm xúc tiêu cực của bạn${termLabel}. Nếu bạn đang gặp khó khăn tâm lý, hãy chia sẻ với cố vấn học tập.`;
        } else {
            continue;
        }

        await Notification.create({
            recipient_user_id: student._id,
            alert_id: alert._id,
            title,
            content,
            is_read: alert.status === "RESOLVED", 
            sent_at: alert.detected_at || new Date(),
            read_at: alert.status === "RESOLVED" ? new Date(alert.detected_at?.getTime() + 24 * 60 * 60 * 1000) : null,
        });
        log(`Created notification: ${alert.alert_type} — ${termName} (${alert.status})`);
    }

    log("\n Done! Student notifications seeded.");
    await mongoose.disconnect();
}

main().catch(e => { console.error(e); mongoose.disconnect(); process.exit(1); });
