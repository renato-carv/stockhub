import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DashboardService, ABCAnalysis } from '../../core/services/dashboard.service';
import { TeamService } from '../../core/services/team.service';
import { OrganizationService } from '../../core/services/organization.service';
import { ReportsService, ReportType } from '../../core/services/reports.service';
import { TrendChart, TrendDataPoint } from '../../shared/components/trend-chart/trend-chart';
import { ABCChart } from '../../shared/components/abc-chart/abc-chart';
import { SetupRequired } from '../../shared/components/setup-required/setup-required';

export interface ReportConfig {
  id: ReportType;
  name: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-reports',
  imports: [CommonModule, FormsModule, TrendChart, ABCChart, SetupRequired],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports {
  private organizationService = inject(OrganizationService);
  private teamService = inject(TeamService);
  private reportsService = inject(ReportsService);
  public dashboardService = inject(DashboardService);

  // Verificar se setup está completo
  isSetupComplete = computed(() => {
    return this.organizationService.organizations().length > 0 && this.teamService.teams().length > 0;
  });

  // Effect para recarregar dados quando currentTeam mudar
  private teamEffect = effect(() => {
    const team = this.teamService.currentTeam();
    if (team) {
      this.setDefaultDateRange();
      this.loadDashboardData();
    }
  });

  // Relatórios disponíveis
  reportTypes: ReportConfig[] = [
    {
      id: 'movements',
      name: 'Movimentações',
      description: 'Entradas, saídas e ajustes de estoque',
      icon: 'trending',
    },
    {
      id: 'stock',
      name: 'Estoque Atual',
      description: 'Visão geral do estoque e alertas',
      icon: 'inventory',
    },
    {
      id: 'financial',
      name: 'Financeiro',
      description: 'Valor do estoque e custos',
      icon: 'money',
    },
    {
      id: 'products',
      name: 'Produtos',
      description: 'Análise de produtos e categorias',
      icon: 'package',
    },
  ];

  // State
  selectedReport = signal<ReportType>('movements');
  startDate = signal('');
  endDate = signal('');

  // Data from dashboard signal
  movementsSummary = computed(() => this.dashboardService.dashboard()?.movementsSummary);
  stockOverview = computed(() => this.dashboardService.dashboard()?.stockOverview);
  financialSummary = computed(() => this.dashboardService.dashboard()?.financial);
  stockAlerts = computed(() => this.dashboardService.dashboard()?.stockAlerts);

  // Trend data
  trendData = signal<TrendDataPoint[]>([]);

  // ABC Analysis data
  abcAnalysis = signal<ABCAnalysis | null>(null);

  // Computed signal for isGenerating from service
  isGenerating = computed(() => this.reportsService.isGenerating());

  private setDefaultDateRange(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.endDate.set(this.formatDateForInput(today));
    this.startDate.set(this.formatDateForInput(firstDayOfMonth));
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private loadDashboardData(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      forkJoin({
        dashboard: this.dashboardService.getFullDashboard(teamId, this.startDate(), this.endDate()),
        trend: this.dashboardService.getMovementsTrend(teamId, 'day', this.startDate(), this.endDate()),
        abc: this.dashboardService.getABCAnalysis(teamId),
      }).subscribe({
        next: ({ trend, abc }) => {
          this.trendData.set(trend.data);
          this.abcAnalysis.set(abc);
        },
      });
    }
  }

  selectReport(reportId: ReportType): void {
    this.selectedReport.set(reportId);
  }

  getReportConfig(reportId: ReportType): ReportConfig | undefined {
    return this.reportTypes.find((r) => r.id === reportId);
  }

  exportPDF(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) return;

    this.reportsService.downloadReport(
      teamId,
      this.selectedReport(),
      'pdf',
      this.startDate(),
      this.endDate()
    );
  }

  exportXLSX(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) return;

    this.reportsService.downloadReport(
      teamId,
      this.selectedReport(),
      'xlsx',
      this.startDate(),
      this.endDate()
    );
  }

  onDateChange(): void {
    this.loadDashboardData();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }
}
