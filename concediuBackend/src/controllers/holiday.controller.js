const { Holiday } = require('../models');
const { startOfLocalDay, localYearRange } = require('../utils/dateUtils');
const AppError = require('../utils/AppError');

exports.getAll = async (req, res, next) => {
  try {
    const { year } = req.query;
    const filter = {};

    if (year) {
      const { start, end } = localYearRange(parseInt(year));
      filter.$or = [{ date: { $gte: start, $lte: end } }, { recurring: true }];
    }

    const holidays = await Holiday.find(filter).sort({ date: 1 });
    res.json({ data: holidays });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      throw new AppError('Holiday not found', 404);
    }
    res.json({ data: holiday });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const holiday = await Holiday.create({
      ...req.body,
      date: startOfLocalDay(req.body.date),
    });
    res.status(201).json({ data: holiday });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.date) {
      updateData.date = startOfLocalDay(updateData.date);
    }

    const holiday = await Holiday.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!holiday) {
      throw new AppError('Holiday not found', 404);
    }
    res.json({ data: holiday });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) {
      throw new AppError('Holiday not found', 404);
    }
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    next(error);
  }
};
