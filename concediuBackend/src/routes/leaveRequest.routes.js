const router = require('express').Router();
const leaveRequestController = require('../controllers/leaveRequest.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createLeaveRequestValidation,
  updateLeaveStatusValidation,
  listLeaveRequestsValidation,
} = require('../validators/leaveRequest.validator');

router.use(authenticate);

// Stats (admin/manager)
router.get('/stats', authorize('admin', 'manager'), leaveRequestController.getStats);

// Calculate working days (utility endpoint)
router.get('/calculate-days', leaveRequestController.calculateDays);

// CRUD
router.get('/', validate(listLeaveRequestsValidation), leaveRequestController.getAll);
router.get('/:id', leaveRequestController.getById);
router.post('/', validate(createLeaveRequestValidation), leaveRequestController.create);

// Approve/Reject (admin/manager only)
router.put(
  '/:id/status',
  authorize('admin', 'manager'),
  validate(updateLeaveStatusValidation),
  leaveRequestController.updateStatus
);

// Cancel (own request or admin)
router.put('/:id/cancel', leaveRequestController.cancel);

module.exports = router;
