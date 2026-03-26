import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LeaveRequest,
  CreateLeaveRequest,
  UpdateLeaveStatusRequest,
  LeaveType,
  LeaveStats,
  Holiday,
  WorkingDaysResponse,
  ApiResponse,
  PaginatedResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly apiUrl = `${environment.apiUrl}/leave-requests`;
  private readonly typeUrl = `${environment.apiUrl}/leave-types`;
  private readonly holidayUrl = `${environment.apiUrl}/holidays`;

  constructor(private http: HttpClient) {}

  // Leave Requests
  getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    year?: number;
    employeeId?: string;
    leaveTypeId?: string;
  }): Observable<PaginatedResponse<LeaveRequest>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<PaginatedResponse<LeaveRequest>>(this.apiUrl, { params: httpParams });
  }

  getById(id: string): Observable<ApiResponse<LeaveRequest>> {
    return this.http.get<ApiResponse<LeaveRequest>>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateLeaveRequest): Observable<ApiResponse<LeaveRequest>> {
    return this.http.post<ApiResponse<LeaveRequest>>(this.apiUrl, data);
  }

  updateStatus(id: string, data: UpdateLeaveStatusRequest): Observable<ApiResponse<LeaveRequest>> {
    return this.http.put<ApiResponse<LeaveRequest>>(`${this.apiUrl}/${id}/status`, data);
  }

  cancel(id: string): Observable<ApiResponse<LeaveRequest>> {
    return this.http.put<ApiResponse<LeaveRequest>>(`${this.apiUrl}/${id}/cancel`, {});
  }

  exportPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/export-pdf`, { responseType: 'blob' });
  }

  getCalendar(startDate: string, endDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/calendar`, { params });
  }

  calculateDays(startDate: string, endDate: string): Observable<ApiResponse<WorkingDaysResponse>> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<ApiResponse<WorkingDaysResponse>>(`${this.apiUrl}/calculate-days`, {
      params,
    });
  }

  getStats(year?: number): Observable<ApiResponse<LeaveStats>> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<ApiResponse<LeaveStats>>(`${this.apiUrl}/stats`, { params });
  }

  // Leave Types
  getLeaveTypes(active?: boolean): Observable<ApiResponse<LeaveType[]>> {
    let params = new HttpParams();
    if (active !== undefined) params = params.set('active', String(active));
    return this.http.get<ApiResponse<LeaveType[]>>(this.typeUrl, { params });
  }

  getLeaveType(id: string): Observable<ApiResponse<LeaveType>> {
    return this.http.get<ApiResponse<LeaveType>>(`${this.typeUrl}/${id}`);
  }

  createLeaveType(data: Partial<LeaveType>): Observable<ApiResponse<LeaveType>> {
    return this.http.post<ApiResponse<LeaveType>>(this.typeUrl, data);
  }

  updateLeaveType(id: string, data: Partial<LeaveType>): Observable<ApiResponse<LeaveType>> {
    return this.http.put<ApiResponse<LeaveType>>(`${this.typeUrl}/${id}`, data);
  }

  deleteLeaveType(id: string): Observable<any> {
    return this.http.delete(`${this.typeUrl}/${id}`);
  }

  // Holidays
  getHolidays(year?: number): Observable<ApiResponse<Holiday[]>> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<ApiResponse<Holiday[]>>(this.holidayUrl, { params });
  }

  getHoliday(id: string): Observable<ApiResponse<Holiday>> {
    return this.http.get<ApiResponse<Holiday>>(`${this.holidayUrl}/${id}`);
  }

  createHoliday(data: Partial<Holiday>): Observable<ApiResponse<Holiday>> {
    return this.http.post<ApiResponse<Holiday>>(this.holidayUrl, data);
  }

  updateHoliday(id: string, data: Partial<Holiday>): Observable<ApiResponse<Holiday>> {
    return this.http.put<ApiResponse<Holiday>>(`${this.holidayUrl}/${id}`, data);
  }

  deleteHoliday(id: string): Observable<any> {
    return this.http.delete(`${this.holidayUrl}/${id}`);
  }
}
