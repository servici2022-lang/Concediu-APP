const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginValidation, registerValidation } = require('../validators/auth.validator');

router.post('/login', validate(loginValidation), authController.login);
router.post('/register', authenticate, authorize('admin'), validate(registerValidation), authController.register);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
