import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { NbLayoutModule, NbSidebarModule, NbSidebarService, NbMenuModule, NbMenuService, NbButtonModule, NbIconModule, NbUserModule, NbContextMenuModule, NbMenuItem } from '@nebular/theme';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../core/models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, UpperCasePipe, NbLayoutModule, NbSidebarModule, NbMenuModule, NbButtonModule, NbIconModule, NbUserModule, NbContextMenuModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private sidebarService = inject(NbSidebarService);
  private menuService = inject(NbMenuService);
  private router = inject(Router);

  user = this.auth.currentUser;

  private readonly allNavItems = [
    { title: 'Dashboard', icon: 'home-outline', link: '/dashboard', roles: ['admin', 'manager', 'employee'] as Role[] },
    { title: 'Cererile Mele', icon: 'calendar-outline', link: '/leaves', roles: ['admin', 'manager', 'employee'] as Role[] },
    { title: 'Cerere Noua', icon: 'plus-circle-outline', link: '/leaves/create', roles: ['admin', 'manager', 'employee'] as Role[] },
    { title: 'Angajati', icon: 'people-outline', link: '/employees', roles: ['admin', 'manager'] as Role[] },
    { title: 'Utilizatori', icon: 'person-outline', link: '/users', roles: ['admin'] as Role[] },
    { title: 'Tipuri Concediu', icon: 'layers-outline', link: '/leave-types', roles: ['admin'] as Role[] },
    { title: 'Sarbatori Legale', icon: 'gift-outline', link: '/holidays', roles: ['admin'] as Role[] },
  ];

  menuItems = computed<NbMenuItem[]>(() => {
    const role = this.auth.userRole();
    if (!role) return [];
    return this.allNavItems.filter((i) => i.roles.includes(role)).map((i) => ({ title: i.title, icon: i.icon, link: i.link }));
  });

  userMenuItems: NbMenuItem[] = [
    { title: 'Profil', icon: 'person-outline' },
    { title: 'Deconectare', icon: 'log-out-outline' },
  ];

  ngOnInit(): void {
    this.menuService.onItemClick().pipe(filter(({ tag }) => tag === 'user-menu'), map(({ item }) => item.title)).subscribe((title) => {
      if (title === 'Deconectare') this.auth.logout();
      else if (title === 'Profil') this.router.navigate(['/profile']);
    });
  }

  toggleSidebar(): void { this.sidebarService.toggle(true, 'main-sidebar'); }
}
