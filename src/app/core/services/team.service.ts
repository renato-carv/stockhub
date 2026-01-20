import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userRole?: TeamRole;
}

export interface TeamMember {
  id: string;
  role: TeamRole;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface CreateTeamDto {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateTeamDto {
  name?: string;
  slug?: string;
  description?: string;
}

export interface AddTeamMemberDto {
  userId: string;
  role: TeamRole;
}

export interface UpdateTeamMemberRoleDto {
  role: TeamRole;
}

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private readonly apiUrl = environment.apiUrl;
  private readonly STORAGE_KEY = 'stockhub_current_team_id';

  teams = signal<Team[]>([]);
  currentTeam = signal<Team | null>(null);
  members = signal<TeamMember[]>([]);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  getSavedTeamId(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  private saveTeamId(teamId: string): void {
    localStorage.setItem(this.STORAGE_KEY, teamId);
  }

  private clearSavedTeamId(): void {
    localStorage.removeItem(this.STORAGE_KEY);
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
        })
      );
  }

  getAllByOrganization(orgId: string): Observable<Team[]> {
    this.isLoading.set(true);
    return this.http
      .get<Team[]>(`${this.apiUrl}/organizations/${orgId}/teams/all`, {
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

  update(teamId: string, dto: UpdateTeamDto): Observable<Team> {
    this.isLoading.set(true);
    return this.http
      .patch<Team>(`${this.apiUrl}/teams/${teamId}`, dto, {
        withCredentials: true,
      })
      .pipe(
        tap((updatedTeam) => {
          this.teams.update((teams) =>
            teams.map((t) => (t.id === teamId ? updatedTeam : t))
          );
          if (this.currentTeam()?.id === teamId) {
            this.currentTeam.set(updatedTeam);
          }
          this.isLoading.set(false);
        })
      );
  }

  delete(teamId: string): Observable<Team> {
    this.isLoading.set(true);
    return this.http
      .delete<Team>(`${this.apiUrl}/teams/${teamId}`, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.teams.update((teams) => teams.filter((t) => t.id !== teamId));
          if (this.currentTeam()?.id === teamId) {
            this.currentTeam.set(null);
          }
          this.isLoading.set(false);
        })
      );
  }

  // Team Members
  getMembers(teamId: string): Observable<TeamMember[]> {
    this.isLoading.set(true);
    return this.http
      .get<TeamMember[]>(`${this.apiUrl}/teams/${teamId}/members`, {
        withCredentials: true,
      })
      .pipe(
        tap((members) => {
          this.members.set(members);
          this.isLoading.set(false);
        })
      );
  }

  addMember(teamId: string, dto: AddTeamMemberDto): Observable<TeamMember> {
    this.isLoading.set(true);
    return this.http
      .post<TeamMember>(`${this.apiUrl}/teams/${teamId}/members`, dto, {
        withCredentials: true,
      })
      .pipe(
        tap((member) => {
          this.members.update((members) => [...members, member]);
          this.isLoading.set(false);
        })
      );
  }

  updateMemberRole(
    teamId: string,
    userId: string,
    dto: UpdateTeamMemberRoleDto
  ): Observable<TeamMember> {
    this.isLoading.set(true);
    return this.http
      .patch<TeamMember>(
        `${this.apiUrl}/teams/${teamId}/members/${userId}`,
        dto,
        {
          withCredentials: true,
        }
      )
      .pipe(
        tap((updatedMember) => {
          this.members.update((members) =>
            members.map((m) =>
              m.user.id === userId ? updatedMember : m
            )
          );
          this.isLoading.set(false);
        })
      );
  }

  removeMember(teamId: string, userId: string): Observable<TeamMember> {
    this.isLoading.set(true);
    return this.http
      .delete<TeamMember>(`${this.apiUrl}/teams/${teamId}/members/${userId}`, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.members.update((members) =>
            members.filter((m) => m.user.id !== userId)
          );
          this.isLoading.set(false);
        })
      );
  }

  setCurrentTeam(team: Team): void {
    this.currentTeam.set(team);
    this.saveTeamId(team.id);
  }

  clear(): void {
    this.teams.set([]);
    this.currentTeam.set(null);
    this.members.set([]);
    this.clearSavedTeamId();
  }
}
