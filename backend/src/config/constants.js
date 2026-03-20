const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

const DEFAULT_LEAVE_DAYS = 21; // Romania: 21 working days minimum

module.exports = {
  ROLES,
  LEAVE_STATUS,
  DEFAULT_LEAVE_DAYS,
};
