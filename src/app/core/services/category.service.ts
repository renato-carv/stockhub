import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface BulkCreateCategoryResult {
  created: number;
  errors: number;
  errorDetails: { name: string; error: string }[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly apiUrl = environment.apiUrl;

  // Dados brutos da API (todos os itens)
  allCategories = signal<Category[]>([]);

  // Dados paginados para exibição
  categories = signal<Category[]>([]);
  paginationMeta = signal<PaginationMeta | null>(null);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  getByTeam(teamId: string, params?: PaginationParams): Observable<PaginatedResponse<Category>> {
    this.isLoading.set(true);

    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http
      .get<PaginatedResponse<Category>>(`${this.apiUrl}/teams/${teamId}/categories`, {
        withCredentials: true,
        params: httpParams,
      })
      .pipe(
        tap((response: any) => {
          const data = response.data ?? response.items ?? response;
          const allData = Array.isArray(data) ? data : [];

          this.categories.set(allData);

          // Se carregou com limit alto, também atualiza allCategories
          if ((params?.limit ?? 10) >= 100) {
            this.allCategories.set(allData);
          }

          if (response.meta) {
            this.paginationMeta.set(response.meta);
          } else {
            this.paginationMeta.set({
              total: allData.length,
              page: params?.page ?? 1,
              limit: params?.limit ?? 10,
              totalPages: Math.ceil(allData.length / (params?.limit ?? 10)),
            });
          }

          this.isLoading.set(false);
        })
      );
  }

  create(teamId: string, dto: CreateCategoryDto): Observable<Category> {
    this.isLoading.set(true);
    return this.http
      .post<Category>(`${this.apiUrl}/teams/${teamId}/categories`, dto, {
        withCredentials: true,
      })
      .pipe(
        tap((category) => {
          this.categories.update((categories) => [...categories, category]);
          this.isLoading.set(false);
        })
      );
  }

  update(teamId: string, categoryId: string, dto: UpdateCategoryDto): Observable<Category> {
    this.isLoading.set(true);
    return this.http
      .patch<Category>(`${this.apiUrl}/teams/${teamId}/categories/${categoryId}`, dto, {
        withCredentials: true,
      })
      .pipe(
        tap((updatedCategory) => {
          this.categories.update((categories) =>
            categories.map((c) => (c.id === categoryId ? updatedCategory : c))
          );
          this.isLoading.set(false);
        })
      );
  }

  delete(teamId: string, categoryId: string): Observable<void> {
    this.isLoading.set(true);
    return this.http
      .delete<void>(`${this.apiUrl}/teams/${teamId}/categories/${categoryId}`, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.categories.update((categories) => categories.filter((c) => c.id !== categoryId));
          this.isLoading.set(false);
        })
      );
  }

  bulkCreate(teamId: string, categories: CreateCategoryDto[]): Observable<BulkCreateCategoryResult> {
    this.isLoading.set(true);
    return this.http
      .post<BulkCreateCategoryResult>(`${this.apiUrl}/teams/${teamId}/categories/bulk`, { categories }, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.isLoading.set(false);
        })
      );
  }

  getAllForExport(teamId: string): Observable<Category[]> {
    return this.http
      .get<PaginatedResponse<Category>>(`${this.apiUrl}/teams/${teamId}/categories`, {
        withCredentials: true,
        params: new HttpParams().set('limit', '10000'),
      })
      .pipe(
        tap((response: any) => {
          const data = response.data ?? response.items ?? response;
          const allData = Array.isArray(data) ? data : [];
          this.allCategories.set(allData);
        })
      );
  }
}
