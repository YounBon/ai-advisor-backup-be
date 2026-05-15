const mongoose = require("mongoose");

const advisorClassSchema = new mongoose.Schema(
    {
        class_code: { type: String, required: true, trim: true },
        class_name: { type: String, trim: true },
        advisor_user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
        major_id: { type: mongoose.Schema.Types.ObjectId, ref: "Major" },
        cohort_year: { type: Number, min: 1900, max: 3000 },
        status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    },
    { timestamps: true, collection: "advisor_classes" }
);

advisorClassSchema.index({ advisor_user_id: 1 });
advisorClassSchema.index({ class_code: 1 }, { unique: true });
advisorClassSchema.index({ status: 1 });
advisorClassSchema.index({ department_id: 1 });
advisorClassSchema.index({ major_id: 1 });

module.exports = mongoose.model("AdvisorClass", advisorClassSchema);
