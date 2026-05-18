/**
 * Complete demo seed.
 *
 * Run:
 *   node scripts/seed-demo-complete/seed.js
 *   node scripts/seed-demo-complete/seed.js --reset
 *
 * Demo accounts:
 *   admin@gmail.com / 123456
 *   trandinhquan@gmail.com / 123456
 *   lehaikhoa@gmail.com / 123456
 *   faculty@gmail.com / 123456
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

require("../../src/models/term.model");
require("../../src/models/user.model");
require("../../src/models/advisorClass.model");
require("../../src/models/classMember.model");
require("../../src/models/meeting.model");
require("../../src/models/academicRecord.model");
require("../../src/models/riskPrediction.model");
require("../../src/models/feedback.model");
require("../../src/models/alert.model");
require("../../src/models/notification.model");
require("../../src/models/recommendation.model");
require("../../src/models/department.model");
require("../../src/models/major.model");

const Term = require("../../src/models/term.model");
const User = require("../../src/models/user.model");
const AdvisorClass = require("../../src/models/advisorClass.model");
const ClassMember = require("../../src/models/classMember.model");
const Meeting = require("../../src/models/meeting.model");
const AcademicRecord = require("../../src/models/academicRecord.model");
const RiskPrediction = require("../../src/models/riskPrediction.model");
const Feedback = require("../../src/models/feedback.model");
const Alert = require("../../src/models/alert.model");
const Notification = require("../../src/models/notification.model");
const Recommendation = require("../../src/models/recommendation.model");
const Department = require("../../src/models/department.model");
const Major = require("../../src/models/major.model");

const PASSWORD = "123456";
let PASSWORD_HASH = null;
const EMAIL_DOMAIN = "gmail.com";
const MARKER = "DEMO_COMPLETE";
const TERM_CODES = ["2022-1", "2022-2", "2023-1", "2023-2", "2024-1", "2024-2", "2025-1", "2025-2"];
const ACTIVE_TERM_CODE = "2025-2";

const WRONG_DEPARTMENT_CODES_FROM_OLD_SCRIPT = ["HTTT", "KTPM", "QTKD"];
const TERM_NAME_REPAIR = {
    "2022-1": "Học kì 1 năm 2022-2023",
    "2022-2": "Học kì 2 năm 2022-2023",
    "2023-1": "Học kì 1 năm 2023-2024",
    "2023-2": "Học kì 2 năm 2023-2024",
    "2024-1": "Học kì 1 năm 2024-2025",
    "2024-2": "Học kì 2 năm 2024-2025",
    "2025-1": "Học kì 1 năm 2025-2026",
    "2025-2": "Học kì 2 năm 2025-2026",
};

const FIRST_NAMES = ["Quan", "Khoa", "Minh", "An", "Bao", "Long", "Linh", "Mai", "Trang", "Vy", "Hung", "Nam", "Duc", "Phuc", "Thao", "Nhi"];
const LAST_NAMES = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vo", "Dang", "Bui", "Do", "Ngo", "Phan", "Huynh"];
const MIDDLE_NAMES = ["Van", "Thi", "Dinh", "Hai", "Minh", "Quoc", "Ngoc", "Thanh", "Duc", "Bao"];

function codeYear(termCode) {
    return Number(termCode.split("-")[0]);
}

function termDates(termCode) {
    const year = codeYear(termCode);
    const sem = termCode.endsWith("-1") ? 1 : 2;
    if (sem === 1) {
        return {
            academic_year: `${year}-${year + 1}`,
            term_name: `Hoc ky 1 nam hoc ${year}-${year + 1}`,
            start_date: new Date(year, 8, 1),
            end_date: new Date(year + 1, 0, 15),
        };
    }
    return {
        academic_year: `${year}-${year + 1}`,
        term_name: `Hoc ky 2 nam hoc ${year}-${year + 1}`,
        start_date: new Date(year + 1, 0, 16),
        end_date: new Date(year + 1, 5, 15),
    };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

function pick(arr, index) {
    return arr[index % arr.length];
}

function fullName(index) {
    return `${pick(LAST_NAMES, index)} ${pick(MIDDLE_NAMES, index * 3)} ${pick(FIRST_NAMES, index * 7)}`;
}

function riskFromGpa(gpa, pattern) {
    if (pattern === "critical") return { risk_label: -1, risk_score: round2(clamp(0.82 + Math.random() * 0.12, 0, 1)) };
    if (gpa < 2.0) return { risk_label: -1, risk_score: round2(0.72 + Math.random() * 0.18) };
    if (gpa < 2.8) return { risk_label: 0, risk_score: round2(0.43 + Math.random() * 0.22) };
    return { risk_label: 1, risk_score: round2(0.08 + Math.random() * 0.25) };
}

function academicProfile(pattern, termIndex) {
    const profiles = {
        excellent: { base: 3.35, delta: 0.05, attendance: 0.92, failed: 0, stress: 2, motivation: 5, sentiment: 0.55 },
        stable: { base: 2.85, delta: 0.02, attendance: 0.82, failed: 0, stress: 3, motivation: 4, sentiment: 0.25 },
        medium: { base: 2.45, delta: -0.01, attendance: 0.72, failed: termIndex % 3 === 0 ? 1 : 0, stress: 3, motivation: 3, sentiment: 0.05 },
        decline: { base: 3.05, delta: -0.17, attendance: 0.75 - termIndex * 0.035, failed: termIndex >= 5 ? 2 : termIndex >= 3 ? 1 : 0, stress: 3 + Math.floor(termIndex / 3), motivation: 4 - Math.floor(termIndex / 4), sentiment: 0.2 - termIndex * 0.12 },
        critical: { base: 2.2, delta: -0.12, attendance: 0.62 - termIndex * 0.04, failed: termIndex >= 4 ? 3 : 2, stress: 5, motivation: 1, sentiment: -0.75 },
        anomaly: { base: termIndex < 5 ? 3.25 : 1.75, delta: termIndex < 5 ? 0.02 : -0.05, attendance: termIndex < 5 ? 0.9 : 0.38, failed: termIndex < 5 ? 0 : 3, stress: termIndex < 5 ? 2 : 5, motivation: termIndex < 5 ? 5 : 1, sentiment: termIndex < 5 ? 0.45 : -0.82 },
    };
    const p = profiles[pattern] || profiles.stable;
    const gpa = round2(clamp(p.base + p.delta * termIndex + (Math.random() * 0.16 - 0.08), 0.5, 4));
    return {
        gpa_current: gpa,
        num_failed: p.failed,
        attendance_rate: round2(clamp(p.attendance + (Math.random() * 0.06 - 0.03), 0.25, 1)),
        shcvht_participation: pattern === "critical" || pattern === "anomaly" ? 0 : 2 + (termIndex % 3),
        study_hours: Math.max(2, Math.round(gpa * 6 + (Math.random() * 4 - 2))),
        motivation_score: clamp(p.motivation, 1, 5),
        stress_level: clamp(p.stress, 1, 5),
        sentiment_score: round2(clamp(p.sentiment + (Math.random() * 0.12 - 0.06), -1, 1)),
    };
}

async function loadExistingMasterData() {
    const departments = await Department.find({
        department_code: { $nin: WRONG_DEPARTMENT_CODES_FROM_OLD_SCRIPT },
    }).sort({ department_code: 1 });
    const majors = await Major.find({
        department_id: { $in: departments.map((dept) => dept._id) },
    }).sort({ major_code: 1 });
    const terms = await Term.find({ term_code: { $in: TERM_CODES } }).sort({ start_date: 1 });

    if (departments.length === 0) throw new Error("No departments found in DB");
    if (majors.length === 0) throw new Error("No majors found in DB");
    if (terms.length !== TERM_CODES.length) {
        const found = new Set(terms.map((term) => term.term_code));
        const missing = TERM_CODES.filter((code) => !found.has(code));
        throw new Error(`Missing required terms: ${missing.join(", ")}`);
    }

    return { departments, majors, terms };
}

async function assertRequiredTermsExist() {
    const terms = await Term.find({ term_code: { $in: TERM_CODES } }).select("term_code").lean();
    const found = new Set(terms.map((term) => term.term_code));
    const missing = TERM_CODES.filter((code) => !found.has(code));
    if (missing.length > 0) {
        throw new Error(
            `Missing required terms before seed reset: ${missing.join(", ")}. Create these terms first, then rerun seed.`
        );
    }
}

async function upsertUser(email, data) {
    if (!PASSWORD_HASH) PASSWORD_HASH = await bcrypt.hash(PASSWORD, 10);
    return User.findOneAndUpdate(
        { email },
        { $set: { email, password_hash: PASSWORD_HASH, ...data } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

async function resetDemoData() {
    const users = await User.find({
        $or: [
            { email: { $in: ["admin@gmail.com", "trandinhquan@gmail.com", "lehaikhoa@gmail.com", "faculty@gmail.com"] } },
            { email: { $regex: `^demo\\.complete\\..*@${EMAIL_DOMAIN}$` } },
            { username: { $regex: "^demo_complete_" } },
            { "student_info.student_code": { $regex: "^DC" } },
            { "advisor_info.staff_code": { $regex: "^DCGV" } },
        ],
    }).select("_id");
    const userIds = users.map((u) => u._id);
    const classes = await AdvisorClass.find({ class_code: { $regex: "^DC-" } }).select("_id");
    const classIds = classes.map((c) => c._id);
    const meetings = await Meeting.find({ class_id: { $in: classIds } }).select("_id");
    const meetingIds = meetings.map((m) => m._id);

    await Recommendation.deleteMany({ student_user_id: { $in: userIds } });
    await Notification.deleteMany({ $or: [{ recipient_user_id: { $in: userIds } }] });
    await Alert.deleteMany({ student_user_id: { $in: userIds } });
    await Feedback.deleteMany({ $or: [{ student_user_id: { $in: userIds } }, { meeting_id: { $in: meetingIds } }] });
    await AcademicRecord.deleteMany({ student_user_id: { $in: userIds } });
    await RiskPrediction.deleteMany({ student_user_id: { $in: userIds } });
    await Meeting.deleteMany({ class_id: { $in: classIds } });
    await ClassMember.deleteMany({ $or: [{ student_user_id: { $in: userIds } }, { class_id: { $in: classIds } }] });
    await AdvisorClass.deleteMany({ _id: { $in: classIds } });
    await User.deleteMany({ _id: { $in: userIds } });

    console.log(`Reset demo complete data: ${userIds.length} users, ${classIds.length} classes`);
}

async function cleanupMasterDataFromOldScript() {
    const wrongDepartments = await Department.find({
        department_code: { $in: WRONG_DEPARTMENT_CODES_FROM_OLD_SCRIPT },
    }).select("_id department_code");
    const wrongDepartmentIds = wrongDepartments.map((dept) => dept._id);

    if (wrongDepartmentIds.length > 0) {
        await Major.deleteMany({ department_id: { $in: wrongDepartmentIds } });
        await Department.deleteMany({ _id: { $in: wrongDepartmentIds } });
        console.log(`Removed wrong department rows from old demo script: ${wrongDepartments.map((d) => d.department_code).join(", ")}`);
    }

    await Department.updateOne(
        { department_code: "KHMT" },
        { $set: { department_name: "Khoa Khoa học Máy tính" } }
    );
    const khmt = await Department.findOne({ department_code: "KHMT" }).select("_id");
    if (khmt) {
        await Major.updateOne({ department_id: khmt._id, major_code: "KHMT" }, { $set: { major_name: "Khoa học Máy tính" } });
        await Major.updateOne({ department_id: khmt._id, major_code: "TTNT" }, { $set: { major_name: "Trí tuệ Nhân tạo" } });
    }

    for (const [term_code, term_name] of Object.entries(TERM_NAME_REPAIR)) {
        await Term.updateOne({ term_code }, { $set: { term_name } });
    }
}

async function createCoreUsers(departments, majors) {
    const khmt = departments.find((d) => d.department_code === "KHMT") || departments[0];
    const khmtMajor = majors.find((m) => String(m.department_id) === String(khmt._id)) || majors[0];

    const admin = await upsertUser("admin@gmail.com", {
        username: "demo_complete_admin",
        role: "ADMIN",
        status: "ACTIVE",
        profile: { full_name: "Admin Demo Complete", gender: "OTHER" },
    });

    const faculty = await upsertUser("faculty@gmail.com", {
        username: "demo_complete_faculty",
        role: "FACULTY",
        status: "ACTIVE",
        profile: { full_name: "Faculty Demo Complete", gender: "OTHER" },
        org: { department_id: khmt._id, major_id: khmtMajor._id },
    });

    const advisor = await upsertUser("lehaikhoa@gmail.com", {
        username: "demo_complete_lehaikhoa",
        role: "ADVISOR",
        status: "ACTIVE",
        profile: {
            full_name: "Le Hai Khoa",
            gender: "MALE",
            phone: "0900000002",
            date_of_birth: new Date(1985, 4, 12),
        },
        org: { department_id: khmt._id, major_id: khmtMajor._id },
        advisor_info: { staff_code: "DCGV001", title: "Thac si" },
    });

    const student = await upsertUser("trandinhquan@gmail.com", {
        username: "demo_complete_trandinhquan",
        role: "STUDENT",
        status: "ACTIVE",
        profile: {
            full_name: "Tran Dinh Quan",
            gender: "MALE",
            phone: "0900000001",
            date_of_birth: new Date(2004, 0, 15),
        },
        org: { department_id: khmt._id, major_id: khmtMajor._id },
        student_info: {
            student_code: "DC220001",
            cohort_year: 2022,
            advisor_user_id: advisor._id,
            enrollment_status: "ENROLLED",
        },
    });

    return { admin, faculty, advisor, student, khmt, khmtMajor };
}

async function createClass(class_code, class_name, advisor, dept, major, cohort_year) {
    return AdvisorClass.findOneAndUpdate(
        { class_code },
        {
            $set: {
                class_code,
                class_name,
                advisor_user_id: advisor._id,
                department_id: dept._id,
                major_id: major._id,
                cohort_year,
                status: "ACTIVE",
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

async function createMember(cls, student, cohortYear) {
    await ClassMember.findOneAndUpdate(
        { student_user_id: student._id },
        { $set: { class_id: cls._id, student_user_id: student._id, joined_at: new Date(cohortYear, 8, 1), status: "ACTIVE" } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await User.updateOne({ _id: student._id }, { $set: { "student_info.advisor_user_id": cls.advisor_user_id } });
}

async function createStudentsAndClasses(departments, majors, core) {
    const students = [{ user: core.student, pattern: "anomaly", isShowcase: true }];
    const classes = [];
    let globalIndex = 2;

    const showcaseClass = await createClass("DC-KHMT-K22A", "Demo Complete KHMT K22A", core.advisor, core.khmt, core.khmtMajor, 2022);
    classes.push(showcaseClass);
    await createMember(showcaseClass, core.student, 2022);

    for (const dept of departments) {
        const deptMajors = majors.filter((m) => String(m.department_id) === String(dept._id));
        for (let classNo = 1; classNo <= 2; classNo++) {
            const major = deptMajors[(classNo - 1) % deptMajors.length] || majors[0];
            let advisor = core.advisor;
            if (!(dept.department_code === "KHMT" && classNo === 1)) {
                advisor = await upsertUser(`demo.complete.advisor.${dept.department_code.toLowerCase()}.${classNo}@${EMAIL_DOMAIN}`, {
                    username: `demo_complete_advisor_${dept.department_code.toLowerCase()}_${classNo}`,
                    role: "ADVISOR",
                    status: "ACTIVE",
                    profile: { full_name: `Advisor ${dept.department_code} ${classNo}`, gender: classNo % 2 ? "MALE" : "FEMALE" },
                    org: { department_id: dept._id, major_id: major._id },
                    advisor_info: { staff_code: `DCGV${String(globalIndex).padStart(3, "0")}`, title: classNo % 2 ? "Thac si" : "Tien si" },
                });
            }

            const cls = await createClass(`DC-${dept.department_code}-K2${classNo + 1}A`, `Demo Complete ${dept.department_code} K2${classNo + 1}A`, advisor, dept, major, 2022 + (classNo - 1));
            if (!classes.find((item) => String(item._id) === String(cls._id))) classes.push(cls);

            const count = dept.department_code === "KHMT" && classNo === 1 ? 7 : 8;
            for (let i = 0; i < count; i++) {
                const idx = globalIndex++;
                const code = `DC${String(220000 + idx).padStart(6, "0")}`;
                const patternPool = ["excellent", "stable", "stable", "medium", "medium", "decline", "critical", "anomaly"];
                const pattern = patternPool[i % patternPool.length];
                const email = `demo.complete.student.${code.toLowerCase()}@${EMAIL_DOMAIN}`;
                const user = await upsertUser(email, {
                    username: `demo_complete_student_${code.toLowerCase()}`,
                    role: "STUDENT",
                    status: "ACTIVE",
                    profile: {
                        full_name: fullName(idx),
                        gender: idx % 3 === 0 ? "FEMALE" : "MALE",
                        phone: `09${String(10000000 + idx).slice(-8)}`,
                        date_of_birth: new Date(2004 + (idx % 3), idx % 12, (idx % 27) + 1),
                    },
                    org: { department_id: dept._id, major_id: major._id },
                    student_info: {
                        student_code: code,
                        cohort_year: 2022 + (classNo - 1),
                        advisor_user_id: advisor._id,
                        enrollment_status: "ENROLLED",
                    },
                });
                await createMember(cls, user, 2022 + (classNo - 1));
                students.push({ user, pattern, class: cls });
            }
        }
    }

    return { students, classes };
}

async function seedAcademicAndRisk(students, terms) {
    const riskMap = new Map();
    const academicMap = new Map();

    for (const item of students) {
        let prevGpa = null;
        for (let i = 0; i < terms.length; i++) {
            const term = terms[i];
            const profile = academicProfile(item.pattern, i);
            const record = await AcademicRecord.findOneAndUpdate(
                { student_user_id: item.user._id, term_id: term._id, is_latest: true },
                {
                    $set: {
                        student_user_id: item.user._id,
                        term_id: term._id,
                        gpa_prev_sem: prevGpa,
                        ...profile,
                        recorded_at: new Date(new Date(term.end_date).getTime() - 7 * 24 * 3600 * 1000),
                        is_latest: true,
                        version: 1,
                        updated_by: null,
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            prevGpa = profile.gpa_current;
            academicMap.set(`${item.user._id}_${term._id}`, record);

            const risk = riskFromGpa(profile.gpa_current, item.pattern === "critical" && i >= 5 ? "critical" : item.pattern === "anomaly" && i >= 5 ? "critical" : item.pattern);
            const riskPrediction = await RiskPrediction.findOneAndUpdate(
                { student_user_id: item.user._id, term_id: term._id, is_latest: true },
                {
                    $set: {
                        student_user_id: item.user._id,
                        term_id: term._id,
                        ...risk,
                        model_name: "RandomForest",
                        predicted_at: new Date(new Date(record.recorded_at).getTime() + 24 * 3600 * 1000),
                        is_latest: true,
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            riskMap.set(`${item.user._id}_${term._id}`, riskPrediction);
        }
    }

    return { riskMap, academicMap };
}

async function createMeetingsAndFeedback(students, classes, terms) {
    const meetingMap = new Map();
    const classStudentMap = new Map();
    for (const row of await ClassMember.find({ class_id: { $in: classes.map((c) => c._id) }, status: "ACTIVE" })) {
        const key = String(row.class_id);
        if (!classStudentMap.has(key)) classStudentMap.set(key, []);
        classStudentMap.get(key).push(row.student_user_id);
    }

    for (const cls of classes) {
        const classStudentIds = classStudentMap.get(String(cls._id)) || [];
        for (const term of terms) {
            const meetingTime = new Date(new Date(term.start_date).getTime() + 45 * 24 * 3600 * 1000);
            const meeting = await Meeting.findOneAndUpdate(
                { class_id: cls._id, term_id: term._id, notes_raw: { $regex: MARKER } },
                {
                    $set: {
                        class_id: cls._id,
                        student_user_ids: classStudentIds.slice(0, 20),
                        advisor_user_id: cls.advisor_user_id,
                        term_id: term._id,
                        meeting_time: meetingTime,
                        meeting_end_time: new Date(meetingTime.getTime() + 90 * 60 * 1000),
                        notes_raw: `${MARKER}: Review academic progress, risk alerts, sentiment, attendance, failed subjects, and action plan for the class.`,
                        notes_summary: "Reviewed learning progress and planned advisor interventions.",
                        summary_model: "T5",
                        status: "ACTIVE",
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            meetingMap.set(`${cls._id}_${term._id}`, meeting);
        }
    }

    for (const item of students) {
        const member = await ClassMember.findOne({ student_user_id: item.user._id }).lean();
        if (!member) continue;
        const cls = classes.find((c) => String(c._id) === String(member.class_id));
        if (!cls) continue;
        for (let i = 0; i < terms.length; i++) {
            const term = terms[i];
            const meeting = meetingMap.get(`${cls._id}_${term._id}`);
            if (!meeting) continue;
            const negative = item.pattern === "critical" || item.pattern === "anomaly" && i >= 5 || item.isShowcase && i >= 4;
            const positive = item.pattern === "excellent" || item.pattern === "stable" && i < 5;
            const sentiment_label = negative ? "NEGATIVE" : positive ? "POSITIVE" : "NEUTRAL";
            const rating = sentiment_label === "NEGATIVE" ? 1 + (i % 2) : sentiment_label === "POSITIVE" ? 4 + (i % 2) : 3;
            const feedback_score = sentiment_label === "NEGATIVE" ? -0.75 : sentiment_label === "POSITIVE" ? 0.72 : 0.08;
            await Feedback.findOneAndUpdate(
                { meeting_id: meeting._id, student_user_id: item.user._id },
                {
                    $set: {
                        class_id: cls._id,
                        student_user_id: item.user._id,
                        advisor_user_id: cls.advisor_user_id,
                        meeting_id: meeting._id,
                        feedback_text: sentiment_label === "NEGATIVE"
                            ? "Em dang gap nhieu ap luc, ket qua hoc tap giam va can co van ho tro som."
                            : sentiment_label === "POSITIVE"
                                ? "Buoi gap giup em ro ke hoach hoc tap va co them dong luc."
                                : "Em can them thoi gian de dieu chinh ke hoach hoc tap.",
                        rating,
                        submitted_at: new Date(new Date(meeting.meeting_end_time).getTime() + 2 * 3600 * 1000),
                        sentiment_label,
                        feedback_score,
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }
    }

    return meetingMap;
}

async function createAlertsNotificationsRecommendations(students, terms, riskMap, academicMap) {
    let alertCount = 0;
    for (const item of students) {
        const member = await ClassMember.findOne({ student_user_id: item.user._id }).populate("class_id").lean();
        const advisorId = member?.class_id?.advisor_user_id;

        for (let i = 0; i < terms.length; i++) {
            const term = terms[i];
            const risk = riskMap.get(`${item.user._id}_${term._id}`);
            const academic = academicMap.get(`${item.user._id}_${term._id}`);
            if (!risk || !academic) continue;

            const shouldRisk = risk.risk_label <= 0 || item.isShowcase;
            const shouldSentiment = item.pattern === "critical" || item.pattern === "anomaly" && i >= 5 || item.isShowcase && i >= 4;
            const shouldAnomaly = item.pattern === "anomaly" && i >= 5 || item.isShowcase && i >= 5 || academic.attendance_rate < 0.45 || academic.num_failed >= 3;

            const alertSpecs = [];
            if (shouldRisk) {
                alertSpecs.push({
                    alert_type: "RISK",
                    source_ai: "AI01_RISK",
                    severity: risk.risk_label === -1 ? "HIGH" : "MEDIUM",
                    metadata: { risk_score: risk.risk_score, risk_label: risk.risk_label, gpa: academic.gpa_current },
                    risk_prediction_id: risk._id,
                });
            }
            if (shouldSentiment) {
                const feedback = await Feedback.findOne({ student_user_id: item.user._id }).sort({ submitted_at: -1 });
                alertSpecs.push({
                    alert_type: "SENTIMENT",
                    source_ai: "AI02_SENTIMENT",
                    severity: i >= 6 || item.isShowcase ? "HIGH" : "MEDIUM",
                    metadata: { sentiment_score: academic.sentiment_score, stress_level: academic.stress_level },
                    feedback_id: feedback?._id,
                });
            }
            if (shouldAnomaly) {
                alertSpecs.push({
                    alert_type: "ANOMALY",
                    source_ai: "AI04_ANOMALY",
                    severity: i >= 6 || item.isShowcase ? "HIGH" : "MEDIUM",
                    metadata: {
                        rule: "GPA/attendance/failed-subject anomaly",
                        gpa_prev_sem: academic.gpa_prev_sem,
                        gpa_current: academic.gpa_current,
                        attendance_rate: academic.attendance_rate,
                        num_failed: academic.num_failed,
                    },
                });
            }

            for (const spec of alertSpecs) {
                const alert = await Alert.findOneAndUpdate(
                    { student_user_id: item.user._id, term_id: term._id, alert_type: spec.alert_type, source_ai: spec.source_ai },
                    {
                        $set: {
                            student_user_id: item.user._id,
                            term_id: term._id,
                            ...spec,
                            academic_record_id: academic._id,
                            status: term.term_code === ACTIVE_TERM_CODE ? "OPEN" : i % 3 === 0 ? "RESOLVED" : "ACKED",
                            detected_at: new Date(new Date(risk.predicted_at).getTime() + (alertCount % 8) * 3600 * 1000),
                        },
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                alertCount++;

                if (advisorId) {
                    await Notification.findOneAndUpdate(
                        { recipient_user_id: advisorId, alert_id: alert._id },
                        {
                            $set: {
                                recipient_user_id: advisorId,
                                alert_id: alert._id,
                                title: `${spec.alert_type} alert - ${item.user.profile?.full_name || item.user.email}`,
                                content: `Sinh vien co canh bao ${spec.alert_type} trong ${term.term_name}.`,
                                is_read: i < 5,
                                sent_at: alert.detected_at,
                                read_at: i < 5 ? new Date(new Date(alert.detected_at).getTime() + 6 * 3600 * 1000) : null,
                            },
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );
                }

                if (item.isShowcase) {
                    await Notification.findOneAndUpdate(
                        { recipient_user_id: item.user._id, alert_id: alert._id },
                        {
                            $set: {
                                recipient_user_id: item.user._id,
                                alert_id: alert._id,
                                title: `Canh bao ${spec.alert_type}`,
                                content: `He thong ghi nhan canh bao ${spec.alert_type} trong ${term.term_name}.`,
                                is_read: i < 4,
                                sent_at: alert.detected_at,
                                read_at: i < 4 ? new Date(new Date(alert.detected_at).getTime() + 4 * 3600 * 1000) : null,
                            },
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );
                }
            }

            if (shouldRisk || shouldSentiment || shouldAnomaly || item.isShowcase) {
                await Recommendation.findOneAndUpdate(
                    { student_user_id: item.user._id, term_id: term._id },
                    {
                        $set: {
                            student_user_id: item.user._id,
                            term_id: term._id,
                            risk_prediction_id: risk._id,
                            title: shouldAnomaly ? "Can thiệp học tập khẩn" : "Ke hoach cai thien hoc tap",
                            content: "Gap co van hoc tap, dieu chinh lich hoc, theo doi diem danh va nop bai hang tuan.",
                            priority: shouldAnomaly || risk.risk_label === -1 ? "HIGH" : "MEDIUM",
                        },
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
        }
    }
}

async function printSummary() {
    const stats = [
        ["departments", await Department.countDocuments()],
        ["majors", await Major.countDocuments()],
        ["terms", await Term.countDocuments({ term_code: { $in: TERM_CODES } })],
        ["users demo", await User.countDocuments({ $or: [{ email: { $regex: `^demo\\.complete\\..*@${EMAIL_DOMAIN}$` } }, { email: { $in: ["admin@gmail.com", "trandinhquan@gmail.com", "lehaikhoa@gmail.com", "faculty@gmail.com"] } }] })],
        ["classes demo", await AdvisorClass.countDocuments({ class_code: { $regex: "^DC-" } })],
        ["academic records", await AcademicRecord.countDocuments({})],
        ["risk predictions", await RiskPrediction.countDocuments({})],
        ["alerts", await Alert.countDocuments({})],
        ["anomaly alerts", await Alert.countDocuments({ alert_type: "ANOMALY" })],
        ["notifications", await Notification.countDocuments({})],
        ["recommendations", await Recommendation.countDocuments({})],
    ];

    console.log("\nDemo complete summary");
    for (const [label, count] of stats) console.log(`  ${label.padEnd(18)} ${count}`);
    console.log("\nAccounts");
    console.log("  admin@gmail.com / 123456");
    console.log("  trandinhquan@gmail.com / 123456");
    console.log("  lehaikhoa@gmail.com / 123456");
    console.log("  faculty@gmail.com / 123456");
}

async function main() {
    const isReset = process.argv.includes("--reset");
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await assertRequiredTermsExist();

    if (isReset) {
        await resetDemoData();
        await cleanupMasterDataFromOldScript();
    }

    const { departments, majors, terms } = await loadExistingMasterData();
    const core = await createCoreUsers(departments, majors);
    const { students, classes } = await createStudentsAndClasses(departments, majors, core);
    const { riskMap, academicMap } = await seedAcademicAndRisk(students, terms);
    await createMeetingsAndFeedback(students, classes, terms);
    await createAlertsNotificationsRecommendations(students, terms, riskMap, academicMap);
    await printSummary();

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error("Seed demo complete failed:", error);
    await mongoose.disconnect();
    process.exit(1);
});
