const express = require("express");
const notificationController = require("../controllers/notification.controller");
const notificationValidator = require("../validations/notification.validator");
const validate = require("../middlewares/validate.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/authorize.middleware");

const router = express.Router();

router.post(
    "/mark-read",
    authMiddleware,
    authorizeRoles("STUDENT", "ADVISOR", "FACULTY", "ADMIN"),
    notificationController.markAsRead
);

router.post(
    "/list",
    authMiddleware,
    authorizeRoles("STUDENT", "ADVISOR", "FACULTY", "ADMIN"),
    notificationValidator.listNotificationsValidator,
    validate,
    notificationController.listNotifications
);

router.post(
    "/generate",
    authMiddleware,
    authorizeRoles("ADVISOR", "FACULTY", "ADMIN"),
    notificationValidator.generateAlertsValidator,
    validate,
    notificationController.generateAlerts
);

module.exports = router;
