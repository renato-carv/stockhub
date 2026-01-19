import { Component, inject, OnInit } from '@angular/core';
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
export class MainLayout implements OnInit {
  protected sidebarService = inject(SidebarService);
  private organizationService = inject(OrganizationService);
  private teamService = inject(TeamService);

  ngOnInit(): void {
    this.loadUserData();
  }

  private loadUserData(): void {
    // Only load if not already loaded
    if (this.organizationService.organizations().length > 0) {
      return;
    }

    this.organizationService.getAll().subscribe({
      next: (orgs) => {
        if (orgs.length > 0) {
          const currentOrg = this.organizationService.currentOrganization() || orgs[0];
          this.organizationService.setCurrentOrganization(currentOrg);
          this.loadTeams(currentOrg.id);
        }
      },
    });
  }

  private loadTeams(orgId: string): void {
    this.teamService.getByOrganization(orgId).subscribe({
      next: (teams) => {
        if (teams.length > 0) {
          const currentTeam = this.teamService.currentTeam() || teams[0];
          this.teamService.setCurrentTeam(currentTeam);
        }
      },
    });
  }
}
