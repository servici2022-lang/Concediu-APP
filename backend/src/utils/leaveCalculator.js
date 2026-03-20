const { Holiday } = require('../models');

/**
 * Calculate the number of working days between two dates,
 * excluding weekends (Saturday, Sunday) and public holidays.
 */
const calculateWorkingDays = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new Error('Start date must be before or equal to end date');
  }

  // Fetch holidays in the date range
  const holidays = await Holiday.find({
    date: { $gte: start, $lte: end },
  });

  const holidaySet = new Set(
    holidays.map((h) => h.date.toISOString().split('T')[0])
  );

  // Also handle recurring holidays by checking month/day for the year range
  const recurringHolidays = await Holiday.find({ recurring: true });
  const year = start.getFullYear();
  const endYear = end.getFullYear();

  for (const rh of recurringHolidays) {
    const rhDate = new Date(rh.date);
    for (let y = year; y <= endYear; y++) {
      const recurringDate = new Date(y, rhDate.getMonth(), rhDate.getDate());
      if (recurringDate >= start && recurringDate <= end) {
        holidaySet.add(recurringDate.toISOString().split('T')[0]);
      }
    }
  }

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];

    // Skip weekends (0 = Sunday, 6 = Saturday) and holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
};

/**
 * Get the leave balance for an employee in a given year.
 */
const getLeaveBalance = async (employeeId, year) => {
  const { LeaveRequest } = require('../models');
  const { LEAVE_STATUS } = require('../config/constants');

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  const approvedLeaves = await LeaveRequest.find({
    employee: employeeId,
    status: LEAVE_STATUS.APPROVED,
    startDate: { $gte: startOfYear, $lte: endOfYear },
  }).populate('leaveType');

  const pendingLeaves = await LeaveRequest.find({
    employee: employeeId,
    status: LEAVE_STATUS.PENDING,
    startDate: { $gte: startOfYear, $lte: endOfYear },
  }).populate('leaveType');

  // Only count leaves that deduct from allowance
  const usedDays = approvedLeaves
    .filter((l) => l.leaveType.deductsFromAllowance)
    .reduce((sum, l) => sum + l.workingDays, 0);

  const pendingDays = pendingLeaves
    .filter((l) => l.leaveType.deductsFromAllowance)
    .reduce((sum, l) => sum + l.workingDays, 0);

  return { usedDays, pendingDays };
};

module.exports = { calculateWorkingDays, getLeaveBalance };
