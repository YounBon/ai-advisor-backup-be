/**
 * 04_meetings.js — Seed buổi họp: 8 lớp × 14 kỳ × 1 buổi/kỳ = 112 buổi
 * Strategy: upsert theo (class_id, term_id) — 1 buổi/lớp/kỳ
 */

const mongoose = require('mongoose');
const Meeting = require('../../../src/models/meeting.model');
const ClassMember = require('../../../src/models/classMember.model');
const { randomDate } = require('../helpers');

// Notes mẫu cho buổi họp (>= 30 ký tự theo schema)
const MEETING_NOTES = [
    'Buổi họp định kỳ đầu học kỳ. Cố vấn thông báo lịch học, kế hoạch thi và nhắc nhở sinh viên đăng ký môn học đúng hạn. Sinh viên phản ánh một số khó khăn về môn học và được hướng dẫn cụ thể.',
    'Họp giữa kỳ để rà soát tiến độ học tập. Cố vấn kiểm tra điểm danh, kết quả giữa kỳ và tư vấn cho các sinh viên có nguy cơ trượt môn. Một số sinh viên được khuyến khích tham gia nhóm học tập.',
    'Buổi họp cuối kỳ tổng kết. Cố vấn thông báo lịch thi, hướng dẫn đăng ký thi lại và tư vấn kế hoạch học tập cho kỳ tiếp theo. Sinh viên chia sẻ khó khăn và nhận được hỗ trợ kịp thời.',
    'Họp đầu kỳ phổ biến quy chế học vụ và kế hoạch học tập. Cố vấn giới thiệu các hoạt động ngoại khóa và học bổng. Sinh viên được khuyến khích tham gia nghiên cứu khoa học.',
    'Buổi tư vấn học tập và định hướng nghề nghiệp. Cố vấn chia sẻ thông tin về cơ hội thực tập và việc làm. Sinh viên đặt câu hỏi về lộ trình học tập và được giải đáp chi tiết.',
    'Họp định kỳ kiểm tra tiến độ và hỗ trợ sinh viên gặp khó khăn. Cố vấn lắng nghe phản hồi và đề xuất giải pháp cải thiện kết quả học tập cho từng sinh viên.',
    'Buổi họp thảo luận về kết quả học tập kỳ vừa qua và kế hoạch kỳ tới. Cố vấn nhận xét tổng quan và đưa ra lời khuyên cụ thể cho từng nhóm sinh viên theo mức độ học lực.',
    'Họp tư vấn chuyên sâu cho sinh viên có kết quả học tập yếu. Cố vấn phân tích nguyên nhân và đề xuất phương án cải thiện. Sinh viên cam kết thực hiện kế hoạch học tập mới.',
];

async function seedMeetings({ classes, terms, students, showcaseStudent }) {
    // Lọc 14 kỳ cần seed (2021-1 đến 2025-2)
    const TARGET_TERM_CODES = [
        '2021-1', '2021-2', '2021-3',
        '2022-1', '2022-2', '2022-3',
        '2023-1', '2023-2', '2023-3',
        '2024-1', '2024-2', '2024-3',
        '2025-1', '2025-2',
    ];
    const targetTerms = terms.filter(t => TARGET_TERM_CODES.includes(t.term_code));

    // Build map: classId → [studentIds]
    const classStudentMap = {};

    // Showcase student vào lớp 0
    classStudentMap[classes[0]._id.toString()] = [showcaseStudent._id];

    for (const { user, classIndex } of students) {
        const cls = classes[classIndex];
        if (!cls) continue;
        const key = cls._id.toString();
        if (!classStudentMap[key]) classStudentMap[key] = [];
        classStudentMap[key].push(user._id);
    }

    // Bổ sung từ DB (class_members đã có từ trước)
    for (const cls of classes) {
        const key = cls._id.toString();
        if (!classStudentMap[key]) {
            const members = await ClassMember.find({ class_id: cls._id, status: 'ACTIVE' });
            classStudentMap[key] = members.map(m => m.student_user_id);
        }
    }

    let created = 0;
    let skipped = 0;
    const meetingMap = {}; // key: `${classId}_${termId}` → meeting

    for (const cls of classes) {
        const advisorId = cls.advisor_user_id;
        const studentIds = classStudentMap[cls._id.toString()] || [];
        if (studentIds.length === 0) continue;

        for (const term of targetTerms) {
            const key = `${cls._id}_${term._id}`;

            // Kiểm tra đã có chưa
            const existing = await Meeting.findOne({ class_id: cls._id, term_id: term._id });
            if (existing) {
                meetingMap[key] = existing;
                skipped++;
                continue;
            }

            // Tạo thời gian họp trong khoảng giữa học kỳ
            const meetingStart = randomDate(
                new Date(term.start_date.getTime() + 14 * 24 * 3600 * 1000), // sau 2 tuần
                new Date(term.end_date.getTime() - 14 * 24 * 3600 * 1000),   // trước 2 tuần
            );
            const meetingEnd = new Date(meetingStart.getTime() + 90 * 60 * 1000); // 90 phút

            const notes = MEETING_NOTES[Math.floor(Math.random() * MEETING_NOTES.length)];

            const meeting = await Meeting.create({
                class_id: cls._id,
                student_user_ids: studentIds,
                advisor_user_id: advisorId,
                term_id: term._id,
                meeting_time: meetingStart,
                meeting_end_time: meetingEnd,
                notes_raw: notes,
                notes_summary: notes.substring(0, 120) + '...',
                summary_model: 'T5',
            });

            meetingMap[key] = meeting;
            created++;
        }
    }

    console.log(`  ✅ ${created} buổi họp mới | ${skipped} đã tồn tại`);
    return meetingMap;
}

module.exports = seedMeetings;
