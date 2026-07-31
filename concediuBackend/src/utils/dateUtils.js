/**
 * Toate datele din aplicație (concedii, sărbători, data angajării) reprezintă
 * ZILE CALENDARISTICE, nu momente în timp. În baza de date ele ajung însă stocate
 * în două forme, în funcție de cine le-a trimis:
 *   - miezul nopții LOCAL  -> `2028-07-02T21:00:00Z` înseamnă 3 iulie (payload-uri vechi, din `toISOString()`)
 *   - miezul nopții UTC    -> `2028-07-03T00:00:00Z` înseamnă 3 iulie (seed + payload-uri `YYYY-MM-DD`)
 *
 * Fusul orar al procesului este Europe/Bucharest (setat în server.js), care e mereu
 * înaintea UTC (+2/+3), deci ambele forme cad în aceeași zi calendaristică LOCALĂ.
 * De aceea singura interpretare corectă pentru amândouă este cea locală — a citi
 * ziua cu `getUTCDate()` scade o zi pentru datele salvate ca miezul nopții local.
 */

/** Cheia zilei calendaristice locale: 'YYYY-MM-DD'. */
const toDateKey = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

/**
 * Ancoră la ora 12 locală. Folosită pentru a itera zi cu zi: la ora 12 nici
 * trecerea la ora de vară, nici cea la ora de iarnă nu pot muta data în ziua vecină.
 */
const localDayAnchor = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
};

/** Începutul zilei calendaristice locale (00:00:00.000). */
const startOfLocalDay = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
};

/** Sfârșitul zilei calendaristice locale (23:59:59.999). */
const endOfLocalDay = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
};

/**
 * Intervalul unui an calendaristic local: [1 ian 00:00:00.000, 31 dec 23:59:59.999].
 * Limitele acoperă ambele forme de stocare, deci un concediu care începe pe 1 ianuarie
 * intră în anul corect indiferent cum a fost salvat.
 */
const localYearRange = (year) => ({
  start: new Date(year, 0, 1, 0, 0, 0, 0),
  end: new Date(year, 11, 31, 23, 59, 59, 999),
});

module.exports = {
  toDateKey,
  localDayAnchor,
  startOfLocalDay,
  endOfLocalDay,
  localYearRange,
};
