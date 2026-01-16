import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface TrendDataPoint {
  period: string;
  entries: number;
  exits: number;
  adjustments: number;
}

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container" [style.height.px]="height">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      width: 100%;
      position: relative;
    }
    canvas {
      width: 100% !important;
    }
  `]
})
export class TrendChart implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: TrendDataPoint[] = [];
  @Input() height = 250;

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.chart) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart(): void {
    if (!this.chartCanvas || !this.data.length) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.data.map(d => this.formatDate(d.period)),
        datasets: [
          {
            label: 'Entradas',
            data: this.data.map(d => d.entries),
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            pointBackgroundColor: '#16a34a',
            pointBorderColor: '#16a34a',
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Saídas',
            data: this.data.map(d => d.exits),
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            pointBackgroundColor: '#dc2626',
            pointBorderColor: '#dc2626',
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Ajustes',
            data: this.data.map(d => d.adjustments),
            borderColor: '#d97706',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            pointBackgroundColor: '#d97706',
            pointBorderColor: '#d97706',
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              color: '#94a3b8',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(148, 163, 184, 0.2)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            displayColors: true,
            boxPadding: 4,
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
              color: '#64748b',
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
              color: '#64748b',
              stepSize: 1,
            },
          },
        },
      },
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(): void {
    if (!this.chart) {
      this.createChart();
      return;
    }

    this.chart.data.labels = this.data.map(d => this.formatDate(d.period));
    this.chart.data.datasets[0].data = this.data.map(d => d.entries);
    this.chart.data.datasets[1].data = this.data.map(d => d.exits);
    this.chart.data.datasets[2].data = this.data.map(d => d.adjustments);
    this.chart.update();
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  }
}
