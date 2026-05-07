/**
 * seed.js — Entry point duy nhất
 * Chạy: node scripts/seed/seed.js
 * Reset: node scripts/seed/seed.js --reset  (xóa toàn bộ data seed trước khi chạy lại)
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Models (cần load để mongoose biết schema)
require('../../src/models/term.model');
require('../../src/models/user.model');
require('../../src/models/advisorClass.model');
require('../../src/models/classMember.model');
require('../../src/models/meeting.model');
require('../../src/models/academicRecord.model');
require('../../src/models/riskPrediction.model');
require('../../src/models/feedback.model');
require('../../src/models/alert.model');
require('../../src/models/notification.model');
require('../../src/models/recommendation.model');
require('../../src/models/department.model');
require('../../src/models/major.model');

const Department = require('../../src/models/department.model');
const Major = require('../../src/models/major.model');
const Term = require('../../src/models/term.model');
const User = require('../../src/models/user.model');
const AdvisorClass = require('../../src/models/advisorClass.model');
const ClassMember = require('../../src/models/classMember.model');
const Meeting = require('../../src/models/meeting.model');
const AcademicRecord = require('../../src/models/academicRecord.model');
const RiskPrediction = require('../../src/models/riskPrediction.model');
const Feedback = require('../../src/models/feedback.model');
const Alert = require('../../src/models/alert.model');
const Notification = require('../../src/models/notification.model');
const Recommendation = require('../../src/models/recommendation.model');

const seedUsers = require('./seeders/01_users');
const seedClasses = require('./seeders/02_classes');
const seedClassMembers = require('./seeders/03_classMembers');
const seedMeetings = require('./seeders/04_meetings');
const seedAcademic = require('./seeders/05_academic');
const seedRiskPredictions = require('./seeders/06_riskPredictions');
const seedFeedback = require('./seeders/07_feedback');
const seedAlerts = require('./seeders/08_alerts');
const seedNotifications = require('./seeders/09_notifications');
const seedRecommendations = require('./seeders/10_recommendations');

// Email domain của seed data — dùng để identify khi reset
const SEED_EMAIL_DOMAIN = '@dtu.edu.vn';
const SEED_STAFF_CODES = ['GV_SEED_001', 'GV_SEED_002', 'GV_SEED_003', 'GV_SEED_004'];
const SEED_CLASS_CODES = ['KHMT-K21A', 'TTNT-K21A', 'KHDL-K22A', 'KHMT-K22A'];
const SHOWCASE_EMAIL = 'trandinhquan.21it001@dtu.edu.vn';

async function resetSeedData() {
    console.log('\n🗑️  Đang xóa dữ liệu seed cũ...');

    // Tìm user seed
    const seedUsers = await User.find({
        $or: [
            { email: { $regex: SEED_EMAIL_DOMAIN } },
        ]
    }).select('_id');
    const seedUserIds = seedUsers.map(u => u._id);

    if (seedUserIds.length > 0) {
        // Xóa theo cascade
        await Recommendation.deleteMany({ student_user_id: { $in: seedUserIds } });
        await Notification.deleteMany({ recipient_user_id: { $in: seedUserIds } });
        await Alert.deleteMany({ student_user_id: { $in: seedUserIds } });
        await Feedback.deleteMany({ student_user_id: { $in: seedUserIds } });
        await AcademicRecord.deleteMany({ student_user_id: { $in: seedUserIds } });
        await RiskPrediction.deleteMany({ student_user_id: { $in: seedUserIds } });

        // Meetings của lớp seed
        const seedClasses = await AdvisorClass.find({ class_code: { $in: SEED_CLASS_CODES } });
        const seedClassIds = seedClasses.map(c => c._id);
        await Meeting.deleteMany({ class_id: { $in: seedClassIds } });
        await ClassMember.deleteMany({ student_user_id: { $in: seedUserIds } });
        await AdvisorClass.deleteMany({ class_code: { $in: SEED_CLASS_CODES } });
        await User.deleteMany({ _id: { $in: seedUserIds } });

        console.log(`  ✅ Đã xóa ${seedUserIds.length} users và dữ liệu liên quan`);
    } else {
        console.log('  ℹ️  Không có dữ liệu seed cũ để xóa');
    }
}

async function main() {
    const isReset = process.argv.includes('--reset');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌱 ADVISOR SEED SCRIPT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Kết nối DB
    console.log('\n📡 Kết nối MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('  ✅ Đã kết nối:', process.env.MONGO_URI.replace(/\/\/.*@/, '//***@'));

    if (isReset) {
        await resetSeedData();
    }

    // ── Đọc dữ liệu nền đã có ──────────────────────────────────
    const departments = await Department.find();
    const majors = await Major.find();
    const terms = await Term.find();

    console.log(`\n📋 Dữ liệu nền: ${departments.length} departments | ${majors.length} majors | ${terms.length} terms`);

    const TARGET_TERM_CODES = [
        '2021-1', '2021-2', '2021-3',
        '2022-1', '2022-2', '2022-3',
        '2023-1', '2023-2', '2023-3',
        '2024-1', '2024-2', '2024-3',
        '2025-1', '2025-2',
    ];
    const targetTerms = terms.filter(t => TARGET_TERM_CODES.includes(t.term_code));
    if (targetTerms.length < 14) {
        console.warn(`  ⚠️  Chỉ tìm thấy ${targetTerms.length}/14 kỳ học cần thiết`);
        console.warn('  Các kỳ tìm thấy:', targetTerms.map(t => t.term_code).join(', '));
    } else {
        console.log(`  ✅ Đủ 14 kỳ học: ${targetTerms.map(t => t.term_code).join(', ')}`);
    }

    // ── STEP 1: Users ──────────────────────────────────────────
    console.log('\n🌱 [1/9] Seeding Users...');
    const { advisors, students, showcaseStudent } = await seedUsers({ departments, majors });

    // ── STEP 2: Classes ────────────────────────────────────────
    console.log('\n🌱 [2/9] Seeding Advisor Classes...');
    const classes = await seedClasses({ advisors, departments, majors });

    // ── STEP 3: Class Members ──────────────────────────────────
    console.log('\n🌱 [3/9] Seeding Class Members...');
    await seedClassMembers({ students, classes, showcaseStudent });

    // ── STEP 4: Meetings ───────────────────────────────────────
    console.log('\n🌱 [4/9] Seeding Meetings...');
    const meetingMap = await seedMeetings({ classes, terms: targetTerms, students, showcaseStudent });

    // ── STEP 5: Academic Records ───────────────────────────────
    console.log('\n🌱 [5/9] Seeding Academic Records...');
    await seedAcademic({ students, showcaseStudent, terms: targetTerms });

    // ── STEP 6: Risk Predictions ───────────────────────────────
    console.log('\n🌱 [6/9] Seeding Risk Predictions...');
    await seedRiskPredictions({ students, showcaseStudent, terms: targetTerms });

    // ── STEP 7: Feedback ───────────────────────────────────────
    console.log('\n🌱 [7/9] Seeding Feedback...');
    await seedFeedback({ meetingMap, students, showcaseStudent, classes, terms: targetTerms });

    // ── STEP 8: Alerts ─────────────────────────────────────────
    console.log('\n🌱 [8/9] Seeding Alerts...');
    await seedAlerts({ students, showcaseStudent, terms: targetTerms });

    // ── STEP 9: Notifications ──────────────────────────────────
    console.log('\n🌱 [9/9a] Seeding Notifications...');
    await seedNotifications({ students, showcaseStudent });

    console.log('\n🌱 [9/9b] Seeding Recommendations...');
    await seedRecommendations({ students, showcaseStudent, terms: targetTerms });

    // ── TỔNG KẾT ───────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 THỐNG KÊ SAU KHI SEED:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const stats = [
        ['users', await User.countDocuments()],
        ['advisor_classes', await AdvisorClass.countDocuments()],
        ['class_members', await ClassMember.countDocuments()],
        ['meetings', await Meeting.countDocuments()],
        ['academic_records', await AcademicRecord.countDocuments()],
        ['risk_predictions', await RiskPrediction.countDocuments()],
        ['feedbacks', await Feedback.countDocuments()],
        ['alert', await Alert.countDocuments()],
        ['notifications', await Notification.countDocuments()],
        ['recommendations', await Recommendation.countDocuments()],
    ];

    for (const [col, count] of stats) {
        console.log(`  ${col.padEnd(20)} : ${count}`);
    }

    console.log('\n✅ SEED HOÀN TẤT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔑 Tài khoản demo:');
    console.log('  Showcase SV : trandinhquan.21it001@dtu.edu.vn / 123456');
    console.log('  Advisor mới : huongnt_seed@dtu.edu.vn / 123456');
    console.log('  (Xem thêm các tài khoản @dtu.edu.vn trong DB)');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ SEED THẤT BẠI:', err.message);
    console.error(err.stack);
    mongoose.disconnect();
    process.exit(1);
});
