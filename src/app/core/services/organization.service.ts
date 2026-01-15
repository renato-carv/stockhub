import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationDto {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private readonly apiUrl = environment.apiUrl;
  private readonly STORAGE_KEY = 'stockhub_organizations';
  private readonly CURRENT_KEY = 'stockhub_current_org';
  private readonly SKIPPED_KEY = 'stockhub_skipped_onboarding';

  organizations = signal<Organization[]>([]);
  currentOrganization = signal<Organization | null>(null);
  isLoading = signal(false);
  skippedOnboarding = signal(false);

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const orgsData = localStorage.getItem(this.STORAGE_KEY);
      if (orgsData) {
        this.organizations.set(JSON.parse(orgsData));
      }

      const currentData = localStorage.getItem(this.CURRENT_KEY);
      if (currentData) {
        this.currentOrganization.set(JSON.parse(currentData));
      }

      const skippedData = localStorage.getItem(this.SKIPPED_KEY);
      if (skippedData) {
        this.skippedOnboarding.set(JSON.parse(skippedData));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.organizations()));
      const current = this.currentOrganization();
      if (current) {
        localStorage.setItem(this.CURRENT_KEY, JSON.stringify(current));
      }
      localStorage.setItem(this.SKIPPED_KEY, JSON.stringify(this.skippedOnboarding()));
    } catch {
      // Ignore storage errors
    }
  }

  getAll(): Observable<Organization[]> {
    this.isLoading.set(true);
    return this.http
      .get<Organization[]>(`${this.apiUrl}/organizations`, {
        withCredentials: true,
      })
      .pipe(
        tap((orgs) => {
          this.organizations.set(orgs);
          this.isLoading.set(false);
          this.saveToStorage();
        })
      );
  }

  getById(id: string): Observable<Organization> {
    return this.http
      .get<Organization>(`${this.apiUrl}/organizations/${id}`, {
        withCredentials: true,
      })
      .pipe(
        tap((org) => {
          this.currentOrganization.set(org);
          this.saveToStorage();
        })
      );
  }

  create(dto: CreateOrganizationDto): Observable<Organization> {
    this.isLoading.set(true);
    return this.http
      .post<Organization>(`${this.apiUrl}/organizations`, dto, {
        withCredentials: true,
      })
      .pipe(
        tap((org) => {
          this.organizations.update((orgs) => [...orgs, org]);
          this.currentOrganization.set(org);
          this.isLoading.set(false);
          this.saveToStorage();
        })
      );
  }

  setCurrentOrganization(org: Organization): void {
    this.currentOrganization.set(org);
    this.saveToStorage();
  }

  setSkippedOnboarding(skipped: boolean): void {
    this.skippedOnboarding.set(skipped);
    this.saveToStorage();
  }

  clearStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.CURRENT_KEY);
    localStorage.removeItem(this.SKIPPED_KEY);
    this.organizations.set([]);
    this.currentOrganization.set(null);
    this.skippedOnboarding.set(false);
  }
}
