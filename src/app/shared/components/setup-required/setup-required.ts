import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OrganizationService } from '../../../core/services/organization.service';
import { TeamService } from '../../../core/services/team.service';

@Component({
  selector: 'app-setup-required',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './setup-required.html',
  styleUrl: './setup-required.css',
})
export class SetupRequired {
  private router = inject(Router);
  private organizationService = inject(OrganizationService);
  private teamService = inject(TeamService);

  hasOrganization = computed(() => this.organizationService.organizations().length > 0);
  hasTeam = computed(() => this.teamService.teams().length > 0);

  startSetup(): void {
    this.router.navigate(['/home']);
  }
}
