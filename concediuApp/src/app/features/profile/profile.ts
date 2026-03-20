import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { NbCardModule, NbInputModule, NbButtonModule, NbIconModule, NbToastrService, NbProgressBarModule } from '@nebular/theme';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { EmployeeService } from '../../core/services/employee.service';
import { Employee, LeaveBalance } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, NbCardModule, NbInputModule, NbButtonModule, NbIconModule, NbProgressBarModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private employeeService = inject(EmployeeService);
  private fb = inject(FormBuilder);
  private toastr = inject(NbToastrService);

  user = this.auth.currentUser;
  employee = signal<Employee | null>(null);
  balance = signal<LeaveBalance | null>(null);
  loading = signal(false);

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    const userId = this.user()?.id;
    if (!userId) return;
    this.employeeService.getByUserId(userId).subscribe({
      next: (res) => {
        this.employee.set(res.data);
        this.employeeService.getBalance(res.data._id).subscribe({
          next: (b) => this.balance.set(b.data),
        });
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.loading.set(true);
    this.userService.changePassword(this.passwordForm.value as any).subscribe({
      next: () => { this.toastr.success('Parola a fost schimbata', 'Succes'); this.passwordForm.reset(); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); },
    });
  }
}
