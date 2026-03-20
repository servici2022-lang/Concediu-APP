const mongoose = require('mongoose');
const { DEFAULT_LEAVE_DAYS } = require('../config/constants');

const employeeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    hireDate: {
      type: Date,
      required: [true, 'Hire date is required'],
    },
    totalLeaveDays: {
      type: Number,
      default: DEFAULT_LEAVE_DAYS,
      min: 0,
    },
    phone: {
      type: String,
      trim: true,
    },
    cnp: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

employeeSchema.index({ manager: 1 });
employeeSchema.index({ department: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
