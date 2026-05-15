const { body } = require("express-validator");

class ClassMemberValidator {
    addMembersValidator = [
        body("class_id").notEmpty().withMessage("class_id is required").isMongoId().withMessage("invalid class_id"),
        body("student_user_ids")
            .isArray({ min: 1 })
            .withMessage("student_user_ids must be a non-empty array"),
        body("student_user_ids.*").isMongoId().withMessage("invalid student_user_id"),
    ];

    listMembersValidator = [
        body("class_id").optional().isMongoId().withMessage("invalid class_id"),
        body("status").optional().isIn(["ACTIVE", "INACTIVE"]),
        body("page").optional().isInt({ min: 1 }).withMessage("page must be an integer >= 1"),
        body("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    ];

    removeMembersValidator = [
        body("class_id").notEmpty().withMessage("class_id is required").isMongoId().withMessage("invalid class_id"),
        body("student_user_ids")
            .isArray({ min: 1 })
            .withMessage("student_user_ids must be a non-empty array"),
        body("student_user_ids.*").isMongoId().withMessage("invalid student_user_id"),
    ];

    transferMembersValidator = [
        body("from_class_id").notEmpty().withMessage("from_class_id is required").isMongoId().withMessage("invalid from_class_id"),
        body("to_class_id").notEmpty().withMessage("to_class_id is required").isMongoId().withMessage("invalid to_class_id"),
        body("student_user_ids")
            .isArray({ min: 1 })
            .withMessage("student_user_ids must be a non-empty array"),
        body("student_user_ids.*").isMongoId().withMessage("invalid student_user_id"),
    ];

    listUnassignedStudentsValidator = [
        body("department_id").optional().isMongoId().withMessage("invalid department_id"),
        body("major_id").optional().isMongoId().withMessage("invalid major_id"),
        body("search").optional().isString().trim(),
        body("page").optional().isInt({ min: 1 }).withMessage("page must be an integer >= 1"),
        body("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    ];
}

module.exports = new ClassMemberValidator();

