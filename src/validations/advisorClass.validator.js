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

    getMyClassValidator = [
        body("advisor_user_id").optional().isMongoId().withMessage("invalid advisor_user_id"),
    ];

    listAllClassesValidator = [
        body("department_id").optional().isMongoId().withMessage("invalid department_id"),
        body("major_id").optional().isMongoId().withMessage("invalid major_id"),
        body("advisor_user_id").optional().isMongoId().withMessage("invalid advisor_user_id"),
        body("status").optional().isIn(["ACTIVE", "INACTIVE"]),
        body("search").optional().isString().trim(),
        body("page").optional().isInt({ min: 1 }).withMessage("page must be an integer >= 1"),
        body("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    ];

    changeAdvisorValidator = [
        body("class_id").notEmpty().withMessage("class_id is required").isMongoId().withMessage("invalid class_id"),
        body("new_advisor_user_id").notEmpty().withMessage("new_advisor_user_id is required").isMongoId().withMessage("invalid new_advisor_user_id"),
    ];
}

module.exports = new AdvisorClassValidator();
