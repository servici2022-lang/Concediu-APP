const path = require('path');
const PDFDocument = require('pdfkit');
const { LeaveRequest, Employee, LeaveType } = require('../models');
const { LEAVE_STATUS, ROLES } = require('../config/constants');
const {
  calculateWorkingDays,
  getLeaveBalance,
  getHolidaysInRange,
} = require('../utils/leaveCalculator');
const {
  startOfLocalDay,
  endOfLocalDay,
  localYearRange,
} = require('../utils/dateUtils');
const { assertCanAccessEmployee } = require('../utils/access');
const { parsePagination, paginationMeta } = require('../utils/query');
const AppError = require('../utils/AppError');

// Datele de angajat din cereri nu includ CNP-ul și telefonul: listele nu au nevoie de ele.
const EMPLOYEE_POPULATE = {
  path: 'employee',
  select: '-cnp -phone',
  populate: { path: 'user', select: 'firstName lastName email' },
};

// Cel mai lung interval acceptat (cereri, calcul de zile, calendar). Fără limită,
// un interval de mii de ani bloca serverul în bucla zi cu zi.
const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Interval de zile calendaristice din input, validat: date reale, în ordine, nu prea lung. */
const parseRange = (startInput, endInput) => {
  if (!startInput || !endInput) {
    throw new AppError('Start date and end date are required', 400);
  }
  const start = startOfLocalDay(startInput);
  const end = startOfLocalDay(endInput);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError('Invalid date', 400);
  }
  if (start > end) {
    throw new AppError('Start date must be before or equal to end date', 400);
  }
  if (Math.round((end - start) / DAY_MS) + 1 > MAX_RANGE_DAYS) {
    throw new AppError(`The period cannot be longer than ${MAX_RANGE_DAYS} days`, 400);
  }
  return { start, end };
};

/** Id-urile de angajat pe care le vede un manager: subordonații direcți și el însuși. */
const managerScopeIds = async (user) => {
  const [directReports, ownEmployee] = await Promise.all([
    Employee.find({ manager: user._id }).select('_id'),
    Employee.findOne({ user: user._id }).select('_id'),
  ]);
  const ids = directReports.map((e) => e._id);
  if (ownEmployee) ids.push(ownEmployee._id);
  return ids;
};

// Cereri trimise în paralel de același angajat (ex. dublu-click) se procesează pe rând,
// ca verificarea de sold și de suprapunere să vadă și cererea abia creată.
const employeeLocks = new Map();
const withEmployeeLock = async (key, fn) => {
  const previous = employeeLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => (release = resolve));
  const chain = previous.then(() => current);
  employeeLocks.set(key, chain);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (employeeLocks.get(key) === chain) employeeLocks.delete(key);
  }
};

/** Cererea cu angajatul populat, doar dacă utilizatorul are voie s-o vadă. */
const findAccessibleRequest = async (req, populateExtra = []) => {
  let query = LeaveRequest.findById(req.params.id).populate(EMPLOYEE_POPULATE);
  for (const p of populateExtra) query = query.populate(p);
  const request = await query;
  if (!request || !request.employee) {
    throw new AppError('Leave request not found', 404);
  }
  assertCanAccessEmployee(req.user, request.employee, 'Leave request not found');
  return request;
};

exports.getAll = async (req, res, next) => {
  try {
    const { status, year, employeeId, leaveTypeId } = req.query;
    const pagination = parsePagination(req.query);

    const filter = {};
    if (status) filter.status = status;
    if (employeeId) filter.employee = employeeId;
    if (leaveTypeId) filter.leaveType = leaveTypeId;

    if (year) {
      const { start, end } = localYearRange(parseInt(year));
      filter.startDate = { $gte: start, $lte: end };
    }

    // Non-admin/manager users can only see their own requests
    if (req.user.role === ROLES.EMPLOYEE) {
      const employee = await Employee.findOne({ user: req.user._id });
      if (!employee) {
        throw new AppError('Employee profile not found', 404);
      }
      filter.employee = employee._id;
    }

    // Managers see their direct reports' requests (and their own)
    if (req.user.role === ROLES.MANAGER) {
      const employeeIds = await managerScopeIds(req.user);
      filter.employee = employeeId
        ? employeeIds.find((id) => id.toString() === employeeId) || { $in: [] }
        : { $in: employeeIds };
    }

    const [requests, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate(EMPLOYEE_POPULATE)
        .populate('leaveType', 'name color isPaid deductsFromAllowance')
        .populate('approvedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      LeaveRequest.countDocuments(filter),
    ]);

    res.json({ data: requests, pagination: paginationMeta(pagination, total) });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const request = await findAccessibleRequest(req, [
      { path: 'leaveType', select: 'name color isPaid deductsFromAllowance' },
      { path: 'approvedBy', select: 'firstName lastName' },
    ]);
    res.json({ data: request });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { leaveTypeId, startDate, endDate, reason } = req.body;

    // Find employee profile for current user
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      throw new AppError('Employee profile not found. Contact your administrator.', 404);
    }

    // Verify leave type exists and is active
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType || !leaveType.isActive) {
      throw new AppError('Invalid or inactive leave type', 400);
    }

    // Validate dates. Se normalizează la miezul nopții local, ca ziua salvată să fie
    // exact ziua aleasă de utilizator indiferent de forma trimisă de client.
    const { start, end } = parseRange(startDate, endDate);

    const leaveRequest = await withEmployeeLock(employee._id.toString(), async () => {
      // Calculate working days (backend calculation)
      const workingDays = await calculateWorkingDays(start, end);
      if (workingDays === 0) {
        throw new AppError(
          'No working days in the selected range (weekends/holidays only)',
          400
        );
      }

      // Check balance if leave type deducts from allowance. Soldul e pe an calendaristic,
      // deci cererea se verifică în anul ei, nu în anul curent.
      if (leaveType.deductsFromAllowance) {
        if (start.getFullYear() !== end.getFullYear()) {
          throw new AppError(
            'Leave that uses the annual allowance cannot span two calendar years. Split it into two requests (until 31 December and from 1 January).',
            400
          );
        }

        const { usedDays, pendingDays, totalDays } = await getLeaveBalance(
          employee._id,
          start.getFullYear()
        );
        const available = totalDays - usedDays - pendingDays;

        if (workingDays > available) {
          throw new AppError(
            `Insufficient leave balance for ${start.getFullYear()}. Available: ${available} days, Requested: ${workingDays} days`,
            400
          );
        }
      }

      // Check for overlapping requests. Limitele acoperă zile întregi, ca o cerere veche
      // salvată la miezul nopții UTC să fie găsită și ea.
      const overlapping = await LeaveRequest.findOne({
        employee: employee._id,
        status: { $in: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
        startDate: { $lte: endOfLocalDay(end) },
        endDate: { $gte: start },
      });

      if (overlapping) {
        throw new AppError('Overlapping leave request exists for this period', 409);
      }

      return LeaveRequest.create({
        employee: employee._id,
        leaveType: leaveTypeId,
        startDate: start,
        endDate: end,
        workingDays,
        reason,
      });
    });

    const populated = await leaveRequest.populate([
      EMPLOYEE_POPULATE,
      { path: 'leaveType', select: 'name color isPaid deductsFromAllowance' },
    ]);

    res.status(201).json({ data: populated });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    const leaveRequest = await LeaveRequest.findById(req.params.id).populate('employee');

    if (!leaveRequest || !leaveRequest.employee) {
      throw new AppError('Leave request not found', 404);
    }

    if (leaveRequest.status !== LEAVE_STATUS.PENDING) {
      throw new AppError('Only pending requests can be approved/rejected', 400);
    }

    // Managers can only approve their direct reports, never their own requests
    if (req.user.role === ROLES.MANAGER) {
      if (leaveRequest.employee.user.toString() === req.user._id.toString()) {
        throw new AppError('You cannot approve or reject your own request', 403);
      }
      if (
        !leaveRequest.employee.manager ||
        leaveRequest.employee.manager.toString() !== req.user._id.toString()
      ) {
        throw new AppError('You can only manage your direct reports', 403);
      }
    }

    // Actualizare atomică: dacă doi aprobatori acționează simultan, doar primul reușește.
    const update = {
      status,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      ...(status === LEAVE_STATUS.REJECTED && { rejectionReason }),
    };
    const updated = await LeaveRequest.findOneAndUpdate(
      { _id: leaveRequest._id, status: LEAVE_STATUS.PENDING },
      update,
      { returnDocument: 'after' }
    );
    if (!updated) {
      throw new AppError('Only pending requests can be approved/rejected', 400);
    }

    const populated = await updated.populate([
      EMPLOYEE_POPULATE,
      { path: 'leaveType', select: 'name color isPaid deductsFromAllowance' },
      { path: 'approvedBy', select: 'firstName lastName' },
    ]);

    res.json({ data: populated });
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    // Only the owner or admin can cancel
    const employee = await Employee.findById(leaveRequest.employee);
    const isOwner = employee && employee.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== ROLES.ADMIN) {
      throw new AppError('You can only cancel your own requests', 403);
    }

    if (
      leaveRequest.status !== LEAVE_STATUS.PENDING &&
      leaveRequest.status !== LEAVE_STATUS.APPROVED
    ) {
      throw new AppError('Only pending or approved requests can be cancelled', 400);
    }

    // Un concediu aprobat care a început deja (sau s-a terminat) nu mai poate fi anulat
    // de angajat: altfel zilele luate s-ar întoarce în sold. Doar adminul îl poate anula.
    if (
      leaveRequest.status === LEAVE_STATUS.APPROVED &&
      req.user.role !== ROLES.ADMIN &&
      leaveRequest.startDate <= endOfLocalDay(new Date())
    ) {
      throw new AppError(
        'This leave has already started and can no longer be cancelled. Contact an administrator.',
        400
      );
    }

    const updated = await LeaveRequest.findOneAndUpdate(
      { _id: leaveRequest._id, status: leaveRequest.status },
      { status: LEAVE_STATUS.CANCELLED },
      { returnDocument: 'after' }
    );
    if (!updated) {
      throw new AppError('The request was changed in the meantime. Refresh and try again.', 409);
    }

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

exports.calculateDays = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseRange(startDate, endDate);

    const workingDays = await calculateWorkingDays(start, end);

    res.json({ data: { startDate, endDate, workingDays } });
  } catch (error) {
    next(error);
  }
};

exports.exportPdf = async (req, res, next) => {
  try {
    const request = await findAccessibleRequest(req, [
      { path: 'leaveType', select: 'name' },
      { path: 'approvedBy', select: 'firstName lastName' },
    ]);

    if (request.status !== LEAVE_STATUS.APPROVED) {
      throw new AppError('Only approved requests can be exported', 400);
    }

    const emp = request.employee;
    const user = emp.user;
    const fullName = `${user.firstName} ${user.lastName}`;
    const formatDate = (d) => {
      const date = new Date(d);
      return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' });
    };

    const doc = new PDFDocument({ size: 'A4', margin: 60 });

    const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
    doc.registerFont('Romanian', path.join(fontsDir, 'DejaVuSans.ttf'));
    doc.registerFont('Romanian-Bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'));
    doc.font('Romanian');

    // res.attachment codifică numele fișierului (RFC 6266): diacriticele din nume
    // (ă, ș, ț) într-un header scris direct făceau exportul să crape cu 500.
    res.attachment(`cerere-concediu-${fullName.replace(/\s+/g, '-')}.pdf`);
    doc.on('error', (err) => {
      if (!res.headersSent) return next(err);
      res.destroy(err);
    });
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Romanian-Bold').text('CERERE DE CONCEDIU', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Romanian').text(`Nr. ${request._id.toString().slice(-8).toUpperCase()} / ${formatDate(request.approvedAt || new Date())}`, { align: 'center' });
    doc.moveDown(2);

    // Employee info
    doc.fontSize(12).font('Romanian-Bold').text('Date angajat:');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Romanian');
    doc.text(`Nume: ${fullName}`);
    doc.text(`Departament: ${emp.department}`);
    doc.text(`Funcție: ${emp.position}`);
    doc.text(`Email: ${user.email}`);
    doc.moveDown(1.5);

    // Leave details
    doc.fontSize(12).font('Romanian-Bold').text('Detalii concediu:');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Romanian');
    doc.text(`Tip concediu: ${request.leaveType.name}`);
    doc.text(`Data început: ${formatDate(request.startDate)}`);
    doc.text(`Data sfârșit: ${formatDate(request.endDate)}`);
    doc.text(`Zile lucrătoare: ${request.workingDays}`);
    if (request.reason) {
      doc.text(`Motiv: ${request.reason}`);
    }
    doc.moveDown(1.5);

    // Approval info
    doc.fontSize(12).font('Romanian-Bold').text('Aprobare:');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Romanian');
    doc.text(`Status: APROBAT`);
    if (request.approvedBy) {
      doc.text(`Aprobat de: ${request.approvedBy.firstName} ${request.approvedBy.lastName}`);
    }
    if (request.approvedAt) {
      doc.text(`Data aprobării: ${formatDate(request.approvedAt)}`);
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};

exports.getCalendar = async (req, res, next) => {
  try {
    const range = parseRange(req.query.startDate, req.query.endDate);
    const start = range.start;
    const end = endOfLocalDay(range.end);

    // Get all approved and pending leave requests that overlap with the range
    const requests = await LeaveRequest.find({
      status: { $in: [LEAVE_STATUS.APPROVED, LEAVE_STATUS.PENDING] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    }).populate('leaveType', 'name color');

    // Angajații cu cont activ. Adminii nu apar în calendar.
    const employees = await Employee.find({}).populate('user', 'firstName lastName role isActive');
    const visibleEmployees = employees.filter(
      (e) => e.user && e.user.isActive !== false && e.user.role !== ROLES.ADMIN
    );

    // Build calendar data: group by employee
    const calendarData = visibleEmployees.map((emp) => {
      const empRequests = requests
        .filter((r) => r.employee && r.employee.toString() === emp._id.toString())
        .map((r) => ({
          id: r._id,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
          leaveType: {
            name: r.leaveType?.name || 'N/A',
            color: r.leaveType?.color || '#999999',
          },
        }));

      return {
        employeeId: emp._id,
        firstName: emp.user?.firstName || '',
        lastName: emp.user?.lastName || '',
        department: emp.department,
        leaves: empRequests,
      };
    });

    // Sort by lastName then firstName
    calendarData.sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB, 'ro');
    });

    // Sărbătorile legale din interval, ca zilele libere să fie marcate în calendar
    // și să nu fie desenate ca zile de concediu.
    const holidayMap = await getHolidaysInRange(start, end);
    const holidays = Array.from(holidayMap, ([date, name]) => ({ date, name })).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    res.json({ data: calendarData, holidays });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const { start: startOfYear, end: endOfYear } = localYearRange(year);

    // Managerul vede statisticile echipei lui, nu ale întregii firme.
    const scope =
      req.user.role === ROLES.MANAGER ? { employee: { $in: await managerScopeIds(req.user) } } : {};

    const dateFilter = {
      ...scope,
      startDate: { $gte: startOfYear, $lte: endOfYear },
    };

    const [totalPending, totalApproved, totalRejected, totalCancelled] =
      await Promise.all([
        LeaveRequest.countDocuments({ ...dateFilter, status: LEAVE_STATUS.PENDING }),
        LeaveRequest.countDocuments({ ...dateFilter, status: LEAVE_STATUS.APPROVED }),
        LeaveRequest.countDocuments({ ...dateFilter, status: LEAVE_STATUS.REJECTED }),
        LeaveRequest.countDocuments({ ...dateFilter, status: LEAVE_STATUS.CANCELLED }),
      ]);

    // People on leave today. Limitele acoperă toată ziua, ca o cerere să fie găsită
    // indiferent dacă e stocată la miezul nopții local sau UTC.
    const now = new Date();
    const onLeaveToday = await LeaveRequest.find({
      ...scope,
      status: LEAVE_STATUS.APPROVED,
      startDate: { $lte: endOfLocalDay(now) },
      endDate: { $gte: startOfLocalDay(now) },
    }).populate(EMPLOYEE_POPULATE);

    res.json({
      data: {
        year,
        pending: totalPending,
        approved: totalApproved,
        rejected: totalRejected,
        cancelled: totalCancelled,
        onLeaveToday: onLeaveToday.map((l) => ({
          name: `${l.employee?.user?.firstName} ${l.employee?.user?.lastName}`,
          endDate: l.endDate,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
