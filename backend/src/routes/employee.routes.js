const router = require('express').Router();
const employeeController = require('../controllers/employee.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createEmployeeValidation,
  updateEmployeeValidation,
} = require('../validators/employee.validator');

router.use(authenticate);

// Get departments list (all authenticated users)
router.get('/departments', employeeController.getDepartments);

// Get employee by user ID (for profile)
router.get('/by-user/:userId', employeeController.getByUserId);

// Get leave balance
router.get('/:id/balance', employeeController.getBalance);

// CRUD - admin/manager
router.get('/', authorize('admin', 'manager'), employeeController.getAll);
router.get('/:id', employeeController.getById);
router.post('/', authorize('admin'), validate(createEmployeeValidation), employeeController.create);
router.put('/:id', authorize('admin'), validate(updateEmployeeValidation), employeeController.update);
router.delete('/:id', authorize('admin'), employeeController.delete);

module.exports = router;
