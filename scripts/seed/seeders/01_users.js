/**
 * 01_users.js — Seed 4 advisor mới + 96 student mới + 1 showcase student
 * Strategy: upsert theo email (unique) — không đụng user cũ
 */

const mongoose = require('mongoose');
const User = require('../../../src/models/user.model');
const { randomName, nameToUsername, initialGPA, randomItem } = require('../helpers');

// Departments và Majors thuộc KHMT (Trường Khoa học Máy tính)
// Sẽ được truyền vào từ context
const ADVISOR_TEMPLATES = [
    { full_name: 'Nguyễn Thị Hương', gender: 'FEMALE', staff_code: 'GV_SEED_001', title: 'Tiến sĩ' },
    { full_name: 'Trần Văn Bảo', gender: 'MALE', staff_code: 'GV_SEED_002', title: 'Thạc sĩ' },
    { full_name: 'Lê Thị Phương', gender: 'FEMALE', staff_code: 'GV_SEED_003', title: 'Tiến sĩ' },
    { full_name: 'Phạm Đức Thịnh', gender: 'MALE', staff_code: 'GV_SEED_004', title: 'Thạc sĩ' },
];

// 8 lớp: 4 lớp cũ (đã có) + 4 lớp mới sẽ được tạo ở 02_classes.js
// Mỗi advisor mới quản 1 lớp mới
// Phân bổ 96 SV vào 8 lớp (12 SV/lớp)
// Tier distribution per class: 2-3 A, 4-5 B, 3 C, 1-2 D

const TIERS = ['A', 'A', 'B', 'B', 'B', 'B', 'B', 'C', 'C', 'C', 'D', 'D'];
// 12 SV/lớp: 2A, 5B, 3C, 2D

async function seedUsers({ departments, majors }) {
    // Truyền plain text — model pre-save hook sẽ tự hash 1 lần
    const PLAIN_PASSWORD = '123456';

    // Lấy department KHMT và major KHMT/TTNT/KHDL
    const khmt = departments.find(d => d.department_code === 'KHMT');
    const khmtMajors = majors.filter(m => ['KHMT', 'TTNT', 'KHDL'].includes(m.major_code));

    if (!khmt) throw new Error('Không tìm thấy department KHMT');
    if (khmtMajors.length === 0) throw new Error('Không tìm thấy major KHMT/TTNT/KHDL');

    // ── SEED ADVISORS ──────────────────────────────────────────────
    const advisors = [];
    for (const tpl of ADVISOR_TEMPLATES) {
        const username = nameToUsername(tpl.full_name, '_seed');
        const email = `${username}@dtu.edu.vn`;

        const existing = await User.findOne({ email });
        if (existing) {
            advisors.push(existing);
            continue;
        }

        const advisor = await User.create({
            username,
            email,
            password_hash: PLAIN_PASSWORD,
            role: 'ADVISOR',
            status: 'ACTIVE',
            profile: {
                full_name: tpl.full_name,
                gender: tpl.gender,
                date_of_birth: new Date(1975 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), 1),
                phone: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
            },
            org: {
                department_id: khmt._id,
                major_id: randomItem(khmtMajors)._id,
            },
            advisor_info: {
                staff_code: tpl.staff_code,
                title: tpl.title,
            },
        });
        advisors.push(advisor);
    }
    console.log(`  ✅ ${advisors.length} cố vấn (seed mới: ${ADVISOR_TEMPLATES.length})`);

    // ── SEED SHOWCASE STUDENT: Trần Đình Quân ─────────────────────
    const showcaseEmail = 'trandinhquan.21it001@dtu.edu.vn';
    let showcaseStudent = await User.findOne({ email: showcaseEmail });
    if (!showcaseStudent) {
        showcaseStudent = await User.create({
            username: 'trandinhquan_21it001',
            email: showcaseEmail,
            password_hash: PLAIN_PASSWORD,
            role: 'STUDENT',
            status: 'ACTIVE',
            profile: {
                full_name: 'Trần Đình Quân',
                gender: 'MALE',
                date_of_birth: new Date(2003, 0, 15),
                phone: '0901234567',
            },
            org: {
                department_id: khmt._id,
                major_id: khmtMajors.find(m => m.major_code === 'KHMT')?._id || khmtMajors[0]._id,
            },
            student_info: {
                student_code: '21IT001',
                cohort_year: 2021,
                enrollment_status: 'ENROLLED',
            },
        });
        console.log(`  ✅ Showcase student: Trần Đình Quân (21IT001)`);
    } else {
        console.log(`  ℹ️  Showcase student đã tồn tại: Trần Đình Quân`);
    }

    // ── SEED 96 STUDENTS ──────────────────────────────────────────
    // 8 lớp × 12 SV = 96 SV
    // advisors[0..3] = 4 advisor mới (lớp 5-8)
    // advisors cũ (lớp 1-4) sẽ được gán ở 02_classes.js
    const students = []; // array of { user, tier, classIndex (0-7) }
    const usedEmails = new Set();
    const usedCodes = new Set(['21IT001']); // showcase đã dùng

    // Cohort mapping: lớp 0-1 = 2021, lớp 2-3 = 2022, lớp 4-5 = 2021, lớp 6-7 = 2022
    const CLASS_COHORTS = [2021, 2021, 2022, 2022, 2021, 2021, 2022, 2022];
    const CLASS_MAJOR_CODES = ['KHMT', 'TTNT', 'KHDL', 'KHMT', 'TTNT', 'KHDL', 'KHMT', 'TTNT'];

    let svCounter = { 2021: 2, 2022: 1 }; // bắt đầu từ 002 cho 2021 (001 đã là showcase), 001 cho 2022

    for (let classIdx = 0; classIdx < 8; classIdx++) {
        const cohort = CLASS_COHORTS[classIdx];
        const majorCode = CLASS_MAJOR_CODES[classIdx];
        const major = khmtMajors.find(m => m.major_code === majorCode) || khmtMajors[0];
        const advisorForClass = advisors[classIdx % advisors.length];

        for (let svIdx = 0; svIdx < 12; svIdx++) {
            const tier = TIERS[svIdx];
            const gender = Math.random() < 0.55 ? 'MALE' : 'FEMALE';
            const fullName = randomName(gender);

            // Tạo student_code duy nhất
            let code;
            const yearShort = String(cohort).slice(2); // "21" hoặc "22"
            do {
                const num = String(svCounter[cohort] || 1).padStart(3, '0');
                code = `${yearShort}IT${num}`;
                svCounter[cohort] = (svCounter[cohort] || 1) + 1;
            } while (usedCodes.has(code));
            usedCodes.add(code);

            // Tạo email duy nhất
            let baseUsername = nameToUsername(fullName);
            let email;
            let attempt = 0;
            do {
                const suffix = attempt === 0 ? `.${code.toLowerCase()}` : `.${code.toLowerCase()}${attempt}`;
                email = `${baseUsername}${suffix}@dtu.edu.vn`;
                attempt++;
            } while (usedEmails.has(email));
            usedEmails.add(email);

            const username = email.split('@')[0].replace(/\./g, '_');

            // Kiểm tra tồn tại
            let user = await User.findOne({
                $or: [{ email }, { 'student_info.student_code': code }]
            });

            if (!user) {
                user = await User.create({
                    username,
                    email,
                    password_hash: PLAIN_PASSWORD,
                    role: 'STUDENT',
                    status: 'ACTIVE',
                    profile: {
                        full_name: fullName,
                        gender,
                        date_of_birth: new Date(cohort + 18, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                        phone: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
                    },
                    org: {
                        department_id: khmt._id,
                        major_id: major._id,
                    },
                    student_info: {
                        student_code: code,
                        cohort_year: cohort,
                        advisor_user_id: advisorForClass._id,
                        enrollment_status: 'ENROLLED',
                    },
                });
            }

            students.push({ user, tier, classIndex: classIdx });
        }
    }

    console.log(`  ✅ ${students.length} sinh viên mới (96 SV + 1 showcase)`);

    return { advisors, students, showcaseStudent };
}

module.exports = seedUsers;
