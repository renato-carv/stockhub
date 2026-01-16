import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

    return this.http
      .get<StockMovement[]>(`${this.apiUrl}/teams/${teamId}/stock-movements`, {
        withCredentials: true,
      })
      .pipe(
        tap((response: any) => {
          const rawData = Array.isArray(response) ? response : (response.data ?? response.items ?? []);
          let filteredData = [...rawData];

          // Filtrar por busca
          if (params?.search) {
            const searchLower = params.search.toLowerCase();
            filteredData = filteredData.filter(m =>
              m.product?.name?.toLowerCase().includes(searchLower) ||
              m.product?.sku?.toLowerCase().includes(searchLower) ||
              m.user?.name?.toLowerCase().includes(searchLower) ||
              m.notes?.toLowerCase().includes(searchLower)
            );
          }

          // Filtrar por tipo
          if (params?.type) {
            filteredData = filteredData.filter(m => m.type === params.type);
          }

          // Filtrar por motivo
          if (params?.reason) {
            filteredData = filteredData.filter(m => m.reason === params.reason);
          }

          // Filtrar por produto
          if (params?.productId) {
            filteredData = filteredData.filter(m => m.productId === params.productId);
          }

          // Paginação no frontend
          const page = params?.page ?? 1;
          const limit = params?.limit ?? 10;
          const total = filteredData.length;
          const totalPages = Math.ceil(total / limit);
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedData = filteredData.slice(startIndex, endIndex);

          this.allMovements.set(rawData);
          this.movements.set(paginatedData);
          this.paginationMeta.set({
            total,
            page,
            limit,
            totalPages,
          });

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
