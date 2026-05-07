/**
 * 03_classMembers.js — Gán sinh viên vào lớp
 * Strategy: upsert theo (class_id, student_user_id) — unique index
 */

const ClassMember = require('../../../src/models/classMember.model');
const User = require('../../../src/models/user.model');

async function seedClassMembers({ students, classes, showcaseStudent }) {
    let created = 0;
    let skipped = 0;

    // Gán showcase student vào lớp đầu tiên (CNTT-K18 hoặc lớp 0)
    const showcaseClass = classes[0];
    const showcaseExists = await ClassMember.findOne({
        student_user_id: showcaseStudent._id,
    });
    if (!showcaseExists) {
        await ClassMember.create({
            class_id: showcaseClass._id,
            student_user_id: showcaseStudent._id,
            joined_at: new Date(2021, 8, 1),
            status: 'ACTIVE',
        });
        // Cập nhật advisor_user_id cho showcase student
        await User.updateOne(
            { _id: showcaseStudent._id },
            { $set: { 'student_info.advisor_user_id': showcaseClass.advisor_user_id } }
        );
        created++;
    } else {
        skipped++;
    }

    // Gán 96 SV vào 8 lớp (12 SV/lớp theo classIndex)
    for (const { user, classIndex } of students) {
        const cls = classes[classIndex];
        if (!cls) continue;

        const exists = await ClassMember.findOne({ student_user_id: user._id });
        if (exists) {
            skipped++;
            continue;
        }

        const cohortYear = user.student_info?.cohort_year || 2021;
        await ClassMember.create({
            class_id: cls._id,
            student_user_id: user._id,
            joined_at: new Date(cohortYear, 8, 1), // tháng 9 năm nhập học
            status: 'ACTIVE',
        });

        // Cập nhật advisor_user_id trên user
        await User.updateOne(
            { _id: user._id },
            { $set: { 'student_info.advisor_user_id': cls.advisor_user_id } }
        );

        created++;
    }

    console.log(`  ✅ ${created} class_members mới | ${skipped} đã tồn tại`);
    return { created, skipped };
}

module.exports = seedClassMembers;
