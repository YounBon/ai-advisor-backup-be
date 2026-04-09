const AcademicRecord = require("../models/academicRecord.model");
const RiskPrediction = require("../models/riskPrediction.model");
const Recommendation = require("../models/recommendation.model");
const Term = require("../models/term.model");
const Feedback = require("../models/feedback.model");
const Alert = require("../models/alert.model");
const Notification = require("../models/notification.model");
const ClassMember = require("../models/classMember.model");
const AdvisorClass = require("../models/advisorClass.model");
const User = require("../models/user.model");
const mongoose = require("mongoose");
const throwError = require("../utils/throwError");

const AI_SERVICE_BASE_URL = process.env.AI_SERVICE_BASE_URL || "http://127.0.0.1:8001/api/v1";
const AI_SERVICE_TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS || 10000);
const AI_ANOMALY_ENDPOINT = process.env.AI_ANOMALY_ENDPOINT || `${AI_SERVICE_BASE_URL}/anomaly/detect`;
const MAX_RECOMMENDATIONS_PER_PREDICTION = 3;
const MIN_HISTORY_FOR_ANOMALY = 2;
const MIN_RECORD_INTERVAL_DAYS = Math.max(1, Number(process.env.MIN_RECORD_INTERVAL_DAYS || 1));

const RECOMMENDATION_GROUPS = {
    ACADEMIC: "ACADEMIC",
    WELLBEING: "WELLBEING",
    ATTENDANCE: "ATTENDANCE",
};

const RECOMMENDATION_TEMPLATES = {
    "-1": {
        priority: "HIGH",
        items: {
            [RECOMMENDATION_GROUPS.ACADEMIC]: {
                title: "Cần cải thiện kết quả học tập khẩn cấp",
                content:
                    "GPA hiện tại thấp hoặc đã có môn rớt. Sinh viên cần lập kế hoạch học lại, tăng thời gian tự học và trao đổi sớm với cố vấn học tập.",
            },
            [RECOMMENDATION_GROUPS.WELLBEING]: {
                title: "Dấu hiệu căng thẳng và tâm lý tiêu cực",
                content:
                    "Mức căng thẳng cao hoặc phản hồi cảm xúc tiêu cực. Cố vấn học tập nên chủ động liên hệ để tư vấn và hỗ trợ tinh thần.",
            },
            [RECOMMENDATION_GROUPS.ATTENDANCE]: {
                title: "Tỉ lệ tham gia lớp học thấp",
                content:
                    "Sinh viên vắng học nhiều buổi. Cần cải thiện chuyên cần và theo dõi sát sao lịch học.",
            },
        },
    },
    "0": {
        priority: "MEDIUM",
        items: {
            [RECOMMENDATION_GROUPS.ACADEMIC]: {
                title: "Nên cải thiện hiệu quả học tập",
                content:
                    "Kết quả học tập chưa ổn định. Nên điều chỉnh phương pháp học và phân bổ thời gian hợp lý hơn.",
            },
            [RECOMMENDATION_GROUPS.WELLBEING]: {
                title: "Cần cân bằng tâm lý học tập",
                content:
                    "Có dấu hiệu áp lực hoặc cảm xúc chưa tích cực. Nên nghỉ ngơi hợp lý và trao đổi khi cần.",
            },
            [RECOMMENDATION_GROUPS.ATTENDANCE]: {
                title: "Nên duy trì tham gia lớp đầy đủ hơn",
                content:
                    "Tỉ lệ tham gia lớp chưa cao. Cần hạn chế vắng học để theo kịp bài giảng.",
            },
        },
    },
    "1": {
        priority: "LOW",
        items: {
            [RECOMMENDATION_GROUPS.ACADEMIC]: {
                title: "Duy trì kết quả học tập tốt",
                content:
                    "Sinh viên đang có kết quả học tập tốt. Nên tiếp tục duy trì phương pháp học hiện tại.",
            },
            [RECOMMENDATION_GROUPS.WELLBEING]: {
                title: "Tâm lý học tập ổn định",
                content:
                    "Tinh thần học tập tích cực. Nên giữ thói quen sinh hoạt và nghỉ ngơi hợp lý.",
            },
            [RECOMMENDATION_GROUPS.ATTENDANCE]: {
                title: "Duy trì chuyên cần lớp học",
                content:
                    "Sinh viên tham gia lớp học đầy đủ. Cần tiếp tục phát huy.",
            },
        },
    },
};

class AcademicService {
    isSameNullableNumber(a, b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;

        const numA = Number(a);
        const numB = Number(b);
        if (Number.isNaN(numA) || Number.isNaN(numB)) return false;

        return numA === numB;
    }

    toAnomalyFeatureVector(record) {
        return {
            gpa_current: typeof record?.gpa_current === "number" ? record.gpa_current : Number(record?.gpa_current ?? 0),
            attendance_rate:
                typeof record?.attendance_rate === "number" ? record.attendance_rate : Number(record?.attendance_rate ?? 0),
            sentiment_score:
                typeof record?.sentiment_score === "number" ? record.sentiment_score : Number(record?.sentiment_score ?? 0),
            stress_level: typeof record?.stress_level === "number" ? record.stress_level : Number(record?.stress_level ?? 0),
        };
    }

    async detectAnomalyViaAI({ studentUserId, latestRecord }) {
        const history = await AcademicRecord.find({ student_user_id: studentUserId })
            .sort({ recorded_at: 1, _id: 1 })
            .select("gpa_current attendance_rate sentiment_score stress_level recorded_at term_id");

        if (history.length < MIN_HISTORY_FOR_ANOMALY) {
            return { skipped: true, reason: "insufficient_history" };
        }

        const historyVectors = history.map((item) => ({
            ...this.toAnomalyFeatureVector(item),
            recorded_at: item.recorded_at,
        }));
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

        try {
            const response = await fetch(AI_ANOMALY_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_user_id: String(studentUserId),
                    latest_record_id: String(latestRecord._id),
                    features: ["gpa_current", "attendance_rate", "sentiment_score", "stress_level"],
                    history: historyVectors,
                }),
                signal: controller.signal,
            });

            let data = null;
            try {
                data = await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {
                const detail = data?.detail || `AI anomaly service returned HTTP ${response.status}`;
                throw new Error(detail);
            }

            return {
                skipped: false,
                isAnomaly: Boolean(data?.is_anomaly),
                anomalyScore: typeof data?.anomaly_score === "number" ? data.anomaly_score : null,
                anomalyType: typeof data?.anomaly_type === "string" ? data.anomaly_type : "Study anomaly",
                modelName:
                    typeof data?.model_name === "string"
                        ? data.model_name
                        : typeof data?.meta?.model_name === "string"
                          ? data.meta.model_name
                          : "IsolationForest",
                triggeredFeatures: Array.isArray(data?.triggered_features) ? data.triggered_features : [],
                zScores: data?.z_scores && typeof data.z_scores === "object" ? data.z_scores : null,
                featureValues:
                    data?.feature_values && typeof data.feature_values === "object" ? data.feature_values : null,
            };
        } catch (error) {
            if (error?.name === "AbortError") {
                throw new Error("AI anomaly service timeout");
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    async createAnomalyAlertIfNeeded({ studentUserId, termId, academicRecordId, anomalyResult }) {
        if (!anomalyResult?.isAnomaly) return null;

        const score = anomalyResult.anomalyScore;
        const severity = typeof score === "number" && score <= -0.2 ? "HIGH" : "MEDIUM";

        return Alert.findOneAndUpdate(
            { academic_record_id: academicRecordId, alert_type: "ANOMALY" },
            {
                $setOnInsert: {
                    student_user_id: studentUserId,
                    term_id: termId,
                    alert_type: "ANOMALY",
                    source_ai: "AI04_ANOMALY",
                    severity,
                    academic_record_id: academicRecordId,
                    metadata: {
                        anomaly_score: score,
                        anomaly_type: anomalyResult.anomalyType,
                        model_name: anomalyResult.modelName,
                        triggered_features: anomalyResult.triggeredFeatures,
                        z_scores: anomalyResult.zScores,
                        feature_values: anomalyResult.featureValues,
                    },
                    detected_at: new Date(),
                },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    }

    async notifyAdvisorForAnomalyAlert({ alert, studentUserId, anomalyResult }) {
        if (!alert?._id) return;

        const advisorId = await this.getAdvisorOfStudent(studentUserId);
        if (!advisorId) return;

        const student = await User.findById(studentUserId).select("profile.full_name student_info.student_code");
        const studentName = student?.profile?.full_name || student?.student_info?.student_code || String(studentUserId);

        const dedupeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const duplicate = await Notification.findOne({
            recipient_user_id: advisorId,
            alert_id: alert._id,
            sent_at: { $gte: dedupeSince },
        }).select("_id");
        if (duplicate) return;

        const zScores = anomalyResult?.zScores && typeof anomalyResult.zScores === "object" ? anomalyResult.zScores : {};
        const featureValues =
            anomalyResult?.featureValues && typeof anomalyResult.featureValues === "object"
                ? anomalyResult.featureValues
                : {};
        const triggeredSet = new Set(
            Array.isArray(anomalyResult?.triggeredFeatures) ? anomalyResult.triggeredFeatures : []
        );

        const featureLabelMap = {
            gpa_current: "GPA hiện tại",
            attendance_rate: "Tỷ lệ tham dự",
            sentiment_score: "Điểm cảm xúc",
            stress_level: "Mức stress",
        };

        const formatFeatureValue = (feature, value) => {
            if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
            if (feature === "attendance_rate") return `${(value * 100).toFixed(0)}%`;
            return value.toFixed(2);
        };

        const topSignals = Object.entries(zScores)
            .map(([feature, z]) => ({
                feature,
                z: Number(z),
                value: Number(featureValues[feature]),
            }))
            .filter((item) => !Number.isNaN(item.z) && (!triggeredSet.size || triggeredSet.has(item.feature)))
            .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
            .slice(0, 2)
            .map((item) => {
                const featureLabel = featureLabelMap[item.feature] || item.feature;
                const direction = item.z >= 0 ? "tăng" : "giảm";
                const zText = item.z >= 0 ? `+${item.z.toFixed(2)}` : item.z.toFixed(2);
                const valueText = formatFeatureValue(item.feature, item.value);
                return `${featureLabel} ${direction} (z=${zText}, value=${valueText})`;
            });

        const explainText = topSignals.length ? ` Tin hieu chinh: ${topSignals.join("; ")}.` : "";

        await Notification.create({
            recipient_user_id: advisorId,
            alert_id: alert._id,
            title: "Cảnh báo dấu hiệu bất thường",
            content: `Sinh viên ${studentName} có dấu hiệu bất thường (${anomalyResult?.anomalyType || "Study anomaly"}).${explainText}`, 
            sent_at: new Date(),
        });
    }

    resolveGroupRiskLevels(payload) {
        const academicHigh = payload.gpa_current < 2.5 || payload.num_failed >= 2;
        const academicLow = payload.gpa_current >= 2.8 && payload.num_failed === 0;
        const wellbeingHigh = payload.stress_level >= 3 || payload.sentiment_score < -0.2;
        const wellbeingLow = payload.stress_level <= 2 && payload.sentiment_score >= 0.2;
        const attendanceHigh = payload.attendance_rate < 0.7;
        const attendanceLow = payload.attendance_rate >= 0.8;

        return {
            [RECOMMENDATION_GROUPS.ACADEMIC]: academicHigh ? -1 : academicLow ? 1 : 0,
            [RECOMMENDATION_GROUPS.WELLBEING]: wellbeingHigh ? -1 : wellbeingLow ? 1 : 0,
            [RECOMMENDATION_GROUPS.ATTENDANCE]: attendanceHigh ? -1 : attendanceLow ? 1 : 0,
        };
    }

    pickRecommendationGroups({ riskLabel, groupLevels }) {
        const allGroups = [
            RECOMMENDATION_GROUPS.ACADEMIC,
            RECOMMENDATION_GROUPS.WELLBEING,
            RECOMMENDATION_GROUPS.ATTENDANCE,
        ];

        const sameRiskGroups = allGroups.filter((group) => groupLevels[group] === riskLabel);
        if (sameRiskGroups.length) {
            return sameRiskGroups.slice(0, MAX_RECOMMENDATIONS_PER_PREDICTION);
        }

        // Fallback to avoid empty recommendations when group levels are mixed.
        return allGroups.slice(0, MAX_RECOMMENDATIONS_PER_PREDICTION);
    }

    async replaceRecommendationsForRisk({ studentUserId, termId, riskPredictionId, riskLabel, payload }) {
        const template = RECOMMENDATION_TEMPLATES[String(riskLabel)] || RECOMMENDATION_TEMPLATES["0"];
        const groupLevels = this.resolveGroupRiskLevels(payload);
        const selectedGroups = this.pickRecommendationGroups({ riskLabel, groupLevels });

        if (!selectedGroups.length) return [];

        const docs = selectedGroups.map((group) => ({
            student_user_id: studentUserId,
            term_id: termId,
            risk_prediction_id: riskPredictionId,
            title: template.items[group].title,
            content: template.items[group].content,
            priority: template.priority,
        }));

        return Recommendation.insertMany(docs);
    }

    async predictRiskViaAI({ studentUserId, termId, payload }) {
        const endpoint = `${AI_SERVICE_BASE_URL}/risk/predict`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_user_id: String(studentUserId),
                    term_id: String(termId),
                    ...payload,
                }),
                signal: controller.signal,
            });

            let data = null;
            try {
                data = await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {
                const detail = data?.detail || `AI service returned HTTP ${response.status}`;
                throwError(`risk predict failed: ${detail}`, 503);
            }

            const riskScore = data?.risk_score;
            const riskLabel = data?.risk_label;
            const modelName = data?.meta?.model_name;

            if (typeof riskScore !== "number" || Number.isNaN(riskScore)) {
                throwError("risk predict failed: invalid risk_score from AI service", 503);
            }
            if (![-1, 0, 1].includes(riskLabel)) {
                throwError("risk predict failed: invalid risk_label from AI service", 503);
            }

            return {
                riskScore,
                riskLabel,
                modelName: typeof modelName === "string" && modelName.trim() ? modelName.trim() : "RandomForest",
            };
        } catch (error) {
            if (error?.name === "AbortError") {
                throwError("risk predict timeout from AI service", 504);
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    async upsertRiskPrediction({ studentUserId, termId, riskScore, riskLabel, modelName }) {
        const now = new Date();
        await RiskPrediction.updateMany(
            { student_user_id: studentUserId, term_id: termId, is_latest: true },
            { $set: { is_latest: false } }
        );

        return RiskPrediction.create({
            student_user_id: studentUserId,
            term_id: termId,
            risk_score: riskScore,
            risk_label: riskLabel,
            model_name: modelName || "RandomForest",
            predicted_at: now,
            is_latest: true,
        });
    }

    async getAdvisorOfStudent(studentUserId) {
        const membership = await ClassMember.findOne({
            student_user_id: studentUserId,
            status: "ACTIVE",
        }).select("class_id");
        if (!membership?.class_id) return null;

        const advisorClass = await AdvisorClass.findOne({
            _id: membership.class_id,
            status: "ACTIVE",
        }).select("advisor_user_id");

        return advisorClass?.advisor_user_id || null;
    }

    async createRiskAlertIfNeeded({ studentUserId, termId, riskPredictionId, riskLabel, riskScore }) {
        if (riskLabel !== -1) return null;

        const severity = riskScore > 0.85 ? "HIGH" : "MEDIUM";
        return Alert.findOneAndUpdate(
            { risk_prediction_id: riskPredictionId, alert_type: "RISK" },
            {
                $setOnInsert: {
                    student_user_id: studentUserId,
                    term_id: termId,
                    alert_type: "RISK",
                    source_ai: "AI01_RISK",
                    severity,
                    risk_prediction_id: riskPredictionId,
                    metadata: { risk_score: riskScore },
                    detected_at: new Date(),
                },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    }

    async notifyAdvisorForAlert({ alert, studentUserId }) {
        if (!alert?._id) return;

        const advisorId = await this.getAdvisorOfStudent(studentUserId);
        if (!advisorId) return;

        const student = await User.findById(studentUserId).select("profile.full_name student_info.student_code");
        const studentName = student?.profile?.full_name || student?.student_info?.student_code || String(studentUserId);

        const dedupeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const duplicate = await Notification.findOne({
            recipient_user_id: advisorId,
            alert_id: alert._id,
            sent_at: { $gte: dedupeSince },
        }).select("_id");
        if (duplicate) return;

        await Notification.create({
            recipient_user_id: advisorId,
            alert_id: alert._id,
            title: "Cảnh báo nguy cơ học vụ",
            content: `Sinh viên ${studentName} có nguy cơ cao về chỉ số rủi ro học tập trong học kỳ.`,
            sent_at: new Date(),
        });
    }

    async submitAcademic(data, studentUserId) {

        if (!studentUserId) throwError("student_user_id is required", 422);
        if (!data.term_id) throwError("term_id is required", 422);
        const term = await Term.findById(data.term_id).select("_id");
        if (!term) throwError("term_id is invalid", 422);

        const sentimentAgg = await Feedback.aggregate([
            {
                $match: {
                    student_user_id: new mongoose.Types.ObjectId(studentUserId),
                    feedback_score: { $type: "number" },
                },
            },
            {
                $lookup: {
                    from: "meetings",
                    localField: "meeting_id",
                    foreignField: "_id",
                    as: "meeting",
                },
            },
            { $unwind: "$meeting" },
            {
                $match: {
                    "meeting.term_id": new mongoose.Types.ObjectId(data.term_id),
                },
            },
            {
                $group: {
                    _id: null,
                    avg_feedback_score: { $avg: "$feedback_score" },
                },
            },
        ]);
        const computedSentimentScore = sentimentAgg.length ? sentimentAgg[0].avg_feedback_score : null;

        const latestRecord = await AcademicRecord.findOne({
            student_user_id: studentUserId,
            term_id: data.term_id,
        }).sort({ recorded_at: -1 });

        const recordedAt = data.recorded_at ? new Date(data.recorded_at) : new Date();
        if (Number.isNaN(recordedAt.getTime())) {
            throwError("recorded_at is invalid", 422);
        }

        if (latestRecord?.recorded_at) {
            const minRecordedAt = new Date(
                latestRecord.recorded_at.getTime() + MIN_RECORD_INTERVAL_DAYS * 24 * 60 * 60 * 1000
            );
            if (recordedAt < minRecordedAt) {
                throwError(
                    `recorded_at must be at least ${MIN_RECORD_INTERVAL_DAYS} days after the latest record in this term`,
                    422
                );
            }
        }

        const resolvedGpaPrevSem =
            data.gpa_prev_sem !== undefined ? data.gpa_prev_sem : latestRecord?.gpa_prev_sem;
        if (
            latestRecord &&
            !this.isSameNullableNumber(latestRecord.gpa_prev_sem, resolvedGpaPrevSem)
        ) {
            throwError("gpa_prev_sem cannot be changed within the same term", 422);
        }

        const payload = {
            student_user_id: studentUserId,
            term_id: data.term_id,
            gpa_prev_sem: resolvedGpaPrevSem,
            gpa_current: data.gpa_current !== undefined ? data.gpa_current : latestRecord?.gpa_current,
            num_failed: data.num_failed !== undefined ? data.num_failed : latestRecord?.num_failed,
            attendance_rate:
                data.attendance_rate !== undefined ? data.attendance_rate : latestRecord?.attendance_rate,
            shcvht_participation:
                data.shcvht_participation !== undefined
                    ? data.shcvht_participation
                    : latestRecord?.shcvht_participation,
            study_hours: data.study_hours !== undefined ? data.study_hours : latestRecord?.study_hours,
            motivation_score:
                data.motivation_score !== undefined ? data.motivation_score : latestRecord?.motivation_score,
            stress_level: data.stress_level !== undefined ? data.stress_level : latestRecord?.stress_level,
            sentiment_score: computedSentimentScore,
            recorded_at: recordedAt,
        };

        const updated = await AcademicRecord.create(payload);

        const riskPayload = {
            gpa_current: Number(updated.gpa_current),
            attendance_rate: Number(updated.attendance_rate),
            num_failed: Number(updated.num_failed),
            stress_level: Number(updated.stress_level),
            motivation_score: Number(updated.motivation_score),
            shcvht_participation: Number(updated.shcvht_participation),
            study_hours: Number(updated.study_hours),
            // Keep neutral fallback when there is no sentiment from AI-02/feedback yet.
            sentiment_score:
                typeof updated.sentiment_score === "number" && !Number.isNaN(updated.sentiment_score)
                    ? Number(updated.sentiment_score)
                    : 0,
        };

        const missingRiskFields = Object.entries(riskPayload)
            .filter(([, value]) => Number.isNaN(value))
            .map(([key]) => key);

        if (missingRiskFields.length) {
            throwError(`missing required fields for risk prediction: ${missingRiskFields.join(", ")}`, 422);
        }

        try {
            const risk = await this.predictRiskViaAI({
                studentUserId,
                termId: data.term_id,
                payload: riskPayload,
            });
            const riskPrediction = await this.upsertRiskPrediction({
                studentUserId,
                termId: data.term_id,
                riskScore: risk.riskScore,
                riskLabel: risk.riskLabel,
                modelName: risk.modelName,
            });
            const riskAlert = await this.createRiskAlertIfNeeded({
                studentUserId,
                termId: data.term_id,
                riskPredictionId: riskPrediction?._id,
                riskLabel: risk.riskLabel,
                riskScore: risk.riskScore,
            });
            if (riskAlert) {
                await this.notifyAdvisorForAlert({
                    alert: riskAlert,
                    studentUserId,
                });
            }
            await this.replaceRecommendationsForRisk({
                studentUserId,
                termId: data.term_id,
                riskPredictionId: riskPrediction?._id,
                riskLabel: risk.riskLabel,
                payload: riskPayload,
            });
        } catch (error) {
            // Do not block academic submit if AI service is temporarily unavailable.
            console.warn("AI risk unavailable, skip saving risk prediction:", error?.message || error);
        }

        try {
            const anomalyResult = await this.detectAnomalyViaAI({
                studentUserId,
                latestRecord: updated,
            });

            if (!anomalyResult?.skipped) {
                const anomalyAlert = await this.createAnomalyAlertIfNeeded({
                    studentUserId,
                    termId: data.term_id,
                    academicRecordId: updated._id,
                    anomalyResult,
                });

                if (anomalyAlert) {
                    await this.notifyAdvisorForAnomalyAlert({
                        alert: anomalyAlert,
                        studentUserId,
                        anomalyResult,
                    });
                }
            }
        } catch (error) {
            // Do not block academic submit if AI anomaly service is temporarily unavailable.
            console.warn("AI anomaly unavailable, skip anomaly detection:", error?.message || error);
        }

        return updated;
    }
}

module.exports = new AcademicService();
