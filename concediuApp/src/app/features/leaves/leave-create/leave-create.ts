import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NbCardModule, NbInputModule, NbSelectModule, NbDatepickerModule, NbButtonModule, NbIconModule, NbSpinnerModule, NbToastrService } from '@nebular/theme';
import { EMPTY, catchError, map, merge, of, switchMap, tap } from 'rxjs';
import { LeaveService } from '../../../core/services/leave.service';
import { LeaveType } from '../../../core/models';
import { toDateOnly } from '../../../core/utils/date';

/** Data de sfârșit nu poate fi înaintea celei de început. */
const dateOrderValidator = (group: AbstractControl): ValidationErrors | null => {
  const start = group.get('startDate')?.value;
  const end = group.get('endDate')?.value;
  return start && end && end < start ? { dateOrder: true } : null;
};

@Component({
  selector: 'app-leave-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NbCardModule, NbInputModule, NbSelectModule, NbDatepickerModule, NbButtonModule, NbIconModule, NbSpinnerModule],
  templateUrl: './leave-create.html',
  styleUrl: './leave-create.scss',
})
export class LeaveCreateComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  form: FormGroup;
  leaveTypes = signal<LeaveType[]>([]);
  workingDays = signal<number | null>(null);
  loading = signal(false);
  calculating = signal(false);

  constructor(private fb: FormBuilder, private leaveService: LeaveService, private router: Router, private toastr: NbToastrService) {
    this.form = this.fb.group(
      { leaveTypeId: ['', Validators.required], startDate: ['', Validators.required], endDate: ['', Validators.required], reason: [''] },
      { validators: dateOrderValidator },
    );
  }

  ngOnInit(): void {
    this.leaveService.getLeaveTypes(true).subscribe({ next: (res) => this.leaveTypes.set(res.data) });

    const start = this.form.get('startDate')!;
    const end = this.form.get('endDate')!;
    // switchMap anulează calculul vechi: dacă datele se schimbă repede, nu mai apare un număr
    // de zile pentru un interval care nu mai e cel selectat.
    merge(start.valueChanges, end.valueChanges)
      .pipe(
        map(() => [start.value, end.value] as const),
        switchMap(([s, e]) => {
          if (!s || !e || e < s) {
            this.workingDays.set(null);
            this.calculating.set(false);
            return EMPTY;
          }
          this.calculating.set(true);
          return this.leaveService.calculateDays(toDateOnly(s), toDateOnly(e)).pipe(
            map((res) => res.data.workingDays as number | null),
            catchError(() => of(null)),
          );
        }),
        tap(() => this.calculating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((days) => this.workingDays.set(days));
  }

  onSubmit(): void {
    if (this.form.invalid || this.workingDays() === 0) return;
    this.loading.set(true);
    const { leaveTypeId, startDate, endDate, reason } = this.form.value;
    this.leaveService.create({ leaveTypeId, startDate: toDateOnly(startDate), endDate: toDateOnly(endDate), reason }).subscribe({
      next: () => { this.toastr.success('Cererea a fost trimisa!', 'Succes'); this.router.navigate(['/leaves']); },
      error: (err) => { this.loading.set(false); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); },
    });
  }
}
