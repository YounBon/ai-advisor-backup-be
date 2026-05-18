const { body } = require("express-validator");

class AuthValidator {
    loginValidator = [
        body("email").notEmpty().withMessage("email is required").isEmail().withMessage("invalid email").toLowerCase(),
        body("password").notEmpty().withMessage("password is required"),
    ];

    refreshTokenValidator = [
        body("refresh_token")
            .notEmpty()
            .withMessage("refresh_token is required")
            .isString()
            .trim(),
    ];

    logoutValidator = [
        body("refresh_token").optional().isString().trim(),
        body("all_devices").optional().isBoolean().withMessage("all_devices must be boolean"),
    ];
}

module.exports = new AuthValidator();
