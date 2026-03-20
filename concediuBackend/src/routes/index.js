const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/employees', require('./employee.routes'));
router.use('/leave-types', require('./leaveType.routes'));
router.use('/holidays', require('./holiday.routes'));
router.use('/leave-requests', require('./leaveRequest.routes'));

module.exports = router;
