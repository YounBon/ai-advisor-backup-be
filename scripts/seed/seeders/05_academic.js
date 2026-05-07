/**
 * 05_academic.js — Seed academic_records
 * - 96 SV × 14 kỳ (kỳ hè chỉ 30% SV có record)
 * - 1 showcase SV × 14 kỳ (đầy đủ, GPA tăng dần 2.1 → 3.5)
 * Strategy: upsert theo partial unique index (student_user_id, term_id, is_latest=true)
 */

const AcademicRecord = require('../../../src/models/academicRecord.model');
const {
    initialGPA, nextGPA, calcRisk,
    calcAttendance, calcNumFailed, calcStress, calcMotivation,
    round2, randomInRange,
} = require('../helpers');

// Kỳ hè
const SUMMER_TERMS = new Set(['2021-3', '2022-3', '2023-3', '2024-3']);

// GPA showcase: tăng dần từ 2.1 → 3.5 qua 14 kỳ
const SHOWCASE_GPAS = [
    2.10, 2.25, 2.15, // kỳ 1,2,3 (2021)
    2.40, 2.55, 2.45, // kỳ 4,5,6 (2022)
    2.70, 2.85, 2.75, // kỳ 7,8,9 (2023)
    3.00, 3.15, 3.05, // kỳ 10,11,12 (2024)
    3.30, 3.50,       // kỳ 13,14 (2025)
];

async function seedAcademic({ students, showcaseStudent, terms }) {
    const TARGET_TERM_CODES = [
        '2021-1', '2021-2', '2021-3',
        '2022-1', '2022-2', '2022-3',
        '2023-1', '2023-2', '2023-3',
        '2024-1', '2024-2', '2024-3',
        '2025-1', '2025-2',
    ];
    const targetTerms = terms.filter(t => TARGET_TERM_CODES.includes(t.term_code));
    // Sắp xếp theo thứ tự thời gian
    targetTerms.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    let created = 0;
    let skipped = 0;

    // ── SHOWCASE STUDENT ──────────────────────────────────────────
    for (let i = 0; i < targetTerms.length; i++) {
        const term = targetTerms[i];
        const gpa = round2(SHOWCASE_GPAS[i]);
        const prevGpa = i > 0 ? round2(SHOWCASE_GPAS[i - 1]) : null;

        const exists = await AcademicRecord.findOne({
            student_user_id: showcaseStudent._id,
            term_id: term._id,
            is_latest: true,
        });
        if (exists) { skipped++; continue; }

        const stress = calcStress(gpa);
        const motivation = calcMotivation(gpa);
        const sentimentScore = gpa >= 3.0 ? round2(randomInRange(0.2, 0.8))
            : gpa >= 2.5 ? round2(randomInRange(-0.1, 0.4))
                : round2(randomInRange(-0.5, 0.1));

        await AcademicRecord.create({
            student_user_id: showcaseStudent._id,
            term_id: term._id,
            gpa_prev_sem: prevGpa,
            gpa_current: gpa,
            num_failed: calcNumFailed(gpa),
            attendance_rate: calcAttendance(gpa),
            shcvht_participation: Math.floor(randomInRange(1, 5)),
            study_hours: Math.floor(randomInRange(gpa * 4, gpa * 8)),
            motivation_score: motivation,
            stress_level: stress,
            sentiment_score: sentimentScore,
            recorded_at: new Date(term.end_date.getTime() - 7 * 24 * 3600 * 1000),
            is_latest: true,
            version: 1,
            updated_by: null,
        });
        created++;
    }

    // ── 96 SINH VIÊN THƯỜNG ───────────────────────────────────────
    // Khởi tạo GPA ban đầu cho mỗi SV
    const studentGPAState = new Map(); // userId → { tier, currentGPA }

    for (const { user, tier } of students) {
        studentGPAState.set(user._id.toString(), {
            tier,
            currentGPA: initialGPA(tier),
        });
    }

    for (const term of targetTerms) {
        const isSummer = SUMMER_TERMS.has(term.term_code);

        for (const { user, tier } of students) {
            const key = user._id.toString();
            const state = studentGPAState.get(key);

            // Kỳ hè: chỉ 30% SV có record
            if (isSummer && Math.random() > 0.30) {
                continue;
            }

            const exists = await AcademicRecord.findOne({
                student_user_id: user._id,
                term_id: term._id,
                is_latest: true,
            });
            if (exists) { skipped++; continue; }

            const gpa = state.currentGPA;
            const prevGpa = state.prevGPA || null;
            const stress = calcStress(gpa);
            const motivation = calcMotivation(gpa);

            const sentimentScore = gpa >= 3.0 ? round2(randomInRange(0.1, 0.9))
                : gpa >= 2.5 ? round2(randomInRange(-0.2, 0.5))
                    : gpa >= 2.0 ? round2(randomInRange(-0.5, 0.2))
                        : round2(randomInRange(-0.9, -0.1));

            await AcademicRecord.create({
                student_user_id: user._id,
                term_id: term._id,
                gpa_prev_sem: prevGpa,
                gpa_current: gpa,
                num_failed: calcNumFailed(gpa),
                attendance_rate: calcAttendance(gpa),
                shcvht_participation: Math.floor(randomInRange(0, 5)),
                study_hours: Math.floor(randomInRange(Math.max(1, gpa * 3), gpa * 9)),
                motivation_score: motivation,
                stress_level: stress,
                sentiment_score: sentimentScore,
                recorded_at: new Date(term.end_date.getTime() - Math.floor(randomInRange(3, 14)) * 24 * 3600 * 1000),
                is_latest: true,
                version: 1,
                updated_by: null,
            });
            created++;

            // Cập nhật GPA cho kỳ tiếp theo
            state.prevGPA = gpa;
            state.currentGPA = nextGPA(tier, gpa);
        }
    }

    console.log(`  ✅ ${created} academic_records mới | ${skipped} đã tồn tại`);
    return { created };
}

module.exports = seedAcademic;
