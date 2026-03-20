import { Component, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../../core/services/leave.service';
import { AuthService } from '../../../core/services/auth.service';
import { LeaveRequest, LeaveStatus } from '../../../core/models';

@Component({
  selector: 'app-leave-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    RouterLink,
    DatePipe,
    NgClass,
    FormsModule,
  ],
  templateUrl: './leave-list.html',
  styleUrl: './leave-list.scss',
})
export class LeaveListComponent implements OnInit {
  leaves = signal<LeaveRequest[]>([]);
  totalItems = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);
  statusFilter = signal<string>('');
  loading = signal(false);

  displayedColumns = ['leaveType', 'dates', 'days', 'status', 'actions'];
  isManager = false;

  constructor(
    private leaveService: LeaveService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {
    this.isManager = this.auth.hasRole('admin', 'manager');
    if (this.isManager) {
      this.displayedColumns = ['employee', 'leaveType', 'dates', 'days', 'status', 'actions'];
    }
  }

  ngOnInit(): void {
    this.loadLeaves();
  }

  loadLeaves(): void {
    this.loading.set(true);
    this.leaveService
      .getAll({
        page: this.currentPage(),
        limit: this.pageSize(),
        status: this.statusFilter() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.leaves.set(res.data);
          this.totalItems.set(res.pagination.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.loadLeaves();
  }

  onStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.loadLeaves();
  }

  approve(id: string): void {
    this.leaveService.updateStatus(id, { status: 'approved' }).subscribe({
      next: () => {
        this.snackBar.open('Cerere aprobată', 'OK', { duration: 3000 });
        this.loadLeaves();
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Eroare', 'OK', { duration: 3000 }),
    });
  }

  reject(id: string): void {
    const reason = prompt('Motivul respingerii:');
    if (!reason) return;

    this.leaveService.updateStatus(id, { status: 'rejected', rejectionReason: reason }).subscribe({
      next: () => {
        this.snackBar.open('Cerere respinsă', 'OK', { duration: 3000 });
        this.loadLeaves();
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Eroare', 'OK', { duration: 3000 }),
    });
  }

  cancel(id: string): void {
    if (!confirm('Sigur doriți să anulați cererea?')) return;

    this.leaveService.cancel(id).subscribe({
      next: () => {
        this.snackBar.open('Cerere anulată', 'OK', { duration: 3000 });
        this.loadLeaves();
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Eroare', 'OK', { duration: 3000 }),
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'In așteptare',
      approved: 'Aprobat',
      rejected: 'Respins',
      cancelled: 'Anulat',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }
}
