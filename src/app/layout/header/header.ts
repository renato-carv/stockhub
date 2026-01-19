import { Component, inject } from '@angular/core';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { OrganizationService } from '../../core/services/organization.service';
import { TeamService } from '../../core/services/team.service';
import { SidebarService } from '../sidebar/sidebar.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  imports: [ThemeToggle, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  protected organizationService = inject(OrganizationService);
  protected teamService = inject(TeamService);
  protected sidebarService = inject(SidebarService);

  onOrganizationChange(orgId: string) {
    const org = this.organizationService.organizations().find((o) => o.id === orgId);
    if (org) {
      this.organizationService.setCurrentOrganization(org);
      this.teamService.getByOrganization(org.id).subscribe();
    }
  }

  onTeamChange(teamId: string) {
    const team = this.teamService.teams().find((t) => t.id === teamId);
    if (team) {
      this.teamService.setCurrentTeam(team);
    }
  }
}
