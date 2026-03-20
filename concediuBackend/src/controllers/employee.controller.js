const { Employee, User } = require('../models');
const { getLeaveBalance } = require('../utils/leaveCalculator');
const AppError = require('../utils/AppError');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, department, search } = req.query;
    const filter = {};

    if (department) filter.department = department;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = Employee.find(filter)
      .populate('user', 'firstName lastName email role isActive')
      .populate('manager', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // If manager, only show their direct reports
    if (req.user.role === 'manager') {
      filter.manager = req.user._id;
    }

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate('user', 'firstName lastName email role isActive')
        .populate('manager', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Employee.countDocuments(filter),
    ]);

    // If search, filter populated results
    let filtered = employees;
    if (search) {
      const s = search.toLowerCase();
      filtered = employees.filter(
        (e) =>
          e.user?.firstName?.toLowerCase().includes(s) ||
          e.user?.lastName?.toLowerCase().includes(s) ||
          e.user?.email?.toLowerCase().includes(s)
      );
    }

    res.json({
      data: filtered,
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
    const employee = await Employee.findById(req.params.id)
      .populate('user', 'firstName lastName email role isActive')
      .populate('manager', 'firstName lastName email');

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    res.json({ data: employee });
  } catch (error) {
    next(error);
  }
};

exports.getByUserId = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.params.userId })
      .populate('user', 'firstName lastName email role isActive')
      .populate('manager', 'firstName lastName email');

    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    res.json({ data: employee });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { userId, department, position, hireDate, manager, totalLeaveDays, phone, cnp } =
      req.body;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if employee profile already exists
    const existing = await Employee.findOne({ user: userId });
    if (existing) {
      throw new AppError('Employee profile already exists for this user', 409);
    }

    const employee = await Employee.create({
      user: userId,
      department,
      position,
      hireDate,
      manager: manager || null,
      totalLeaveDays,
      phone,
      cnp,
    });

    const populated = await employee.populate([
      { path: 'user', select: 'firstName lastName email role isActive' },
      { path: 'manager', select: 'firstName lastName email' },
    ]);

    res.status(201).json({ data: populated });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { department, position, hireDate, manager, totalLeaveDays, phone, cnp } =
      req.body;
    const updateData = {};

    if (department) updateData.department = department;
    if (position) updateData.position = position;
    if (hireDate) updateData.hireDate = hireDate;
    if (manager !== undefined) updateData.manager = manager || null;
    if (totalLeaveDays !== undefined) updateData.totalLeaveDays = totalLeaveDays;
    if (phone !== undefined) updateData.phone = phone;
    if (cnp !== undefined) updateData.cnp = cnp;

    const employee = await Employee.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('user', 'firstName lastName email role isActive')
      .populate('manager', 'firstName lastName email');

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    res.json({ data: employee });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    res.json({ message: 'Employee profile deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getBalance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const year = req.query.year ? parseInt(req.query.year) : null;

    const employee = await Employee.findById(id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const balance = await getLeaveBalance(id, year);

    res.json({
      data: {
        year: balance.year,
        periodStart: balance.periodStart,
        periodEnd: balance.periodEnd,
        currentYearDays: balance.currentYearDays,
        carryoverDays: balance.carryoverDays,
        totalDays: balance.totalDays,
        yearlyAllowance: employee.totalLeaveDays,
        usedDays: balance.usedDays,
        pendingDays: balance.pendingDays,
        remainingDays: balance.totalDays - balance.usedDays,
        availableDays: balance.totalDays - balance.usedDays - balance.pendingDays,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllBalances = async (req, res, next) => {
  try {
    const employees = await Employee.find({})
      .populate('user', 'firstName lastName email isActive');

    const results = [];
    for (const emp of employees) {
      if (!emp.user || !emp.user.isActive) continue;
      const balance = await getLeaveBalance(emp._id);
      results.push({
        employeeId: emp._id,
        name: `${emp.user.firstName} ${emp.user.lastName}`,
        department: emp.department,
        totalDays: balance.totalDays,
        currentYearDays: balance.currentYearDays,
        carryoverDays: balance.carryoverDays,
        usedDays: balance.usedDays,
        pendingDays: balance.pendingDays,
        remainingDays: balance.totalDays - balance.usedDays,
        availableDays: balance.totalDays - balance.usedDays - balance.pendingDays,
      });
    }

    res.json({ data: results });
  } catch (error) {
    next(error);
  }
};

exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await Employee.distinct('department');
    res.json({ data: departments });
  } catch (error) {
    next(error);
  }
};
