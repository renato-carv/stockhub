import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  TeamService,
  Team as TeamModel,
  TeamMember,
  CreateTeamDto,
  UpdateTeamDto,
  TeamRole,
} from '../../core/services/team.service';
import { OrganizationService } from '../../core/services/organization.service';
import { UserService, User } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SetupRequired } from '../../shared/components/setup-required/setup-required';

@Component({
  selector: 'app-team',
  imports: [CommonModule, FormsModule, SetupRequired],
  templateUrl: './team.html',
  styleUrl: './team.css',
})
export class Team {
  private router = inject(Router);
  private organizationService = inject(OrganizationService);
  private userService = inject(UserService);
  public teamService = inject(TeamService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  // Verificar se setup está completo (precisa ter pelo menos uma organização)
  isSetupComplete = computed(() => {
    return this.organizationService.organizations().length > 0;
  });

  // Effect para recarregar dados quando currentOrganization mudar
  private orgEffect = effect(() => {
    const org = this.organizationService.currentOrganization();
    if (org) {
      this.loadTeams();
    }
  });

  // Effect para redirecionar se o usuário não tiver permissão
  private permissionEffect = effect(() => {
    const team = this.teamService.currentTeam();
    if (team && team.userRole !== 'OWNER' && team.userRole !== 'ADMIN') {
      this.router.navigate(['/home']);
    }
  });

  // Modal states
  showModal = signal(false);
  isEditing = signal(false);
  editingTeamId = signal<string | null>(null);

  // Modal para confirmação de exclusão
  showDeleteModal = signal(false);
  teamToDelete = signal<TeamModel | null>(null);

  // Modal de membros
  showMembersModal = signal(false);
  selectedTeam = signal<TeamModel | null>(null);

  // Modal de adicionar membro
  showAddMemberModal = signal(false);
  memberEmail = signal('');
  selectedRole = signal<TeamRole>('MEMBER');
  foundUser = signal<User | null>(null);
  isSearchingUser = signal(false);
  userSearchError = signal<string | null>(null);

  // Modal de editar role do membro
  showEditMemberModal = signal(false);
  memberToEdit = signal<TeamMember | null>(null);
  editMemberRole = signal<TeamRole>('MEMBER');

  // Modal de remover membro
  showRemoveMemberModal = signal(false);
  memberToRemove = signal<TeamMember | null>(null);

  // Formulário da equipe
  teamName = signal('');
  teamSlug = signal('');
  teamDescription = signal('');

  // Busca
  searchQuery = signal('');

  // Stats
  totalTeams = computed(() => this.teamService.teams().length);
  activeTeams = computed(() =>
    this.teamService.teams().filter((t) => t.isActive).length
  );

  // Equipes filtradas
  filteredTeams = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.teamService.teams();

    return this.teamService.teams().filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.slug.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  });

  // Roles disponíveis
  roleOptions: { value: TeamRole; label: string }[] = [
    { value: 'OWNER', label: 'Proprietário' },
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'MEMBER', label: 'Membro' },
  ];

  private loadTeams(): void {
    const orgId = this.organizationService.currentOrganization()?.id;
    if (orgId) {
      // Tentar carregar todas as equipes (admin view)
      // Se falhar com 403, usar o endpoint normal (apenas equipes do usuário)
      this.teamService.getAllByOrganization(orgId).subscribe({
        error: (err) => {
          if (err.status === 403) {
            // Usuário não é admin da organização, carregar apenas suas equipes
            this.teamService.getByOrganization(orgId).subscribe();
          }
        },
      });
    }
  }

  // Busca com debounce
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  // Modal handlers
  openCreateModal(): void {
    this.resetForm();
    this.isEditing.set(false);
    this.editingTeamId.set(null);
    this.showModal.set(true);
  }

  openEditModal(team: TeamModel): void {
    this.isEditing.set(true);
    this.editingTeamId.set(team.id);

    this.teamName.set(team.name);
    this.teamSlug.set(team.slug);
    this.teamDescription.set(team.description || '');

    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.teamName.set('');
    this.teamSlug.set('');
    this.teamDescription.set('');
  }

  // Slug generation
  generateSlug(): void {
    const name = this.teamName();
    if (name) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      this.teamSlug.set(slug);
    }
  }

  // CRUD operations
  saveTeam(): void {
    const orgId = this.organizationService.currentOrganization()?.id;
    if (!orgId) return;

    const dto: CreateTeamDto = {
      name: this.teamName(),
      slug: this.teamSlug(),
      description: this.teamDescription() || undefined,
    };

    if (this.isEditing() && this.editingTeamId()) {
      this.teamService
        .update(this.editingTeamId()!, dto as UpdateTeamDto)
        .subscribe({
          next: () => {
            this.closeModal();
            this.toastService.success(
              'Equipe atualizada',
              'As alterações foram salvas com sucesso.'
            );
          },
          error: (err) => {
            if (err.status === 409) {
              this.toastService.error(
                'Slug em uso',
                'Este identificador já está sendo usado por outra equipe.'
              );
            } else {
              this.toastService.error(
                'Erro ao atualizar',
                'Não foi possível atualizar a equipe.'
              );
            }
          },
        });
    } else {
      this.teamService.create(orgId, dto).subscribe({
        next: () => {
          this.closeModal();
          this.toastService.success(
            'Equipe criada',
            'A nova equipe foi criada com sucesso.'
          );
        },
        error: (err) => {
          if (err.status === 409) {
            this.toastService.error(
              'Slug em uso',
              'Este identificador já está sendo usado por outra equipe.'
            );
          } else {
            this.toastService.error(
              'Erro ao criar',
              'Não foi possível criar a equipe.'
            );
          }
        },
      });
    }
  }

  // Delete handlers
  openDeleteModal(team: TeamModel): void {
    this.teamToDelete.set(team);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.teamToDelete.set(null);
  }

  confirmDelete(): void {
    const team = this.teamToDelete();
    if (!team) return;

    this.teamService.delete(team.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.toastService.success(
          'Equipe removida',
          'A equipe foi excluída com sucesso.'
        );
      },
      error: () => {
        this.toastService.error(
          'Erro ao remover',
          'Não foi possível remover a equipe.'
        );
      },
    });
  }

  // Members handlers
  openMembersModal(team: TeamModel): void {
    this.selectedTeam.set(team);
    this.teamService.getMembers(team.id).subscribe({
      next: () => {
        this.showMembersModal.set(true);
      },
      error: () => {
        this.toastService.error(
          'Erro',
          'Não foi possível carregar os membros da equipe.'
        );
      },
    });
  }

  closeMembersModal(): void {
    this.showMembersModal.set(false);
    this.selectedTeam.set(null);
    this.teamService.members.set([]);
  }

  // Add member handlers
  openAddMemberModal(): void {
    this.memberEmail.set('');
    this.selectedRole.set('MEMBER');
    this.foundUser.set(null);
    this.userSearchError.set(null);
    this.showAddMemberModal.set(true);
  }

  closeAddMemberModal(): void {
    this.showAddMemberModal.set(false);
    this.memberEmail.set('');
    this.selectedRole.set('MEMBER');
    this.foundUser.set(null);
    this.userSearchError.set(null);
  }

  searchUserByEmail(): void {
    const email = this.memberEmail().trim();
    if (!email) {
      this.userSearchError.set('Digite um email para buscar.');
      return;
    }

    this.isSearchingUser.set(true);
    this.userSearchError.set(null);
    this.foundUser.set(null);

    this.userService.findByEmail(email).subscribe({
      next: (user) => {
        this.isSearchingUser.set(false);
        // Verificar se o usuário já é membro da equipe
        const currentMembers = this.teamService.members();
        const isAlreadyMember = currentMembers.some((m) => m.user.id === user.id);
        if (isAlreadyMember) {
          this.userSearchError.set('Este usuário já é membro da equipe.');
        } else {
          this.foundUser.set(user);
        }
      },
      error: (err) => {
        this.isSearchingUser.set(false);
        if (err.status === 404) {
          this.userSearchError.set('Usuário não encontrado com este email.');
        } else {
          this.userSearchError.set('Erro ao buscar usuário.');
        }
      },
    });
  }

  confirmAddMember(): void {
    const team = this.selectedTeam();
    const user = this.foundUser();
    const role = this.selectedRole();

    if (!team || !user) return;

    this.teamService.addMember(team.id, { userId: user.id, role }).subscribe({
      next: () => {
        this.closeAddMemberModal();
        this.toastService.success(
          'Membro adicionado',
          'O membro foi adicionado à equipe.'
        );
      },
      error: (err) => {
        if (err.status === 409) {
          this.toastService.error(
            'Membro existente',
            'Este usuário já é membro da equipe.'
          );
        } else if (err.status === 403) {
          this.toastService.error(
            'Sem permissão',
            err.error?.message || 'Você não tem permissão para adicionar membros.'
          );
        } else {
          this.toastService.error(
            'Erro',
            'Não foi possível adicionar o membro.'
          );
        }
      },
    });
  }

  // Edit member role handlers
  openEditMemberModal(member: TeamMember): void {
    this.memberToEdit.set(member);
    this.editMemberRole.set(member.role);
    this.showEditMemberModal.set(true);
  }

  closeEditMemberModal(): void {
    this.showEditMemberModal.set(false);
    this.memberToEdit.set(null);
    this.editMemberRole.set('MEMBER');
  }

  confirmEditMemberRole(): void {
    const team = this.selectedTeam();
    const member = this.memberToEdit();
    const role = this.editMemberRole();

    if (!team || !member) return;

    this.teamService
      .updateMemberRole(team.id, member.user.id, { role })
      .subscribe({
        next: () => {
          this.closeEditMemberModal();
          this.toastService.success(
            'Função atualizada',
            'A função do membro foi atualizada.'
          );
        },
        error: (err) => {
          if (err.status === 403) {
            this.toastService.error(
              'Sem permissão',
              err.error?.message || 'Você não tem permissão para alterar funções.'
            );
          } else {
            this.toastService.error(
              'Erro',
              'Não foi possível atualizar a função do membro.'
            );
          }
        },
      });
  }

  // Remove member handlers
  openRemoveMemberModal(member: TeamMember): void {
    this.memberToRemove.set(member);
    this.showRemoveMemberModal.set(true);
  }

  closeRemoveMemberModal(): void {
    this.showRemoveMemberModal.set(false);
    this.memberToRemove.set(null);
  }

  confirmRemoveMember(): void {
    const team = this.selectedTeam();
    const member = this.memberToRemove();

    if (!team || !member) return;

    this.teamService.removeMember(team.id, member.user.id).subscribe({
      next: () => {
        this.closeRemoveMemberModal();
        this.toastService.success(
          'Membro removido',
          'O membro foi removido da equipe.'
        );
      },
      error: (err) => {
        if (err.status === 403) {
          this.toastService.error(
            'Sem permissão',
            err.error?.message || 'Você não tem permissão para remover este membro.'
          );
        } else {
          this.toastService.error(
            'Erro',
            'Não foi possível remover o membro.'
          );
        }
      },
    });
  }

  // Helpers
  getRoleLabel(role: TeamRole): string {
    switch (role) {
      case 'OWNER':
        return 'Proprietário';
      case 'ADMIN':
        return 'Administrador';
      case 'MEMBER':
        return 'Membro';
      default:
        return role;
    }
  }

  getRoleClass(role: TeamRole): string {
    switch (role) {
      case 'OWNER':
        return 'owner';
      case 'ADMIN':
        return 'admin';
      case 'MEMBER':
        return 'member';
      default:
        return '';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  isCurrentUser(userId: string): boolean {
    return this.authService.user()?.id === userId;
  }

  // Verifica se o usuário atual pode editar/remover um membro
  canManageMember(member: TeamMember): boolean {
    const team = this.selectedTeam();
    if (!team?.userRole) return false;

    // OWNER pode gerenciar qualquer membro
    if (team.userRole === 'OWNER') return true;

    // ADMIN pode gerenciar apenas ADMIN e MEMBER, não pode mexer em OWNER
    if (team.userRole === 'ADMIN') {
      return member.role !== 'OWNER';
    }

    // MEMBER não pode gerenciar ninguém
    return false;
  }

  // Verifica se o usuário atual pode adicionar membros
  canAddMembers(): boolean {
    const team = this.selectedTeam();
    return team?.userRole === 'OWNER' || team?.userRole === 'ADMIN';
  }
}
