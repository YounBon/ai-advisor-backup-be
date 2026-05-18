/**
 * scripts/seed-demo-ai/seed.js
 *
 * Tạo 3 sinh viên demo cho cảnh quay 3 AI:
 *   SV1 — Nguyễn Minh Đức   (22IT051) → Demo AI01 Risk
 *   SV2 — Trần Thị Hà Linh  (22IT052) → Demo AI02 Sentiment
 *   SV3 — Phạm Quốc Huy     (22IT053) → Demo AI03 Anomaly
 *
 * Tất cả 3 SV được thêm vào lớp KHMT22A của Lê Hải Khoa.
 * Dữ liệu các kỳ trước: hoàn toàn sạch (GPA tốt, không alert, không notification).
 *
 * Trạng thái kỳ active:
 *   SV1: academic record để trống → live demo nhập để trigger AI01
 *   SV2: academic record seed sẵn (sạch) + meeting đã kết thúc + feedback để trống → live demo submit để trigger AI02
 *   SV3: academic record để trống → live demo nhập để trigger AI03
 *
 * Run:
 *   node scripts/seed-demo-ai/seed.js
 *   node scripts/seed-demo-ai/seed.js --reset
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Load models
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

// ─────────────────────────────────────────────────────────────────────────────
// Hằng số
// ─────────────────────────────────────────────────────────────────────────────
const PLAIN_PASSWORD = "123456";
const ADVISOR_EMAIL = "lehaikhoa@gmail.com";
const CLASS_CODE = "KHMT22A";

// 3 sinh viên demo
const DEMO_STUDENTS = [
    {
        name: "Nguyễn Minh Đức",
        gender: "MALE",
        code: "22IT051",
        email: "ducnm.demo@gmail.com",
        dob: new Date(2004, 2, 10),
        demo: "AI01_RISK",
    },
    {
        name: "Trần Thị Hà Linh",
        gender: "FEMALE",
        code: "22IT052",
        email: "linhtthl.demo@gmail.com",
        dob: new Date(2004, 5, 22),
        demo: "AI02_SENTIMENT",
    },
    {
        name: "Phạm Quốc Huy",
        gender: "MALE",
        code: "22IT053",
        email: "huyqp.demo@gmail.com",
        dob: new Date(2004, 8, 5),
        demo: "AI03_ANOMALY",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dữ liệu sạch cho các kỳ trước (3 kỳ, index 0 = xa nhất)
// Tất cả: GPA tốt, không failed, attendance cao, stress thấp, sentiment tích cực
// → risk_label = 1 (thấp) → KHÔNG tạo Alert, KHÔNG tạo Notification
// ─────────────────────────────────────────────────────────────────────────────
const CLEAN_HISTORY = [
    // [gpa, numFailed, attendance, stress, motiv, shcvht, studyHours, sentScore, sentLabel, rating]
    [3.20, 0, 0.92, 2, 4, 4.0, 14, 0.65, "POSITIVE", 5],
    [3.40, 0, 0.94, 2, 5, 4.5, 16, 0.72, "POSITIVE", 5],
    [3.30, 0, 0.91, 2, 4, 4.0, 15, 0.68, "POSITIVE", 4],
];

// Dữ liệu kỳ active cho SV2 (sạch — không trigger AI01/AI03)
const SV2_ACTIVE_RECORD = {
    gpa_current: 3.25,
    num_failed: 0,
    attendance_rate: 0.93,
    stress_level: 2,
    motivation_score: 4,
    shcvht_participation: 4.0,
    study_hours: 15,
    sentiment_score: 0.70, // sẽ bị ghi đè bởi avg feedback khi SV submit thật, nhưng seed sẵn giá trị tốt
};

// ─────────────────────────────────────────────────────────────────────────────
// Nội dung feedback POSITIVE cho các kỳ sạch
// ─────────────────────────────────────────────────────────────────────────────
const POSITIVE_FEEDBACK_TEXTS = [
    "Buổi gặp cố vấn rất bổ ích, em được giải đáp nhiều thắc mắc về kế hoạch học tập và định hướng nghề nghiệp.",
    "Thầy hướng dẫn rất tận tình và chi tiết, em hiểu rõ hơn về lộ trình học tập và cảm thấy có động lực hơn.",
    "Em cảm ơn thầy đã dành thời gian tư vấn. Buổi họp giúp em có thêm nhiều lời khuyên thiết thực để cải thiện kết quả.",
    "Rất hài lòng với buổi sinh hoạt, thầy chia sẻ nhiều kinh nghiệm học tập hữu ích và em cảm thấy được hỗ trợ tốt.",
    "Buổi họp diễn ra rất tốt, em được giải đáp các thắc mắc về đăng ký học phần và kế hoạch tốt nghiệp.",
];

// Nội dung ghi chú buổi họp
const MEETING_NOTES = [
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn thông báo lịch học, lịch thi và các mốc quan trọng trong học kỳ. Sinh viên được nhắc nhở về tỷ lệ điểm danh tối thiểu và quy định nộp bài tập. Một số sinh viên phản ánh khó khăn trong việc sắp xếp thời gian học, cố vấn đã hướng dẫn cách lập kế hoạch học tập hiệu quả.`,
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn tổng kết tình hình học tập chung của lớp, biểu dương các sinh viên có kết quả tốt và động viên các sinh viên còn gặp khó khăn. Lớp thảo luận về các giải pháp cải thiện tỷ lệ điểm danh và chất lượng bài tập nhóm.`,
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn chia sẻ thông tin về các chương trình học bổng và cơ hội thực tập trong học kỳ. Sinh viên được khuyến khích chủ động liên hệ cố vấn khi gặp khó khăn về học tập hoặc tâm lý.`,
    (termName) => `Buổi sinh hoạt cố vấn học tập ${termName}. Cố vấn nhắc nhở lớp về tiến độ đăng ký học phần cho kỳ tiếp theo và các môn học cần ưu tiên. Một số sinh viên trao đổi về định hướng chuyên ngành, cố vấn tư vấn lộ trình học tập phù hợp.`,
];

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function r2(v) {
    return Math.round(v * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset: xóa chỉ 3 SV demo này
// ─────────────────────────────────────────────────────────────────────────────
async function resetDemoStudents() {
    console.log("\n🗑️  Reset 3 sinh viên demo AI...");

    const emails = DEMO_STUDENTS.map((s) => s.email);
    const users = await User.find({ email: { $in: emails } }).select("_id").lean();
    const userIds = users.map((u) => u._id);

    if (!userIds.length) {
        console.log("  Không tìm thấy sinh viên demo nào để xóa.");
        return;
    }

    // Tìm meetings có student_user_ids chứa các SV này (meeting riêng của demo)
    // Chỉ xóa meeting nếu student_user_ids chỉ gồm các SV demo (tránh xóa meeting chung)
    const meetings = await Meeting.find({ student_user_ids: { $in: userIds } }).select("_id student_user_ids").lean();
    const meetingIdsToDelete = meetings
        .filter((m) => m.student_user_ids.every((id) => userIds.map(String).includes(String(id))))
        .map((m) => m._id);

    // Với meeting chung (có SV khác), chỉ pull SV demo ra
    const sharedMeetingIds = meetings
        .filter((m) => !m.student_user_ids.every((id) => userIds.map(String).includes(String(id))))
        .map((m) => m._id);

    if (sharedMeetingIds.length) {
        await Meeting.updateMany(
            { _id: { $in: sharedMeetingIds } },
            { $pull: { student_user_ids: { $in: userIds } } }
        );
    }

    await Recommendation.deleteMany({ student_user_id: { $in: userIds } });
    await Notification.deleteMany({ recipient_user_id: { $in: userIds } });
    // Xóa cả notification gửi đến advisor liên quan đến các SV demo
    const alertsOfDemo = await Alert.find({ student_user_id: { $in: userIds } }).select("_id").lean();
    const alertIdsOfDemo = alertsOfDemo.map(a => a._id);
    if (alertIdsOfDemo.length) {
        await Notification.deleteMany({ alert_id: { $in: alertIdsOfDemo } });
    }
    await Alert.deleteMany({ student_user_id: { $in: userIds } });
    await Feedback.deleteMany({ student_user_id: { $in: userIds } });
    await AcademicRecord.deleteMany({ student_user_id: { $in: userIds } });
    await RiskPrediction.deleteMany({ student_user_id: { $in: userIds } });
    if (meetingIdsToDelete.length) {
        await Feedback.deleteMany({ meeting_id: { $in: meetingIdsToDelete } });
        await Meeting.deleteMany({ _id: { $in: meetingIdsToDelete } });
    }
    await ClassMember.deleteMany({ student_user_id: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  Đã xóa ${userIds.length} sinh viên demo và dữ liệu liên quan.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed dữ liệu sạch cho 1 SV qua các kỳ trước (không tạo alert/notification)
// ─────────────────────────────────────────────────────────────────────────────
async function seedCleanHistory(sv, prevTerms, advisorClass, advisor) {
    for (let i = 0; i < prevTerms.length; i++) {
        const term = prevTerms[i];
        const [gpa, numFailed, attendance, stress, motiv, shcvht, studyHours, sentScore, sentLabel, rating] =
            CLEAN_HISTORY[i];
        const prevGpa = i > 0 ? CLEAN_HISTORY[i - 1][0] : null;

        const termStart = new Date(term.start_date);
        const termEnd = new Date(term.end_date);
        const termMid = new Date((termStart.getTime() + termEnd.getTime()) / 2);
        // Ghi nhận trước khi kỳ kết thúc 10 ngày
        const recordedAt = new Date(termEnd.getTime() - 10 * 24 * 3600 * 1000);

        // 1. Academic record (sạch)
        await AcademicRecord.updateMany(
            { student_user_id: sv._id, term_id: term._id, is_latest: true },
            { $set: { is_latest: false } }
        );
        await AcademicRecord.create({
            student_user_id: sv._id,
            term_id: term._id,
            gpa_prev_sem: prevGpa,
            gpa_current: gpa,
            num_failed: numFailed,
            attendance_rate: attendance,
            shcvht_participation: shcvht,
            study_hours: studyHours,
            motivation_score: motiv,
            stress_level: stress,
            sentiment_score: r2(sentScore),
            recorded_at: recordedAt,
            is_latest: true,
            version: 1,
            updated_by: null,
        });

        // 2. Risk prediction (label = 1, score thấp) — không tạo alert
        await RiskPrediction.updateMany(
            { student_user_id: sv._id, term_id: term._id, is_latest: true },
            { $set: { is_latest: false } }
        );
        await RiskPrediction.create({
            student_user_id: sv._id,
            term_id: term._id,
            risk_score: r2(0.05 + Math.random() * 0.20), // 0.05–0.25 (thấp)
            risk_label: 1,
            model_name: "RandomForest",
            predicted_at: new Date(recordedAt.getTime() + 2 * 3600 * 1000),
            is_latest: true,
        });

        // 3. Meeting (1 buổi/kỳ, dùng chung cho cả lớp nếu đã có)
        const meetingTime = new Date(termMid);
        meetingTime.setHours(9, 0, 0, 0);
        const meetingEndTime = new Date(meetingTime.getTime() + 90 * 60 * 1000); // +90 phút

        let meeting = await Meeting.findOne({ class_id: advisorClass._id, term_id: term._id });
        if (!meeting) {
            meeting = await Meeting.create({
                class_id: advisorClass._id,
                student_user_ids: [sv._id],
                advisor_user_id: advisor._id,
                term_id: term._id,
                meeting_time: meetingTime,
                meeting_end_time: meetingEndTime,
                notes_raw: pickRandom(MEETING_NOTES)(term.term_name),
                status: "ACTIVE",
            });
        } else {
            await Meeting.updateOne(
                { _id: meeting._id },
                { $addToSet: { student_user_ids: sv._id } }
            );
        }

        // 4. Feedback POSITIVE — không trigger AI02 alert (score > -0.6)
        const existingFb = await Feedback.findOne({ meeting_id: meeting._id, student_user_id: sv._id });
        if (!existingFb) {
            await Feedback.create({
                class_id: advisorClass._id,
                student_user_id: sv._id,
                advisor_user_id: advisor._id,
                meeting_id: meeting._id,
                feedback_text: pickRandom(POSITIVE_FEEDBACK_TEXTS),
                rating,
                submitted_at: new Date(meetingEndTime.getTime() + 2 * 3600 * 1000),
                sentiment_label: sentLabel,
                feedback_score: r2(sentScore),
            });
        }

        // KHÔNG tạo Alert, KHÔNG tạo Notification → dữ liệu hoàn toàn sạch
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed kỳ active cho SV2 (academic record sạch + meeting đã kết thúc, KHÔNG có feedback)
// ─────────────────────────────────────────────────────────────────────────────
async function seedSV2ActiveTerm(sv, activeTerm, advisorClass, advisor) {
    const termStart = new Date(activeTerm.start_date);
    const termEnd = new Date(activeTerm.end_date);
    const termMid = new Date((termStart.getTime() + termEnd.getTime()) / 2);

    // Academic record sạch cho kỳ active
    const recordedAt = new Date(); // ghi nhận hôm nay
    // Lấy gpa kỳ trước (kỳ -1 trong CLEAN_HISTORY)
    const prevGpa = CLEAN_HISTORY[CLEAN_HISTORY.length - 1][0];

    await AcademicRecord.updateMany(
        { student_user_id: sv._id, term_id: activeTerm._id, is_latest: true },
        { $set: { is_latest: false } }
    );
    await AcademicRecord.create({
        student_user_id: sv._id,
        term_id: activeTerm._id,
        gpa_prev_sem: prevGpa,
        gpa_current: SV2_ACTIVE_RECORD.gpa_current,
        num_failed: SV2_ACTIVE_RECORD.num_failed,
        attendance_rate: SV2_ACTIVE_RECORD.attendance_rate,
        shcvht_participation: SV2_ACTIVE_RECORD.shcvht_participation,
        study_hours: SV2_ACTIVE_RECORD.study_hours,
        motivation_score: SV2_ACTIVE_RECORD.motivation_score,
        stress_level: SV2_ACTIVE_RECORD.stress_level,
        sentiment_score: SV2_ACTIVE_RECORD.sentiment_score,
        recorded_at: recordedAt,
        is_latest: true,
        version: 1,
        updated_by: null,
    });

    // Risk prediction sạch (label = 1)
    await RiskPrediction.updateMany(
        { student_user_id: sv._id, term_id: activeTerm._id, is_latest: true },
        { $set: { is_latest: false } }
    );
    await RiskPrediction.create({
        student_user_id: sv._id,
        term_id: activeTerm._id,
        risk_score: r2(0.08 + Math.random() * 0.15),
        risk_label: 1,
        model_name: "RandomForest",
        predicted_at: new Date(recordedAt.getTime() + 2 * 3600 * 1000),
        is_latest: true,
    });

    // Meeting đã kết thúc trong kỳ active — thời gian: 2 ngày trước hôm nay
    // Đảm bảo meeting_end_time < now để SV2 có thể submit feedback ngay
    const now = new Date();
    const meetingTime = new Date(now.getTime() - 2 * 24 * 3600 * 1000);
    meetingTime.setHours(9, 0, 0, 0);
    const meetingEndTime = new Date(meetingTime.getTime() + 90 * 60 * 1000);

    // Kiểm tra meeting kỳ active đã tồn tại chưa (do seedCleanHistory có thể đã tạo cho kỳ này)
    let activeMeeting = await Meeting.findOne({
        class_id: advisorClass._id,
        term_id: activeTerm._id,
    });

    if (!activeMeeting) {
        activeMeeting = await Meeting.create({
            class_id: advisorClass._id,
            student_user_ids: [sv._id],
            advisor_user_id: advisor._id,
            term_id: activeTerm._id,
            meeting_time: meetingTime,
            meeting_end_time: meetingEndTime,
            notes_raw: pickRandom(MEETING_NOTES)(activeTerm.term_name),
            status: "ACTIVE",
        });
        console.log(`    Meeting kỳ active tạo mới: ${meetingTime.toLocaleDateString("vi-VN")} 09:00–10:30`);
    } else {
        // Cập nhật thời gian meeting để đảm bảo đã kết thúc
        await Meeting.updateOne(
            { _id: activeMeeting._id },
            {
                $set: { meeting_time: meetingTime, meeting_end_time: meetingEndTime },
                $addToSet: { student_user_ids: sv._id },
            }
        );
        console.log(`    Meeting kỳ active đã tồn tại, cập nhật thời gian: ${meetingTime.toLocaleDateString("vi-VN")} 09:00–10:30`);
    }

    // KHÔNG tạo Feedback → để trống cho live demo
    console.log(`    ✅ SV2 kỳ active: academic record sạch, meeting đã kết thúc, feedback để trống`);
    return activeMeeting;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
    const isReset = process.argv.includes("--reset");
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required in .env");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    if (isReset) await resetDemoStudents();

    // ── 1. Load dữ liệu nền ──────────────────────────────────────────────────
    const activeTerm = await Term.findOne({ status: "ACTIVE" }).lean();
    if (!activeTerm) throw new Error("Không tìm thấy kỳ học ACTIVE trong DB. Hãy chạy seed chính trước.");

    // Lấy 3 kỳ liền trước kỳ active (sort start_date DESC, bỏ kỳ active, lấy 3 kỳ gần nhất)
    const prevTerms = await Term.find({
        status: "INACTIVE",
        start_date: { $lt: activeTerm.start_date },
    })
        .sort({ start_date: -1 })
        .limit(3)
        .lean();

    if (prevTerms.length < 3) {
        throw new Error(
            `Cần ít nhất 3 kỳ INACTIVE trước kỳ active. Hiện chỉ có ${prevTerms.length} kỳ. Hãy chạy seed chính trước.`
        );
    }
    prevTerms.reverse(); // đảo lại: cũ → mới

    console.log(`\nKỳ active   : ${activeTerm.term_code} — ${activeTerm.term_name}`);
    console.log(`Kỳ lịch sử  : ${prevTerms.map((t) => t.term_code).join(" → ")}`);

    // ── 2. Load advisor và lớp KHMT22A ───────────────────────────────────────
    const advisor = await User.findOne({ email: ADVISOR_EMAIL }).lean();
    if (!advisor) throw new Error(`Không tìm thấy advisor ${ADVISOR_EMAIL}. Hãy chạy seed-showcase trước.`);

    const advisorClass = await AdvisorClass.findOne({ class_code: CLASS_CODE }).lean();
    if (!advisorClass) throw new Error(`Không tìm thấy lớp ${CLASS_CODE}. Hãy chạy seed-showcase trước.`);

    console.log(`\nAdvisor     : ${advisor.profile?.full_name} (${ADVISOR_EMAIL})`);
    console.log(`Lớp         : ${CLASS_CODE} — ${advisorClass.class_name}`);

    // User.create() trigger pre("save") hook → tự hash password_hash → truyền plain text
    // User.updateOne/findOneAndUpdate KHÔNG trigger hook → cần hash thủ công
    const pwHash = await bcrypt.hash(PLAIN_PASSWORD, 10);  // dùng cho updateOne
    const pwPlain = PLAIN_PASSWORD;  // dùng cho User.create()

    // ── 3. Tạo 3 sinh viên demo ───────────────────────────────────────────────
    console.log("\n👥 Tạo 3 sinh viên demo...");
    const createdStudents = [];

    for (const s of DEMO_STUDENTS) {
        // Upsert user (tìm theo email hoặc student_code để tránh duplicate)
        let sv = await User.findOne({
            $or: [{ email: s.email }, { "student_info.student_code": s.code }],
        });

        const svDataBase = {
            email: s.email,
            username: s.email.split("@")[0],
            role: "STUDENT",
            status: "ACTIVE",
            profile: {
                full_name: s.name,
                gender: s.gender,
                date_of_birth: s.dob,
            },
            org: {
                department_id: advisorClass.department_id,
                major_id: advisorClass.major_id,
            },
            student_info: {
                student_code: s.code,
                cohort_year: 2022,
                advisor_user_id: advisor._id,
                enrollment_status: "ENROLLED",
            },
        };

        if (sv) {
            // updateOne không trigger pre-save hook → dùng pwHash (đã hash thủ công)
            await User.updateOne({ _id: sv._id }, { $set: { ...svDataBase, password_hash: pwHash } });
            sv = await User.findById(sv._id);
            console.log(`  [UPDATE] ${s.name} (${s.code}) — ${s.email}`);
        } else {
            // User.create() trigger pre-save hook → truyền plain text để hook tự hash
            sv = await User.create({ ...svDataBase, password_hash: pwPlain });
            console.log(`  [CREATE] ${s.name} (${s.code}) — ${s.email}`);
        }

        // Thêm vào lớp KHMT22A
        await ClassMember.findOneAndUpdate(
            { student_user_id: sv._id },
            {
                $set: {
                    class_id: advisorClass._id,
                    student_user_id: sv._id,
                    joined_at: new Date(2022, 8, 1),
                    status: "ACTIVE",
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        createdStudents.push({ ...s, _id: sv._id, doc: sv });
    }

    // ── 4. Seed dữ liệu sạch (3 kỳ trước) cho SV2 và SV3 ───────────────────
    // SV1 (AI01 Risk): KHÔNG seed lịch sử — hoàn toàn trống để chỉ trigger AI01
    // SV2 (AI02 Sentiment): cần lịch sử sạch để có context
    // SV3 (AI03 Anomaly): cần ít nhất 2 kỳ lịch sử để Anomaly detection hoạt động
    console.log("\n📚 Seed lịch sử sạch (3 kỳ trước) cho SV2 và SV3...");
    for (const sv of createdStudents) {
        if (sv.demo === "AI01_RISK") {
            console.log(`\n  → ${sv.name} (${sv.code}) [${sv.demo}]: bỏ qua — để trống hoàn toàn`);
            continue;
        }
        console.log(`\n  → ${sv.name} (${sv.code}) [${sv.demo}]`);
        await seedCleanHistory(sv.doc, prevTerms, advisorClass, advisor);
        console.log(`    ✅ 3 kỳ sạch: academic + risk(label=1) + meeting + feedback POSITIVE`);
    }

    // ── 5. Xử lý kỳ active theo từng SV ─────────────────────────────────────
    console.log("\n🎬 Chuẩn bị kỳ active cho từng SV...");

    const sv1 = createdStudents.find((s) => s.demo === "AI01_RISK");
    const sv2 = createdStudents.find((s) => s.demo === "AI02_SENTIMENT");
    const sv3 = createdStudents.find((s) => s.demo === "AI03_ANOMALY");

    // SV1 (AI01 Risk): kỳ active để trống hoàn toàn
    // Chỉ cần thêm vào meeting kỳ active nếu có (để giao diện hiển thị đúng)
    console.log(`\n  → ${sv1.name}: kỳ active để trống (live demo nhập academic record)`);
    const sv1ActiveMeeting = await Meeting.findOne({ class_id: advisorClass._id, term_id: activeTerm._id });
    if (sv1ActiveMeeting) {
        await Meeting.updateOne(
            { _id: sv1ActiveMeeting._id },
            { $addToSet: { student_user_ids: sv1._id } }
        );
        console.log(`    Đã thêm vào meeting kỳ active hiện có`);
    }

    // SV2 (AI02 Sentiment): seed academic record sạch + meeting đã kết thúc
    console.log(`\n  → ${sv2.name}: seed kỳ active (academic sạch + meeting đã kết thúc, feedback để trống)`);
    await seedSV2ActiveTerm(sv2.doc, activeTerm, advisorClass, advisor);

    // SV3 (AI03 Anomaly): kỳ active để trống
    // Lưu ý: AI03 cần ít nhất 2 bản ghi is_latest=true trong lịch sử
    // → 3 kỳ trước đã đủ (mỗi kỳ có 1 bản is_latest=true)
    console.log(`\n  → ${sv3.name}: kỳ active để trống (live demo nhập academic record, AI03 dùng 3 kỳ lịch sử)`);
    const sv3ActiveMeeting = await Meeting.findOne({ class_id: advisorClass._id, term_id: activeTerm._id });
    if (sv3ActiveMeeting) {
        await Meeting.updateOne(
            { _id: sv3ActiveMeeting._id },
            { $addToSet: { student_user_ids: sv3._id } }
        );
        console.log(`    Đã thêm vào meeting kỳ active hiện có`);
    }

    // ── 6. Thống kê ───────────────────────────────────────────────────────────
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 THỐNG KÊ SEED DEMO AI:");

    const svIds = createdStudents.map((s) => s._id);
    const stats = [
        ["Sinh viên demo", await User.countDocuments({ _id: { $in: svIds } })],
        ["Academic records", await AcademicRecord.countDocuments({ student_user_id: { $in: svIds } })],
        ["Risk predictions", await RiskPrediction.countDocuments({ student_user_id: { $in: svIds } })],
        ["Feedbacks", await Feedback.countDocuments({ student_user_id: { $in: svIds } })],
        ["Alerts", await Alert.countDocuments({ student_user_id: { $in: svIds } })],
        ["Notifications", await Notification.countDocuments({ recipient_user_id: { $in: svIds } })],
    ];
    for (const [label, count] of stats) {
        console.log(`  ${label.padEnd(22)} ${count}`);
    }

    console.log("\n🔑 Tài khoản 3 sinh viên demo:");
    for (const s of createdStudents) {
        console.log(`  [${s.demo.padEnd(14)}] ${s.name.padEnd(22)} ${s.email} / ${PLAIN_PASSWORD}`);
    }

    console.log("\n🎬 HƯỚNG DẪN DEMO:");
    console.log("  CẢNH 1 — AI01 Risk:");
    console.log(`    Đăng nhập: ${sv1.email} / ${PLAIN_PASSWORD}`);
    console.log("    Vào Học vụ → Nộp dữ liệu kỳ này, nhập:");
    console.log("      gpa_current: 1.7, num_failed: 3, attendance_rate: 0.58");
    console.log("      stress_level: 5, motivation_score: 1, shcvht_participation: 0, study_hours: 2");
    console.log("    → Kết quả: risk_label=-1, alert RISK HIGH, notification cho SV + Advisor");

    console.log("\n  CẢNH 2 — AI02 Sentiment:");
    console.log(`    Đăng nhập: ${sv2.email} / ${PLAIN_PASSWORD}`);
    console.log("    Vào Buổi họp → Gửi phản hồi (meeting 2 ngày trước), nhập feedback tiêu cực:");
    console.log('      "Em cảm thấy rất chán nản và mệt mỏi, không muốn đi học nữa.');
    console.log('       Mọi thứ đang rất khó khăn, em không biết có thể tiếp tục không."');
    console.log("      rating: 1, KHÔNG truyền sentiment_label");
    console.log("    → Kết quả: NEGATIVE score<-0.6, alert SENTIMENT, notification cho Advisor");

    console.log("\n  CẢNH 3 — AI03 Anomaly:");
    console.log(`    Đăng nhập: ${sv3.email} / ${PLAIN_PASSWORD}`);
    console.log("    Vào Học vụ → Nộp dữ liệu kỳ này, nhập (sụt giảm mạnh so với kỳ trước GPA 3.30):");
    console.log("      gpa_current: 1.5, num_failed: 2, attendance_rate: 0.38");
    console.log("      stress_level: 5, motivation_score: 1, shcvht_participation: 0, study_hours: 3");
    console.log("    → Kết quả: DeltaFallback triggers (gpa giảm 1.8, attendance giảm 0.53, stress tăng 3)");
    console.log("               is_anomaly=true, alert ANOMALY, notification cho SV + Advisor");

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SEED DEMO AI HOÀN TẤT");

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error("\n❌ SEED THẤT BẠI:", err.message);
    console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
});
