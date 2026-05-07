const { body } = require("express-validator");

class AdvisorClassValidator {
    upsertClassValidator = [
        body("advisor_user_id").notEmpty().withMessage("advisor_user_id is required").isMongoId().withMessage("invalid advisor_user_id"),
        body("class_code").notEmpty().withMessage("class_code is required").isString().trim(),
        body("class_name").optional().isString().trim(),
        body("department_id").notEmpty().withMessage("department_id is required").isMongoId().withMessage("invalid department_id"),
        body("major_id").optional().isMongoId().withMessage("invalid major_id"),
        body("cohort_year").optional().isInt({ min: 1900, max: 3000 }).withMessage("cohort_year is invalid"),
        body("status").optional().isIn(["ACTIVE", "INACTIVE"]),
    ];

    // Dùng cho POST /advisor-classes/my — lấy danh sách lớp của cố vấn (1–3 lớp)
    getMyClassValidator = [
        body("advisor_user_id").optional().isMongoId().withMessage("invalid advisor_user_id"),
    ];
}

module.exports = new AdvisorClassValidator();
