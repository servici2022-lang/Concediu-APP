import { Component, OnInit, signal } from '@angular/core';
import { NbCardModule, NbButtonModule, NbIconModule, NbSelectModule, NbToastrService } from '@nebular/theme';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
  // Cererea pe care rulează o acțiune: butoanele ei sunt blocate până la răspuns (fără dublu-click).
  busyId = signal<string | null>(null);
  isManager = false;
  private isAdmin = false;
  private currentUserId: string | undefined;

  constructor(private leaveService: LeaveService, private auth: AuthService, private toastr: NbToastrService) {
    this.isManager = this.auth.hasRole('admin', 'manager');
    this.isAdmin = this.auth.hasRole('admin');
    this.currentUserId = this.auth.currentUser()?.id;
  }

  ngOnInit(): void { this.loadLeaves(); }

  loadLeaves(): void {
    this.loading.set(true);
    this.leaveService.getAll({ limit: 50, status: this.statusFilter() || undefined }).subscribe({
      next: (res) => { this.leaves.set(res.data); this.totalItems.set(res.pagination.total); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toastr.danger(err.error?.message || 'Cererile nu au putut fi incarcate', 'Eroare'); },
    });
  }

  onStatusFilter(status: string): void { this.statusFilter.set(status); this.loadLeaves(); }

  isOwn(r: LeaveRequest): boolean { return !!this.currentUserId && r.employee?.user?._id === this.currentUserId; }

  // Aceleași reguli ca în backend: managerul decide doar pentru subordonați (nu pentru el însuși),
  // iar un concediu aprobat care a început deja îl mai poate anula doar adminul.
  canDecide(r: LeaveRequest): boolean {
    return r.status === 'pending' && this.isManager && (this.isAdmin || !this.isOwn(r));
  }

  canCancel(r: LeaveRequest): boolean {
    if (this.isAdmin) return r.status === 'pending' || r.status === 'approved';
    if (!this.isOwn(r)) return false;
    if (r.status === 'pending') return true;
    return r.status === 'approved' && !this.hasStarted(r);
  }

  private hasStarted(r: LeaveRequest): boolean {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return new Date(r.startDate) <= endOfToday;
  }

  approve(id: string): void {
    this.busyId.set(id);
    this.leaveService.updateStatus(id, { status: 'approved' }).subscribe({
      next: () => { this.busyId.set(null); this.toastr.success('Cerere aprobata', 'Succes'); this.loadLeaves(); },
      error: (err) => { this.busyId.set(null); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); },
    });
  }

  reject(id: string): void {
    const reason = prompt('Motivul respingerii:');
    if (!reason) return;
    this.busyId.set(id);
    this.leaveService.updateStatus(id, { status: 'rejected', rejectionReason: reason }).subscribe({
      next: () => { this.busyId.set(null); this.toastr.success('Cerere respinsa', 'Succes'); this.loadLeaves(); },
      error: (err) => { this.busyId.set(null); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); },
    });
  }

  cancel(id: string): void {
    if (!confirm('Sigur doriti sa anulati cererea?')) return;
    this.busyId.set(id);
    this.leaveService.cancel(id).subscribe({
      next: () => { this.busyId.set(null); this.toastr.success('Cerere anulata', 'Succes'); this.loadLeaves(); },
      error: (err) => { this.busyId.set(null); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); },
    });
  }

  exportPdf(id: string): void {
    this.leaveService.exportPdf(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cerere-concediu-${id}.pdf`;
        a.click();
        // Revocat după ce browserul a pornit descărcarea, nu imediat după click.
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      },
      error: (err: HttpErrorResponse) => this.showBlobError(err, 'Eroare la export'),
    });
  }

  getStatusLabel(status: string): string {
    return { pending: 'In asteptare', approved: 'Aprobat', rejected: 'Respins', cancelled: 'Anulat' }[status] || status;
  }

  /** La descărcări (responseType blob) mesajul de eroare al serverului vine tot ca Blob. */
  private async showBlobError(err: HttpErrorResponse, fallback: string): Promise<void> {
    let message = fallback;
    if (err.error instanceof Blob) {
      try { message = JSON.parse(await err.error.text()).message || fallback; } catch { /* nu e JSON */ }
    } else if (err.error?.message) {
      message = err.error.message;
    }
    this.toastr.danger(message, 'Eroare');
  }
}
