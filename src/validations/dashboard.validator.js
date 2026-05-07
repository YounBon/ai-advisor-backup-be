const { body } = require("express-validator");

class DashboardValidator {
    studentDashboardValidator = [
        body("student_user_id").optional().isMongoId().withMessage("invalid student_user_id"),
        body("history_limit")
            .optional()
            .isInt({ min: 1, max: 24 })
            .withMessage("history_limit must be between 1 and 24"),
        body("risk_threshold")
            .optional()
            .isFloat({ min: 0, max: 1 })
            .withMessage("risk_threshold must be between 0 and 1"),
    ];

    advisorDashboardValidator = [
        body("advisor_user_id").optional().isMongoId().withMessage("invalid advisor_user_id"),
        body("class_id").optional().isMongoId().withMessage("invalid class_id"),
        body("page").optional().isInt({ min: 1 }).withMessage("page must be an integer >= 1"),
        body("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("limit must be between 1 and 100"),
        body("risk_threshold")
            .optional()
            .isFloat({ min: 0, max: 1 })
            .withMessage("risk_threshold must be between 0 and 1"),
    ];

    facultyDashboardValidator = [
        body("department_id").optional().isMongoId().withMessage("invalid department_id"),
        body("risk_threshold")
            .optional()
            .isFloat({ min: 0, max: 1 })
            .withMessage("risk_threshold must be between 0 and 1"),
    ];
}

module.exports = new DashboardValidator();
