import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard that only allows access to guests (non-authenticated users).
 * If user is authenticated, redirects to /home.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};
