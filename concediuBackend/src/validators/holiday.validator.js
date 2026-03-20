const { body, param } = require('express-validator');

const createHolidayValidation = [
  body('name').trim().notEmpty().withMessage('Holiday name is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('recurring').optional().isBoolean(),
];

const updateHolidayValidation = [
  param('id').isMongoId().withMessage('Invalid holiday ID'),
  body('name').optional().trim().notEmpty(),
  body('date').optional().isISO8601(),
  body('recurring').optional().isBoolean(),
];

module.exports = { createHolidayValidation, updateHolidayValidation };
