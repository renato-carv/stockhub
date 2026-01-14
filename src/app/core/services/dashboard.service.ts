import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface StockOverview {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStock: number;
  lowStock: number;
  totalItems: number;
}

export interface StockAlertProduct {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  deficit: number;
}

export interface StockAlerts {
  outOfStock: StockAlertProduct[];
  lowStock: StockAlertProduct[];
  totalAlerts: number;
}

export interface MovementsSummary {
  totalEntries: number;
  totalExits: number;
  totalAdjustments: number;
  itemsIn: number;
  itemsOut: number;
  netBalance: number;
}

export interface FinancialSummary {
  totalStockValue: number;
  averageCost: number;
  mostValuableProduct: {
    id: string;
    name: string;
    sku: string;
    totalValue: number;
    quantity: number;
    unitPrice: number;
  } | null;
  averageProductValue: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  reason: string;
  quantity: number;
  productName: string;
  productSku: string;
  userName: string;
  createdAt: string;
}

export interface Dashboard {
  stockOverview: StockOverview;
  stockAlerts: StockAlerts;
  movementsSummary: MovementsSummary;
  financial: FinancialSummary;
  recentActivity: RecentActivity[];
}

export interface MovementByPeriod {
  period: string;
  entries: number;
  exits: number;
  adjustments: number;
  itemsIn: number;
  itemsOut: number;
}

export interface MovementsTrend {
  data: MovementByPeriod[];
  granularity: string;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  totalMovements: number;
  totalQuantity: number;
}

export interface TopProducts {
  mostMovedOut: TopProduct[];
  mostMovedIn: TopProduct[];
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly apiUrl = environment.apiUrl;

  dashboard = signal<Dashboard | null>(null);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  getFullDashboard(teamId: string, startDate?: string, endDate?: string): Observable<Dashboard> {
    this.isLoading.set(true);
    let url = `${this.apiUrl}/teams/${teamId}/dashboard`;

    const params: string[] = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length) url += `?${params.join('&')}`;

    return this.http
      .get<Dashboard>(url, { withCredentials: true })
      .pipe(
        tap((data) => {
          this.dashboard.set(data);
          this.isLoading.set(false);
        })
      );
  }

  getStockOverview(teamId: string): Observable<StockOverview> {
    return this.http.get<StockOverview>(
      `${this.apiUrl}/teams/${teamId}/dashboard/stock/overview`,
      { withCredentials: true }
    );
  }

  getStockAlerts(teamId: string, limit?: number): Observable<StockAlerts> {
    let url = `${this.apiUrl}/teams/${teamId}/dashboard/stock/alerts`;
    if (limit) url += `?limit=${limit}`;
    return this.http.get<StockAlerts>(url, { withCredentials: true });
  }

  getMovementsSummary(teamId: string, startDate?: string, endDate?: string): Observable<MovementsSummary> {
    let url = `${this.apiUrl}/teams/${teamId}/dashboard/movements/summary`;
    const params: string[] = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<MovementsSummary>(url, { withCredentials: true });
  }

  getMovementsTrend(
    teamId: string,
    granularity: 'day' | 'week' | 'month' = 'day',
    startDate?: string,
    endDate?: string
  ): Observable<MovementsTrend> {
    let url = `${this.apiUrl}/teams/${teamId}/dashboard/movements/trend?granularity=${granularity}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return this.http.get<MovementsTrend>(url, { withCredentials: true });
  }

  getFinancialSummary(teamId: string): Observable<FinancialSummary> {
    return this.http.get<FinancialSummary>(
      `${this.apiUrl}/teams/${teamId}/dashboard/financial`,
      { withCredentials: true }
    );
  }

  getTopProducts(teamId: string, limit?: number): Observable<TopProducts> {
    let url = `${this.apiUrl}/teams/${teamId}/dashboard/products/top`;
    if (limit) url += `?limit=${limit}`;
    return this.http.get<TopProducts>(url, { withCredentials: true });
  }

  getRecentActivity(teamId: string, limit?: number): Observable<RecentActivity[]> {
    let url = `${this.apiUrl}/teams/${teamId}/dashboard/activity/recent`;
    if (limit) url += `?limit=${limit}`;
    return this.http.get<RecentActivity[]>(url, { withCredentials: true });
  }
}
