import { Employee } from './employee.model';
import { User } from './user.model';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveType {
  _id: string;
  name: string;
  description?: string;
  color: string;
  isPaid: boolean;
  deductsFromAllowance: boolean;
  isActive: boolean;
}

export interface LeaveRequest {
  _id: string;
  employee: Employee;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  workingDays: number;
  status: LeaveStatus;
  reason?: string;
  rejectionReason?: string;
  approvedBy: User | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateLeaveStatusRequest {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface LeaveStats {
  year: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  onLeaveToday: { name: string; endDate: string }[];
}

export interface Holiday {
  _id: string;
  name: string;
  date: string;
  recurring: boolean;
}

export interface WorkingDaysResponse {
  startDate: string;
  endDate: string;
  workingDays: number;
}
