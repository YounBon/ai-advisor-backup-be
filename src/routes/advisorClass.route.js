const express = require("express");
const advisorClassController = require("../controllers/advisorClass.controller");
const advisorClassValidator = require("../validations/advisorClass.validator");
const validate = require("../middlewares/validate.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/authorize.middleware");

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    authorizeRoles("ADMIN"),
    advisorClassValidator.upsertClassValidator,
    validate,
    advisorClassController.upsertClass
);

router.post(
    "/my",
    authMiddleware,
    authorizeRoles("ADVISOR", "ADMIN"),
    advisorClassValidator.getMyClassValidator,
    validate,
    advisorClassController.getMyClass
);

router.post(
    "/list",
    authMiddleware,
    authorizeRoles("ADMIN"),
    advisorClassValidator.listAllClassesValidator,
    validate,
    advisorClassController.listAllClasses
);

router.post(
    "/change-advisor",
    authMiddleware,
    authorizeRoles("ADMIN"),
    advisorClassValidator.changeAdvisorValidator,
    validate,
    advisorClassController.changeAdvisor
);

router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles("ADMIN"),
    advisorClassController.deleteClass
);

module.exports = router;

