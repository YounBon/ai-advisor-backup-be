const { body, param } = require("express-validator");

class MeetingValidator {
    listMyMeetingsValidator = [
        body("page").optional().isInt({ min: 1 }).withMessage("page must be an integer >= 1"),
        body("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("limit must be between 1 and 100"),
    ];

    createMeetingValidator = [
        body("class_id").notEmpty().withMessage("class_id is required").isMongoId(),
        body("student_user_ids")
            .customSanitizer((value) => {
                if (Array.isArray(value)) return value;
                if (typeof value === "string") {
                    try {
                        const parsed = JSON.parse(value);
                        return parsed;
                    } catch (error) {
                        return value;
                    }
                }
                return value;
            })
            .isArray({ min: 1 })
            .withMessage("student_user_ids must be a non-empty array"),
        body("student_user_ids.*").isMongoId().withMessage("invalid student_user_id"),
        body("advisor_user_id").optional({ values: "falsy" }).isMongoId().withMessage("invalid advisor_user_id"),
        body("term_id").optional({ values: "falsy" }).isMongoId().withMessage("invalid term_id"),
        body("meeting_time").notEmpty().withMessage("meeting_time is required").isISO8601(),
        body("meeting_end_time")
            .notEmpty()
            .withMessage("meeting_end_time is required")
            .isISO8601()
            .withMessage("meeting_end_time must be ISO date")
            .custom((value, { req }) => {
                const start = new Date(req.body.meeting_time);
                const end = new Date(value);
                if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;
                if (end <= start) {
                    throw new Error("meeting_end_time must be after meeting_time");
                }
                return true;
            }),
        body("notes_raw")
            .notEmpty()
            .withMessage("notes_raw is required")
            .isString()
            .withMessage("notes_raw must be a string")
            .trim()
            .isLength({ min: 30 })
            .withMessage("notes_raw must be at least 30 characters long"),
        body("notes_summary").optional().isString().trim(),
        body("summary_model").optional().isString().trim(),
    ];

    listAdvisorMeetingsValidator = [
        body("page").optional().isInt({ min: 1 }).withMessage("page must be an integer >= 1"),
        body("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("limit must be between 1 and 100"),
        body("student_name").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
        body("date_from").optional({ values: "falsy" }).isISO8601().withMessage("date_from must be ISO date"),
        body("date_to").optional({ values: "falsy" }).isISO8601().withMessage("date_to must be ISO date"),
        body("status").optional({ values: "falsy" }).isIn(["ACTIVE", "ARCHIVED"]).withMessage("status must be ACTIVE or ARCHIVED"),
    ];

    updateNotesValidator = [
        param("id").notEmpty().withMessage("meeting id is required").isMongoId().withMessage("invalid meeting id"),
        body("notes_raw")
            .notEmpty()
            .withMessage("notes_raw is required")
            .isString()
            .withMessage("notes_raw must be a string")
            .trim()
            .isLength({ min: 30 })
            .withMessage("notes_raw must be at least 30 characters long"),
        body("notes_summary").optional().isString().trim(),
        body("summary_model").optional().isString().trim(),
    ];

    meetingIdValidator = [
        param("id").notEmpty().withMessage("meeting id is required").isMongoId().withMessage("invalid meeting id"),
    ];
}

module.exports = new MeetingValidator();
