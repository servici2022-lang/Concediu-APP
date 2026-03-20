import { Component, OnInit, signal } from '@angular/core';
import { NbCardModule, NbButtonModule, NbIconModule, NbToastrService } from '@nebular/theme';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LeaveService } from '../../../core/services/leave.service';
import { Holiday } from '../../../core/models';

@Component({
  selector: 'app-holiday-list',
  standalone: true,
  imports: [NbCardModule, NbButtonModule, NbIconModule, RouterLink, DatePipe],
  templateUrl: './holiday-list.html',
  styleUrl: './holiday-list.scss',
})
export class HolidayListComponent implements OnInit {
  holidays = signal<Holiday[]>([]);
  constructor(private leaveService: LeaveService, private toastr: NbToastrService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.leaveService.getHolidays().subscribe({ next: (res) => this.holidays.set(res.data) }); }
  delete(id: string): void {
    if (!confirm('Stergeti sarbatoarea?')) return;
    this.leaveService.deleteHoliday(id).subscribe({ next: () => { this.toastr.success('Stearsa', 'Succes'); this.load(); } });
  }
}
