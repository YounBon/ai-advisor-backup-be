/**
 * 10_recommendations.js — Seed recommendations cho SV risk cao
 * Tối ưu: batch query, insertMany
 * Strategy: kiểm tra theo (student_user_id, term_id, risk_prediction_id, title)
 */

const Recommendation = require('../../../src/models/recommendation.model');
const RiskPrediction = require('../../../src/models/riskPrediction.model');

const RECO_TEMPLATES = {
    '-1': [ // risk_label = -1 (cao) → 2 recos HIGH
        {
            title: 'Đăng ký học lại ngay',
            content: 'Sinh viên cần đăng ký học lại các môn đã trượt trong học kỳ này để đảm bảo tiến độ tốt nghiệp. Liên hệ phòng đào tạo để được hỗ trợ.',
            priority: 'HIGH',
        },
        {
            title: 'Tham gia chương trình hỗ trợ học tập',
            content: 'Đăng ký tham gia nhóm học tập có hướng dẫn (tutoring) do nhà trường tổ chức. Gặp cố vấn học tập ít nhất 2 lần/tháng để theo dõi tiến độ.',
            priority: 'HIGH',
        },
        {
            title: 'Tư vấn tâm lý học đường',
            content: 'Liên hệ trung tâm hỗ trợ sinh viên để được tư vấn tâm lý. Áp lực học tập cần được giải quyết kịp thời để tránh ảnh hưởng lâu dài.',
            priority: 'HIGH',
        },
    ],
    '0': [ // risk_label = 0 (trung bình) → 1 reco MEDIUM
        {
            title: 'Cải thiện kế hoạch học tập',
            content: 'Xây dựng thời gian biểu học tập cụ thể, ưu tiên các môn học yếu. Tham gia đầy đủ các buổi học và thực hành.',
            priority: 'MEDIUM',
        },
        {
            title: 'Tăng cường tham gia hoạt động học thuật',
            content: 'Tham gia các câu lạc bộ học thuật, seminar và workshop để mở rộng kiến thức và kỹ năng. Kết nối với sinh viên có kết quả tốt.',
            priority: 'MEDIUM',
        },
        {
            title: 'Theo dõi điểm danh và bài tập',
            content: 'Đảm bảo tỷ lệ điểm danh trên 80%. Nộp bài tập đúng hạn và chủ động hỏi giảng viên khi gặp khó khăn.',
            priority: 'MEDIUM',
        },
    ],
};

async function seedRecommendations({ students, showcaseStudent, terms }) {
    const TARGET_TERM_CODES = [
        '2021-1', '2021-2', '2021-3',
        '2022-1', '2022-2', '2022-3',
        '2023-1', '2023-2', '2023-3',
        '2024-1', '2024-2', '2024-3',
        '2025-1', '2025-2',
    ];
    const targetTerms = terms.filter(t => TARGET_TERM_CODES.includes(t.term_code));
    const termIds = targetTerms.map(t => t._id);

    // Chỉ seed reco cho nhóm C và D
    const riskStudents = [
        ...students.filter(s => s.tier === 'C' || s.tier === 'D'),
        { user: showcaseStudent, tier: 'D' },
    ];
    const riskStudentIds = riskStudents.map(s => s.user._id);

    // Batch load risk predictions risk_label <= 0
    const riskPreds = await RiskPrediction.find({
        student_user_id: { $in: riskStudentIds },
        term_id: { $in: termIds },
        is_latest: true,
        risk_label: { $lte: 0 },
    }).lean();

    // Batch load existing recommendations
    const existingRecos = await Recommendation.find({
        student_user_id: { $in: riskStudentIds },
        term_id: { $in: termIds },
    }).lean();
    const existingSet = new Set(
        existingRecos.map(r => `${r.student_user_id}_${r.term_id}_${r.title}`)
    );

    const toInsert = [];

    for (const riskPred of riskPreds) {
        const labelKey = String(riskPred.risk_label);
        const pool = RECO_TEMPLATES[labelKey] || [];
        if (pool.length === 0) continue;

        // risk_label -1: chọn 2 recos ngẫu nhiên; risk_label 0: chọn 1
        const count = riskPred.risk_label === -1 ? 2 : 1;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);

        for (const reco of selected) {
            const key = `${riskPred.student_user_id}_${riskPred.term_id}_${reco.title}`;
            if (existingSet.has(key)) continue;

            toInsert.push({
                student_user_id: riskPred.student_user_id,
                term_id: riskPred.term_id,
                risk_prediction_id: riskPred._id,
                title: reco.title,
                content: reco.content,
                priority: reco.priority,
            });
            existingSet.add(key);
        }
    }

    let created = 0;
    if (toInsert.length > 0) {
        await Recommendation.insertMany(toInsert, { ordered: false });
        created = toInsert.length;
    }

    console.log(`  ✅ ${created} recommendations mới | ${existingRecos.length} đã tồn tại`);
    return { created };
}

module.exports = seedRecommendations;
