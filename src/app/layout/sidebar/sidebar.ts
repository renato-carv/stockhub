import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from './sidebar.service';
import { OrganizationService } from '../../core/services/organization.service';
import { TeamService } from '../../core/services/team.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private router = inject(Router);
  protected authService = inject(AuthService);
  protected sidebarService = inject(SidebarService);
  private organizationService = inject(OrganizationService);
  private teamService = inject(TeamService);

  get isCollapsed() {
    return this.sidebarService.isCollapsed;
  }

  userName = computed(() => {
    const user = this.authService.user();
    return user?.name?.split(' ')[0] || 'Usuário';
  });

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  logout() {
    this.authService.logout();
    this.organizationService.clearStorage();
    this.teamService.clearStorage();
    this.router.navigate(['/login']);
  }
}
