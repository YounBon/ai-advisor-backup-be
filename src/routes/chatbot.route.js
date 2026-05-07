const express = require("express");
const { body } = require("express-validator");
const chatbotController = require("../controllers/chatbot.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/authorize.middleware");
const validate = require("../middlewares/validate.middleware");

const router = express.Router();

router.post(
    "/message",
    authMiddleware,
    authorizeRoles("STUDENT"),
    [
        body("message")
            .isString()
            .withMessage("message phải là chuỗi")
            .trim()
            .notEmpty()
            .withMessage("message không được để trống")
            .isLength({ max: 1000 })
            .withMessage("message tối đa 1000 ký tự"),
        body("history")
            .optional()
            .isArray()
            .withMessage("history phải là mảng")
            .isLength({ max: 40 })
            .withMessage("history tối đa 40 phần tử"),
    ],
    validate,
    chatbotController.sendMessage
);

// GET /api/chatbot/usage — xem thống kê usage theo ngày (chỉ ADMIN/FACULTY)
router.get(
    "/usage",
    authMiddleware,
    authorizeRoles("ADMIN", "FACULTY"),
    chatbotController.getUsage
);

module.exports = router;
