import { HttpInterceptorFn, HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, filter, from, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

// Rotas de autenticação que não devem triggerar refresh
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/logout', '/auth/refresh'];

function isAuthRoute(url: string): boolean {
  return AUTH_ROUTES.some(route => url.includes(route));
}

// Usa fetch nativo para evitar passar pelo interceptor Angular
async function refreshToken(): Promise<boolean> {
  const apiUrl = environment.apiUrl;

  try {
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Importante: envia cookies
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Fastify exige body quando Content-Type é json
    });

    return response.ok;
  } catch {
    return false;
  }
}

function handleRefreshToken(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  error: HttpErrorResponse,
  router: Router,
  authService: AuthService
): Observable<any> {
  // Se já está fazendo refresh, aguarda o resultado
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter(result => result !== null),
      take(1),
      switchMap((success) => {
        if (success) {
          // Refresh bem-sucedido, repete a requisição original
          return next(req);
        }
        return throwError(() => error);
      })
    );
  }

  // Inicia o processo de refresh
  isRefreshing = true;
  refreshTokenSubject.next(null);

  // Usa fetch nativo para o refresh (não passa pelo interceptor)
  return from(refreshToken()).pipe(
    switchMap((success) => {
      isRefreshing = false;

      if (success) {
        refreshTokenSubject.next(true);
        // Repete a requisição original após refresh bem-sucedido
        return next(req);
      }

      // Refresh falhou
      refreshTokenSubject.next(false);
      authService.clearAuth();
      router.navigate(['/login']);
      return throwError(() => error);
    }),
    catchError((refreshError) => {
      isRefreshing = false;
      refreshTokenSubject.next(false);
      authService.clearAuth();
      router.navigate(['/login']);
      return throwError(() => refreshError);
    })
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Adiciona withCredentials para enviar cookies em todas as requisições
  const clonedReq = req.clone({
    withCredentials: true,
  });

  // Se for rota de auth, não faz nada especial (só envia com credentials)
  if (isAuthRoute(req.url)) {
    return next(clonedReq);
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Se não for erro 401, propaga o erro normalmente
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Tenta fazer refresh do token (passa a req clonada com credentials)
      return handleRefreshToken(clonedReq, next, error, router, authService);
    })
  );
};
