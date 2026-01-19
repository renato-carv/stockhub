import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  isCollapsed = signal(false);
  isMobileOpen = signal(false);

  toggle() {
    this.isCollapsed.update((v) => !v);
  }

  collapse() {
    this.isCollapsed.set(true);
  }

  expand() {
    this.isCollapsed.set(false);
  }

  toggleMobile() {
    this.isMobileOpen.update((v) => !v);
  }

  openMobile() {
    this.isMobileOpen.set(true);
  }

  closeMobile() {
    this.isMobileOpen.set(false);
  }
}
