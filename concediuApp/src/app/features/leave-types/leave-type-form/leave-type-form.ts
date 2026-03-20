import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LeaveService } from '../../../core/services/leave.service';

@Component({
  selector: 'app-leave-type-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatSnackBarModule,
  ],
  templateUrl: './leave-type-form.html',
  styleUrl: './leave-type-form.scss',
})
export class LeaveTypeFormComponent implements OnInit {
  form: FormGroup;
  isEdit = signal(false);
  leaveTypeId = '';
  loading = signal(false);

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      color: ['#1976d2', Validators.required],
      isPaid: [true],
      deductsFromAllowance: [true],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.leaveTypeId = this.route.snapshot.params['id'];
    if (this.leaveTypeId) {
      this.isEdit.set(true);
      this.leaveService.getLeaveType(this.leaveTypeId).subscribe({
        next: (res) => this.form.patchValue(res.data),
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);

    const req$ = this.isEdit()
      ? this.leaveService.updateLeaveType(this.leaveTypeId, this.form.value)
      : this.leaveService.createLeaveType(this.form.value);

    req$.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit() ? 'Tip actualizat' : 'Tip creat', 'OK', { duration: 3000 });
        this.router.navigate(['/leave-types']);
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(err.error?.message || 'Eroare', 'OK', { duration: 3000 });
      },
    });
  }
}
