const { LeaveType } = require('../models');
const AppError = require('../utils/AppError');

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;

    const leaveTypes = await LeaveType.find(filter).sort({ name: 1 });
    res.json({ data: leaveTypes });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const leaveType = await LeaveType.findById(req.params.id);
    if (!leaveType) {
      throw new AppError('Leave type not found', 404);
    }
    res.json({ data: leaveType });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const leaveType = await LeaveType.create(req.body);
    res.status(201).json({ data: leaveType });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const leaveType = await LeaveType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!leaveType) {
      throw new AppError('Leave type not found', 404);
    }
    res.json({ data: leaveType });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    // Soft delete
    const leaveType = await LeaveType.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!leaveType) {
      throw new AppError('Leave type not found', 404);
    }
    res.json({ message: 'Leave type deactivated', data: leaveType });
  } catch (error) {
    next(error);
  }
};
