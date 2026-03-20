import { Component, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatFormFieldModule, MatInputModule, MatSnackBarModule,
    MatTooltipModule, RouterLink, DatePipe, NgClass, UpperCasePipe, FormsModule,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserListComponent implements OnInit {
  users = signal<User[]>([]);
  totalItems = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);
  search = '';
  loading = signal(false);

  displayedColumns = ['name', 'email', 'role', 'status', 'createdAt', 'actions'];

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService.getAll({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.search || undefined,
    }).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.totalItems.set(res.pagination.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadUsers();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.loadUsers();
  }

  deactivateUser(id: string): void {
    if (!confirm('Sigur doriți să dezactivați utilizatorul?')) return;
    this.userService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Utilizator dezactivat', 'OK', { duration: 3000 });
        this.loadUsers();
      },
    });
  }

  getRoleBadgeClass(role: string): string {
    return `role-${role}`;
  }
}
