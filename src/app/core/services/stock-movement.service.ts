import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
export type MovementReason = 'PURCHASE' | 'SALE' | 'RETURN' | 'LOSS' | 'ADJUSTMENT' | 'OTHER';

export interface StockMovement {
  id: string;
  productId: string;
  userId: string;
  teamId: string;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  previousStock: number;
  newStock: number;
  notes?: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  user: {
    id: string;
    name: string;
  };
}

export interface CreateStockMovementDto {
  productId: string;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  notes?: string;
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
  type?: MovementType;
  reason?: MovementReason;
  productId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class StockMovementService {
  private readonly apiUrl = environment.apiUrl;

  allMovements = signal<StockMovement[]>([]);
  movements = signal<StockMovement[]>([]);
  paginationMeta = signal<PaginationMeta | null>(null);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  getByTeam(teamId: string, params?: PaginationParams): Observable<StockMovement[]> {
    this.isLoading.set(true);

    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.reason) httpParams = httpParams.set('reason', params.reason);
    if (params?.productId) httpParams = httpParams.set('productId', params.productId);

    return this.http
      .get<StockMovement[]>(`${this.apiUrl}/teams/${teamId}/stock-movements`, {
        withCredentials: true,
        params: httpParams,
      })
      .pipe(
        tap((response: any) => {
          const data = response.data ?? response.items ?? response;
          const allData = Array.isArray(data) ? data : [];

          this.allMovements.set(allData);
          this.movements.set(allData);

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

  getByProduct(teamId: string, productId: string): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(
      `${this.apiUrl}/teams/${teamId}/stock-movements/product/${productId}`,
      { withCredentials: true }
    );
  }

  getById(teamId: string, movementId: string): Observable<StockMovement> {
    return this.http.get<StockMovement>(
      `${this.apiUrl}/teams/${teamId}/stock-movements/${movementId}`,
      { withCredentials: true }
    );
  }

  create(teamId: string, dto: CreateStockMovementDto): Observable<StockMovement> {
    this.isLoading.set(true);
    return this.http
      .post<StockMovement>(`${this.apiUrl}/teams/${teamId}/stock-movements`, dto, {
        withCredentials: true,
      })
      .pipe(
        tap((movement) => {
          this.movements.update((movements) => [movement, ...movements]);
          this.allMovements.update((movements) => [movement, ...movements]);
        }),
        catchError((error) => {
          console.error('Erro ao criar movimentação:', error);
          return throwError(() => error);
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      );
  }
}
