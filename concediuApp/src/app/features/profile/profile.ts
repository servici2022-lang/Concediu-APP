import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { EmployeeService } from '../../core/services/employee.service';
import { Employee, LeaveBalance } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule, MatProgressBarModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private employeeService = inject(EmployeeService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

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
      next: () => {
        this.snackBar.open('Parola a fost schimbată', 'OK', { duration: 3000 });
        this.passwordForm.reset();
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(err.error?.message || 'Eroare', 'OK', { duration: 3000 });
      },
    });
  }
}
