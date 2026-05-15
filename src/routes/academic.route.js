const express = require("express");
const academicController = require("../controllers/academic.controller");
const academicValidator = require("../validations/academic.validator");
const validate = require("../middlewares/validate.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/authorize.middleware");

const router = express.Router();

router.post(
    "/submit",
    authMiddleware,
    authorizeRoles("STUDENT"),
    academicValidator.submitAcademicValidator,
    validate,
    academicController.submitAcademic
);

module.exports = router;
