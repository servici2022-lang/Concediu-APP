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

  const holidays = await Holiday.find({
    date: { $gte: start, $lte: end },
  });

  const holidaySet = new Set(
    holidays.map((h) => h.date.toISOString().split('T')[0])
  );

  const recurringHolidays = await Holiday.find({ recurring: true });
  const year = start.getFullYear();
  const endYear = end.getFullYear();

  for (const rh of recurringHolidays) {
    const rhDate = new Date(rh.date);
    for (let y = year; y <= endYear; y++) {
      const recurringDate = new Date(Date.UTC(y, rhDate.getUTCMonth(), rhDate.getUTCDate()));
      if (recurringDate >= start && recurringDate <= end) {
        holidaySet.add(recurringDate.toISOString().split('T')[0]);
      }
    }
  }

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getUTCDay();
    const dateStr = current.toISOString().split('T')[0];

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
      workingDays++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return workingDays;
};

/**
 * Extract local date parts (Europe/Bucharest timezone set via process.env.TZ).
 */
const getLocalDateParts = (date) => {
  const d = new Date(date);
  return {
    year: d.getFullYear(),
    month: d.getMonth(), // 0-based
    day: d.getDate(),
  };
};

/**
 * Calculate prorated leave days for a calendar year based on hire date.
 * Prorated by remaining months from hire month.
 * Formula: totalLeaveDays * remainingMonths / 12 (exact, 2 decimals).
 * E.g., hired 1 Oct: 21 * 3/12 = 5.25 days
 */
const getDaysForYear = (hireDate, totalLeaveDays, year) => {
  const { year: hireYear, month: hireMonth } = getLocalDateParts(hireDate);

  if (year < hireYear) return 0;

  // Year of hire: prorate by remaining months (including hire month)
  if (year === hireYear) {
    const remainingMonths = 12 - hireMonth;
    return Math.round(totalLeaveDays * remainingMonths / 12);
  }

  // Full year
  return totalLeaveDays;
};

/**
 * Get used leave days (approved) for a calendar year.
 */
const getUsedDaysForYear = async (employeeId, year) => {
  const { LeaveRequest } = require('../models');
  const { LEAVE_STATUS } = require('../config/constants');

  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const endOfYear = new Date(Date.UTC(year, 11, 31));

  const approvedLeaves = await LeaveRequest.find({
    employee: employeeId,
    status: LEAVE_STATUS.APPROVED,
    startDate: { $gte: startOfYear, $lte: endOfYear },
  }).populate('leaveType');

  return approvedLeaves
    .filter((l) => l.leaveType && l.leaveType.deductsFromAllowance)
    .reduce((sum, l) => sum + l.workingDays, 0);
};

/**
 * Get the complete leave balance for an employee.
 * Calendar year based (Jan 1 - Dec 31).
 * Includes carryover from previous year (unused days).
 */
const getLeaveBalance = async (employeeId, year) => {
  const { LeaveRequest, Employee } = require('../models');
  const { LEAVE_STATUS } = require('../config/constants');

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  const currentYear = year || new Date().getFullYear();
  const hireDate = employee.hireDate;
  const hireYear = new Date(hireDate).getUTCFullYear();

  const periodStart = new Date(Date.UTC(currentYear, 0, 1));
  const periodEnd = new Date(Date.UTC(currentYear, 11, 31));

  // Days for current year (prorated if hired this year)
  const currentYearDays = getDaysForYear(hireDate, employee.totalLeaveDays, currentYear);

  // Carryover: unused days from previous year
  let carryoverDays = 0;
  if (currentYear > hireYear) {
    const prevYearDays = getDaysForYear(hireDate, employee.totalLeaveDays, currentYear - 1);
    const prevYearUsed = await getUsedDaysForYear(employeeId, currentYear - 1);
    carryoverDays = Math.max(0, prevYearDays - prevYearUsed);
  }

  const totalDays = currentYearDays + carryoverDays;

  // Current year usage
  const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
  const endOfYear = new Date(Date.UTC(currentYear, 11, 31));

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

  const usedDays = approvedLeaves
    .filter((l) => l.leaveType && l.leaveType.deductsFromAllowance)
    .reduce((sum, l) => sum + l.workingDays, 0);

  const pendingDays = pendingLeaves
    .filter((l) => l.leaveType && l.leaveType.deductsFromAllowance)
    .reduce((sum, l) => sum + l.workingDays, 0);

  return {
    year: currentYear,
    currentYearDays,
    carryoverDays,
    totalDays,
    usedDays,
    pendingDays,
    periodStart,
    periodEnd,
  };
};

module.exports = { calculateWorkingDays, getLeaveBalance };
