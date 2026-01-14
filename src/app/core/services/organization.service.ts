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

  organizations = signal<Organization[]>([]);
  currentOrganization = signal<Organization | null>(null);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

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
        })
      );
  }

  setCurrentOrganization(org: Organization): void {
    this.currentOrganization.set(org);
  }
}
