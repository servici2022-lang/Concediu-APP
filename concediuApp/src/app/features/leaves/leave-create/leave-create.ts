import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import { RouterLink } from '@angular/router';
import { LeaveService } from '../../../core/services/leave.service';
import { LeaveType } from '../../../core/models';

@Component({
  selector: 'app-leave-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './leave-create.html',
  styleUrl: './leave-create.scss',
})
export class LeaveCreateComponent implements OnInit {
  form: FormGroup;
  leaveTypes = signal<LeaveType[]>([]);
  workingDays = signal<number | null>(null);
  loading = signal(false);
  calculating = signal(false);

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      leaveTypeId: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      reason: [''],
    });
  }

  ngOnInit(): void {
    this.leaveService.getLeaveTypes(true).subscribe({
      next: (res) => this.leaveTypes.set(res.data),
    });

    // Auto-calculate working days when dates change
    this.form.get('startDate')?.valueChanges.subscribe(() => this.calculateDays());
    this.form.get('endDate')?.valueChanges.subscribe(() => this.calculateDays());
  }

  calculateDays(): void {
    const start = this.form.get('startDate')?.value;
    const end = this.form.get('endDate')?.value;

    if (!start || !end) {
      this.workingDays.set(null);
      return;
    }

    this.calculating.set(true);
    const startStr = new Date(start).toISOString().split('T')[0];
    const endStr = new Date(end).toISOString().split('T')[0];

    this.leaveService.calculateDays(startStr, endStr).subscribe({
      next: (res) => {
        this.workingDays.set(res.data.workingDays);
        this.calculating.set(false);
      },
      error: () => {
        this.workingDays.set(null);
        this.calculating.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    const { leaveTypeId, startDate, endDate, reason } = this.form.value;

    this.leaveService
      .create({
        leaveTypeId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Cererea a fost trimisă cu succes!', 'OK', { duration: 3000 });
          this.router.navigate(['/leaves']);
        },
        error: (err) => {
          this.loading.set(false);
          this.snackBar.open(err.error?.message || 'Eroare la trimiterea cererii', 'OK', {
            duration: 5000,
          });
        },
      });
  }
}
