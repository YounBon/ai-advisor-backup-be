/**
 * verify.js — Kiểm tra nhanh dữ liệu sau seed
 * Chạy: node scripts/seed/verify.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 VERIFY SEED DATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Thống kê collections
    const collections = [
        'users', 'advisor_classes', 'class_members', 'meetings',
        'academic_records', 'risk_predictions', 'feedbacks',
        'alert', 'notifications', 'recommendations',
    ];
    console.log('\n📊 Số lượng records:');
    for (const col of collections) {
        const count = await db.collection(col).countDocuments();
        console.log(`  ${col.padEnd(20)}: ${count}`);
    }

    // Showcase student
    const sv = await db.collection('users').findOne({ email: 'trandinhquan.21it001@dtu.edu.vn' });
    if (!sv) {
        console.log('\n❌ Không tìm thấy showcase student!');
        process.exit(1);
    }

    console.log('\n👤 SHOWCASE STUDENT: ' + sv.profile.full_name + ' (' + sv.student_info.student_code + ')');

    const records = await db.collection('academic_records')
        .find({ student_user_id: sv._id, is_latest: true })
        .sort({ recorded_at: 1 })
        .toArray();

    const terms = await db.collection('terms').find({}).toArray();
    const termMap = {};
    terms.forEach(t => { termMap[t._id.toString()] = t.term_code; });

    console.log('\n📈 GPA theo kỳ (showcase):');
    records.forEach(r => {
        const code = termMap[r.term_id.toString()] || '?';
        const bar = '█'.repeat(Math.round(r.gpa_current * 5));
        console.log('  ' + code.padEnd(8) + ' GPA: ' + String(r.gpa_current).padEnd(5) + ' ' + bar);
    });

    const risks = await db.collection('risk_predictions')
        .find({ student_user_id: sv._id, is_latest: true })
        .sort({ predicted_at: 1 })
        .toArray();

    console.log('\n⚠️  Risk theo kỳ (showcase):');
    risks.forEach(r => {
        const code = termMap[r.term_id.toString()] || '?';
        const label = r.risk_label === -1 ? 'CAO  ' : r.risk_label === 0 ? 'TB   ' : 'THẤP ';
        console.log('  ' + code.padEnd(8) + ' label: ' + label + ' score: ' + r.risk_score);
    });

    // Kiểm tra broken references
    console.log('\n🔗 Kiểm tra broken references...');
    const orphanAcademic = await db.collection('academic_records').aggregate([
        { $lookup: { from: 'users', localField: 'student_user_id', foreignField: '_id', as: 'sv' } },
        { $match: { sv: { $size: 0 } } },
        { $count: 'total' },
    ]).toArray();
    console.log('  academic_records orphan:', orphanAcademic[0]?.total || 0);

    const orphanRisk = await db.collection('risk_predictions').aggregate([
        { $lookup: { from: 'users', localField: 'student_user_id', foreignField: '_id', as: 'sv' } },
        { $match: { sv: { $size: 0 } } },
        { $count: 'total' },
    ]).toArray();
    console.log('  risk_predictions orphan:', orphanRisk[0]?.total || 0);

    const orphanFeedback = await db.collection('feedbacks').aggregate([
        { $lookup: { from: 'meetings', localField: 'meeting_id', foreignField: '_id', as: 'mtg' } },
        { $match: { mtg: { $size: 0 } } },
        { $count: 'total' },
    ]).toArray();
    console.log('  feedbacks orphan meeting:', orphanFeedback[0]?.total || 0);

    // Phân bố GPA
    console.log('\n📊 Phân bố GPA (academic_records is_latest):');
    const gpaDistrib = await db.collection('academic_records').aggregate([
        { $match: { is_latest: true } },
        {
            $bucket: {
                groupBy: '$gpa_current',
                boundaries: [0, 2.0, 2.5, 3.0, 3.5, 4.01],
                default: 'other',
                output: { count: { $sum: 1 } },
            }
        },
    ]).toArray();
    gpaDistrib.forEach(b => {
        console.log('  GPA ' + b._id + '+: ' + b.count);
    });

    // Phân bố risk
    console.log('\n⚠️  Phân bố risk_label:');
    const riskDistrib = await db.collection('risk_predictions').aggregate([
        { $match: { is_latest: true } },
        { $group: { _id: '$risk_label', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]).toArray();
    riskDistrib.forEach(r => {
        const label = r._id === -1 ? 'CAO (-1)' : r._id === 0 ? 'TB  (0) ' : 'THẤP(1) ';
        console.log('  ' + label + ': ' + r.count);
    });

    console.log('\n✅ VERIFY HOÀN TẤT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(e => {
    console.error('❌', e.message);
    process.exit(1);
});
