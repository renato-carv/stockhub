import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamDto {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private readonly apiUrl = environment.apiUrl;

  teams = signal<Team[]>([]);
  currentTeam = signal<Team | null>(null);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  getByOrganization(orgId: string): Observable<Team[]> {
    this.isLoading.set(true);
    return this.http
      .get<Team[]>(`${this.apiUrl}/organizations/${orgId}/teams`, {
        withCredentials: true,
      })
      .pipe(
        tap((teams) => {
          this.teams.set(teams);
          this.isLoading.set(false);
        })
      );
  }

  getById(teamId: string): Observable<Team> {
    return this.http
      .get<Team>(`${this.apiUrl}/teams/${teamId}`, {
        withCredentials: true,
      })
      .pipe(
        tap((team) => {
          this.currentTeam.set(team);
        })
      );
  }

  create(orgId: string, dto: CreateTeamDto): Observable<Team> {
    this.isLoading.set(true);
    return this.http
      .post<Team>(`${this.apiUrl}/organizations/${orgId}/teams`, dto, {
        withCredentials: true,
      })
      .pipe(
        tap((team) => {
          this.teams.update((teams) => [...teams, team]);
          this.currentTeam.set(team);
          this.isLoading.set(false);
        })
      );
  }

  setCurrentTeam(team: Team): void {
    this.currentTeam.set(team);
  }

  clear(): void {
    this.teams.set([]);
    this.currentTeam.set(null);
  }
}
