import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NbCardModule, NbInputModule, NbSelectModule, NbButtonModule, NbIconModule, NbToggleModule, NbToastrService } from '@nebular/theme';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NbCardModule, NbInputModule, NbSelectModule, NbButtonModule, NbIconModule, NbToggleModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserFormComponent implements OnInit {
  form: FormGroup;
  isEdit = signal(false);
  userId = '';
  loading = signal(false);

  constructor(private fb: FormBuilder, private userService: UserService, private route: ActivatedRoute, private router: Router, private toastr: NbToastrService) {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(8)]], firstName: ['', Validators.required], lastName: ['', Validators.required], role: ['employee', Validators.required], isActive: [true] });
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.params['id'];
    if (this.userId) {
      this.isEdit.set(true);
      this.form.get('password')?.clearValidators(); this.form.get('password')?.updateValueAndValidity(); this.form.get('email')?.disable();
      this.userService.getById(this.userId).subscribe({ next: (res) => this.form.patchValue({ email: res.data.email, firstName: res.data.firstName, lastName: res.data.lastName, role: res.data.role, isActive: res.data.isActive }) });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    if (this.isEdit()) {
      const { firstName, lastName, role, isActive } = this.form.value;
      this.userService.update(this.userId, { firstName, lastName, role, isActive }).subscribe({ next: () => { this.toastr.success('Actualizat', 'Succes'); this.router.navigate(['/users']); }, error: (err) => { this.loading.set(false); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); } });
    } else {
      const { email, password, firstName, lastName, role } = this.form.value;
      this.userService.create({ email, password, firstName, lastName, role }).subscribe({ next: () => { this.toastr.success('Creat', 'Succes'); this.router.navigate(['/users']); }, error: (err) => { this.loading.set(false); this.toastr.danger(err.error?.message || 'Eroare', 'Eroare'); } });
    }
  }
}
