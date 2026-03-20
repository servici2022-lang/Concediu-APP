import { Component, OnInit, signal } from '@angular/core';
import { NbCardModule, NbButtonModule, NbIconModule, NbToastrService } from '@nebular/theme';
import { RouterLink } from '@angular/router';
import { LeaveService } from '../../../core/services/leave.service';
import { LeaveType } from '../../../core/models';

@Component({
  selector: 'app-leave-type-list',
  standalone: true,
  imports: [NbCardModule, NbButtonModule, NbIconModule, RouterLink],
  templateUrl: './leave-type-list.html',
  styleUrl: './leave-type-list.scss',
})
export class LeaveTypeListComponent implements OnInit {
  leaveTypes = signal<LeaveType[]>([]);
  constructor(private leaveService: LeaveService, private toastr: NbToastrService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.leaveService.getLeaveTypes().subscribe({ next: (res) => this.leaveTypes.set(res.data) }); }
  deactivate(id: string): void {
    if (!confirm('Dezactivati?')) return;
    this.leaveService.deleteLeaveType(id).subscribe({ next: () => { this.toastr.success('Dezactivat', 'Succes'); this.load(); } });
  }
}
