import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile').then((m) => m.ProfileComponent),
      },
      // Leaves
      {
        path: 'leaves',
        loadComponent: () =>
          import('./features/leaves/leave-list/leave-list').then((m) => m.LeaveListComponent),
      },
      {
        path: 'leaves/create',
        loadComponent: () =>
          import('./features/leaves/leave-create/leave-create').then(
            (m) => m.LeaveCreateComponent,
          ),
      },
      // Employees (admin, manager)
      {
        path: 'employees',
        canActivate: [roleGuard('admin', 'manager')],
        loadComponent: () =>
          import('./features/employees/employee-list/employee-list').then(
            (m) => m.EmployeeListComponent,
          ),
      },
      {
        path: 'employees/new',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/employees/employee-form/employee-form').then(
            (m) => m.EmployeeFormComponent,
          ),
      },
      {
        path: 'employees/:id/edit',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/employees/employee-form/employee-form').then(
            (m) => m.EmployeeFormComponent,
          ),
      },
      // Users (admin only)
      {
        path: 'users',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/users/user-list/user-list').then((m) => m.UserListComponent),
      },
      {
        path: 'users/new',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/users/user-form/user-form').then((m) => m.UserFormComponent),
      },
      {
        path: 'users/:id/edit',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/users/user-form/user-form').then((m) => m.UserFormComponent),
      },
      // Leave Types (admin only)
      {
        path: 'leave-types',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/leave-types/leave-type-list/leave-type-list').then(
            (m) => m.LeaveTypeListComponent,
          ),
      },
      {
        path: 'leave-types/new',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/leave-types/leave-type-form/leave-type-form').then(
            (m) => m.LeaveTypeFormComponent,
          ),
      },
      {
        path: 'leave-types/:id/edit',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/leave-types/leave-type-form/leave-type-form').then(
            (m) => m.LeaveTypeFormComponent,
          ),
      },
      // Holidays (admin only)
      {
        path: 'holidays',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/holidays/holiday-list/holiday-list').then(
            (m) => m.HolidayListComponent,
          ),
      },
      {
        path: 'holidays/new',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/holidays/holiday-form/holiday-form').then(
            (m) => m.HolidayFormComponent,
          ),
      },
      {
        path: 'holidays/:id/edit',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/holidays/holiday-form/holiday-form').then(
            (m) => m.HolidayFormComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
