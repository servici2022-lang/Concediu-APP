/**
 * Recalculează `workingDays` pentru cererile de concediu deja existente.
 *
 * Cererile create înainte de corectarea calculului au numărul de zile lucrătoare
 * salvat greșit (interval deplasat cu o zi înapoi), iar din el se scad zilele din
 * soldul angajatului. Corectarea calculului nu rescrie singură valorile vechi.
 *
 * Rulare:
 *   node src/scripts/recalc-working-days.js            # doar raportează diferențele
 *   node src/scripts/recalc-working-days.js --apply    # scrie corecțiile în baza de date
 */
process.env.TZ = 'Europe/Bucharest';
require('dotenv').config();

const mongoose = require('mongoose');
const config = require('../config');
const { LeaveRequest } = require('../models');
const { calculateWorkingDays } = require('../utils/leaveCalculator');
const { startOfLocalDay, toDateKey } = require('../utils/dateUtils');

const apply = process.argv.includes('--apply');

const run = async () => {
  await mongoose.connect(config.mongo.uri);
  console.log(`Conectat la MongoDB${apply ? '' : ' (dry-run, nu se scrie nimic)'}\n`);

  const requests = await LeaveRequest.find({})
    .populate({ path: 'employee', populate: { path: 'user', select: 'firstName lastName' } })
    .sort({ startDate: 1 });

  let changed = 0;

  for (const req of requests) {
    const start = startOfLocalDay(req.startDate);
    const end = startOfLocalDay(req.endDate);
    const correct = await calculateWorkingDays(start, end);

    const datesShifted =
      start.getTime() !== new Date(req.startDate).getTime() ||
      end.getTime() !== new Date(req.endDate).getTime();

    if (correct === req.workingDays && !datesShifted) continue;

    changed++;
    const name = req.employee?.user
      ? `${req.employee.user.firstName} ${req.employee.user.lastName}`
      : req.employee?._id;
    const delta = correct - req.workingDays;
    console.log(
      `${name} | ${toDateKey(start)} -> ${toDateKey(end)} | ${req.status} | ` +
        `${req.workingDays} -> ${correct} zile (${delta > 0 ? '+' : ''}${delta})`
    );

    if (apply) {
      req.startDate = start;
      req.endDate = end;
      req.workingDays = correct;
      await req.save({ validateBeforeSave: false });
    }
  }

  console.log(
    `\n${changed} din ${requests.length} cereri ${apply ? 'au fost corectate' : 'necesită corectare'}.`
  );
  if (!apply && changed > 0) {
    console.log('Rulează din nou cu --apply pentru a salva modificările.');
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Eroare:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
