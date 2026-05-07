const Notification = require("../models/notification.model");
const RiskPrediction = require("../models/riskPrediction.model");
const Alert = require("../models/alert.model");
const Feedback = require("../models/feedback.model");
const AdvisorClass = require("../models/advisorClass.model");
const ClassMember = require("../models/classMember.model");
const User = require("../models/user.model");
const Meeting = require("../models/meeting.model");

class NotificationService {
    async createNotification(payload) {
        const now = new Date();
        const dedupeSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const duplicate = await Notification.findOne({
            recipient_user_id: payload.recipient_user_id,
            alert_id: payload.alert_id,
            sent_at: { $gte: dedupeSince },
        });

        if (duplicate) return null;

        return Notification.create({
            recipient_user_id: payload.recipient_user_id,
            alert_id: payload.alert_id,
            title: payload.title,
            content: payload.content,
            is_read: false,
            sent_at: now,
        });
    }

    async markAsRead(body, currentUser) {
        const recipientUserId = currentUser.userId;
        const { notification_id, mark_all } = body;

        if (mark_all) {
            await Notification.updateMany(
                { recipient_user_id: recipientUserId, is_read: false },
                { $set: { is_read: true, read_at: new Date() } }
            );
            return { updated: true, mark_all: true };
        }

        if (!notification_id) {
            const err = new Error("notification_id is required");
            err.statusCode = 422;
            throw err;
        }

        const notif = await Notification.findOneAndUpdate(
            { _id: notification_id, recipient_user_id: recipientUserId },
            { $set: { is_read: true, read_at: new Date() } },
            { new: true }
        );

        if (!notif) {
            const err = new Error("notification not found");
            err.statusCode = 404;
            throw err;
        }

        return { updated: true, notification_id };
    }

    async listNotifications(body, currentUser) {
        const page = Number(body.page || 1);
        const limit = Number(body.limit || 20);
        const skip = (page - 1) * limit;

        const recipientUserId = currentUser.role === "ADMIN" ? body.recipient_user_id || currentUser.userId : currentUser.userId;

        const filter = { recipient_user_id: recipientUserId };
        if (typeof body.is_read === "boolean") filter.is_read = body.is_read;
        const alertTypeFromLegacyType = {
            RISK_ALERT: "RISK",
            SENTIMENT_ALERT: "SENTIMENT",
            ANOMALY_ALERT: "ANOMALY",
        };
        const alertType = body.alert_type || alertTypeFromLegacyType[body.type];
        if (alertType) {
            const alertIds = await Alert.find({ alert_type: alertType }).select("_id");
            filter.alert_id = { $in: alertIds.map((item) => item._id) };
        }

        const [items, total] = await Promise.all([
            Notification.find(filter)
                .populate({
                    path: "alert_id",
                    select: "alert_type source_ai severity status detected_at term_id student_user_id",
                    populate: [
                        { path: "term_id", select: "term_code term_name" },
                        { path: "student_user_id", select: "profile.full_name student_info.student_code" },
                    ],
                })
                .sort({ sent_at: -1 })
                .skip(skip)
                .limit(limit),
            Notification.countDocuments(filter),
        ]);

        // Lấy thông tin lớp cho từng sinh viên trong alert
        const studentIds = items
            .map(n => {
                const a = n.alert_id;
                return a && typeof a === "object" ? a.student_user_id?._id || a.student_user_id : null;
            })
            .filter(Boolean);

        const uniqueStudentIds = [...new Set(studentIds.map(String))];
        const classMemberRows = uniqueStudentIds.length
            ? await ClassMember.find({ student_user_id: { $in: uniqueStudentIds } })
                .select("student_user_id class_id")
                .populate("class_id", "class_code class_name")
                .lean()
            : [];

        const classDisplayByStudent = new Map(
            classMemberRows.map(r => {
                const c = r.class_id;
                const label = c && typeof c === "object"
                    ? [c.class_code, c.class_name].filter(Boolean).join(" — ")
                    : null;
                return [String(r.student_user_id), label];
            })
        );

        const normalized = items.map(n => {
            const obj = n.toObject ? n.toObject() : n;
            const a = obj.alert_id;
            const studentId = a && typeof a === "object"
                ? String(a.student_user_id?._id || a.student_user_id || "")
                : "";
            return {
                ...obj,
                class_display: classDisplayByStudent.get(studentId) ?? null,
            };
        });

        return {
            items: normalized,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async generateAlerts(body = {}, currentUser = null) {
        const riskThreshold = Number(body.risk_threshold ?? 0.7);
        const negativeDays = Number(body.negative_days ?? 30);
        const studentUserId = body.student_user_id;
        const advisorUserId = currentUser?.role === "ADVISOR" ? currentUser.userId : body.advisor_user_id;

        const classFilter = { status: "ACTIVE" };
        if (advisorUserId) classFilter.advisor_user_id = advisorUserId;

        const advisorClasses = await AdvisorClass.find(classFilter).select("_id advisor_user_id");
        if (!advisorClasses.length) {
            return { created_count: 0, details: { risk: 0, sentiment: 0, anomaly: 0 } };
        }

        const classIds = advisorClasses.map((item) => item._id);
        const memberFilter = { class_id: { $in: classIds }, status: "ACTIVE" };
        if (studentUserId) memberFilter.student_user_id = studentUserId;

        const members = await ClassMember.find(memberFilter).select("class_id student_user_id");
        if (!members.length) {
            return { created_count: 0, details: { risk: 0, sentiment: 0, anomaly: 0 } };
        }

        const advisorByClassId = new Map(advisorClasses.map((item) => [String(item._id), item.advisor_user_id]));
        const advisorByStudent = new Map(
            members
                .map((item) => [String(item.student_user_id), advisorByClassId.get(String(item.class_id))])
                .filter(([, advisorId]) => !!advisorId)
        );

        const studentIds = Array.from(new Set(members.map((item) => String(item.student_user_id))));
        if (!studentIds.length) {
            return { created_count: 0, details: { risk: 0, sentiment: 0, anomaly: 0 } };
        }

        const students = await User.find({ _id: { $in: studentIds }, role: "STUDENT" }).select(
            "_id student_info.student_code profile.full_name"
        );
        const studentCodeById = new Map(students.map((s) => [String(s._id), s.student_info?.student_code || ""]));
        const studentNameById = new Map(students.map((s) => [String(s._id), s.profile?.full_name || ""]));

        let riskCreated = 0;
        let sentimentCreated = 0;
        let anomalyCreated = 0;

        const [riskRows, negativeFeedbackRows, anomalyRows] = await Promise.all([
            RiskPrediction.find({
                student_user_id: { $in: studentIds },
                is_latest: true,
                risk_score: { $gte: riskThreshold },
            })
                .select("_id student_user_id risk_score term_id predicted_at")
                .populate("term_id", "term_code")
                .sort({ predicted_at: -1 }),
            Feedback.find({
                student_user_id: { $in: studentIds },
                sentiment_label: "NEGATIVE",
                feedback_score: { $lt: -0.6 },
                submitted_at: {
                    $gte: new Date(Date.now() - negativeDays * 24 * 60 * 60 * 1000),
                },
            })
                .select("_id student_user_id meeting_id submitted_at feedback_score sentiment_label")
                .sort({ submitted_at: -1 }),
            Alert.find({
                student_user_id: { $in: studentIds },
                alert_type: "ANOMALY",
                severity: "HIGH",
                status: "OPEN",
            })
                .select("_id student_user_id term_id alert_type detected_at")
                .sort({ detected_at: -1 }),
        ]);

        const riskTermIdByStudent = new Map(
            riskRows
                .map((row) => [String(row.student_user_id), row.term_id?._id || row.term_id])
                .filter(([, termId]) => !!termId)
        );

        const meetingIds = Array.from(new Set(negativeFeedbackRows.map((row) => String(row.meeting_id || "")).filter(Boolean)));
        const meetingRows = meetingIds.length ? await Meeting.find({ _id: { $in: meetingIds } }).select("_id term_id") : [];
        const termIdByMeetingId = new Map(meetingRows.map((item) => [String(item._id), item.term_id]));

        for (const risk of riskRows) {
            const key = String(risk.student_user_id);
            const advisorId = advisorByStudent.get(key);
            if (!advisorId) continue;
            const riskTermId = risk.term_id?._id || risk.term_id;
            if (!riskTermId) continue;

            const riskAlert = await Alert.findOneAndUpdate(
                { risk_prediction_id: risk._id, alert_type: "RISK" },
                {
                    $setOnInsert: {
                        student_user_id: risk.student_user_id,
                        term_id: riskTermId,
                        alert_type: "RISK",
                        source_ai: "AI01_RISK",
                        severity: "HIGH",
                        risk_prediction_id: risk._id,
                        metadata: { risk_score: risk.risk_score },
                        detected_at: risk.predicted_at || new Date(),
                    },
                },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            const created = await this.createNotification({
                recipient_user_id: advisorId,
                alert_id: riskAlert._id,
                title: "High risk student detected",
                content: `Student ${studentCodeById.get(key) || key} has risk_score=${risk.risk_score.toFixed(2)}`,
            });

            if (created) riskCreated += 1;
        }

        for (const feedback of negativeFeedbackRows) {
            const key = String(feedback.student_user_id);
            const advisorId = advisorByStudent.get(key);
            if (!advisorId) continue;
            const termId = termIdByMeetingId.get(String(feedback.meeting_id)) || riskTermIdByStudent.get(key);
            if (!termId) continue;
            const severity = feedback.feedback_score < -0.8 ? "HIGH" : "MEDIUM";

            const sentimentAlert = await Alert.findOneAndUpdate(
                { feedback_id: feedback._id, alert_type: "SENTIMENT" },
                {
                    $setOnInsert: {
                        student_user_id: feedback.student_user_id,
                        term_id: termId,
                        alert_type: "SENTIMENT",
                        source_ai: "AI02_SENTIMENT",
                        severity,
                        feedback_id: feedback._id,
                        metadata: { sentiment_label: feedback.sentiment_label, feedback_score: feedback.feedback_score },
                        detected_at: feedback.submitted_at || new Date(),
                    },
                },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            const created = await this.createNotification({
                recipient_user_id: advisorId,
                alert_id: sentimentAlert._id,
                title: "Negative sentiment feedback",
                content: `Student ${studentCodeById.get(key) || key} reported negative sentiment`,
            });

            if (created) sentimentCreated += 1;
        }

        for (const anomaly of anomalyRows) {
            const key = String(anomaly.student_user_id);
            const advisorId = advisorByStudent.get(key);
            if (!advisorId) continue;

            const created = await this.createNotification({
                recipient_user_id: advisorId,
                alert_id: anomaly._id,
                title: "High severity anomaly",
                content: `Student ${studentCodeById.get(key) || studentNameById.get(key) || key} has anomaly ${anomaly.alert_type}`,
            });

            if (created) anomalyCreated += 1;
        }

        return {
            created_count: riskCreated + sentimentCreated + anomalyCreated,
            details: {
                risk: riskCreated,
                sentiment: sentimentCreated,
                anomaly: anomalyCreated,
            },
        };
    }
}

module.exports = new NotificationService();
