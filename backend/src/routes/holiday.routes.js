const router = require('express').Router();
const holidayController = require('../controllers/holiday.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createHolidayValidation,
  updateHolidayValidation,
} = require('../validators/holiday.validator');

router.use(authenticate);

router.get('/', holidayController.getAll);
router.get('/:id', holidayController.getById);
router.post('/', authorize('admin'), validate(createHolidayValidation), holidayController.create);
router.put('/:id', authorize('admin'), validate(updateHolidayValidation), holidayController.update);
router.delete('/:id', authorize('admin'), holidayController.delete);

module.exports = router;
