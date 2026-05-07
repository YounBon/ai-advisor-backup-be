/**
 * 06_riskPredictions.js — Seed risk_predictions từ academic_records
 * 1 risk prediction per (student, term) — tương quan với GPA
 * Strategy: upsert theo partial unique index (student_user_id, term_id, is_latest=true)
 */

const RiskPrediction = require('../../../src/models/riskPrediction.model');
const AcademicRecord = require('../../../src/models/academicRecord.model');
const { calcRisk, randomInRange, round2 } = require('../helpers');

async function seedRiskPredictions({ students, showcaseStudent, terms }) {
    const TARGET_TERM_CODES = [
        '2021-1', '2021-2', '2021-3',
        '2022-1', '2022-2', '2022-3',
        '2023-1', '2023-2', '2023-3',
        '2024-1', '2024-2', '2024-3',
        '2025-1', '2025-2',
    ];
    const targetTerms = terms.filter(t => TARGET_TERM_CODES.includes(t.term_code));

    let created = 0;
    let skipped = 0;

    // Lấy tất cả academic records is_latest=true của các SV cần seed
    const allStudentIds = [
        showcaseStudent._id,
        ...students.map(s => s.user._id),
    ];

    const records = await AcademicRecord.find({
        student_user_id: { $in: allStudentIds },
        term_id: { $in: targetTerms.map(t => t._id) },
        is_latest: true,
    });

    for (const record of records) {
        const exists = await RiskPrediction.findOne({
            student_user_id: record.student_user_id,
            term_id: record.term_id,
            is_latest: true,
        });
        if (exists) { skipped++; continue; }

        const { risk_label, risk_score } = calcRisk(record.gpa_current);

        // Thời điểm predict: sau khi có academic record ~1-3 ngày
        const predictedAt = new Date(record.recorded_at.getTime() + Math.floor(randomInRange(1, 3)) * 24 * 3600 * 1000);

        await RiskPrediction.create({
            student_user_id: record.student_user_id,
            term_id: record.term_id,
            risk_score,
            risk_label,
            model_name: 'RandomForest',
            predicted_at: predictedAt,
            is_latest: true,
        });
        created++;
    }

    console.log(`  ✅ ${created} risk_predictions mới | ${skipped} đã tồn tại`);
    return { created };
}

module.exports = seedRiskPredictions;
