require("dotenv").config();
const mongoose = require("mongoose");
require("../src/models/user.model");
require("../src/models/alert.model");
require("../src/models/notification.model");
require("../src/models/classMember.model");
require("../src/models/advisorClass.model");
require("../src/models/academicRecord.model");
require("../src/models/riskPrediction.model");
const User = require("../src/models/user.model");
const Alert = require("../src/models/alert.model");
const Notification = require("../src/models/notification.model");
const ClassMember = require("../src/models/classMember.model");
const AdvisorClass = require("../src/models/advisorClass.model");
const AcademicRecord = require("../src/models/academicRecord.model");
const RiskPrediction = require("../src/models/riskPrediction.model");

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const sv1 = await User.findOne({ email: "ducnm.demo@gmail.com" }).select("_id profile.full_name student_info");
    const advisor = await User.findOne({ email: "lehaikhoa@gmail.com" }).select("_id profile.full_name");
    console.log("SV1:", sv1?.profile?.full_name, sv1?._id);
    console.log("Advisor:", advisor?.profile?.full_name, advisor?._id);

    // Academic records
    const records = await AcademicRecord.find({ student_user_id: sv1._id }).sort({ recorded_at: -1 }).lean();
    console.log(`\nAcademic records (${records.length}):`);
    records.forEach(r => console.log(`  term=${r.term_id} | gpa=${r.gpa_current} | is_latest=${r.is_latest} | recorded_at=${r.recorded_at?.toISOString()}`));

    // Risk predictions
    const risks = await RiskPrediction.find({ student_user_id: sv1._id }).sort({ predicted_at: -1 }).lean();
    console.log(`\nRisk predictions (${risks.length}):`);
    risks.forEach(r => console.log(`  label=${r.risk_label} | score=${r.risk_score} | is_latest=${r.is_latest} | predicted_at=${r.predicted_at?.toISOString()}`));

    // Alerts
    const alerts = await Alert.find({ student_user_id: sv1._id }).sort({ detected_at: -1 }).lean();
    console.log(`\nAlerts (${alerts.length}):`);
    alerts.forEach(a => console.log(`  [${a.alert_type}] severity=${a.severity} | detected_at=${a.detected_at?.toISOString()} | _id=${a._id}`));

    // Notifications to SV1
    const svNotifs = await Notification.find({ recipient_user_id: sv1._id }).sort({ sent_at: -1 }).lean();
    console.log(`\nNotifications to SV1 (${svNotifs.length}):`);
    svNotifs.forEach(n => console.log(`  ${n.title} | ${n.sent_at?.toISOString()}`));

    // Notifications to Advisor for SV1 alerts
    const alertIds = alerts.map(a => a._id);
    const advNotifs = await Notification.find({ recipient_user_id: advisor._id, alert_id: { $in: alertIds } }).sort({ sent_at: -1 }).lean();
    console.log(`\nNotifications to Advisor for SV1 alerts (${advNotifs.length}):`);
    advNotifs.forEach(n => console.log(`  ${n.title} | ${n.sent_at?.toISOString()}`));

    // ClassMember check
    const membership = await ClassMember.findOne({ student_user_id: sv1._id }).lean();
    const cls = membership ? await AdvisorClass.findById(membership.class_id).lean() : null;
    console.log(`\nClassMember: status=${membership?.status} | class=${cls?.class_code} | class_status=${cls?.status} | advisor=${cls?.advisor_user_id}`);
    console.log(`Advisor match: ${String(cls?.advisor_user_id) === String(advisor._id)}`);

    await mongoose.disconnect();
});
