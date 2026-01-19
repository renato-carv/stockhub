import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OrganizationService } from './organization.service';
import { TeamService } from './team.service';

/**
 * Guard que verifica se o usuário tem organização e equipe configuradas.
 * Se não tiver, redireciona para /home onde o modal de setup será exibido.
 */
export const setupGuard: CanActivateFn = () => {
  const organizationService = inject(OrganizationService);
  const teamService = inject(TeamService);
  const router = inject(Router);

  const hasOrganization = organizationService.organizations().length > 0;
  const hasTeam = teamService.teams().length > 0;

  if (hasOrganization && hasTeam) {
    return true;
  }

  // Redireciona para home onde o modal de setup será exibido
  router.navigate(['/home']);
  return false;
};
