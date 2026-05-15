const Feedback = require("../models/feedback.model");
const Meeting = require("../models/meeting.model");
const ClassMember = require("../models/classMember.model");
const AdvisorClass = require("../models/advisorClass.model");
const Alert = require("../models/alert.model");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const throwError = require("../utils/throwError");

const AI_SERVICE_BASE_URL = process.env.AI_SERVICE_BASE_URL || "http://127.0.0.1:8001/api/v1";
const AI_SERVICE_TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS || 10000);
const ALLOWED_SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE"];

class FeedbackService {
    async classifySentimentViaAI({ meetingId, studentUserId, feedbackText }) {
        const endpoint = `${AI_SERVICE_BASE_URL}/sentiment/classify`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meeting_id: String(meetingId),
                    student_user_id: String(studentUserId),
                    feedback_text: feedbackText,
                }),
                signal: controller.signal,
            });

            let payload = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok) {
                const detail = payload?.detail || `AI service returned HTTP ${response.status}`;
                throwError(`sentiment classify failed: ${detail}`, 503);
            }

            const sentimentLabel = payload?.sentiment_label;
            const sentimentScore = payload?.sentiment_score;

            if (!["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(sentimentLabel)) {
                throwError("sentiment classify failed: invalid sentiment_label from AI service", 503);
            }
            if (typeof sentimentScore !== "number" || Number.isNaN(sentimentScore)) {
                throwError("sentiment classify failed: invalid sentiment_score from AI service", 503);
            }

            return { sentimentLabel, sentimentScore };
        } catch (error) {
            if (error?.name === "AbortError") {
                throwError("sentiment classify timeout from AI service", 504);
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    async submitFeedback(data, studentUserId) {
        if (!studentUserId) throwError("student_user_id is required", 422);

        const meeting = await Meeting.findById(data.meeting_id).select(
            "_id class_id advisor_user_id student_user_ids meeting_end_time term_id"
        );
        if (!meeting) throwError("meeting not found", 404);

        const isInvitedStudent = meeting.student_user_ids?.some(
            (id) => String(id) === String(studentUserId)
        );
        if (!isInvitedStudent) {
            throwError("student is not in this meeting", 403);
        }

        const membership = await ClassMember.findOne({
            class_id: meeting.class_id,
            student_user_id: studentUserId,
            status: "ACTIVE",
        }).select("_id");

        if (!membership) {
            throwError("student is not an active member of meeting class", 403);
        }

        const submittedAt = data.submitted_at ? new Date(data.submitted_at) : new Date();
        const meetingEndTime = new Date(meeting.meeting_end_time);
        const maxAllowedTime = new Date(meetingEndTime.getTime() + 24 * 60 * 60 * 1000);

        if (submittedAt < meetingEndTime) {
            throwError("feedback can only be submitted after meeting ends", 422);
        }
        if (submittedAt > maxAllowedTime) {
            throwError("feedback must be submitted within 24 hours after meeting ends", 422);
        }

        let sentimentLabel = "NEUTRAL";
        let sentimentScore = 0;
        const clientSentiment = typeof data.sentiment_label === "string" ? data.sentiment_label : "";

        if (ALLOWED_SENTIMENTS.includes(clientSentiment)) {
            sentimentLabel = clientSentiment;
        } else {
            try {
                const classified = await this.classifySentimentViaAI({
                    meetingId: meeting._id,
                    studentUserId,
                    feedbackText: data.feedback_text,
                });
                sentimentLabel = classified.sentimentLabel;
                sentimentScore = classified.sentimentScore;
            } catch (error) {
                console.warn("AI sentiment unavailable, fallback to NEUTRAL:", error?.message || error);
            }
        }

        let created;
        try {
            created = await Feedback.create({
                class_id: meeting.class_id,
                student_user_id: studentUserId,
                advisor_user_id: meeting.advisor_user_id,
                meeting_id: meeting._id,
                feedback_text: data.feedback_text,
                rating: data.rating,
                sentiment_label: sentimentLabel,
                feedback_score: sentimentScore,
                submitted_at: submittedAt,
            });
        } catch (error) {
            if (error?.code === 11000) {
                throwError("feedback already submitted for this meeting", 409);
            }
            throw error;
        }

        if (sentimentLabel === "NEGATIVE" && sentimentScore < -0.6 && meeting.term_id) {
            const severity = sentimentScore < -0.8 ? "HIGH" : "MEDIUM";
            const sentimentAlert = await Alert.findOneAndUpdate(
                { feedback_id: created._id, alert_type: "SENTIMENT" },
                {
                    $setOnInsert: {
                        student_user_id: studentUserId,
                        term_id: meeting.term_id,
                        alert_type: "SENTIMENT",
                        source_ai: "AI02_SENTIMENT",
                        severity,
                        feedback_id: created._id,
                        metadata: { sentiment_label: sentimentLabel, feedback_score: sentimentScore },
                        detected_at: created.submitted_at || new Date(),
                    },
                },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            const studentMembership = await ClassMember.findOne({
                student_user_id: sentimentAlert.student_user_id,
                status: "ACTIVE",
            }).select("class_id");

            if (studentMembership?.class_id) {
                const advisorClass = await AdvisorClass.findOne({
                    _id: studentMembership.class_id,
                    status: "ACTIVE",
                }).select("advisor_user_id");

                const advisorId = advisorClass?.advisor_user_id;
                if (advisorId) {
                    const student = await User.findById(sentimentAlert.student_user_id).select(
                        "profile.full_name student_info.student_code"
                    );
                    const studentName =
                        student?.profile?.full_name ||
                        student?.student_info?.student_code ||
                        String(sentimentAlert.student_user_id);
                    const studentCode = student?.student_info?.student_code || null;
                    const studentDisplay = studentCode ? `${studentName} - ${studentCode}` : studentName;

                    const dedupeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const duplicate = await Notification.findOne({
                        recipient_user_id: advisorId,
                        alert_id: sentimentAlert._id,
                        sent_at: { $gte: dedupeSince },
                    }).select("_id");

                    if (!duplicate) {
                        await Notification.create({
                            recipient_user_id: advisorId,
                            alert_id: sentimentAlert._id,
                            title: `Cảnh báo cảm xúc từ sinh viên: ${studentDisplay}`,
                            content: `Sinh viên ${studentDisplay} vừa gửi phản hồi có dấu hiệu tâm lý nghiêm trọng.`,
                            sent_at: new Date(),
                        });
                    }
                }
            }
        }

        return created;
    }

    async getFeedbackList(body, currentUser) {
        const page = Number(body.page || 1);
        const limit = Number(body.limit || 20);
        const skip = (page - 1) * limit;

        const filter = {};
        if (body.class_id) filter.class_id = body.class_id;
        if (body.student_user_id) filter.student_user_id = body.student_user_id;
        if (body.advisor_user_id) filter.advisor_user_id = body.advisor_user_id;

        if (body.sentiment_label) filter.sentiment_label = body.sentiment_label;
        if (body.meeting_id) filter.meeting_id = body.meeting_id;

        const role = currentUser?.role;
        const userId = currentUser?.userId;
        if (role === "ADVISOR") {
            filter.advisor_user_id = userId;
        }
        if (role === "STUDENT") {
            filter.student_user_id = userId;
        }

        const [items, total] = await Promise.all([
            Feedback.find(filter)
                .sort({ submitted_at: -1 })
                .skip(skip)
                .limit(limit)
                .populate("meeting_id", "meeting_time meeting_end_time")
                .populate("class_id", "class_code class_name")
                .populate("advisor_user_id", "email profile.full_name")
                .populate("student_user_id", "email profile.full_name student_info.student_code")
                .lean(),
            Feedback.countDocuments(filter),
        ]);

        const normalized = items.map((row) => {
            const m = row.meeting_id && typeof row.meeting_id === "object" ? row.meeting_id : null;
            const c = row.class_id && typeof row.class_id === "object" ? row.class_id : null;
            const a = row.advisor_user_id && typeof row.advisor_user_id === "object" ? row.advisor_user_id : null;
            const s = row.student_user_id && typeof row.student_user_id === "object" ? row.student_user_id : null;
            const classDisplay =
                c && (c.class_code || c.class_name)
                    ? [c.class_code, c.class_name].filter(Boolean).join(" — ")
                    : null;
            const advisorDisplay = a?.profile?.full_name || a?.email || null;
            const studentDisplay = s?.profile?.full_name || s?.student_info?.student_code || s?.email || null;
            return {
                ...row,
                meeting_id: m ? m._id : row.meeting_id,
                class_id: c ? c._id : row.class_id,
                advisor_user_id: a ? a._id : row.advisor_user_id,
                student_user_id: s ? s._id : row.student_user_id,
                meeting_time: m?.meeting_time ?? null,
                meeting_end_time: m?.meeting_end_time ?? null,
                class_display: classDisplay,
                advisor_display: advisorDisplay,
                student_display: studentDisplay,
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
}

module.exports = new FeedbackService();
