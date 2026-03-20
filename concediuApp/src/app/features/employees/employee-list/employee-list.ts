import { Component, OnInit, signal } from '@angular/core';
import { NbCardModule, NbButtonModule, NbIconModule, NbInputModule, NbToastrService } from '@nebular/theme';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employee } from '../../../core/models';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [NbCardModule, NbButtonModule, NbIconModule, NbInputModule, RouterLink, DatePipe, FormsModule],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
})
export class EmployeeListComponent implements OnInit {
  employees = signal<Employee[]>([]);
  search = '';
  isAdmin = false;

  constructor(private employeeService: EmployeeService, private auth: AuthService, private toastr: NbToastrService) {
    this.isAdmin = this.auth.hasRole('admin');
  }

  ngOnInit(): void { this.load(); }
  load(): void { this.employeeService.getAll({ limit: 100, search: this.search || undefined }).subscribe({ next: (res) => this.employees.set(res.data) }); }
  onSearch(): void { this.load(); }
  delete(id: string): void {
    if (!confirm('Sigur doriti sa stergeti?')) return;
    this.employeeService.delete(id).subscribe({ next: () => { this.toastr.success('Sters', 'Succes'); this.load(); } });
  }
}
