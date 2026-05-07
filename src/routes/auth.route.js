const express = require('express');
const authController = require('../controllers/auth.controller');
const authValidator = require('../validations/auth.validator');
const validate = require('../middlewares/validate.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/login', authValidator.loginValidator, validate, authController.login);
router.post('/refresh', authValidator.refreshTokenValidator, validate, authController.refresh);
router.post('/logout', authMiddleware, authValidator.logoutValidator, validate, authController.logout);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
