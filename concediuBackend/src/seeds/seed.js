process.env.TZ = 'Europe/Bucharest';
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const { User, Employee, LeaveType, Holiday } = require('../models');

const romanianHolidays = [
  { name: 'Anul Nou', date: new Date('2026-01-01'), recurring: true },
  { name: 'Anul Nou (ziua 2)', date: new Date('2026-01-02'), recurring: true },
  { name: 'Ziua Unirii', date: new Date('2026-01-24'), recurring: true },
  { name: 'Ziua Muncii', date: new Date('2026-05-01'), recurring: true },
  { name: 'Ziua Copilului', date: new Date('2026-06-01'), recurring: true },
  { name: 'Adormirea Maicii Domnului', date: new Date('2026-08-15'), recurring: true },
  { name: 'Sfântul Andrei', date: new Date('2026-11-30'), recurring: true },
  { name: 'Ziua Națională', date: new Date('2026-12-01'), recurring: true },
  { name: 'Crăciunul', date: new Date('2026-12-25'), recurring: true },
  { name: 'Crăciunul (ziua 2)', date: new Date('2026-12-26'), recurring: true },
  // Variable dates for 2026 (Orthodox Easter)
  { name: 'Vinerea Mare', date: new Date('2026-04-10'), recurring: false },
  { name: 'Paștele', date: new Date('2026-04-12'), recurring: false },
  { name: 'Paștele (ziua 2)', date: new Date('2026-04-13'), recurring: false },
  { name: 'Rusaliile', date: new Date('2026-05-31'), recurring: false },
  { name: 'Rusaliile (ziua 2)', date: new Date('2026-06-01'), recurring: false },
];

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
        new: true,
      });
    }
    console.log(`${defaultLeaveTypes.length} leave types seeded`);

    // Seed holidays
    for (const h of romanianHolidays) {
      await Holiday.findOneAndUpdate(
        { name: h.name, date: h.date },
        h,
        { upsert: true, new: true }
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
