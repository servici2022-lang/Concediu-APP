process.env.TZ = 'Europe/Bucharest';
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const { User, Employee, LeaveType, Holiday } = require('../models');

const fixedHolidays = [
  { name: 'Anul Nou', date: new Date('2026-01-01'), recurring: true },
  { name: 'Anul Nou (ziua 2)', date: new Date('2026-01-02'), recurring: true },
  // Zile libere legale din 2024 (Legea 52/2023)
  { name: 'Boboteaza', date: new Date('2026-01-06'), recurring: true },
  { name: 'Sfântul Ioan Botezătorul', date: new Date('2026-01-07'), recurring: true },
  { name: 'Ziua Unirii', date: new Date('2026-01-24'), recurring: true },
  { name: 'Ziua Muncii', date: new Date('2026-05-01'), recurring: true },
  { name: 'Ziua Copilului', date: new Date('2026-06-01'), recurring: true },
  { name: 'Adormirea Maicii Domnului', date: new Date('2026-08-15'), recurring: true },
  { name: 'Sfântul Andrei', date: new Date('2026-11-30'), recurring: true },
  { name: 'Ziua Națională', date: new Date('2026-12-01'), recurring: true },
  { name: 'Crăciunul', date: new Date('2026-12-25'), recurring: true },
  { name: 'Crăciunul (ziua 2)', date: new Date('2026-12-26'), recurring: true },
];

/**
 * Paștele ortodox (algoritmul lui Meeus pentru calendarul iulian, +13 zile pentru
 * calendarul gregorian; valabil 1900-2099). Întoarce 'YYYY-MM-DD'.
 */
const orthodoxEaster = (year) => {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const easter = new Date(Date.UTC(year, month - 1, day + 13));
  return easter.toISOString().slice(0, 10);
};

const addDays = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Date(d.toISOString().slice(0, 10));
};

// Sărbătorile cu dată variabilă (legate de Paște), pentru anul trecut și următorii 5 ani.
// Seed-ul e idempotent: rulat din nou, adaugă doar anii care lipsesc.
const easterHolidays = () => {
  const thisYear = new Date().getFullYear();
  const holidays = [];
  for (let year = thisYear - 1; year <= thisYear + 5; year++) {
    const easter = orthodoxEaster(year);
    holidays.push(
      { name: 'Vinerea Mare', date: addDays(easter, -2), recurring: false },
      { name: 'Paștele', date: addDays(easter, 0), recurring: false },
      { name: 'Paștele (ziua 2)', date: addDays(easter, 1), recurring: false },
      { name: 'Rusaliile', date: addDays(easter, 49), recurring: false },
      { name: 'Rusaliile (ziua 2)', date: addDays(easter, 50), recurring: false }
    );
  }
  return holidays;
};

const romanianHolidays = [...fixedHolidays, ...easterHolidays()];

const defaultLeaveTypes = [
  {
    name: 'Concediu de odihnă',
    description: 'Concediu anual de odihnă',
    color: '#4caf50',
    isPaid: true,
    deductsFromAllowance: true,
  },
  {
    name: 'Concediu medical',
    description: 'Concediu medical (certificat medical)',
    color: '#f44336',
    isPaid: true,
    deductsFromAllowance: false,
  },
  {
    name: 'Concediu fără plată',
    description: 'Concediu fără plată',
    color: '#ff9800',
    isPaid: false,
    deductsFromAllowance: false,
  },
  {
    name: 'Eveniment familial',
    description: 'Căsătorie, naștere copil, deces rudă (conform legislație)',
    color: '#9c27b0',
    isPaid: true,
    deductsFromAllowance: false,
  },
  {
    name: 'Delegație',
    description: 'Deplasare în interes de serviciu',
    color: '#2196f3',
    isPaid: true,
    deductsFromAllowance: false,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(config.mongo.uri);
    console.log('Connected to MongoDB');

    // Create admin user
    const existingAdmin = await User.findOne({ email: config.admin.email });
    if (!existingAdmin) {
      await User.create({
        email: config.admin.email,
        password: config.admin.password,
        firstName: 'Admin',
        lastName: 'System',
        role: 'admin',
      });
      console.log(`Admin user created: ${config.admin.email}`);
      if (config.admin.password === 'Admin123!') {
        console.warn('ATENȚIE: adminul are parola implicită Admin123! Schimb-o după prima logare (Profil -> Schimbă parola).');
      }
    } else {
      console.log('Admin user already exists');
    }

    // Create employee profile for admin
    const adminUser = await User.findOne({ email: config.admin.email });
    const existingEmployee = await Employee.findOne({ user: adminUser._id });
    if (!existingEmployee) {
      await Employee.create({
        user: adminUser._id,
        department: 'Management',
        position: 'Administrator',
        hireDate: new Date('2024-01-01'),
        totalLeaveDays: 21,
      });
      console.log('Admin employee profile created');
    } else {
      console.log('Admin employee profile already exists');
    }

    // Seed leave types
    for (const lt of defaultLeaveTypes) {
      await LeaveType.findOneAndUpdate({ name: lt.name }, lt, {
        upsert: true,
        returnDocument: 'after',
      });
    }
    console.log(`${defaultLeaveTypes.length} leave types seeded`);

    // Seed holidays
    for (const h of romanianHolidays) {
      await Holiday.findOneAndUpdate(
        { name: h.name, date: h.date },
        h,
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log(`${romanianHolidays.length} Romanian holidays seeded`);

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
