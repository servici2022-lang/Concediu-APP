const { body, param } = require('express-validator');

const createLeaveTypeValidation = [
  body('name').trim().notEmpty().withMessage('Leave type name is required'),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Invalid color hex'),
  body('isPaid').optional().isBoolean(),
  body('deductsFromAllowance').optional().isBoolean(),
];

const updateLeaveTypeValidation = [
  param('id').isMongoId().withMessage('Invalid leave type ID'),
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/),
  body('isPaid').optional().isBoolean(),
  body('deductsFromAllowance').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
];

module.exports = { createLeaveTypeValidation, updateLeaveTypeValidation };
