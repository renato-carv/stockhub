import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  categoryId?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  maxStock?: number;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

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
  categoryId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly apiUrl = environment.apiUrl;

  // Dados brutos da API (todos os itens)
  allProducts = signal<Product[]>([]);

  // Dados paginados para exibição
  products = signal<Product[]>([]);
  paginationMeta = signal<PaginationMeta | null>(null);
  currentProduct = signal<Product | null>(null);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  getByTeam(teamId: string, params?: PaginationParams): Observable<PaginatedResponse<Product>> {
    this.isLoading.set(true);

    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);

    return this.http
      .get<PaginatedResponse<Product>>(`${this.apiUrl}/teams/${teamId}/products`, {
        withCredentials: true,
        params: httpParams,
      })
      .pipe(
        tap((response: any) => {
          // Suporte a diferentes formatos de resposta da API
          const rawData = response.data ?? response.items ?? response;
          const allData = Array.isArray(rawData) ? rawData : [];

          // Filtrar por busca se necessário
          let filteredData = allData;
          if (params?.search) {
            const searchLower = params.search.toLowerCase();
            filteredData = allData.filter(p =>
              p.name.toLowerCase().includes(searchLower) ||
              p.sku.toLowerCase().includes(searchLower) ||
              p.description?.toLowerCase().includes(searchLower)
            );
          }

          // Filtrar por categoria se necessário
          if (params?.categoryId) {
            filteredData = filteredData.filter(p => p.categoryId === params.categoryId);
          }

          // Verificar se a API já paginou (retornou menos que o total)
          const apiAlreadyPaginated = response.meta && response.data && response.data.length < response.meta.total;

          if (apiAlreadyPaginated) {
            // API já fez a paginação
            this.allProducts.set(allData);
            this.products.set(response.data);
            this.paginationMeta.set(response.meta);
          } else {
            // Fazer paginação no frontend
            const page = params?.page ?? 1;
            const limit = params?.limit ?? 10;
            const total = filteredData.length;
            const totalPages = Math.ceil(total / limit);
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedData = filteredData.slice(startIndex, endIndex);

            this.allProducts.set(allData);
            this.products.set(paginatedData);
            this.paginationMeta.set({
              total,
              page,
              limit,
              totalPages,
            });
          }

          this.isLoading.set(false);
        })
      );
  }

  getById(teamId: string, productId: string): Observable<Product> {
    return this.http
      .get<Product>(`${this.apiUrl}/teams/${teamId}/products/${productId}`, {
        withCredentials: true,
      })
      .pipe(
        tap((product) => {
          this.currentProduct.set(product);
        })
      );
  }

  create(teamId: string, dto: CreateProductDto): Observable<Product> {
    this.isLoading.set(true);
    return this.http
      .post<Product>(`${this.apiUrl}/teams/${teamId}/products`, dto, {
        withCredentials: true,
      })
      .pipe(
        tap((product) => {
          this.products.update((products) => [...products, product]);
          this.isLoading.set(false);
        })
      );
  }

  update(teamId: string, productId: string, dto: UpdateProductDto): Observable<Product> {
    this.isLoading.set(true);
    return this.http
      .patch<Product>(`${this.apiUrl}/teams/${teamId}/products/${productId}`, dto, {
        withCredentials: true,
      })
      .pipe(
        tap((updatedProduct) => {
          this.products.update((products) =>
            products.map((p) => (p.id === productId ? updatedProduct : p))
          );
          this.currentProduct.set(updatedProduct);
          this.isLoading.set(false);
        })
      );
  }

  delete(teamId: string, productId: string): Observable<void> {
    this.isLoading.set(true);
    return this.http
      .delete<void>(`${this.apiUrl}/teams/${teamId}/products/${productId}`, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.products.update((products) => products.filter((p) => p.id !== productId));
          this.isLoading.set(false);
        })
      );
  }
}
