import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { SidebarService } from '../sidebar/sidebar.service';
import { OrganizationService } from '../../core/services/organization.service';
import { TeamService } from '../../core/services/team.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  protected sidebarService = inject(SidebarService);
  private organizationService = inject(OrganizationService);
  private teamService = inject(TeamService);

  // Mostra layout se tiver organização E equipe, OU se o usuário pulou o onboarding
  showLayout = computed(() => {
    const hasOrg = this.organizationService.organizations().length > 0;
    const hasTeam = this.teamService.teams().length > 0;
    const skipped = this.organizationService.skippedOnboarding();
    return (hasOrg && hasTeam) || skipped;
  });
}
