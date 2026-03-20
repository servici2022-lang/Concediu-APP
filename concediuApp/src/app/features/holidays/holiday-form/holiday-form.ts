import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NbCardModule, NbInputModule, NbDatepickerModule, NbButtonModule, NbIconModule, NbToggleModule, NbToastrService } from '@nebular/theme';
import { LeaveService } from '../../../core/services/leave.service';

@Component({
  selector: 'app-holiday-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NbCardModule, NbInputModule, NbDatepickerModule, NbButtonModule, NbIconModule, NbToggleModule],
  templateUrl: './holiday-form.html',
  styleUrl: './holiday-form.scss',
})
export class HolidayFormComponent implements OnInit {
  form: FormGroup;
  isEdit = signal(false);
  holidayId = '';
  loading = signal(false);

  constructor(private fb: FormBuilder, private leaveService: LeaveService, private route: ActivatedRoute, private router: Router, private toastr: NbToastrService) {
    this.form = this.fb.group({ name: ['', Validators.required], date: ['', Validators.required], recurring: [true] });
  }

  ngOnInit(): void {
    this.holidayId = this.route.snapshot.params['id'];
    if (this.holidayId) { this.isEdit.set(true); this.leaveService.getHoliday(this.holidayId).subscribe({ next: (res) => this.form.patchValue({ ...res.data, date: new Date(res.data.date) }) }); }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const val = { ...this.form.value, date: new Date(this.form.value.date).toISOString() };
    const req$ = this.isEdit() ? this.leaveService.updateHoliday(this.holidayId, val) : this.leaveService.createHoliday(val);
    req$.subscribe({
      next: () => { this.toastr.success(this.isEdit() ? 'Actualizata' : 'Creata', 'Succes'); this.router.navigate(['/holidays']); },
      error: (err) => { this.loading.set(false); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); },
    });
  }
}
