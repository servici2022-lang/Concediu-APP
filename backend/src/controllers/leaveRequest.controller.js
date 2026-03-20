const { LeaveRequest, Employee, LeaveType } = require('../models');
const { LEAVE_STATUS, ROLES } = require('../config/constants');
const { calculateWorkingDays, getLeaveBalance } = require('../utils/leaveCalculator');
const AppError = require('../utils/AppError');

exports.getAll = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      year,
      employeeId,
      leaveTypeId,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (employeeId) filter.employee = employeeId;
    if (leaveTypeId) filter.leaveType = leaveTypeId;

    if (year) {
      const y = parseInt(year);
      filter.startDate = {
        $gte: new Date(y, 0, 1),
        $lte: new Date(y, 11, 31),
      };
    }

    // Non-admin/manager users can only see their own requests
    if (req.user.role === ROLES.EMPLOYEE) {
      const employee = await Employee.findOne({ user: req.user._id });
      if (!employee) {
        throw new AppError('Employee profile not found', 404);
      }
      filter.employee = employee._id;
    }

    // Managers see their direct reports' requests
    if (req.user.role === ROLES.MANAGER) {
      const directReports = await Employee.find({ manager: req.user._id });
      const ownEmployee = await Employee.findOne({ user: req.user._id });
      const employeeIds = directReports.map((e) => e._id);
      if (ownEmployee) employeeIds.push(ownEmployee._id);
      filter.employee = { $in: employeeIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate({
          path: 'employee',
          populate: { path: 'user', select: 'firstName lastName email' },
        })
        .populate('leaveType', 'name color isPaid deductsFromAllowance')
        .populate('approvedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LeaveRequest.countDocuments(filter),
    ]);

    res.json({
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id)
      .populate({
        path: 'employee',
        populate: { path: 'user', select: 'firstName lastName email' },
      })
      .populate('leaveType', 'name color isPaid deductsFromAllowance')
      .populate('approvedBy', 'firstName lastName');

    if (!request) {
      throw new AppError('Leave request not found', 404);
    }

    res.json({ data: request });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { leaveTypeId, startDate, endDate, reason } = req.body;

    // Find employee profile for current user
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      throw new AppError('Employee profile not found. Contact your administrator.', 404);
    }

    // Verify leave type exists and is active
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType || !leaveType.isActive) {
      throw new AppError('Invalid or inactive leave type', 400);
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      throw new AppError('Start date must be before or equal to end date', 400);
    }

    // Calculate working days (backend calculation)
    const workingDays = await calculateWorkingDays(start, end);
    if (workingDays === 0) {
      throw new AppError(
        'No working days in the selected range (weekends/holidays only)',
        400
      );
    }

    // Check balance if leave type deducts from allowance
    if (leaveType.deductsFromAllowance) {
      const year = start.getFullYear();
      const { usedDays, pendingDays } = await getLeaveBalance(employee._id, year);
      const available = employee.totalLeaveDays - usedDays - pendingDays;

      if (workingDays > available) {
        throw new AppError(
          `Insufficient leave balance. Available: ${available} days, Requested: ${workingDays} days`,
          400
        );
      }
    }

    // Check for overlapping requests
    const overlapping = await LeaveRequest.findOne({
      employee: employee._id,
      status: { $in: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      throw new AppError('Overlapping leave request exists for this period', 409);
    }

    const leaveRequest = await LeaveRequest.create({
      employee: employee._id,
      leaveType: leaveTypeId,
      startDate: start,
      endDate: end,
      workingDays,
      reason,
    });

    const populated = await leaveRequest.populate([
      {
        path: 'employee',
        populate: { path: 'user', select: 'firstName lastName email' },
      },
      { path: 'leaveType', select: 'name color isPaid deductsFromAllowance' },
    ]);

    res.status(201).json({ data: populated });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    const leaveRequest = await LeaveRequest.findById(req.params.id).populate(
      'employee'
    );

    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    if (leaveRequest.status !== LEAVE_STATUS.PENDING) {
      throw new AppError('Only pending requests can be approved/rejected', 400);
    }

    // Managers can only approve their direct reports
    if (req.user.role === ROLES.MANAGER) {
      if (
        !leaveRequest.employee.manager ||
        leaveRequest.employee.manager.toString() !== req.user._id.toString()
      ) {
        throw new AppError('You can only manage your direct reports', 403);
      }
    }

    leaveRequest.status = status;
    leaveRequest.approvedBy = req.user._id;
    leaveRequest.approvedAt = new Date();
    if (status === LEAVE_STATUS.REJECTED) {
      leaveRequest.rejectionReason = rejectionReason;
    }

    await leaveRequest.save();

    const populated = await leaveRequest.populate([
      {
        path: 'employee',
        populate: { path: 'user', select: 'firstName lastName email' },
      },
      { path: 'leaveType', select: 'name color isPaid deductsFromAllowance' },
      { path: 'approvedBy', select: 'firstName lastName' },
    ]);

    res.json({ data: populated });
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    // Only the owner or admin can cancel
    const employee = await Employee.findById(leaveRequest.employee);
    if (
      employee.user.toString() !== req.user._id.toString() &&
      req.user.role !== ROLES.ADMIN
    ) {
      throw new AppError('You can only cancel your own requests', 403);
    }

    if (
      leaveRequest.status !== LEAVE_STATUS.PENDING &&
      leaveRequest.status !== LEAVE_STATUS.APPROVED
    ) {
      throw new AppError('Only pending or approved requests can be cancelled', 400);
    }

    leaveRequest.status = LEAVE_STATUS.CANCELLED;
    await leaveRequest.save();

    res.json({ data: leaveRequest });
  } catch (error) {
    next(error);
  }
};

exports.calculateDays = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }

    const workingDays = await calculateWorkingDays(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({ data: { startDate, endDate, workingDays } });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const dateFilter = {
      startDate: { $gte: startOfYear, $lte: endOfYear },
    };

    const [totalPending, totalApproved, totalRejected, totalCancelled] =
      await Promise.all([
        LeaveRequest.countDocuments({ ...dateFilter, status: LEAVE_STATUS.PENDING }),
        LeaveRequest.countDocuments({ ...dateFilter, status: LEAVE_STATUS.APPROVED }),
        LeaveRequest.countDocuments({ ...dateFilter, status: LEAVE_STATUS.REJECTED }),
        LeaveRequest.countDocuments({ ...dateFilter, status: LEAVE_STATUS.CANCELLED }),
      ]);

    // People on leave today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const onLeaveToday = await LeaveRequest.find({
      status: LEAVE_STATUS.APPROVED,
      startDate: { $lte: today },
      endDate: { $gte: today },
    }).populate({
      path: 'employee',
      populate: { path: 'user', select: 'firstName lastName' },
    });

    res.json({
      data: {
        year,
        pending: totalPending,
        approved: totalApproved,
        rejected: totalRejected,
        cancelled: totalCancelled,
        onLeaveToday: onLeaveToday.map((l) => ({
          name: `${l.employee?.user?.firstName} ${l.employee?.user?.lastName}`,
          endDate: l.endDate,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
