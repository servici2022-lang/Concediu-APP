import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NbCardModule, NbButtonModule, NbIconModule, NbTooltipModule, NbSpinnerModule, NbSelectModule } from '@nebular/theme';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../core/services/leave.service';

interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  dayNum: number;
  dayName: string;
  monthName: string;
  isWeekend: boolean;
  isToday: boolean;
  dateStr: string;
}

interface EmployeeLeave {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  leaveType: { name: string; color: string };
}

interface CalendarEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  leaves: EmployeeLeave[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, NbCardModule, NbButtonModule, NbIconModule, NbTooltipModule, NbSpinnerModule, NbSelectModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class CalendarComponent implements OnInit {
  private leaveService = inject(LeaveService);

  loading = signal(false);
  employees = signal<CalendarEmployee[]>([]);
  rangeStart = signal(new Date());
  filterDepartment = signal<string>('');

  departments = computed(() => {
    const deps = new Set(this.employees().map((e) => e.department).filter(Boolean));
    return Array.from(deps).sort();
  });

  filteredEmployees = computed(() => {
    const dept = this.filterDepartment();
    if (!dept) return this.employees();
    return this.employees().filter((e) => e.department === dept);
  });

  days = computed<CalendarDay[]>(() => {
    const start = this.rangeStart();
    const result: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa'];
    const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

    for (let i = 0; i < 32; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const dow = d.getDay();
      result.push({
        date: d,
        dayOfWeek: dow,
        dayNum: d.getDate(),
        dayName: dayNames[dow],
        monthName: monthNames[d.getMonth()],
        isWeekend: dow === 0 || dow === 6,
        isToday: d.getTime() === today.getTime(),
        dateStr: d.toISOString().split('T')[0],
      });
    }
    return result;
  });

  rangeLabel = computed(() => {
    const d = this.days();
    if (!d.length) return '';
    const fmt = (dt: Date) => dt.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${fmt(d[0].date)} - ${fmt(d[d.length - 1].date)}`;
  });

  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.rangeStart.set(today);
    this.loadCalendar();
  }

  prevRange(): void {
    const d = new Date(this.rangeStart());
    d.setDate(d.getDate() - 32);
    this.rangeStart.set(d);
    this.loadCalendar();
  }

  nextRange(): void {
    const d = new Date(this.rangeStart());
    d.setDate(d.getDate() + 32);
    this.rangeStart.set(d);
    this.loadCalendar();
  }

  getLeaveForDay(emp: CalendarEmployee, day: CalendarDay): EmployeeLeave | null {
    if (day.isWeekend) return null;
    return emp.leaves.find((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return day.date >= start && day.date <= end;
    }) || null;
  }

  private loadCalendar(): void {
    const d = this.days();
    if (!d.length) return;
    const startDate = d[0].dateStr;
    const endDate = d[d.length - 1].dateStr;

    this.loading.set(true);
    this.leaveService.getCalendar(startDate, endDate).subscribe({
      next: (res) => {
        this.employees.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
