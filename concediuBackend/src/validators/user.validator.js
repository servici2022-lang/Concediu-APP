const { body, param } = require('express-validator');

const updateUserValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Invalid role'),
  body('isActive').optional().isBoolean(),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

module.exports = { updateUserValidation, changePasswordValidation };
