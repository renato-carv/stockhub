import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TeamService } from './team.service';

export const teamAdminGuard: CanActivateFn = () => {
  const teamService = inject(TeamService);
  const router = inject(Router);

  const team = teamService.currentTeam();

  // Se a equipe ainda não foi carregada, permite acesso
  // O componente Team tem um effect que redireciona se não tiver permissão
  if (!team) {
    return true;
  }

  if (team.userRole === 'OWNER' || team.userRole === 'ADMIN') {
    return true;
  }

  router.navigate(['/home']);
  return false;
};
