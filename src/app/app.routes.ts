import { Routes } from '@angular/router';
import { authGuard } from './core/services/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/landing/landing').then((m) => m.Landing) },
  { path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  { path: 'register', loadComponent: () => import('./features/register/register').then((m) => m.Register) },
  { path: 'home', loadComponent: () => import('./features/home/home').then((m) => m.Home), canActivate: [authGuard] },
];
