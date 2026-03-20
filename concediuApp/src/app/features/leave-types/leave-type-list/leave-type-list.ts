import { Component, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LeaveService } from '../../../core/services/leave.service';
import { LeaveType } from '../../../core/models';

@Component({
  selector: 'app-leave-type-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule, RouterLink],
  templateUrl: './leave-type-list.html',
  styleUrl: './leave-type-list.scss',
})
export class LeaveTypeListComponent implements OnInit {
  leaveTypes = signal<LeaveType[]>([]);
  displayedColumns = ['color', 'name', 'description', 'isPaid', 'deducts', 'status', 'actions'];

  constructor(private leaveService: LeaveService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.leaveService.getLeaveTypes().subscribe({ next: (res) => this.leaveTypes.set(res.data) });
  }

  deactivate(id: string): void {
    if (!confirm('Sigur doriți să dezactivați acest tip de concediu?')) return;
    this.leaveService.deleteLeaveType(id).subscribe({
      next: () => { this.snackBar.open('Tip dezactivat', 'OK', { duration: 3000 }); this.load(); },
    });
  }
}
