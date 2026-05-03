const express = require("express");
const userController = require("../controllers/user.controller");
const userValidator = require("../validations/user.validator");
const validate = require("../middlewares/validate.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/authorize.middleware");

const router = express.Router();

router.post("/me", authMiddleware, userController.getMe);

router.post("/me/change-password", authMiddleware, userController.changePassword);

router.post(
    "/me/update",
    authMiddleware,
    userValidator.updateMyProfileValidator,
    validate,
    userController.updateMyProfile
);

router.post("/create",
    authMiddleware,
    authorizeRoles("ADMIN", "ADVISOR"),
    userValidator.createUserValidator,
    validate,
    userController.createUser
);

router.post(
    "/info",
    authMiddleware,
    authorizeRoles("ADMIN", "ADVISOR", "FACULTY"),
    userValidator.getUserInfoValidator,
    validate,
    userController.getUserInfo
);

router.post("/",
    authMiddleware,
    authorizeRoles("ADMIN", "ADVISOR"),
    userValidator.listUsersValidator,
    validate,
    userController.getUsers
);

module.exports = router;
