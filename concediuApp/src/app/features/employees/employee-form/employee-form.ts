import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NbCardModule, NbInputModule, NbSelectModule, NbDatepickerModule, NbButtonModule, NbIconModule, NbToastrService } from '@nebular/theme';
import { EmployeeService } from '../../../core/services/employee.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NbCardModule, NbInputModule, NbSelectModule, NbDatepickerModule, NbButtonModule, NbIconModule],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
})
export class EmployeeFormComponent implements OnInit {
  form: FormGroup;
  isEdit = signal(false);
  employeeId = '';
  users = signal<User[]>([]);
  managers = signal<User[]>([]);
  loading = signal(false);

  constructor(private fb: FormBuilder, private employeeService: EmployeeService, private userService: UserService, private route: ActivatedRoute, private router: Router, private toastr: NbToastrService) {
    this.form = this.fb.group({ userId: ['', Validators.required], department: ['', Validators.required], position: ['', Validators.required], hireDate: ['', Validators.required], manager: [''], totalLeaveDays: [21, [Validators.required, Validators.min(0)]], phone: [''], cnp: [''] });
  }

  ngOnInit(): void {
    this.userService.getAll({ limit: 100 }).subscribe({ next: (res) => { this.users.set(res.data); this.managers.set(res.data.filter(u => u.role === 'manager' || u.role === 'admin')); } });
    this.employeeId = this.route.snapshot.params['id'];
    if (this.employeeId) {
      this.isEdit.set(true);
      this.form.get('userId')?.disable();
      this.employeeService.getById(this.employeeId).subscribe({ next: (res) => { const e = res.data; this.form.patchValue({ userId: e.user?._id, department: e.department, position: e.position, hireDate: new Date(e.hireDate), manager: e.manager?._id || '', totalLeaveDays: e.totalLeaveDays, phone: e.phone, cnp: e.cnp }); } });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const val = this.form.getRawValue();
    const req$ = this.isEdit()
      ? this.employeeService.update(this.employeeId, { department: val.department, position: val.position, hireDate: new Date(val.hireDate).toISOString(), manager: val.manager || null, totalLeaveDays: val.totalLeaveDays, phone: val.phone, cnp: val.cnp })
      : this.employeeService.create({ userId: val.userId, department: val.department, position: val.position, hireDate: new Date(val.hireDate).toISOString(), manager: val.manager || undefined, totalLeaveDays: val.totalLeaveDays, phone: val.phone, cnp: val.cnp });
    req$.subscribe({
      next: () => { this.toastr.success(this.isEdit() ? 'Actualizat' : 'Creat', 'Succes'); this.router.navigate(['/employees']); },
      error: (err) => { this.loading.set(false); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); },
    });
  }
}
