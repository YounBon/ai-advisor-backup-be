require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Department = require("../models/department.model");
const Major = require("../models/major.model");
const User = require("../models/user.model");
const Term = require("../models/term.model");
const AdvisorClass = require("../models/advisorClass.model");
const ClassMember = require("../models/classMember.model");
const AcademicRecord = require("../models/academicRecord.model");
const RiskPrediction = require("../models/riskPrediction.model");
const Recommendation = require("../models/recommendation.model");
const Meeting = require("../models/meeting.model");
const Feedback = require("../models/feedback.model");
const Alert = require("../models/alert.model");
const Notification = require("../models/notification.model");

function log(msg) {
    console.log(`[seed] ${msg}`);
}

async function upsertOne(Model, filter, data, label) {
    const existing = await Model.findOne(filter);
    if (existing) {
        log(`${label} already exists — skip`);
        return existing;
    }
    const doc = await Model.create(data);
    log(`${label} created: ${doc._id}`);
    return doc;
}

const TERM_DEFS = [
    {
        term_code: "2023-1",
        academic_year: "2023-2024",
        term_name: "Học kỳ 1",
        start_date: new Date("2023-09-01"),
        end_date: new Date("2024-01-15"),
        status: "INACTIVE",
    },
    {
        term_code: "2023-2",
        academic_year: "2023-2024",
        term_name: "Học kỳ 2",
        start_date: new Date("2024-02-01"),
        end_date: new Date("2024-06-30"),
        status: "INACTIVE",
    },
    {
        term_code: "2024-1",
        academic_year: "2024-2025",
        term_name: "Học kỳ 1",
        start_date: new Date("2024-09-01"),
        end_date: new Date("2025-01-15"),
        status: "INACTIVE",
    },
    {
        term_code: "2024-2",
        academic_year: "2024-2025",
        term_name: "Học kỳ 2",
        start_date: new Date("2025-02-01"),
        end_date: new Date("2025-06-30"),
        status: "INACTIVE",
    },
    {
        term_code: "2025-1",
        academic_year: "2025-2026",
        term_name: "Học kỳ 1",
        start_date: new Date("2025-09-01"),
        end_date: new Date("2026-01-15"),
        status: "INACTIVE",
    },
    {
        term_code: "2025-2",
        academic_year: "2025-2026",
        term_name: "Học kỳ 2",
        start_date: new Date("2026-02-01"),
        end_date: new Date("2026-07-31"),
        status: "ACTIVE",   
    },
];

const ACADEMIC_DATA = {
    "2023-1": {
        gpa_prev_sem: 3.1,
        gpa_current: 3.0,
        num_failed: 0,
        attendance_rate: 0.92,
        shcvht_participation: 5,
        study_hours: 20,
        motivation_score: 4,
        stress_level: 2,
        sentiment_score: 0.65,
        risk_score: 0.18,
        risk_label: 1,
        feedback_sentiment: "POSITIVE",
        feedback_score: 0.72,
        feedback_text: "Thầy hướng dẫn rất tận tình, em hiểu bài hơn sau buổi gặp.",
        rating: 5,
    },
    "2023-2": {
        gpa_prev_sem: 3.0,
        gpa_current: 2.7,
        num_failed: 1,
        attendance_rate: 0.82,
        shcvht_participation: 4,
        study_hours: 16,
        motivation_score: 3,
        stress_level: 3,
        sentiment_score: 0.2,
        risk_score: 0.42,
        risk_label: 0,
        feedback_sentiment: "NEUTRAL",
        feedback_score: 0.1,
        feedback_text: "Buổi gặp bình thường, em vẫn chưa rõ hướng giải quyết môn học.",
        rating: 3,
    },
    "2024-1": {
        gpa_prev_sem: 2.7,
        gpa_current: 2.1,
        num_failed: 3,
        attendance_rate: 0.65,
        shcvht_participation: 2,
        study_hours: 9,
        motivation_score: 2,
        stress_level: 4,
        sentiment_score: -0.35,
        risk_score: 0.81,
        risk_label: -1,
        feedback_sentiment: "NEGATIVE",
        feedback_score: -0.55,
        feedback_text: "Em cảm thấy áp lực lắm, không biết phải làm sao với mấy môn rớt.",
        rating: 2,
    },
    "2024-2": {
        gpa_prev_sem: 2.1,
        gpa_current: 2.45,
        num_failed: 1,
        attendance_rate: 0.75,
        shcvht_participation: 3,
        study_hours: 13,
        motivation_score: 3,
        stress_level: 3,
        sentiment_score: 0.05,
        risk_score: 0.55,
        risk_label: 0,
        feedback_sentiment: "NEUTRAL",
        feedback_score: 0.08,
        feedback_text: "Em đang cố gắng cải thiện, nhưng vẫn còn khó khăn với một số môn.",
        rating: 3,
    },
    "2025-1": {
        gpa_prev_sem: 2.45,
        gpa_current: 2.2,
        num_failed: 2,
        attendance_rate: 0.68,
        shcvht_participation: 2,
        study_hours: 10,
        motivation_score: 2,
        stress_level: 4,
        sentiment_score: -0.28,
        risk_score: 0.76,
        risk_label: -1,
        feedback_sentiment: "NEGATIVE",
        feedback_score: -0.42,
        feedback_text: "Em thấy mệt mỏi, không có động lực học, hay bỏ tiết.",
        rating: 2,
    },
    "2025-2": {
        gpa_prev_sem: 2.2,
        gpa_current: 1.95,
        num_failed: 4,
        attendance_rate: 0.58,
        shcvht_participation: 1,
        study_hours: 7,
        motivation_score: 1,
        stress_level: 5,
        sentiment_score: -0.72,
        risk_score: 0.91,
        risk_label: -1,
        feedback_sentiment: "NEGATIVE",
        feedback_score: -0.78,
        feedback_text: "Em không muốn đi học nữa, cảm thấy rất chán nản và không có ai hiểu em.",
        rating: 1,
    },
};

async function main() {
    await connectDB();
    log("Connected to MongoDB");

    const dept = await upsertOne(
        Department,
        { department_code: "DTQT" },
        { department_code: "DTQT", department_name: "Khoa Đào tạo Quốc tế" },
        "Department DTQT"
    );

    const major = await upsertOne(
        Major,
        { department_id: dept._id, major_code: "ARCCSU" },
        {
            major_code: "ARCCSU",
            major_name: "Kiến trúc chuẩn CSU",
            department_id: dept._id,
        },
        "Major ARCCSU"
    );

    const advisor = await upsertOne(
        User,
        { username: "gv_nguyenvana" },
        {
            username: "gv_nguyenvana",
            email: "nguyenvana@advisor.local",
            password_hash: "123456",
            role: "ADVISOR",
            status: "ACTIVE",
            profile: {
                full_name: "Nguyễn Văn A",
                gender: "MALE",
            },
            org: {
                department_id: dept._id,
                major_id: major._id,
            },
            advisor_info: {
                staff_code: "GV_NVA_001",
                title: "ThS",
            },
        },
        "Advisor Nguyễn Văn A"
    );

    const student = await upsertOne(
        User,
        { "student_info.student_code": "SV230001" },
        {
            username: "sv_trandinhkhoa",
            email: "trandinhkhoa@advisor.local",
            password_hash: "123456",
            role: "STUDENT",
            status: "ACTIVE",
            profile: {
                full_name: "Trần Đình Khoa",
                gender: "MALE",
                date_of_birth: new Date("2005-03-15"),
                phone: "0901234567",
            },
            org: {
                department_id: dept._id,
                major_id: major._id,
            },
            student_info: {
                student_code: "SV230001",
                cohort_year: 2023,
                advisor_user_id: advisor._id,
                enrollment_status: "ENROLLED",
            },
        },
        "Student Trần Đình Khoa"
    );

    log("Upserting terms...");
    const termMap = {};

    const existingActive = await Term.findOne({ status: "ACTIVE" });

    for (const def of TERM_DEFS) {
        let term = await Term.findOne({ term_code: def.term_code });
        if (!term) {
            const statusToUse =
                def.status === "ACTIVE" && existingActive && String(existingActive.term_code) !== def.term_code
                    ? "INACTIVE"
                    : def.status;
            term = await Term.create({ ...def, status: statusToUse });
            log(`Term ${def.term_code} created`);
        } else {
            log(`Term ${def.term_code} already exists — skip`);
        }
        termMap[def.term_code] = term;
    }

    const term2025_2 = termMap["2025-2"];
    if (term2025_2 && term2025_2.status !== "ACTIVE") {
        await Term.updateMany({ status: "ACTIVE" }, { $set: { status: "INACTIVE" } });
        await Term.findByIdAndUpdate(term2025_2._id, { $set: { status: "ACTIVE" } });
        term2025_2.status = "ACTIVE";
        log("Term 2025-2 set to ACTIVE");
    }

    const advisorClass = await upsertOne(
        AdvisorClass,
        { class_code: "ARCCSU1" },
        {
            class_code: "ARCCSU1",
            class_name: "Lớp Kiến trúc CSU K1",
            advisor_user_id: advisor._id,
            department_id: dept._id,
            major_id: major._id,
            cohort_year: 2023,
            status: "ACTIVE",
        },
        "AdvisorClass ARCCSU1"
    );

    await upsertOne(
        ClassMember,
        { student_user_id: student._id },
        {
            class_id: advisorClass._id,
            student_user_id: student._id,
            joined_at: new Date("2023-09-05"),
            status: "ACTIVE",
        },
        "ClassMember Trần Đình Khoa"
    );

    for (const [termCode, acData] of Object.entries(ACADEMIC_DATA)) {
        const term = termMap[termCode];
        if (!term) {
            log(`Term ${termCode} not found, skip`);
            continue;
        }

        log(`\n--- Seeding term ${termCode} ---`);

        const midDate = new Date((term.start_date.getTime() + term.end_date.getTime()) / 2);

        const existingRecord = await AcademicRecord.findOne({
            student_user_id: student._id,
            term_id: term._id,
            is_latest: true,
        });

        let academicRecord;
        if (existingRecord) {
            log(`AcademicRecord ${termCode} already exists — skip`);
            academicRecord = existingRecord;
        } else {
            await AcademicRecord.updateMany(
                { student_user_id: student._id, term_id: term._id, is_latest: true },
                { $set: { is_latest: false } }
            );
            academicRecord = await AcademicRecord.create({
                student_user_id: student._id,
                term_id: term._id,
                gpa_prev_sem: acData.gpa_prev_sem,
                gpa_current: acData.gpa_current,
                num_failed: acData.num_failed,
                attendance_rate: acData.attendance_rate,
                shcvht_participation: acData.shcvht_participation,
                study_hours: acData.study_hours,
                motivation_score: acData.motivation_score,
                stress_level: acData.stress_level,
                sentiment_score: acData.sentiment_score,
                recorded_at: midDate,
                is_latest: true,
                version: 1,
                updated_by: student._id,
            });
            log(`AcademicRecord ${termCode} created: ${academicRecord._id}`);
        }

        const meetingTime = new Date(midDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 tuần trước midDate
        const meetingEndTime = new Date(meetingTime.getTime() + 60 * 60 * 1000);   // +1 giờ

        let meeting = await Meeting.findOne({
            advisor_user_id: advisor._id,
            term_id: term._id,
            "student_user_ids": student._id,
        });

        if (!meeting) {
            meeting = await Meeting.create({
                class_id: advisorClass._id,
                student_user_ids: [student._id],
                advisor_user_id: advisor._id,
                term_id: term._id,
                meeting_time: meetingTime,
                meeting_end_time: meetingEndTime,
                notes_raw: `Buổi gặp cố vấn học tập kỳ ${term.term_name} năm học ${term.academic_year}. Sinh viên Trần Đình Khoa trao đổi về tình hình học tập, điểm số và các khó khăn gặp phải trong học kỳ. Cố vấn đã tư vấn và đưa ra các hướng giải quyết cụ thể.`,
                notes_summary: `Trao đổi tình hình học tập kỳ ${term.term_name}. GPA hiện tại: ${acData.gpa_current}. Số môn rớt: ${acData.num_failed}.`,
                summary_model: "T5",
            });
            log(`Meeting ${termCode} created: ${meeting._id}`);
        } else {
            log(`Meeting ${termCode} already exists — skip`);
        }

        let feedback = await Feedback.findOne({
            meeting_id: meeting._id,
            student_user_id: student._id,
        });

        if (!feedback) {
            feedback = await Feedback.create({
                class_id: advisorClass._id,
                student_user_id: student._id,
                advisor_user_id: advisor._id,
                meeting_id: meeting._id,
                feedback_text: acData.feedback_text,
                rating: acData.rating,
                submitted_at: new Date(meetingTime.getTime() + 2 * 60 * 60 * 1000),
                sentiment_label: acData.feedback_sentiment,
                feedback_score: acData.feedback_score,
            });
            log(`Feedback ${termCode} created: ${feedback._id}`);
        } else {
            log(`Feedback ${termCode} already exists — skip`);
        }

        let riskPrediction = await RiskPrediction.findOne({
            student_user_id: student._id,
            term_id: term._id,
            is_latest: true,
        });

        if (!riskPrediction) {
            await RiskPrediction.updateMany(
                { student_user_id: student._id, term_id: term._id, is_latest: true },
                { $set: { is_latest: false } }
            );
            riskPrediction = await RiskPrediction.create({
                student_user_id: student._id,
                term_id: term._id,
                risk_score: acData.risk_score,
                risk_label: acData.risk_label,
                model_name: "XGBoost",
                predicted_at: midDate,
                is_latest: true,
            });
            log(`RiskPrediction ${termCode} created: ${riskPrediction._id}`);
        } else {
            log(`RiskPrediction ${termCode} already exists — skip`);
        }

        const existingRec = await Recommendation.findOne({ risk_prediction_id: riskPrediction._id });
        if (!existingRec) {
            const recTemplates = {
                "-1": [
                    {
                        title: "Cần cải thiện kết quả học tập khẩn cấp",
                        content: "GPA hiện tại thấp hoặc đã có môn rớt. Sinh viên cần lập kế hoạch học lại, tăng thời gian tự học và trao đổi sớm với cố vấn học tập.",
                        priority: "HIGH",
                    },
                    {
                        title: "Dấu hiệu căng thẳng và tâm lý tiêu cực",
                        content: "Mức căng thẳng cao hoặc phản hồi cảm xúc tiêu cực. Cố vấn học tập nên chủ động liên hệ để tư vấn và hỗ trợ tinh thần.",
                        priority: "HIGH",
                    },
                    {
                        title: "Tỉ lệ tham gia lớp học thấp",
                        content: "Sinh viên vắng học nhiều buổi. Cần cải thiện chuyên cần và theo dõi sát sao lịch học.",
                        priority: "HIGH",
                    },
                ],
                "0": [
                    {
                        title: "Nên cải thiện hiệu quả học tập",
                        content: "Kết quả học tập chưa ổn định. Nên điều chỉnh phương pháp học và phân bổ thời gian hợp lý hơn.",
                        priority: "MEDIUM",
                    },
                    {
                        title: "Cần cân bằng tâm lý học tập",
                        content: "Có dấu hiệu áp lực hoặc cảm xúc chưa tích cực. Nên nghỉ ngơi hợp lý và trao đổi khi cần.",
                        priority: "MEDIUM",
                    },
                ],
                "1": [
                    {
                        title: "Duy trì kết quả học tập tốt",
                        content: "Sinh viên đang có kết quả học tập tốt. Nên tiếp tục duy trì phương pháp học hiện tại.",
                        priority: "LOW",
                    },
                ],
            };

            const recs = recTemplates[String(acData.risk_label)] || recTemplates["0"];
            await Recommendation.insertMany(
                recs.map((r) => ({
                    student_user_id: student._id,
                    term_id: term._id,
                    risk_prediction_id: riskPrediction._id,
                    title: r.title,
                    content: r.content,
                    priority: r.priority,
                }))
            );
            log(`Recommendations ${termCode} created (${recs.length} items)`);
        } else {
            log(`Recommendations ${termCode} already exist — skip`);
        }

        if (acData.risk_label === -1) {
            const existingRiskAlert = await Alert.findOne({
                risk_prediction_id: riskPrediction._id,
                alert_type: "RISK",
            });
            if (!existingRiskAlert) {
                const severity = acData.risk_score > 0.85 ? "HIGH" : "MEDIUM";
                const riskAlert = await Alert.create({
                    student_user_id: student._id,
                    term_id: term._id,
                    alert_type: "RISK",
                    source_ai: "AI01_RISK",
                    severity,
                    risk_prediction_id: riskPrediction._id,
                    metadata: { risk_score: acData.risk_score },
                    detected_at: midDate,
                    status: termCode === "2025-2" ? "OPEN" : "RESOLVED",
                });
                log(`RISK Alert ${termCode} created: ${riskAlert._id} (${severity})`);

                await Notification.create({
                    recipient_user_id: advisor._id,
                    alert_id: riskAlert._id,
                    title: "Cảnh báo nguy cơ học vụ",
                    content: `Sinh viên Trần Đình Khoa có nguy cơ cao về chỉ số rủi ro học tập trong ${term.term_name} ${term.academic_year}.`,
                    is_read: termCode !== "2025-2",
                    sent_at: midDate,
                    read_at: termCode !== "2025-2" ? new Date(midDate.getTime() + 24 * 60 * 60 * 1000) : null,
                });
                log(`Notification (RISK) ${termCode} created`);
            } else {
                log(`RISK Alert ${termCode} already exists — skip`);
            }
        }

        if (acData.feedback_sentiment === "NEGATIVE") {
            const existingSentimentAlert = await Alert.findOne({
                feedback_id: feedback._id,
                alert_type: "SENTIMENT",
            });
            if (!existingSentimentAlert) {
                const sentimentAlert = await Alert.create({
                    student_user_id: student._id,
                    term_id: term._id,
                    alert_type: "SENTIMENT",
                    source_ai: "AI02_SENTIMENT",
                    severity: acData.feedback_score < -0.6 ? "HIGH" : "MEDIUM",
                    feedback_id: feedback._id,
                    metadata: {
                        feedback_score: acData.feedback_score,
                        sentiment_label: acData.feedback_sentiment,
                    },
                    detected_at: feedback.submitted_at,
                    status: termCode === "2025-2" ? "OPEN" : "RESOLVED",
                });
                log(`SENTIMENT Alert ${termCode} created: ${sentimentAlert._id}`);

                await Notification.create({
                    recipient_user_id: advisor._id,
                    alert_id: sentimentAlert._id,
                    title: "Cảnh báo cảm xúc tiêu cực",
                    content: `Sinh viên Trần Đình Khoa có phản hồi cảm xúc tiêu cực trong ${term.term_name} ${term.academic_year}. Điểm cảm xúc: ${acData.feedback_score.toFixed(2)}.`,
                    is_read: termCode !== "2025-2",
                    sent_at: feedback.submitted_at,
                    read_at: termCode !== "2025-2" ? new Date(feedback.submitted_at.getTime() + 12 * 60 * 60 * 1000) : null,
                });
                log(`Notification (SENTIMENT) ${termCode} created`);
            } else {
                log(`SENTIMENT Alert ${termCode} already exists — skip`);
            }
        }
    }

    log("\nSeed hoàn tất!");
    log(`   Advisor  : Nguyễn Văn A  (username: gv_nguyenvana  | password: 123456)`);
    log(`   Student  : Trần Đình Khoa (username: sv_trandinhkhoa | password: 123456)`);
    log(`   Lớp      : ARCCSU1`);
    log(`   Kỳ active: 2025-2 (HK2 2025-2026)`);
    log(`   Cảnh báo RISK OPEN    : HK1 2024-2025, HK1 2025-2026, HK2 2025-2026`);
    log(`   Cảnh báo SENTIMENT OPEN: HK1 2024-2025, HK1 2025-2026, HK2 2025-2026`);

    await mongoose.disconnect();
    log("Disconnected.");
}

main().catch((err) => {
    console.error("[seed] ERROR:", err);
    mongoose.disconnect();
    process.exit(1);
});
