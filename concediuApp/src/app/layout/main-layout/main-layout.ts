import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../core/models';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: Role[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    UpperCasePipe,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayoutComponent {
  private auth = inject(AuthService);
  private breakpointObserver = inject(BreakpointObserver);

  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile = signal(false);
  user = this.auth.currentUser;

  private readonly allNavItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['admin', 'manager', 'employee'] },
    { label: 'Cererile Mele', icon: 'event_note', route: '/leaves', roles: ['admin', 'manager', 'employee'] },
    { label: 'Cerere Nouă', icon: 'add_circle', route: '/leaves/create', roles: ['admin', 'manager', 'employee'] },
    { label: 'Angajați', icon: 'people', route: '/employees', roles: ['admin', 'manager'] },
    { label: 'Utilizatori', icon: 'manage_accounts', route: '/users', roles: ['admin'] },
    { label: 'Tipuri Concediu', icon: 'category', route: '/leave-types', roles: ['admin'] },
    { label: 'Sărbători Legale', icon: 'celebration', route: '/holidays', roles: ['admin'] },
  ];

  navItems = computed(() => {
    const role = this.auth.userRole();
    if (!role) return [];
    return this.allNavItems.filter((item) => item.roles.includes(role));
  });

  constructor() {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe((result) => {
      this.isMobile.set(result.matches);
    });
  }

  logout(): void {
    this.auth.logout();
  }

  onNavClick(): void {
    if (this.isMobile()) {
      this.sidenav.close();
    }
  }
}
