import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NbCardModule, NbInputModule, NbSelectModule, NbDatepickerModule, NbButtonModule, NbIconModule, NbSpinnerModule, NbToastrService } from '@nebular/theme';
import { LeaveService } from '../../../core/services/leave.service';
import { LeaveType } from '../../../core/models';

@Component({
  selector: 'app-leave-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NbCardModule, NbInputModule, NbSelectModule, NbDatepickerModule, NbButtonModule, NbIconModule, NbSpinnerModule],
  templateUrl: './leave-create.html',
  styleUrl: './leave-create.scss',
})
export class LeaveCreateComponent implements OnInit {
  form: FormGroup;
  leaveTypes = signal<LeaveType[]>([]);
  workingDays = signal<number | null>(null);
  loading = signal(false);
  calculating = signal(false);

  constructor(private fb: FormBuilder, private leaveService: LeaveService, private router: Router, private toastr: NbToastrService) {
    this.form = this.fb.group({ leaveTypeId: ['', Validators.required], startDate: ['', Validators.required], endDate: ['', Validators.required], reason: [''] });
  }

  ngOnInit(): void {
    this.leaveService.getLeaveTypes(true).subscribe({ next: (res) => this.leaveTypes.set(res.data) });
    this.form.get('startDate')?.valueChanges.subscribe(() => this.calculateDays());
    this.form.get('endDate')?.valueChanges.subscribe(() => this.calculateDays());
  }

  calculateDays(): void {
    const start = this.form.get('startDate')?.value;
    const end = this.form.get('endDate')?.value;
    if (!start || !end) { this.workingDays.set(null); return; }
    this.calculating.set(true);
    this.leaveService.calculateDays(new Date(start).toISOString().split('T')[0], new Date(end).toISOString().split('T')[0]).subscribe({
      next: (res) => { this.workingDays.set(res.data.workingDays); this.calculating.set(false); },
      error: () => { this.workingDays.set(null); this.calculating.set(false); },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const { leaveTypeId, startDate, endDate, reason } = this.form.value;
    this.leaveService.create({ leaveTypeId, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), reason }).subscribe({
      next: () => { this.toastr.success('Cererea a fost trimisa!', 'Succes'); this.router.navigate(['/leaves']); },
      error: (err) => { this.loading.set(false); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); },
    });
  }
}
