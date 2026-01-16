import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

export type ReportType = 'movements' | 'stock' | 'financial' | 'products';
export type ExportFormat = 'pdf' | 'xlsx';

export interface GenerateReportDto {
  type: ReportType;
  format: ExportFormat;
  startDate?: string;
  endDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly apiUrl = environment.apiUrl;
  private toastService = inject(ToastService);

  isGenerating = signal(false);

  constructor(private http: HttpClient) {}

  generateReport(teamId: string, dto: GenerateReportDto): Observable<Blob> {
    this.isGenerating.set(true);

    return this.http
      .post(`${this.apiUrl}/teams/${teamId}/reports/generate`, dto, {
        responseType: 'blob',
        withCredentials: true,
      })
      .pipe(finalize(() => this.isGenerating.set(false)));
  }

  downloadReport(
    teamId: string,
    type: ReportType,
    format: ExportFormat,
    startDate?: string,
    endDate?: string,
  ): void {
    const dto: GenerateReportDto = {
      type,
      format,
      startDate,
      endDate,
    };

    this.generateReport(teamId, dto).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const reportTypeName = this.getReportTypeName(type);
        const timestamp = new Date().toISOString().split('T')[0];
        const extension = format === 'pdf' ? 'pdf' : 'xlsx';
        link.download = `${reportTypeName}_${timestamp}.${extension}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        const formatLabel = format === 'pdf' ? 'PDF' : 'Excel';
        this.toastService.success('Relatório gerado', `O arquivo ${formatLabel} foi baixado com sucesso.`);
      },
      error: () => {
        this.toastService.error('Erro ao gerar relatório', 'Não foi possível gerar o relatório. Tente novamente.');
      },
    });
  }

  private getReportTypeName(type: ReportType): string {
    const names: Record<ReportType, string> = {
      movements: 'movimentacoes',
      stock: 'estoque',
      financial: 'financeiro',
      products: 'produtos',
    };
    return names[type];
  }
}
