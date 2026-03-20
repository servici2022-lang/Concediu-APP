import { Component, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employee } from '../../../core/models';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
    RouterLink,
    DatePipe,
    FormsModule,
  ],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
})
export class EmployeeListComponent implements OnInit {
  employees = signal<Employee[]>([]);
  totalItems = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);
  search = '';
  loading = signal(false);
  isAdmin = false;

  displayedColumns = ['name', 'email', 'department', 'position', 'hireDate', 'leaveDays'];

  constructor(
    private employeeService: EmployeeService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.isAdmin = this.auth.hasRole('admin');
    if (this.isAdmin) {
      this.displayedColumns.push('actions');
    }
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.employeeService
      .getAll({
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.search || undefined,
      })
      .subscribe({
        next: (res) => {
          this.employees.set(res.data);
          this.totalItems.set(res.pagination.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadEmployees();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.loadEmployees();
  }

  deleteEmployee(id: string): void {
    if (!confirm('Sigur doriți să ștergeți profilul angajatului?')) return;
    this.employeeService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Angajat șters', 'OK', { duration: 3000 });
        this.loadEmployees();
      },
    });
  }
}
