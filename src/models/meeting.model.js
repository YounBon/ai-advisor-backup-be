const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
    {
        class_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdvisorClass",
            required: true,
            index: true,
        },
        student_user_ids: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        advisor_user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        term_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Term",
            required: false,
            index: true,
        },
        meeting_time: { type: Date, required: true },
        meeting_end_time: { type: Date, required: true },
        notes_raw: { type: String, required: true, trim: true, minlength: 30 },
        notes_summary: { type: String },
        summary_model: { type: String, default: "T5" },
        status: {
            type: String,
            enum: ["ACTIVE", "ARCHIVED"],
            default: "ACTIVE",
            index: true,
        },
        file: {
            url: { type: String, trim: true },
            download_url: { type: String, trim: true },
            public_id: { type: String, trim: true },
            original_name: { type: String, trim: true },
            mime_type: { type: String, trim: true, lowercase: true },
            file_size: { type: Number, min: 0, max: 5 },
            format: { type: String, trim: true, lowercase: true, enum: ["doc", "docx", "pdf"] },
        },
    },
    { timestamps: true, collection: "meetings" }
);

meetingSchema.path("student_user_ids").validate((value) => Array.isArray(value) && value.length > 0, "student_user_ids is required");

meetingSchema.index({ class_id: 1, meeting_time: -1 });
meetingSchema.index({ student_user_ids: 1, meeting_time: -1 });
meetingSchema.index({ advisor_user_id: 1, meeting_time: -1 });

module.exports = mongoose.model("Meeting", meetingSchema);
