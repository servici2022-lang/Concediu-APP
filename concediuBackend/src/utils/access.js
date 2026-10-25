const { ROLES } = require('../config/constants');
const AppError = require('./AppError');

const idOf = (ref) => (ref && ref._id ? String(ref._id) : ref ? String(ref) : null);

/**
 * Cine are voie să vadă datele unui angajat (profil, sold, cereri, PDF):
 * adminul, angajatul însuși și managerul lui direct. Oricine altcineva primește 404,
 * ca să nu poată afla nici măcar dacă un id există.
 */
const canAccessEmployee = (user, employee) => {
  if (!employee) return false;
  if (user.role === ROLES.ADMIN) return true;
  const userId = String(user._id);
  if (idOf(employee.user) === userId) return true;
  return user.role === ROLES.MANAGER && idOf(employee.manager) === userId;
};

const assertCanAccessEmployee = (user, employee, notFoundMessage = 'Employee not found') => {
  if (!canAccessEmployee(user, employee)) {
    throw new AppError(notFoundMessage, 404);
  }
};

/** CNP-ul îl văd doar adminul și angajatul însuși, nu și managerul. */
const canSeeCnp = (user, employee) =>
  user.role === ROLES.ADMIN || idOf(employee.user) === String(user._id);

/** Profilul angajatului ca JSON, fără CNP pentru cine nu are voie să-l vadă. */
const employeeForViewer = (user, employee) => {
  const json = employee.toJSON();
  if (!canSeeCnp(user, employee)) delete json.cnp;
  return json;
};

module.exports = { canAccessEmployee, assertCanAccessEmployee, employeeForViewer };
