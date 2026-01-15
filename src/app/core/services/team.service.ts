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
  private readonly STORAGE_KEY = 'stockhub_teams';
  private readonly CURRENT_KEY = 'stockhub_current_team';

  teams = signal<Team[]>([]);
  currentTeam = signal<Team | null>(null);
  isLoading = signal(false);

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const teamsData = localStorage.getItem(this.STORAGE_KEY);
      if (teamsData) {
        this.teams.set(JSON.parse(teamsData));
      }

      const currentData = localStorage.getItem(this.CURRENT_KEY);
      if (currentData) {
        this.currentTeam.set(JSON.parse(currentData));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.teams()));
      const current = this.currentTeam();
      if (current) {
        localStorage.setItem(this.CURRENT_KEY, JSON.stringify(current));
      }
    } catch {
      // Ignore storage errors
    }
  }

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
          this.saveToStorage();
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
          this.saveToStorage();
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
          this.saveToStorage();
        })
      );
  }

  setCurrentTeam(team: Team): void {
    this.currentTeam.set(team);
    this.saveToStorage();
  }

  clearStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.CURRENT_KEY);
    this.teams.set([]);
    this.currentTeam.set(null);
  }
}
