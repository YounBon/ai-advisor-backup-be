const mongoose = require("mongoose");

const academicRecordSchema = new mongoose.Schema(
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
        gpa_prev_sem: { type: Number, min: 0, max: 4 },
        gpa_current: { type: Number, min: 0, max: 4 },
        num_failed: { type: Number, min: 0, default: 0 },
        attendance_rate: { type: Number, min: 0, max: 1 },
        shcvht_participation: { type: Number, min: 0, default: 0 },
        study_hours: { type: Number, min: 0 },
        motivation_score: { type: Number, min: 1, max: 5 },
        stress_level: { type: Number, min: 1, max: 5 },
        sentiment_score: { type: Number, min: -1, max: 1 },
        recorded_at: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true, collection: "academic_records" }
);

academicRecordSchema.index({ student_user_id: 1, term_id: 1, recorded_at: -1 });
academicRecordSchema.index({ student_user_id: 1, recorded_at: -1 });

module.exports = mongoose.model("AcademicRecord", academicRecordSchema);
