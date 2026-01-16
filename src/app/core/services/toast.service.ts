import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 0;
  toasts = signal<ToastMessage[]>([]);

  success(title: string, message?: string, duration = 4000): void {
    this.show('success', title, message, duration);
  }

  error(title: string, message?: string, duration = 5000): void {
    this.show('error', title, message, duration);
  }

  warning(title: string, message?: string, duration = 4000): void {
    this.show('warning', title, message, duration);
  }

  info(title: string, message?: string, duration = 4000): void {
    this.show('info', title, message, duration);
  }

  private show(type: ToastType, title: string, message?: string, duration = 4000): void {
    const id = this.nextId++;
    const toast: ToastMessage = { id, type, title, message, duration };

    this.toasts.update((toasts) => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  remove(id: number): void {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
