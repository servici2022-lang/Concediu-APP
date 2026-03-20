import { User } from './user.model';

export interface Employee {
  _id: string;
  user: User;
  department: string;
  position: string;
  manager: User | null;
  hireDate: string;
  totalLeaveDays: number;
  phone?: string;
  cnp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  userId: string;
  department: string;
  position: string;
  hireDate: string;
  manager?: string;
  totalLeaveDays?: number;
  phone?: string;
  cnp?: string;
}

export interface UpdateEmployeeRequest {
  department?: string;
  position?: string;
  hireDate?: string;
  manager?: string | null;
  totalLeaveDays?: number;
  phone?: string;
  cnp?: string;
}

export interface EmployeeBalance {
  employeeId: string;
  name: string;
  department: string;
  totalDays: number;
  currentYearDays: number;
  carryoverDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  availableDays: number;
}

export interface LeaveBalance {
  year: number;
  periodStart: string;
  periodEnd: string;
  currentYearDays: number;
  carryoverDays: number;
  totalDays: number;
  yearlyAllowance: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  availableDays: number;
}
