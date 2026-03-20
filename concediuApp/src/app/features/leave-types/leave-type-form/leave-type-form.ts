import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NbCardModule, NbInputModule, NbButtonModule, NbIconModule, NbToggleModule, NbToastrService } from '@nebular/theme';
import { LeaveService } from '../../../core/services/leave.service';

@Component({
  selector: 'app-leave-type-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NbCardModule, NbInputModule, NbButtonModule, NbIconModule, NbToggleModule],
  templateUrl: './leave-type-form.html',
  styleUrl: './leave-type-form.scss',
})
export class LeaveTypeFormComponent implements OnInit {
  form: FormGroup;
  isEdit = signal(false);
  leaveTypeId = '';
  loading = signal(false);

  constructor(private fb: FormBuilder, private leaveService: LeaveService, private route: ActivatedRoute, private router: Router, private toastr: NbToastrService) {
    this.form = this.fb.group({ name: ['', Validators.required], description: [''], color: ['#1976d2', Validators.required], isPaid: [true], deductsFromAllowance: [true], isActive: [true] });
  }

  ngOnInit(): void {
    this.leaveTypeId = this.route.snapshot.params['id'];
    if (this.leaveTypeId) { this.isEdit.set(true); this.leaveService.getLeaveType(this.leaveTypeId).subscribe({ next: (res) => this.form.patchValue(res.data) }); }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const req$ = this.isEdit() ? this.leaveService.updateLeaveType(this.leaveTypeId, this.form.value) : this.leaveService.createLeaveType(this.form.value);
    req$.subscribe({
      next: () => { this.toastr.success(this.isEdit() ? 'Actualizat' : 'Creat', 'Succes'); this.router.navigate(['/leave-types']); },
      error: (err) => { this.loading.set(false); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); },
    });
  }
}
