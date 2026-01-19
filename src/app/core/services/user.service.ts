import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  imageUrl?: string;
}

export interface UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  isLoading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  updateProfile(userId: string, data: UpdateUserDto): Observable<User> {
    this.isLoading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    return this.http
      .patch<User>(`${this.apiUrl}/${userId}`, data, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.isLoading.set(false);
          this.successMessage.set('Perfil atualizado com sucesso!');
        }),
        catchError((err) => {
          this.isLoading.set(false);
          const message = err.error?.message || 'Erro ao atualizar perfil.';
          this.error.set(message);
          return throwError(() => err);
        })
      );
  }

  updatePassword(userId: string, data: UpdatePasswordDto): Observable<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    return this.http
      .patch<void>(`${this.apiUrl}/${userId}/password`, data, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.isLoading.set(false);
          this.successMessage.set('Senha atualizada com sucesso!');
        }),
        catchError((err) => {
          this.isLoading.set(false);
          const message = err.error?.message || 'Erro ao atualizar senha.';
          this.error.set(message);
          return throwError(() => err);
        })
      );
  }

  clearMessages(): void {
    this.error.set(null);
    this.successMessage.set(null);
  }
}
