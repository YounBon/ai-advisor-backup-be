/**
 * Verify complete demo seed.
 *
 * Run:
 *   node scripts/seed-demo-complete/verify.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

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

const TERM_CODES = ["2022-1", "2022-2", "2023-1", "2023-2", "2024-1", "2024-2", "2025-1", "2025-2"];
const WRONG_DEPARTMENT_CODES_FROM_OLD_SCRIPT = ["HTTT", "KTPM", "QTKD"];

async function countByAlertType(studentId) {
    return Alert.aggregate([
        { $match: { student_user_id: studentId } },
        { $group: { _id: "$alert_type", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
}

async function main() {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    await mongoose.connect(process.env.MONGO_URI);

    const terms = await Term.find({ term_code: { $in: TERM_CODES } }).sort({ start_date: 1 });
    const foundTermCodes = new Set(terms.map((term) => term.term_code));
    const missingTermCodes = TERM_CODES.filter((code) => !foundTermCodes.has(code));
    const activeTerm = await Term.findOne({ status: "ACTIVE" });
    const admin = await User.findOne({ email: "admin@gmail.com" });
    const student = await User.findOne({ email: "trandinhquan@gmail.com" });
    const advisor = await User.findOne({ email: "lehaikhoa@gmail.com" });
    const faculty = await User.findOne({ email: "faculty@gmail.com" });
    const wrongDepartments = await Department.find({
        department_code: { $in: WRONG_DEPARTMENT_CODES_FROM_OLD_SCRIPT },
    }).select("department_code");
    const departmentCount = await Department.countDocuments();
    const majorCount = await Major.countDocuments();
    const advisorClassIndexes = await mongoose.connection.db.collection("advisor_classes").indexes();
    const uniqueAdvisorIndex = advisorClassIndexes.find(
        (index) => index.unique === true && index.key && index.key.advisor_user_id === 1
    );

    console.log("Demo complete verification");
    console.log(`  departments          ${departmentCount}`);
    console.log(`  majors               ${majorCount}`);
    console.log(`  wrong departments    ${wrongDepartments.length ? wrongDepartments.map((d) => d.department_code).join(", ") : "none"}`);
    console.log(`  advisor unique index ${uniqueAdvisorIndex ? uniqueAdvisorIndex.name : "none"}`);
    console.log(`  terms found          ${terms.length}/8: ${terms.map((t) => t.term_code).join(", ")}`);
    console.log(`  missing terms        ${missingTermCodes.length ? missingTermCodes.join(", ") : "none"}`);
    console.log(`  active term          ${activeTerm?.term_code || "missing"}`);
    console.log(`  admin account        ${admin ? "ok" : "missing"}`);
    console.log(`  student account      ${student ? "ok" : "missing"}`);
    console.log(`  advisor account      ${advisor ? "ok" : "missing"}`);
    console.log(`  faculty account      ${faculty ? "ok" : "missing"}`);

    if (!student || !advisor) {
        await mongoose.disconnect();
        process.exit(1);
    }

    const studentRecords = await AcademicRecord.countDocuments({ student_user_id: student._id, is_latest: true });
    const studentRisks = await RiskPrediction.countDocuments({ student_user_id: student._id, is_latest: true });
    const studentAlerts = await countByAlertType(student._id);
    const studentNotifications = await Notification.countDocuments({ recipient_user_id: student._id });
    const studentRecommendations = await Recommendation.countDocuments({ student_user_id: student._id });
    const studentFeedbacks = await Feedback.countDocuments({ student_user_id: student._id });

    const advisorClasses = await AdvisorClass.countDocuments({ advisor_user_id: advisor._id, class_code: { $regex: "^DC-" } });
    const advisorClassIds = await AdvisorClass.find({ advisor_user_id: advisor._id, class_code: { $regex: "^DC-" } }).select("_id");
    const advisorStudents = await ClassMember.countDocuments({ class_id: { $in: advisorClassIds.map((c) => c._id) }, status: "ACTIVE" });
    const advisorNotifications = await Notification.countDocuments({ recipient_user_id: advisor._id });
    const advisorMeetings = await Meeting.countDocuments({ class_id: { $in: advisorClassIds.map((c) => c._id) } });

    const activeAnomaly = activeTerm
        ? await Alert.countDocuments({ term_id: activeTerm._id, alert_type: "ANOMALY" })
        : 0;
    const demoClasses = await AdvisorClass.find({ class_code: { $regex: "^DC-" } }).select("_id");
    const demoClassIds = demoClasses.map((c) => c._id);
    const demoMembers = await ClassMember.find({ class_id: { $in: demoClassIds }, status: "ACTIVE" }).select("student_user_id");
    const demoStudentIds = demoMembers.map((member) => member.student_user_id);
    const demoMeetings = await Meeting.countDocuments({ class_id: { $in: demoClassIds } });
    const demoFeedbacks = await Feedback.countDocuments({ class_id: { $in: demoClassIds } });
    const demoRecommendations = await Recommendation.countDocuments({ student_user_id: { $in: demoStudentIds } });

    console.log("\nStudent demo coverage");
    console.log(`  academic records     ${studentRecords}/8`);
    console.log(`  risk predictions     ${studentRisks}/8`);
    console.log(`  alerts by type       ${studentAlerts.map((r) => `${r._id}:${r.count}`).join(", ")}`);
    console.log(`  notifications        ${studentNotifications}`);
    console.log(`  recommendations      ${studentRecommendations}`);
    console.log(`  feedbacks            ${studentFeedbacks}`);

    console.log("\nAdvisor demo coverage");
    console.log(`  classes              ${advisorClasses}`);
    console.log(`  students             ${advisorStudents}`);
    console.log(`  meetings             ${advisorMeetings}`);
    console.log(`  notifications        ${advisorNotifications}`);

    console.log("\nDashboard coverage");
    console.log(`  active term anomaly  ${activeAnomaly}`);
    console.log(`  demo meetings        ${demoMeetings}`);
    console.log(`  demo feedbacks       ${demoFeedbacks}`);
    console.log(`  demo recommendations ${demoRecommendations}`);

    const ok = terms.length === 8
        && missingTermCodes.length === 0
        && activeTerm?.term_code === "2025-2"
        && wrongDepartments.length === 0
        && !uniqueAdvisorIndex
        && admin
        && student
        && advisor
        && studentRecords === 8
        && studentRisks === 8
        && studentFeedbacks === 8
        && studentRecommendations === 8
        && advisorMeetings >= 8
        && demoMeetings >= 8
        && demoFeedbacks >= 8
        && demoRecommendations >= 8
        && activeAnomaly > 0;

    console.log(`\nResult: ${ok ? "OK" : "CHECK REQUIRED"}`);
    await mongoose.disconnect();
    process.exit(ok ? 0 : 1);
}

main().catch(async (error) => {
    console.error("Verify demo complete failed:", error);
    await mongoose.disconnect();
    process.exit(1);
});
