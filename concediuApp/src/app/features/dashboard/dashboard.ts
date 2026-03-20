import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { LeaveService } from '../../core/services/leave.service';
import { EmployeeService } from '../../core/services/employee.service';
import { LeaveBalance, LeaveStats, EmployeeBalance } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatListModule,
    MatDividerModule,
    MatProgressBarModule,
    MatTableModule,
    RouterLink,
    DatePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private leaveService = inject(LeaveService);
  private employeeService = inject(EmployeeService);

  user = this.auth.currentUser;
  role = this.auth.userRole;
  balance = signal<LeaveBalance | null>(null);
  stats = signal<LeaveStats | null>(null);
  recentLeaves = signal<any[]>([]);
  allBalances = signal<EmployeeBalance[]>([]);

  usagePercent = computed(() => {
    const b = this.balance();
    if (!b || b.totalDays === 0) return 0;
    return Math.round((b.usedDays / b.totalDays) * 100);
  });

  balanceColumns = ['name', 'department', 'totalDays', 'usedDays', 'pendingDays', 'availableDays'];

  ngOnInit(): void {
    this.loadBalance();
    this.loadRecentLeaves();

    if (this.auth.hasRole('admin', 'manager')) {
      this.loadStats();
      this.loadAllBalances();
    }
  }

  private loadBalance(): void {
    const userId = this.user()?.id;
    if (!userId) return;

    this.employeeService.getByUserId(userId).subscribe({
      next: (res) => {
        this.employeeService.getBalance(res.data._id).subscribe({
          next: (balRes) => this.balance.set(balRes.data),
        });
      },
    });
  }

  private loadStats(): void {
    this.leaveService.getStats().subscribe({
      next: (res) => this.stats.set(res.data),
    });
  }

  private loadRecentLeaves(): void {
    this.leaveService.getAll({ limit: 5 }).subscribe({
      next: (res) => this.recentLeaves.set(res.data),
    });
  }

  private loadAllBalances(): void {
    this.employeeService.getAllBalances().subscribe({
      next: (res) => this.allBalances.set(res.data),
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
}
