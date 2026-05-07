/**
 * 07_feedback.js — Seed feedback: ~70% buổi họp có feedback
 * Mỗi buổi họp: 1 feedback từ 1 SV đại diện (hoặc showcase SV)
 * Sentiment tương quan GPA của SV
 * Strategy: unique index (meeting_id, student_user_id)
 */

const Feedback = require('../../../src/models/feedback.model');
const AcademicRecord = require('../../../src/models/academicRecord.model');
const {
    calcSentiment, sentimentScore, pickFeedbackText,
    randomInRange, round2,
} = require('../helpers');

async function seedFeedback({ meetingMap, students, showcaseStudent, classes, terms }) {
    const TARGET_TERM_CODES = [
        '2021-1', '2021-2', '2021-3',
        '2022-1', '2022-2', '2022-3',
        '2023-1', '2023-2', '2023-3',
        '2024-1', '2024-2', '2024-3',
        '2025-1', '2025-2',
    ];
    const targetTerms = terms.filter(t => TARGET_TERM_CODES.includes(t.term_code));

    // Build map: studentId → tier
    const studentTierMap = new Map();
    for (const { user, tier } of students) {
        studentTierMap.set(user._id.toString(), tier);
    }
    // Showcase: tier tăng dần — dùng GPA để tính
    studentTierMap.set(showcaseStudent._id.toString(), 'SHOWCASE');

    // Build map: classId → [students in that class]
    const classStudentMap = new Map();
    for (const { user, classIndex } of students) {
        const cls = classes[classIndex];
        if (!cls) continue;
        const key = cls._id.toString();
        if (!classStudentMap.has(key)) classStudentMap.set(key, []);
        classStudentMap.get(key).push(user);
    }
    // Showcase vào lớp 0
    const showcaseClassKey = classes[0]._id.toString();
    if (!classStudentMap.has(showcaseClassKey)) classStudentMap.set(showcaseClassKey, []);
    classStudentMap.get(showcaseClassKey).push(showcaseStudent);

    let created = 0;
    let skipped = 0;

    for (const [meetingKey, meeting] of Object.entries(meetingMap)) {
        // 70% xác suất có feedback
        if (Math.random() > 0.70) continue;

        const termId = meeting.term_id;
        const classId = meeting.class_id;

        // Lấy danh sách SV trong lớp này
        const classStudents = classStudentMap.get(classId.toString()) || [];
        if (classStudents.length === 0) continue;

        // Chọn ngẫu nhiên 1 SV để gửi feedback
        const sv = classStudents[Math.floor(Math.random() * classStudents.length)];

        // Kiểm tra đã có feedback chưa
        const exists = await Feedback.findOne({
            meeting_id: meeting._id,
            student_user_id: sv._id,
        });
        if (exists) { skipped++; continue; }

        // Lấy GPA của SV trong kỳ này
        const record = await AcademicRecord.findOne({
            student_user_id: sv._id,
            term_id: termId,
            is_latest: true,
        });

        let sentiment;
        let rating;
        if (record) {
            const stress = record.stress_level || 3;
            sentiment = calcSentiment(record.gpa_current, stress);
            // Rating tương quan sentiment
            if (sentiment === 'POSITIVE') rating = Math.floor(randomInRange(4, 5.5));
            else if (sentiment === 'NEGATIVE') rating = Math.floor(randomInRange(1, 3));
            else rating = Math.floor(randomInRange(3, 4.5));
        } else {
            // Không có record → neutral
            sentiment = 'NEUTRAL';
            rating = 3;
        }

        const feedbackText = pickFeedbackText(sentiment);
        const score = sentimentScore(sentiment);

        // Thời điểm submit: sau buổi họp 1-7 ngày
        const submittedAt = new Date(
            meeting.meeting_time.getTime() + Math.floor(randomInRange(1, 7)) * 24 * 3600 * 1000
        );

        await Feedback.create({
            class_id: classId,
            student_user_id: sv._id,
            advisor_user_id: meeting.advisor_user_id,
            meeting_id: meeting._id,
            feedback_text: feedbackText,
            rating,
            submitted_at: submittedAt,
            sentiment_label: sentiment,
            feedback_score: score,
        });
        created++;
    }

    console.log(`  ✅ ${created} feedbacks mới | ${skipped} đã tồn tại`);
    return { created };
}

module.exports = seedFeedback;
