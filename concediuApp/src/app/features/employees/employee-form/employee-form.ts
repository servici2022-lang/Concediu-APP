import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { EmployeeService } from '../../../core/services/employee.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  providers: [provideNativeDateAdapter()],
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

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      userId: ['', Validators.required],
      department: ['', Validators.required],
      position: ['', Validators.required],
      hireDate: ['', Validators.required],
      manager: [''],
      totalLeaveDays: [21, [Validators.required, Validators.min(0)]],
      phone: [''],
      cnp: [''],
    });
  }

  ngOnInit(): void {
    this.loadUsers();

    this.employeeId = this.route.snapshot.params['id'];
    if (this.employeeId) {
      this.isEdit.set(true);
      this.form.get('userId')?.disable();
      this.loadEmployee();
    }
  }

  private loadUsers(): void {
    this.userService.getAll({ limit: 100 }).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.managers.set(res.data.filter((u) => u.role === 'manager' || u.role === 'admin'));
      },
    });
  }

  private loadEmployee(): void {
    this.employeeService.getById(this.employeeId).subscribe({
      next: (res) => {
        const e = res.data;
        this.form.patchValue({
          userId: e.user?._id,
          department: e.department,
          position: e.position,
          hireDate: new Date(e.hireDate),
          manager: e.manager?._id || '',
          totalLeaveDays: e.totalLeaveDays,
          phone: e.phone,
          cnp: e.cnp,
        });
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);

    const val = this.form.getRawValue();

    if (this.isEdit()) {
      this.employeeService
        .update(this.employeeId, {
          department: val.department,
          position: val.position,
          hireDate: new Date(val.hireDate).toISOString(),
          manager: val.manager || null,
          totalLeaveDays: val.totalLeaveDays,
          phone: val.phone,
          cnp: val.cnp,
        })
        .subscribe({
          next: () => {
            this.snackBar.open('Angajat actualizat', 'OK', { duration: 3000 });
            this.router.navigate(['/employees']);
          },
          error: (err) => {
            this.loading.set(false);
            this.snackBar.open(err.error?.message || 'Eroare', 'OK', { duration: 3000 });
          },
        });
    } else {
      this.employeeService
        .create({
          userId: val.userId,
          department: val.department,
          position: val.position,
          hireDate: new Date(val.hireDate).toISOString(),
          manager: val.manager || undefined,
          totalLeaveDays: val.totalLeaveDays,
          phone: val.phone,
          cnp: val.cnp,
        })
        .subscribe({
          next: () => {
            this.snackBar.open('Angajat creat', 'OK', { duration: 3000 });
            this.router.navigate(['/employees']);
          },
          error: (err) => {
            this.loading.set(false);
            this.snackBar.open(err.error?.message || 'Eroare', 'OK', { duration: 3000 });
          },
        });
    }
  }
}
