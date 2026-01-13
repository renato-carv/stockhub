import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface User {
  id: string;
  email: string;
  name: string;
}

interface LoginResponse {
  user: User;
  message?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  user = signal<User | null>(null);
  isAuthenticated = signal(false);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: LoginCredentials): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials, {
        withCredentials: true,
      })
      .subscribe({
        next: (response) => {
          this.user.set(response.user);
          this.isAuthenticated.set(true);
          this.isLoading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.error.set(err.error?.message || 'Erro ao fazer login. Verifique suas credenciais.');
        },
      });
  }

  logout(): void {
    this.http
      .post(
        `${this.apiUrl}/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      )
      .subscribe({
        next: () => {
          this.user.set(null);
          this.isAuthenticated.set(false);
          this.router.navigate(['/login']);
        },
        error: () => {
          this.user.set(null);
          this.isAuthenticated.set(false);
          this.router.navigate(['/login']);
        },
      });
  }

  checkAuth(): void {
    this.http
      .get<{ user: User }>(`${this.apiUrl}/auth/me`, {
        withCredentials: true,
      })
      .subscribe({
        next: (response) => {
          this.user.set(response.user);
          this.isAuthenticated.set(true);
        },
        error: () => {
          this.user.set(null);
          this.isAuthenticated.set(false);
        },
      });
  }

  register(credentials: RegisterCredentials): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/register`, credentials, {
        withCredentials: true,
      })
      .subscribe({
        next: (response) => {
          this.user.set(response.user);
          this.isAuthenticated.set(true);
          this.isLoading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.error.set(err.error?.message || 'Erro ao registrar. Tente novamente.');
        },
      });
  }
}
