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

        // --- Lịch sử cập nhật ---
        // is_latest = true: bản ghi mới nhất của sinh viên trong kỳ (dùng cho AI/dashboard)
        // is_latest = false: bản ghi lịch sử (audit trail)
        is_latest: { type: Boolean, default: true, index: true },

        // Phiên bản bản ghi trong cùng 1 kỳ (1, 2, 3, ...)
        version: { type: Number, min: 1, default: 1 },

        // Người thực hiện cập nhật (student tự nộp hoặc advisor/admin nhập hộ)
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true, collection: "academic_records" }
);

// Index cho query lịch sử theo sinh viên + kỳ (sắp xếp mới nhất trước)
academicRecordSchema.index({ student_user_id: 1, term_id: 1, recorded_at: -1 });

// Index cho query bản ghi mới nhất của sinh viên trong kỳ
academicRecordSchema.index({ student_user_id: 1, term_id: 1, is_latest: 1 });

// Index cho query toàn bộ lịch sử của sinh viên
academicRecordSchema.index({ student_user_id: 1, recorded_at: -1 });

// Partial unique index: mỗi sinh viên chỉ có đúng 1 bản ghi is_latest=true mỗi kỳ
academicRecordSchema.index(
    { student_user_id: 1, term_id: 1 },
    { unique: true, partialFilterExpression: { is_latest: true }, name: "unique_latest_per_term" }
);

module.exports = mongoose.model("AcademicRecord", academicRecordSchema);
