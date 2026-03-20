import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Employee,
  EmployeeBalance,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  LeaveBalance,
  ApiResponse,
  PaginatedResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly apiUrl = `${environment.apiUrl}/employees`;

  constructor(private http: HttpClient) {}

  getAll(params?: {
    page?: number;
    limit?: number;
    department?: string;
    search?: string;
  }): Observable<PaginatedResponse<Employee>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<PaginatedResponse<Employee>>(this.apiUrl, { params: httpParams });
  }

  getById(id: string): Observable<ApiResponse<Employee>> {
    return this.http.get<ApiResponse<Employee>>(`${this.apiUrl}/${id}`);
  }

  getByUserId(userId: string): Observable<ApiResponse<Employee>> {
    return this.http.get<ApiResponse<Employee>>(`${this.apiUrl}/by-user/${userId}`);
  }

  create(data: CreateEmployeeRequest): Observable<ApiResponse<Employee>> {
    return this.http.post<ApiResponse<Employee>>(this.apiUrl, data);
  }

  update(id: string, data: UpdateEmployeeRequest): Observable<ApiResponse<Employee>> {
    return this.http.put<ApiResponse<Employee>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getBalance(id: string, year?: number): Observable<ApiResponse<LeaveBalance>> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<ApiResponse<LeaveBalance>>(`${this.apiUrl}/${id}/balance`, {
      params,
    });
  }

  getDepartments(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/departments`);
  }

  getAllBalances(): Observable<ApiResponse<EmployeeBalance[]>> {
    return this.http.get<ApiResponse<EmployeeBalance[]>>(`${this.apiUrl}/balances/all`);
  }
}
