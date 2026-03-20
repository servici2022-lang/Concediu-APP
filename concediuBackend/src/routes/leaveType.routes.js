const router = require('express').Router();
const leaveTypeController = require('../controllers/leaveType.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createLeaveTypeValidation,
  updateLeaveTypeValidation,
} = require('../validators/leaveType.validator');

router.use(authenticate);

router.get('/', leaveTypeController.getAll);
router.get('/:id', leaveTypeController.getById);
router.post('/', authorize('admin'), validate(createLeaveTypeValidation), leaveTypeController.create);
router.put('/:id', authorize('admin'), validate(updateLeaveTypeValidation), leaveTypeController.update);
router.delete('/:id', authorize('admin'), leaveTypeController.delete);

module.exports = router;
