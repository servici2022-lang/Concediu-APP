const { Holiday } = require('../models');
const { toDateKey, localDayAnchor, localYearRange } = require('./dateUtils');

/**
 * Sărbătorile legale dintr-un interval, ca Map<'YYYY-MM-DD', nume>.
 * Cele marcate `recurring` se proiectează pe fiecare an atins de interval.
 *
 * Sursă unică pentru numărarea zilelor lucrătoare și pentru afișarea în calendar,
 * ca ambele să vadă exact aceleași zile libere.
 */
const getHolidaysInRange = async (startDate, endDate) => {
  const start = localDayAnchor(startDate);
  const end = localDayAnchor(endDate);

  // Marjă de o zi în ambele capete: sărbătorile din zilele de la margine pot fi
  // stocate ca miezul nopții local, adică înaintea ancorei de la ora 12.
  const queryStart = new Date(start);
  queryStart.setDate(queryStart.getDate() - 1);
  const queryEnd = new Date(end);
  queryEnd.setDate(queryEnd.getDate() + 1);

  const [fixedHolidays, recurringHolidays] = await Promise.all([
    Holiday.find({ date: { $gte: queryStart, $lte: queryEnd } }),
    Holiday.find({ recurring: true }),
  ]);

  const holidays = new Map();

  for (const h of fixedHolidays) {
    holidays.set(toDateKey(h.date), h.name);
  }

  for (const rh of recurringHolidays) {
    const rhDate = new Date(rh.date);
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      const projected = localDayAnchor(new Date(y, rhDate.getMonth(), rhDate.getDate()));
      if (projected >= start && projected <= end) {
        holidays.set(toDateKey(projected), rh.name);
      }
    }
  }

  return holidays;
};

/**
 * Calculate the number of working days between two dates (both inclusive),
 * excluding weekends (Saturday, Sunday) and public holidays.
 *
 * Zilele sunt comparate în calendarul local (vezi dateUtils): o dată salvată ca
 * miezul nopții local reprezintă ziua următoare în UTC, deci citirea în UTC ar
 * deplasa tot intervalul cu o zi înapoi.
 */
const calculateWorkingDays = async (startDate, endDate) => {
  const start = localDayAnchor(startDate);
  const end = localDayAnchor(endDate);

  if (start > end) {
    throw new Error('Start date must be before or equal to end date');
  }

  const holidays = await getHolidaysInRange(start, end);

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(toDateKey(current))) {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
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

  const { start: startOfYear, end: endOfYear } = localYearRange(year);

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
  const hireYear = new Date(hireDate).getFullYear();

  const { start: periodStart, end: periodEnd } = localYearRange(currentYear);

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
  const { start: startOfYear, end: endOfYear } = localYearRange(currentYear);

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

module.exports = { calculateWorkingDays, getLeaveBalance, getHolidaysInRange };
