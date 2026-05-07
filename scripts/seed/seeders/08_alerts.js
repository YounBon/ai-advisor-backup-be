/**
 * 08_alerts.js — Seed alerts cho SV nhóm C và D (risk cao/trung bình)
 * Tối ưu: batch query thay vì loop từng record
 * Strategy: kiểm tra trước khi insert (không có unique index trên alert)
 */

const Alert = require('../../../src/models/alert.model');
const RiskPrediction = require('../../../src/models/riskPrediction.model');
const AcademicRecord = require('../../../src/models/academicRecord.model');
const Feedback = require('../../../src/models/feedback.model');
const { calcAlertSeverity, randomInRange } = require('../helpers');

async function seedAlerts({ students, showcaseStudent, terms }) {
    const TARGET_TERM_CODES = [
        '2021-1', '2021-2', '2021-3',
        '2022-1', '2022-2', '2022-3',
        '2023-1', '2023-2', '2023-3',
        '2024-1', '2024-2', '2024-3',
        '2025-1', '2025-2',
    ];
    const targetTerms = terms.filter(t => TARGET_TERM_CODES.includes(t.term_code));
    const termIds = targetTerms.map(t => t._id);

    // SV cần tạo alert: nhóm C, D + showcase
    const alertStudents = [
        ...students.filter(s => s.tier === 'C' || s.tier === 'D'),
        { user: showcaseStudent, tier: 'D' },
    ];
    const alertStudentIds = alertStudents.map(s => s.user._id);

    // Batch load tất cả risk predictions cần thiết
    const riskPreds = await RiskPrediction.find({
        student_user_id: { $in: alertStudentIds },
        term_id: { $in: termIds },
        is_latest: true,
        risk_label: { $lte: 0 },
    }).lean();

    // Batch load academic records
    const recordMap = new Map();
    const records = await AcademicRecord.find({
        student_user_id: { $in: alertStudentIds },
        term_id: { $in: termIds },
        is_latest: true,
    }).lean();
    for (const r of records) {
        recordMap.set(`${r.student_user_id}_${r.term_id}`, r);
    }

    // Batch load existing alerts để tránh duplicate
    const existingAlerts = await Alert.find({
        student_user_id: { $in: alertStudentIds },
        term_id: { $in: termIds },
    }).lean();
    const existingSet = new Set(
        existingAlerts.map(a => `${a.student_user_id}_${a.term_id}_${a.alert_type}_${a.risk_prediction_id || ''}_${a.feedback_id || ''}`)
    );

    // Batch load feedback NEGATIVE của các SV nhóm D
    const tierDIds = alertStudents.filter(s => s.tier === 'D').map(s => s.user._id);
    const negFeedbacks = await Feedback.find({
        student_user_id: { $in: tierDIds },
        sentiment_label: 'NEGATIVE',
    }).lean();
    // Map: studentId → first negative feedback
    const negFeedbackMap = new Map();
    for (const fb of negFeedbacks) {
        const key = fb.student_user_id.toString();
        if (!negFeedbackMap.has(key)) negFeedbackMap.set(key, fb);
    }

    // Build tier map
    const tierMap = new Map();
    for (const s of alertStudents) tierMap.set(s.user._id.toString(), s.tier);

    let created = 0;
    let skipped = 0;
    const toInsert = [];

    for (const riskPred of riskPreds) {
        const svId = riskPred.student_user_id.toString();
        const termId = riskPred.term_id.toString();
        const record = recordMap.get(`${svId}_${termId}`);
        if (!record) continue;

        const severity = calcAlertSeverity(riskPred.risk_label, record.gpa_current);
        const riskKey = `${svId}_${termId}_RISK_${riskPred._id}_`;

        if (!existingSet.has(riskKey)) {
            toInsert.push({
                student_user_id: riskPred.student_user_id,
                term_id: riskPred.term_id,
                alert_type: 'RISK',
                source_ai: 'AI01_RISK',
                severity,
                risk_prediction_id: riskPred._id,
                academic_record_id: record._id,
                metadata: {
                    gpa: record.gpa_current,
                    risk_score: riskPred.risk_score,
                    num_failed: record.num_failed,
                },
                status: Math.random() < 0.4 ? 'RESOLVED' : Math.random() < 0.5 ? 'ACKED' : 'OPEN',
                detected_at: new Date(new Date(riskPred.predicted_at).getTime() + Math.floor(randomInRange(0, 2)) * 3600 * 1000),
            });
            existingSet.add(riskKey);
        } else {
            skipped++;
        }

        // Alert SENTIMENT cho nhóm D
        const tier = tierMap.get(svId);
        if (tier === 'D' || record.gpa_current < 2.0) {
            const negFb = negFeedbackMap.get(svId);
            if (negFb) {
                const sentKey = `${svId}_${termId}_SENTIMENT__${negFb._id}`;
                if (!existingSet.has(sentKey)) {
                    toInsert.push({
                        student_user_id: riskPred.student_user_id,
                        term_id: riskPred.term_id,
                        alert_type: 'SENTIMENT',
                        source_ai: 'AI02_SENTIMENT',
                        severity: record.gpa_current < 1.5 ? 'HIGH' : 'MEDIUM',
                        feedback_id: negFb._id,
                        academic_record_id: record._id,
                        metadata: {
                            sentiment_label: 'NEGATIVE',
                            feedback_score: negFb.feedback_score,
                            stress_level: record.stress_level,
                        },
                        status: 'OPEN',
                        detected_at: new Date(new Date(negFb.submitted_at).getTime() + 3600 * 1000),
                    });
                    existingSet.add(sentKey);
                } else {
                    skipped++;
                }
            }
        }
    }

    // Batch insert
    if (toInsert.length > 0) {
        await Alert.insertMany(toInsert, { ordered: false });
        created = toInsert.length;
    }

    console.log(`  ✅ ${created} alerts mới | ${skipped} đã tồn tại`);
    return { created };
}

module.exports = seedAlerts;
