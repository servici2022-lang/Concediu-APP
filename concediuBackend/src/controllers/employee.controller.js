const { Employee, User, LeaveRequest } = require('../models');
const { ROLES } = require('../config/constants');
const { getLeaveBalance } = require('../utils/leaveCalculator');
const { startOfLocalDay } = require('../utils/dateUtils');
const { assertCanAccessEmployee, employeeForViewer } = require('../utils/access');
const { parsePagination, paginationMeta, escapeRegex } = require('../utils/query');
const AppError = require('../utils/AppError');

exports.getAll = async (req, res, next) => {
  try {
    const { department, search } = req.query;
    const pagination = parsePagination(req.query);
    const filter = {};

    if (department) filter.department = department;

    // If manager, only show their direct reports
    if (req.user.role === ROLES.MANAGER) {
      filter.manager = req.user._id;
    }

    // Căutarea se face în baza de date, înainte de paginare: filtrată după paginare
    // găsea doar angajații de pe pagina curentă.
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      const userIds = await User.find({
        $or: [{ firstName: pattern }, { lastName: pattern }, { email: pattern }],
      }).distinct('_id');
      filter.user = { $in: userIds };
    }

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate('user', 'firstName lastName email role isActive')
        .populate('manager', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Employee.countDocuments(filter),
    ]);

    res.json({
      data: employees.map((e) => employeeForViewer(req.user, e)),
      pagination: paginationMeta(pagination, total),
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

    assertCanAccessEmployee(req.user, employee);

    res.json({ data: employeeForViewer(req.user, employee) });
  } catch (error) {
    next(error);
  }
};

exports.getByUserId = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.params.userId })
      .populate('user', 'firstName lastName email role isActive')
      .populate('manager', 'firstName lastName email');

    assertCanAccessEmployee(req.user, employee, 'Employee profile not found');

    res.json({ data: employeeForViewer(req.user, employee) });
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

    if (manager && manager.toString() === userId.toString()) {
      throw new AppError('An employee cannot be their own manager', 400);
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
      hireDate: startOfLocalDay(hireDate),
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

    const current = await Employee.findById(req.params.id);
    if (!current) {
      throw new AppError('Employee not found', 404);
    }

    // Un angajat care e propriul manager și-ar putea aproba singur cererile.
    if (manager && manager.toString() === current.user.toString()) {
      throw new AppError('An employee cannot be their own manager', 400);
    }

    const updateData = {};

    if (department) updateData.department = department;
    if (position) updateData.position = position;
    if (hireDate) updateData.hireDate = startOfLocalDay(hireDate);
    if (manager !== undefined) updateData.manager = manager || null;
    if (totalLeaveDays !== undefined) updateData.totalLeaveDays = totalLeaveDays;
    if (phone !== undefined) updateData.phone = phone;
    if (cnp !== undefined) updateData.cnp = cnp;

    const employee = await Employee.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: 'after',
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
    // Un profil cu cereri de concediu nu se șterge: cererile ar rămâne fără angajat,
    // iar anularea, exportul PDF și aprobarea lor ar da erori.
    const hasRequests = await LeaveRequest.exists({ employee: req.params.id });
    if (hasRequests) {
      throw new AppError(
        'This employee has leave requests and cannot be deleted. Deactivate their user account instead.',
        409
      );
    }

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
    assertCanAccessEmployee(req.user, employee);

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
    // Managerul vede soldurile subordonaților și pe al lui, nu ale întregii firme.
    const filter =
      req.user.role === ROLES.MANAGER
        ? { $or: [{ manager: req.user._id }, { user: req.user._id }] }
        : {};
    const employees = await Employee.find(filter)
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
