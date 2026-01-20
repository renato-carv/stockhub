import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { OrganizationService, CreateOrganizationDto } from '../../core/services/organization.service';
import { TeamService, CreateTeamDto } from '../../core/services/team.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ToastService } from '../../core/services/toast.service';
import { SetupRequired } from '../../shared/components/setup-required/setup-required';

type OnboardingStep = 'welcome' | 'create-org' | 'create-team' | 'complete' | 'skipped';

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, SetupRequired],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  // Estado computado
  hasOrganization = computed(() => this.organizationService.organizations().length > 0);
  hasTeam = computed(() => this.teamService.teams().length > 0);
  showDashboard = computed(() => this.hasOrganization() && this.hasTeam());

  // Effect para recarregar dashboard quando a equipe mudar
  private teamEffect = effect(() => {
    const team = this.teamService.currentTeam();
    if (team && this.showDashboard()) {
      this.loadDashboard(team.id);
    }
  });

  // Onboarding state
  currentStep = signal<OnboardingStep>('welcome');

  // Formulário de organização
  orgName = signal('');
  orgSlug = signal('');
  orgDescription = signal('');
  orgLogoFile = signal<File | null>(null);
  orgLogoPreview = signal<string | null>(null);

  // Formulário de equipe
  teamName = signal('');
  teamSlug = signal('');
  teamDescription = signal('');
  teamLogoFile = signal<File | null>(null);
  teamLogoPreview = signal<string | null>(null);

  private toastService = inject(ToastService);

  constructor(
    public authService: AuthService,
    public organizationService: OrganizationService,
    public teamService: TeamService,
    public dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    // Os dados são carregados pelo MainLayout
    // Apenas carrega o dashboard se já tiver equipe selecionada
    const team = this.teamService.currentTeam();
    if (team) {
      this.loadDashboard(team.id);
    }
  }

  private loadDashboard(teamId: string): void {
    this.dashboardService.getFullDashboard(teamId).subscribe();
  }

  // Onboarding navigation
  startOnboarding(): void {
    this.currentStep.set('create-org');
  }

  goToTeamStep(): void {
    this.currentStep.set('create-team');
  }

  skipSetup(): void {
    this.currentStep.set('skipped');
  }


  // Slug generation
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  onOrgNameChange(value: string): void {
    this.orgName.set(value);
    this.orgSlug.set(this.generateSlug(value));
  }

  onTeamNameChange(value: string): void {
    this.teamName.set(value);
    this.teamSlug.set(this.generateSlug(value));
  }

  // Logo handling
  onOrgLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.orgLogoFile.set(file);
      this.orgLogoPreview.set(URL.createObjectURL(file));
    }
  }

  removeOrgLogo(): void {
    if (this.orgLogoPreview()) {
      URL.revokeObjectURL(this.orgLogoPreview()!);
    }
    this.orgLogoFile.set(null);
    this.orgLogoPreview.set(null);
  }

  onTeamLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.teamLogoFile.set(file);
      this.teamLogoPreview.set(URL.createObjectURL(file));
    }
  }

  removeTeamLogo(): void {
    if (this.teamLogoPreview()) {
      URL.revokeObjectURL(this.teamLogoPreview()!);
    }
    this.teamLogoFile.set(null);
    this.teamLogoPreview.set(null);
  }

  // Form submissions
  createOrganization(): void {
    const dto: CreateOrganizationDto = {
      name: this.orgName(),
      slug: this.orgSlug(),
      description: this.orgDescription() || undefined,
      logoUrl: this.orgLogoPreview() || undefined,
    };

    this.organizationService.create(dto).subscribe({
      next: () => {
        this.currentStep.set('create-team');
        this.toastService.success('Organização criada', 'Agora vamos criar sua primeira equipe.');
      },
      error: () => {
        this.toastService.error('Erro ao criar', 'Não foi possível criar a organização.');
      },
    });
  }

  createTeam(): void {
    const orgId = this.organizationService.currentOrganization()?.id;
    if (!orgId) return;

    const dto: CreateTeamDto = {
      name: this.teamName(),
      slug: this.teamSlug(),
      description: this.teamDescription() || undefined,
    };

    this.teamService.create(orgId, dto).subscribe({
      next: () => {
        this.currentStep.set('complete');
        this.toastService.success('Equipe criada', 'Tudo pronto! Você já pode começar a usar o sistema.');
      },
      error: () => {
        this.toastService.error('Erro ao criar', 'Não foi possível criar a equipe.');
      },
    });
  }

  goToDashboard(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      this.loadDashboard(teamId);
    }
  }

  onSetupCompleted(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      this.loadDashboard(teamId);
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
