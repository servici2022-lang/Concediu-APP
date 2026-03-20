import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { NbCardModule, NbIconModule, NbButtonModule, NbListModule, NbBadgeModule, NbProgressBarModule } from '@nebular/theme';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { LeaveService } from '../../core/services/leave.service';
import { EmployeeService } from '../../core/services/employee.service';
import { LeaveBalance, LeaveStats, EmployeeBalance } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NbCardModule, NbIconModule, NbButtonModule, NbListModule, NbBadgeModule, NbProgressBarModule, RouterLink, DatePipe, NgClass],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private leaveService = inject(LeaveService);
  private employeeService = inject(EmployeeService);

  user = this.auth.currentUser;
  balance = signal<LeaveBalance | null>(null);
  stats = signal<LeaveStats | null>(null);
  recentLeaves = signal<any[]>([]);
  allBalances = signal<EmployeeBalance[]>([]);

  usagePercent = computed(() => {
    const b = this.balance();
    if (!b || b.totalDays === 0) return 0;
    return Math.round((b.usedDays / b.totalDays) * 100);
  });

  ngOnInit(): void {
    this.loadBalance();
    this.loadRecentLeaves();
    if (this.auth.hasRole('admin', 'manager')) { this.loadStats(); this.loadAllBalances(); }
  }

  private loadBalance(): void {
    const userId = this.user()?.id;
    if (!userId) return;
    this.employeeService.getByUserId(userId).subscribe({
      next: (res) => this.employeeService.getBalance(res.data._id).subscribe({ next: (b) => this.balance.set(b.data) }),
    });
  }
  private loadStats(): void { this.leaveService.getStats().subscribe({ next: (res) => this.stats.set(res.data) }); }
  private loadRecentLeaves(): void { this.leaveService.getAll({ limit: 5 }).subscribe({ next: (res) => this.recentLeaves.set(res.data) }); }
  private loadAllBalances(): void { this.employeeService.getAllBalances().subscribe({ next: (res) => this.allBalances.set(res.data) }); }

  getStatusLabel(status: string): string {
    return { pending: 'In asteptare', approved: 'Aprobat', rejected: 'Respins', cancelled: 'Anulat' }[status] || status;
  }
}
