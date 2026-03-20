import { Component, OnInit, signal } from '@angular/core';
import { NbCardModule, NbButtonModule, NbIconModule, NbInputModule, NbToastrService } from '@nebular/theme';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [NbCardModule, NbButtonModule, NbIconModule, NbInputModule, RouterLink, DatePipe, NgClass, UpperCasePipe, FormsModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserListComponent implements OnInit {
  users = signal<User[]>([]);
  search = '';
  constructor(private userService: UserService, private toastr: NbToastrService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.userService.getAll({ limit: 100, search: this.search || undefined }).subscribe({ next: (res) => this.users.set(res.data) }); }
  onSearch(): void { this.load(); }
  deactivate(id: string): void {
    if (!confirm('Dezactivati utilizatorul?')) return;
    this.userService.delete(id).subscribe({ next: () => { this.toastr.success('Dezactivat', 'Succes'); this.load(); } });
  }
}
