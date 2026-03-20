import { Component, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LeaveService } from '../../../core/services/leave.service';
import { Holiday } from '../../../core/models';

@Component({
  selector: 'app-holiday-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule, RouterLink, DatePipe],
  templateUrl: './holiday-list.html',
  styleUrl: './holiday-list.scss',
})
export class HolidayListComponent implements OnInit {
  holidays = signal<Holiday[]>([]);
  displayedColumns = ['name', 'date', 'recurring', 'actions'];

  constructor(private leaveService: LeaveService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.leaveService.getHolidays().subscribe({ next: (res) => this.holidays.set(res.data) });
  }

  delete(id: string): void {
    if (!confirm('Sigur doriți să ștergeți această sărbătoare?')) return;
    this.leaveService.deleteHoliday(id).subscribe({
      next: () => { this.snackBar.open('Sărbătoare ștearsă', 'OK', { duration: 3000 }); this.load(); },
    });
  }
}
