import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";
import { map, catchError } from "rxjs/operators";
import { of } from "rxjs";

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Se já está autenticado em memória, permite acesso
    if (authService.isAuthenticated()) {
        return true;
    }

    // Se não está autenticado, tenta verificar com o backend
    // Isso vai passar pelo interceptor que tentará refresh se receber 401
    return authService.checkAuth().pipe(
        map((user) => {
            if (user) {
                return true;
            }
            router.navigate(['/login']);
            return false;
        }),
        catchError(() => {
            router.navigate(['/login']);
            return of(false);
        })
    );
}