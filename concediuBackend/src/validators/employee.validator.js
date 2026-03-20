const { body, param } = require('express-validator');

const createEmployeeValidation = [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('position').trim().notEmpty().withMessage('Position is required'),
  body('hireDate').isISO8601().withMessage('Valid hire date is required'),
  body('manager').optional().isMongoId().withMessage('Invalid manager ID'),
  body('totalLeaveDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total leave days must be a positive number'),
  body('phone').optional().trim(),
  body('cnp').optional().trim(),
];

const updateEmployeeValidation = [
  param('id').isMongoId().withMessage('Invalid employee ID'),
  body('department').optional().trim().notEmpty(),
  body('position').optional().trim().notEmpty(),
  body('hireDate').optional().isISO8601(),
  body('manager').optional({ values: 'null' }).isMongoId(),
  body('totalLeaveDays').optional().isInt({ min: 0 }),
  body('phone').optional().trim(),
  body('cnp').optional().trim(),
];

module.exports = { createEmployeeValidation, updateEmployeeValidation };
