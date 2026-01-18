import { Component, Input } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-export-to-excel',
  imports: [],
  templateUrl: './export-to-excel.html',
  styleUrl: './export-to-excel.css',
})
export class ExportToExcel<T = any> {
  @Input() data: T[] = [];
  @Input() fileName: string = 'export.xlsx';
  @Input() sheetName: string = 'data';
  @Input() mapper?: (item: T) => Record<string, any>;

  exportExcel(): void {
    if (!this.data || this.data.length === 0) {
      console.warn('No data available to export.');
      return;
    }

    const exportData = this.mapper
      ? this.data.map(this.mapper)
      : this.data;

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { [this.sheetName]: worksheet },
      SheetNames: [this.sheetName],
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    this.saveFile(excelBuffer, this.fileName);
  }

  private saveFile(buffer: any, fileName: string): void {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    saveAs(blob, fileName);
  }
}
