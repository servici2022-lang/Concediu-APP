/**
 * Datepicker-ul Nebular întoarce un Date la miezul nopții LOCAL. `toISOString()` pe
 * acest Date dă ziua precedentă la ora 21:00/22:00 UTC (România e UTC+2/+3), iar
 * backend-ul primea astfel altă zi decât cea aleasă de utilizator.
 *
 * Se trimite ziua calendaristică ca atare, 'YYYY-MM-DD', construită din componentele
 * locale — fără conversie în UTC.
 */
export function toDateOnly(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
