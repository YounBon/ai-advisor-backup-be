/**
 * 09_notifications.js — Seed notifications từ alerts
 * Tối ưu: batch query toàn bộ, insertMany
 * Strategy: kiểm tra theo (alert_id, recipient_user_id)
 */

const Notification = require('../../../src/models/notification.model');
const Alert = require('../../../src/models/alert.model');
const User = require('../../../src/models/user.model');
const { randomInRange } = require('../helpers');

const NOTIF_TEMPLATES = {
    RISK: {
        HIGH: (name, code) => ({ title: `⚠️ Cảnh báo rủi ro cao: ${name}${code ? ` - ${code}` : ''}`, content: `Sinh viên ${name}${code ? ` - ${code}` : ''} có nguy cơ học tập cao trong học kỳ này. GPA thấp và có môn trượt. Cần can thiệp ngay.` }),
        MEDIUM: (name, code) => ({ title: `🔔 Cảnh báo rủi ro: ${name}${code ? ` - ${code}` : ''}`, content: `Sinh viên ${name}${code ? ` - ${code}` : ''} có dấu hiệu rủi ro học tập ở mức trung bình. Cần theo dõi và hỗ trợ kịp thời.` }),
        LOW: (name, code) => ({ title: `ℹ️ Theo dõi học tập: ${name}${code ? ` - ${code}` : ''}`, content: `Sinh viên ${name}${code ? ` - ${code}` : ''} có một số chỉ số học tập cần chú ý. Khuyến khích gặp gỡ tư vấn.` }),
    },
    SENTIMENT: {
        HIGH: (name, code) => ({ title: `🚨 Cảnh báo tâm lý: ${name}${code ? ` - ${code}` : ''}`, content: `Sinh viên ${name}${code ? ` - ${code}` : ''} có phản hồi tiêu cực nghiêm trọng. Cần gặp gỡ và hỗ trợ tâm lý ngay.` }),
        MEDIUM: (name, code) => ({ title: `💬 Phản hồi tiêu cực: ${name}${code ? ` - ${code}` : ''}`, content: `Sinh viên ${name}${code ? ` - ${code}` : ''} bày tỏ cảm xúc tiêu cực trong phản hồi. Cần quan tâm và lắng nghe.` }),
        LOW: (name, code) => ({ title: `📝 Phản hồi cần chú ý: ${name}${code ? ` - ${code}` : ''}`, content: `Sinh viên ${name}${code ? ` - ${code}` : ''} có phản hồi cần được xem xét thêm.` }),
    },
    ANOMALY: {
        HIGH: (name, code) => ({ title: `⚡ Bất thường học tập: ${name}${code ? ` - ${code}` : ''}`, content: `Phát hiện bất thường trong dữ liệu học tập của sinh viên ${name}${code ? ` - ${code}` : ''}. Cần kiểm tra ngay.` }),
        MEDIUM: (name, code) => ({ title: `📊 Bất thường nhẹ: ${name}${code ? ` - ${code}` : ''}`, content: `Có sự thay đổi bất thường trong kết quả học tập của sinh viên ${name}${code ? ` - ${code}` : ''}.` }),
        LOW: (name, code) => ({ title: `📈 Thay đổi học tập: ${name}${code ? ` - ${code}` : ''}`, content: `Ghi nhận thay đổi trong xu hướng học tập của sinh viên ${name}${code ? ` - ${code}` : ''}.` }),
    },
};

async function seedNotifications({ students, showcaseStudent }) {
    const allStudentIds = [
        showcaseStudent._id,
        ...students.map(s => s.user._id),
    ];

    // Batch load alerts
    const alerts = await Alert.find({
        student_user_id: { $in: allStudentIds },
    }).lean();

    if (alerts.length === 0) {
        console.log('  ℹ️  Không có alert nào để tạo notification');
        return { created: 0 };
    }

    // Batch load users (SV) để lấy advisor_user_id và full_name
    const svUsers = await User.find({ _id: { $in: allStudentIds } })
        .select('_id profile.full_name student_info.advisor_user_id student_info.student_code')
        .lean();
    const svMap = new Map(svUsers.map(u => [u._id.toString(), u]));

    // Batch load existing notifications để tránh duplicate
    const alertIds = alerts.map(a => a._id);
    const existingNotifs = await Notification.find({
        alert_id: { $in: alertIds },
    }).lean();
    const existingSet = new Set(
        existingNotifs.map(n => `${n.alert_id}_${n.recipient_user_id}`)
    );

    const toInsert = [];

    for (const alert of alerts) {
        const sv = svMap.get(alert.student_user_id.toString());
        if (!sv) continue;

        const advisorId = sv.student_info?.advisor_user_id;
        if (!advisorId) continue;

        const key = `${alert._id}_${advisorId}`;
        if (existingSet.has(key)) continue;

        const svName = sv.profile?.full_name || 'Sinh viên';
        const svCode = sv.student_info?.student_code || null;
        const templates = NOTIF_TEMPLATES[alert.alert_type] || NOTIF_TEMPLATES.RISK;
        const tpl = templates[alert.severity] || templates.MEDIUM;
        const { title, content } = tpl(svName, svCode);

        const sentAt = new Date(new Date(alert.detected_at).getTime() + Math.floor(randomInRange(5, 30)) * 60 * 1000);
        const isRead = alert.status !== 'OPEN';

        toInsert.push({
            recipient_user_id: advisorId,
            alert_id: alert._id,
            title,
            content,
            is_read: isRead,
            sent_at: sentAt,
            read_at: isRead ? new Date(sentAt.getTime() + Math.floor(randomInRange(1, 48)) * 3600 * 1000) : undefined,
        });
        existingSet.add(key);
    }

    let created = 0;
    if (toInsert.length > 0) {
        await Notification.insertMany(toInsert, { ordered: false });
        created = toInsert.length;
    }

    console.log(`  ✅ ${created} notifications mới | ${existingNotifs.length} đã tồn tại`);
    return { created };
}

module.exports = seedNotifications;
