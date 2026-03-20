const { body, param, query } = require('express-validator');

const createLeaveRequestValidation = [
  body('leaveTypeId').isMongoId().withMessage('Valid leave type ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('reason').optional().trim().isLength({ max: 500 }),
];

const updateLeaveStatusValidation = [
  param('id').isMongoId().withMessage('Invalid leave request ID'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected'),
  body('rejectionReason')
    .if(body('status').equals('rejected'))
    .notEmpty()
    .withMessage('Rejection reason is required when rejecting'),
];

const listLeaveRequestsValidation = [
  query('year').optional().isInt({ min: 2000, max: 2100 }),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = {
  createLeaveRequestValidation,
  updateLeaveStatusValidation,
  listLeaveRequestsValidation,
};
