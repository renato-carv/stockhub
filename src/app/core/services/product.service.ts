import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Product {
  id: string;
  teamId: string;
  name: string;
  description?: string | null;
  sku: string;
  barcode?: string | null;
  categoryId?: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock?: number | null;
  costPrice?: number | null;
  salePrice?: number | null;
  isActive: boolean;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  barcode?: string;
  categoryId?: string;
  unit: string;
  currentStock?: number;
  costPrice?: number;
  salePrice?: number;
  minStock?: number;
  maxStock?: number;
  imageUrl?: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface BulkCreateResult {
  created: number;
  errors: number;
  errorDetails: { sku: string; error: string }[];
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
          const data = response.data ?? response.items ?? response;
          const allData = Array.isArray(data) ? data : [];

          this.allProducts.set(allData);
          this.products.set(allData);

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

  delete(teamId: string, productId: string): Observable<Product> {
    this.isLoading.set(true);
    return this.http
      .patch<Product>(`${this.apiUrl}/teams/${teamId}/products/${productId}/deactivate`, {}, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.products.update((products) => products.filter((p) => p.id !== productId));
          this.allProducts.update((products) => products.filter((p) => p.id !== productId));
          this.isLoading.set(false);
        })
      );
  }

  activate(teamId: string, productId: string): Observable<Product> {
    this.isLoading.set(true);
    return this.http
      .patch<Product>(`${this.apiUrl}/teams/${teamId}/products/${productId}/activate`, {}, {
        withCredentials: true,
      })
      .pipe(
        tap((product) => {
          this.products.update((products) => [...products, product]);
          this.allProducts.update((products) => [...products, product]);
          this.isLoading.set(false);
        })
      );
  }

  bulkCreate(teamId: string, products: CreateProductDto[]): Observable<BulkCreateResult> {
    this.isLoading.set(true);
    return this.http
      .post<BulkCreateResult>(`${this.apiUrl}/teams/${teamId}/products/bulk`, { products }, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.isLoading.set(false);
        })
      );
  }
}
