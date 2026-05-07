/**
 * 02_classes.js — Seed 4 advisor_class mới (lớp 5-8)
 * Lớp 1-4 đã có trong DB (CNTT-K18, HTTT-K18, TPM5, ARCCSU1)
 * Strategy: upsert theo class_code
 */

const AdvisorClass = require('../../../src/models/advisorClass.model');

// 4 lớp mới tương ứng 4 advisor mới (GV_SEED_001..004)
const NEW_CLASS_TEMPLATES = [
    { class_code: 'KHMT-K21A', class_name: 'Lớp KHMT K21 - Nhóm A', cohort_year: 2021, majorCode: 'KHMT' },
    { class_code: 'TTNT-K21A', class_name: 'Lớp TTNT K21 - Nhóm A', cohort_year: 2021, majorCode: 'TTNT' },
    { class_code: 'KHDL-K22A', class_name: 'Lớp KHDL K22 - Nhóm A', cohort_year: 2022, majorCode: 'KHDL' },
    { class_code: 'KHMT-K22A', class_name: 'Lớp KHMT K22 - Nhóm A', cohort_year: 2022, majorCode: 'KHMT' },
];

async function seedClasses({ advisors, departments, majors }) {
    const khmt = departments.find(d => d.department_code === 'KHMT');

    // Lấy 4 lớp cũ đã có trong DB
    const existingClasses = await AdvisorClass.find({
        class_code: { $in: ['CNTT-K18', 'HTTT-K18', 'TPM5', 'ARCCSU1'] }
    });

    const newClasses = [];
    for (let i = 0; i < NEW_CLASS_TEMPLATES.length; i++) {
        const tpl = NEW_CLASS_TEMPLATES[i];
        const advisor = advisors[i]; // advisor mới thứ i
        const major = majors.find(m => m.major_code === tpl.majorCode) || majors[0];

        const existing = await AdvisorClass.findOne({ class_code: tpl.class_code });
        if (existing) {
            newClasses.push(existing);
            continue;
        }

        const cls = await AdvisorClass.create({
            class_code: tpl.class_code,
            class_name: tpl.class_name,
            advisor_user_id: advisor._id,
            department_id: khmt._id,
            major_id: major._id,
            cohort_year: tpl.cohort_year,
            status: 'ACTIVE',
        });
        newClasses.push(cls);
    }

    // allClasses: 4 cũ + 4 mới = 8 lớp
    const allClasses = [...existingClasses, ...newClasses];
    console.log(`  ✅ ${allClasses.length} lớp cố vấn (${existingClasses.length} cũ + ${newClasses.length} mới)`);

    return allClasses;
}

module.exports = seedClasses;
