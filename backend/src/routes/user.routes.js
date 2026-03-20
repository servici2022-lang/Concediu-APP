const router = require('express').Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  updateUserValidation,
  changePasswordValidation,
} = require('../validators/user.validator');

// All routes require authentication
router.use(authenticate);

// Change own password
router.put('/change-password', validate(changePasswordValidation), userController.changePassword);

// Admin-only routes
router.get('/', authorize('admin', 'manager'), userController.getAll);
router.get('/:id', authorize('admin', 'manager'), userController.getById);
router.put('/:id', authorize('admin'), validate(updateUserValidation), userController.update);
router.delete('/:id', authorize('admin'), userController.delete);

module.exports = router;
