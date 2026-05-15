const express = require("express");
const classMemberController = require("../controllers/classMember.controller");
const classMemberValidator = require("../validations/classMember.validator");
const validate = require("../middlewares/validate.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/authorize.middleware");

const router = express.Router();

router.post(
    "/add",
    authMiddleware,
    authorizeRoles("ADVISOR", "ADMIN"),
    classMemberValidator.addMembersValidator,
    validate,
    classMemberController.addMembers
);

router.post(
    "/list",
    authMiddleware,
    authorizeRoles("ADVISOR", "ADMIN"),
    classMemberValidator.listMembersValidator,
    validate,
    classMemberController.listMembers
);

router.post(
    "/remove",
    authMiddleware,
    authorizeRoles("ADVISOR", "ADMIN"),
    classMemberValidator.removeMembersValidator,
    validate,
    classMemberController.removeMembers
);

router.post(
    "/transfer",
    authMiddleware,
    authorizeRoles("ADMIN"),
    classMemberValidator.transferMembersValidator,
    validate,
    classMemberController.transferMembers
);

router.post(
    "/unassigned",
    authMiddleware,
    authorizeRoles("ADMIN"),
    classMemberValidator.listUnassignedStudentsValidator,
    validate,
    classMemberController.listUnassignedStudents
);

module.exports = router;

