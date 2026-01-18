import { Routes } from '@angular/router';
import { authGuard } from './core/services/auth.guard';
import { guestGuard } from './core/services/guest.guard';

export const routes: Routes = [
  // Landing page - accessible to everyone, redirects to /home if already logged in
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
    canActivate: [guestGuard],
  },

  // Public routes (guest only)
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/register/register').then((m) => m.Register),
    canActivate: [guestGuard],
  },

  // Protected routes (auth required)
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    children: [
      { path: 'home', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
      { path: 'products', loadComponent: () => import('./features/product/product').then((m) => m.Product) },
      { path: 'categories', loadComponent: () => import('./features/category/category').then((m) => m.Category) },
      { path: 'movements', loadComponent: () => import('./features/movement/movement').then((m) => m.Movement) },
      { path: 'reports', loadComponent: () => import('./features/reports/reports').then((m) => m.Reports) },
      { path: 'chat', loadComponent: () => import('./features/chat/chat').then((m) => m.Chat) },
    ],
  },
];
