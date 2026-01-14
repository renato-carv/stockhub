import { Routes } from '@angular/router';
import { authGuard } from './core/services/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/landing/landing').then((m) => m.Landing) },
  { path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  { path: 'register', loadComponent: () => import('./features/register/register').then((m) => m.Register) },

  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    children: [
      { path: 'home', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
    ],
  },
];
