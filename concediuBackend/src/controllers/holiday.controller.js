const { Holiday } = require('../models');
const AppError = require('../utils/AppError');

exports.getAll = async (req, res, next) => {
  try {
    const { year } = req.query;
    const filter = {};

    if (year) {
      const startOfYear = new Date(parseInt(year), 0, 1);
      const endOfYear = new Date(parseInt(year), 11, 31);
      filter.$or = [
        { date: { $gte: startOfYear, $lte: endOfYear } },
        { recurring: true },
      ];
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
    const holiday = await Holiday.create(req.body);
    res.status(201).json({ data: holiday });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, {
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
