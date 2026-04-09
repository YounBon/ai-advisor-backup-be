const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
    {
        student_user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        term_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Term",
            required: true,
            index: true,
        },
        alert_type: {
            type: String,
            enum: ["RISK", "SENTIMENT", "ANOMALY"],
            required: true,
        },
        source_ai: {
            type: String,
            enum: ["AI01_RISK", "AI02_SENTIMENT", "AI04_ANOMALY"],
            required: true,
        },
        severity: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH"],
            required: true,
        },
        risk_prediction_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RiskPrediction",
        },
        feedback_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Feedback",
        },
        academic_record_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicRecord",
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        status: { type: String, enum: ["OPEN", "ACKED", "RESOLVED"], default: "OPEN" },
        detected_at: { type: Date, default: Date.now },
    },
    { timestamps: true, collection: "alert" }
);

alertSchema.index({ student_user_id: 1, detected_at: -1 });
alertSchema.index({ status: 1, severity: 1 });
alertSchema.index({ academic_record_id: 1, alert_type: 1 });

module.exports = mongoose.model("Alert", alertSchema);
