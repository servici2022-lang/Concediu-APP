import { Component, OnInit, signal } from '@angular/core';
import { NbCardModule, NbButtonModule, NbIconModule, NbSelectModule, NbToastrService } from '@nebular/theme';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../../core/services/leave.service';
import { AuthService } from '../../../core/services/auth.service';
import { LeaveRequest } from '../../../core/models';

@Component({
  selector: 'app-leave-list',
  standalone: true,
  imports: [NbCardModule, NbButtonModule, NbIconModule, NbSelectModule, RouterLink, DatePipe, NgClass, FormsModule],
  templateUrl: './leave-list.html',
  styleUrl: './leave-list.scss',
})
export class LeaveListComponent implements OnInit {
  leaves = signal<LeaveRequest[]>([]);
  totalItems = signal(0);
  statusFilter = signal<string>('');
  loading = signal(false);
  isManager = false;

  constructor(private leaveService: LeaveService, private auth: AuthService, private toastr: NbToastrService) {
    this.isManager = this.auth.hasRole('admin', 'manager');
  }

  ngOnInit(): void { this.loadLeaves(); }

  loadLeaves(): void {
    this.loading.set(true);
    this.leaveService.getAll({ limit: 50, status: this.statusFilter() || undefined }).subscribe({
      next: (res) => { this.leaves.set(res.data); this.totalItems.set(res.pagination.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onStatusFilter(status: string): void { this.statusFilter.set(status); this.loadLeaves(); }

  approve(id: string): void {
    this.leaveService.updateStatus(id, { status: 'approved' }).subscribe({
      next: () => { this.toastr.success('Cerere aprobata', 'Succes'); this.loadLeaves(); },
      error: (err) => this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'),
    });
  }

  reject(id: string): void {
    const reason = prompt('Motivul respingerii:');
    if (!reason) return;
    this.leaveService.updateStatus(id, { status: 'rejected', rejectionReason: reason }).subscribe({
      next: () => { this.toastr.success('Cerere respinsa', 'Succes'); this.loadLeaves(); },
      error: (err) => this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'),
    });
  }

  cancel(id: string): void {
    if (!confirm('Sigur doriti sa anulati cererea?')) return;
    this.leaveService.cancel(id).subscribe({
      next: () => { this.toastr.success('Cerere anulata', 'Succes'); this.loadLeaves(); },
      error: (err) => this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'),
    });
  }

  getStatusLabel(status: string): string {
    return { pending: 'In asteptare', approved: 'Aprobat', rejected: 'Respins', cancelled: 'Anulat' }[status] || status;
  }
}
