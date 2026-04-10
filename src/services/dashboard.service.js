const mongoose = require("mongoose");
const AcademicRecord = require("../models/academicRecord.model");
const RiskPrediction = require("../models/riskPrediction.model");
const Feedback = require("../models/feedback.model");
const Notification = require("../models/notification.model");
const Alert = require("../models/alert.model");
const AdvisorClass = require("../models/advisorClass.model");
const ClassMember = require("../models/classMember.model");
const User = require("../models/user.model");
const throwError = require("../utils/throwError");

class DashboardService {
    async getStudentDashboard(body = {}, currentUser) {
        const historyLimit = Number(body.history_limit || 6);
        const studentUserId = currentUser.userId;

        if (!studentUserId) throwError("student_user_id is required", 422);

        const [risk, academicRecords, sentimentTrend] = await Promise.all([
            RiskPrediction.findOne({ student_user_id: studentUserId, is_latest: true })
                .sort({ predicted_at: -1 })
                .select("student_user_id term_id risk_score risk_label model_name predicted_at")
                .populate("term_id", "term_code"),
            AcademicRecord.find({ student_user_id: studentUserId })
                .sort({ recorded_at: -1 })
                .limit(historyLimit)
                .select(
                    "student_user_id term_id gpa_prev_sem gpa_current num_failed attendance_rate shcvht_participation study_hours motivation_score stress_level sentiment_score recorded_at"
                )
                .populate("term_id", "term_code term_name"),
            Feedback.aggregate([
                { $match: { student_user_id: new mongoose.Types.ObjectId(studentUserId) } },
                {
                    $group: {
                        _id: {
                            month: { $dateToString: { format: "%Y-%m", date: "$submitted_at" } },
                            sentiment_label: "$sentiment_label",
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { "_id.month": 1 } },
            ]),
        ]);

        return {
            student_user_id: studentUserId,
            risk_score: risk?.risk_score ?? null,
            risk_label: risk?.risk_label ?? null,
            risk_term_id: risk?.term_id?._id ?? null,
            risk_term_code: risk?.term_id?.term_code ?? null,
            academic_trend: academicRecords.reverse(),
            sentiment_trend: sentimentTrend,
        };
    }

    async getAdvisorDashboard(body = {}, currentUser) {
        const advisorUserId = currentUser.userId;
        if (!advisorUserId) throwError("advisor_user_id is required", 422);

        const page = Number(body.page || 1);
        const limit = Number(body.limit || 20);
        const skip = (page - 1) * limit;

        const advisorClass = await AdvisorClass.findOne({
            advisor_user_id: advisorUserId,
            status: "ACTIVE",
        }).select("_id");

        if (!advisorClass) {
            return {
                advisor_user_id: advisorUserId,
                student_table: [],
                recent_alerts: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    total_pages: 1,
                },
            };
        }

        const [memberRows, total] = await Promise.all([
            ClassMember.find({ class_id: advisorClass._id, status: "ACTIVE" })
                .select("student_user_id")
                .skip(skip)
                .limit(limit),
            ClassMember.countDocuments({ class_id: advisorClass._id, status: "ACTIVE" }),
        ]);

        const pagedStudentIds = memberRows.map((row) => row.student_user_id);
        const students = await User.find({ _id: { $in: pagedStudentIds }, role: "STUDENT" })
            .select("_id username email profile.full_name student_info status")
            .sort({ createdAt: -1 });

        const studentIds = students.map((s) => s._id);
        const [riskRows, openAlerts, recentAlertsRaw] = await Promise.all([
            RiskPrediction.aggregate([
                {
                    $match: {
                        student_user_id: { $in: studentIds },
                    },
                },
                { $sort: { predicted_at: -1 } },
                {
                    $group: {
                        _id: "$student_user_id",
                        latest: { $first: "$$ROOT" },
                    },
                },
            ]),
            Alert.find({
                student_user_id: { $in: studentIds },
                status: "OPEN",
                alert_type: { $in: ["RISK", "SENTIMENT", "ANOMALY"] },
            })
                .select("_id student_user_id alert_type severity status detected_at")
                .sort({ detected_at: -1 }),
            Notification.find({
                recipient_user_id: advisorUserId,
            })
                .populate("alert_id", "alert_type severity status detected_at student_user_id")
                .sort({ sent_at: -1 })
                .limit(50),
        ]);

        const recentAlerts = recentAlertsRaw
            .filter((item) => ["RISK", "SENTIMENT", "ANOMALY"].includes(item.alert_id?.alert_type))
            .slice(0, 20);

        const riskMap = new Map(riskRows.map((row) => [String(row._id), row.latest]));
        const riskAlertCountMap = new Map();
        const sentimentAlertCountMap = new Map();
        const anomalyAlertCountMap = new Map();
        const riskAlerts = [];
        const sentimentAlerts = [];
        const anomalyAlerts = [];

        for (const alert of openAlerts) {
            const key = String(alert.student_user_id);
            if (alert.alert_type === "RISK") {
                riskAlertCountMap.set(key, (riskAlertCountMap.get(key) || 0) + 1);
                riskAlerts.push(alert);
                continue;
            }
            if (alert.alert_type === "SENTIMENT") {
                sentimentAlertCountMap.set(key, (sentimentAlertCountMap.get(key) || 0) + 1);
                sentimentAlerts.push(alert);
                continue;
            }
            if (alert.alert_type === "ANOMALY") {
                anomalyAlertCountMap.set(key, (anomalyAlertCountMap.get(key) || 0) + 1);
                anomalyAlerts.push(alert);
            }
        }

        const student_table = students.map((student) => {
            const key = String(student._id);
            const risk = riskMap.get(key);
            const negativeCount = sentimentAlertCountMap.get(key) || 0;
            const highRiskCount = riskAlertCountMap.get(key) || 0;

            return {
                student_user_id: student._id,
                student_code: student.student_info?.student_code || null,
                full_name: student.profile?.full_name || null,
                email: student.email,
                risk_score: risk?.risk_score ?? null,
                risk_label: risk?.risk_label ?? null,
                alert_count: negativeCount + highRiskCount,
                alerts: {
                    negative_sentiment_30d: negativeCount,
                    high_risk: highRiskCount,
                },
            };
        });

        return {
            advisor_user_id: advisorUserId,
            student_table,
            recent_alerts: recentAlerts,
            alert_cards: {
                risk_open: riskAlerts.length,
                sentiment_open: sentimentAlerts.length,
                anomaly_open: anomalyAlerts.length,
            },
            risk_alerts: riskAlerts.slice(0, 20),
            sentiment_alerts: sentimentAlerts.slice(0, 20),
            anomaly_alerts: anomalyAlerts.slice(0, 20),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async getFacultyDashboard(body = {}) {
        const riskThreshold = Number(body.risk_threshold ?? 0.7);
        const studentFilter = { role: "STUDENT" };
        if (body.department_id) studentFilter["org.department_id"] = body.department_id;

        const students = await User.find(studentFilter).select("_id");
        const studentIds = students.map((s) => s._id);

        const [riskDistribution, riskKpi, anomalySummary] = await Promise.all([
            RiskPrediction.aggregate([
                {
                    $match: {
                        student_user_id: { $in: studentIds },
                        is_latest: true,
                    },
                },
                {
                    $group: {
                        _id: "$risk_label",
                        count: { $sum: 1 },
                    },
                },
            ]),
            RiskPrediction.aggregate([
                {
                    $match: {
                        student_user_id: { $in: studentIds },
                        is_latest: true,
                    },
                },
                {
                    $group: {
                        _id: null,
                        avg_risk_score: { $avg: "$risk_score" },
                        high_risk_students: {
                            $sum: {
                                $cond: [{ $gte: ["$risk_score", riskThreshold] }, 1, 0],
                            },
                        },
                        total_predictions: { $sum: 1 },
                    },
                },
            ]),
            Alert.aggregate([
                {
                    $match: {
                        student_user_id: { $in: studentIds },
                    },
                },
                {
                    $group: {
                        _id: {
                            alert_type: "$alert_type",
                            severity: "$severity",
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $sort: {
                        "_id.alert_type": 1,
                        "_id.severity": 1,
                    },
                },
            ]),
        ]);

        return {
            department_id: body.department_id || null,
            kpi: {
                total_students: studentIds.length,
                avg_risk_score: riskKpi[0]?.avg_risk_score ?? 0,
                high_risk_students: riskKpi[0]?.high_risk_students ?? 0,
                total_predictions: riskKpi[0]?.total_predictions ?? 0,
            },
            risk_distribution: riskDistribution,
            anomaly_summary: anomalySummary,
        };
    }
}

module.exports = new DashboardService();
