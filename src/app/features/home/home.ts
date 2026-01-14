import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { OrganizationService } from '../../core/services/organization.service';
import { TeamService } from '../../core/services/team.service';
import { DashboardService } from '../../core/services/dashboard.service';

type OnboardingStep = 'welcome' | 'create-org' | 'create-team' | 'complete';

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  // Estado do onboarding
  onboardingStep = signal<OnboardingStep>('welcome');

  // Formulários
  orgForm = {
    name: '',
    slug: '',
    description: '',
  };

  teamForm = {
    name: '',
    slug: '',
    description: '',
  };

  // Estado computado
  hasOrganization = computed(() => this.organizationService.organizations().length > 0);
  hasTeam = computed(() => this.teamService.teams().length > 0);
  showDashboard = computed(() => this.hasOrganization() && this.hasTeam());

  // Loading states
  isCreatingOrg = signal(false);
  isCreatingTeam = signal(false);

  constructor(
    public authService: AuthService,
    public organizationService: OrganizationService,
    public teamService: TeamService,
    public dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  private loadUserData(): void {
    this.organizationService.getAll().subscribe({
      next: (orgs) => {
        if (orgs.length > 0) {
          const currentOrg = orgs[0];
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
          const currentTeam = teams[0];
          this.teamService.setCurrentTeam(currentTeam);
          this.loadDashboard(currentTeam.id);
        }
      },
    });
  }

  private loadDashboard(teamId: string): void {
    this.dashboardService.getFullDashboard(teamId).subscribe();
  }

  // Onboarding actions
  startOnboarding(): void {
    this.onboardingStep.set('create-org');
  }

  generateSlug(name: string, type: 'org' | 'team'): void {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    if (type === 'org') {
      this.orgForm.slug = slug;
    } else {
      this.teamForm.slug = slug;
    }
  }

  createOrganization(): void {
    if (!this.orgForm.name || !this.orgForm.slug) return;

    this.isCreatingOrg.set(true);
    this.organizationService.create({
      name: this.orgForm.name,
      slug: this.orgForm.slug,
      description: this.orgForm.description || undefined,
    }).subscribe({
      next: () => {
        this.isCreatingOrg.set(false);
        this.onboardingStep.set('create-team');
      },
      error: () => {
        this.isCreatingOrg.set(false);
      },
    });
  }

  createTeam(): void {
    if (!this.teamForm.name || !this.teamForm.slug) return;

    const currentOrg = this.organizationService.currentOrganization();
    if (!currentOrg) return;

    this.isCreatingTeam.set(true);
    this.teamService.create(currentOrg.id, {
      name: this.teamForm.name,
      slug: this.teamForm.slug,
      description: this.teamForm.description || undefined,
    }).subscribe({
      next: (team) => {
        this.isCreatingTeam.set(false);
        this.onboardingStep.set('complete');
        // Carrega o dashboard após criar o team
        setTimeout(() => {
          this.loadDashboard(team.id);
        }, 2000);
      },
      error: () => {
        this.isCreatingTeam.set(false);
      },
    });
  }

  finishOnboarding(): void {
    const currentTeam = this.teamService.currentTeam();
    if (currentTeam) {
      this.loadDashboard(currentTeam.id);
    }
  }

  // Dashboard helpers
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  getMovementTypeClass(type: string): string {
    switch (type) {
      case 'ENTRY': return 'type-entry';
      case 'EXIT': return 'type-exit';
      case 'ADJUSTMENT': return 'type-adjustment';
      default: return '';
    }
  }

  getMovementTypeLabel(type: string): string {
    switch (type) {
      case 'ENTRY': return 'Entrada';
      case 'EXIT': return 'Saída';
      case 'ADJUSTMENT': return 'Ajuste';
      default: return type;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
