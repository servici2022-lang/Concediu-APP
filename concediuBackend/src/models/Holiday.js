const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Holiday date is required'],
    },
    recurring: {
      type: Boolean,
      default: true,
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

holidaySchema.index({ date: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
