import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface ABCChartData {
  classACount: number;
  classAPercentage: number;
  classBCount: number;
  classBPercentage: number;
  classCCount: number;
  classCPercentage: number;
}

@Component({
  selector: 'app-abc-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="abc-chart-container">
      <div class="chart-wrapper" [style.height.px]="height">
        <canvas #chartCanvas></canvas>
      </div>
      <div class="abc-legend">
        <div class="legend-item class-a">
          <span class="legend-color"></span>
          <span class="legend-label">Classe A</span>
          <span class="legend-value">{{ data?.classACount ?? 0 }} produtos ({{ (data?.classAPercentage ?? 0).toFixed(1) }}% do valor)</span>
        </div>
        <div class="legend-item class-b">
          <span class="legend-color"></span>
          <span class="legend-label">Classe B</span>
          <span class="legend-value">{{ data?.classBCount ?? 0 }} produtos ({{ (data?.classBPercentage ?? 0).toFixed(1) }}% do valor)</span>
        </div>
        <div class="legend-item class-c">
          <span class="legend-color"></span>
          <span class="legend-label">Classe C</span>
          <span class="legend-value">{{ data?.classCCount ?? 0 }} produtos ({{ (data?.classCPercentage ?? 0).toFixed(1) }}% do valor)</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .abc-chart-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .chart-wrapper {
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
      position: relative;
    }

    canvas {
      width: 100% !important;
    }

    .abc-legend {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: rgba(148, 163, 184, 0.05);
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .class-a .legend-color {
      background: #16a34a;
    }

    .class-b .legend-color {
      background: #eab308;
    }

    .class-c .legend-color {
      background: #dc2626;
    }

    .legend-label {
      font-weight: 600;
      color: var(--text);
      min-width: 70px;
    }

    .legend-value {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
  `]
})
export class ABCChart implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: ABCChartData | null = null;
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
    if (!this.chartCanvas || !this.data) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Classe A', 'Classe B', 'Classe C'],
        datasets: [
          {
            data: [
              this.data.classAPercentage || 0,
              this.data.classBPercentage || 0,
              this.data.classCPercentage || 0,
            ],
            backgroundColor: [
              '#16a34a',
              '#eab308',
              '#dc2626',
            ],
            borderColor: [
              '#15803d',
              '#ca8a04',
              '#b91c1c',
            ],
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(148, 163, 184, 0.2)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            callbacks: {
              label: (context) => {
                const value = context.parsed || 0;
                return ` ${value.toFixed(1)}% do valor total`;
              },
            },
          },
        },
      },
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(): void {
    if (!this.chart || !this.data) {
      this.createChart();
      return;
    }

    this.chart.data.datasets[0].data = [
      this.data.classAPercentage || 0,
      this.data.classBPercentage || 0,
      this.data.classCPercentage || 0,
    ];
    this.chart.update();
  }
}
