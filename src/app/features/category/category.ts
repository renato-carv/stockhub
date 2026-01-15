import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService, Category as CategoryModel, CreateCategoryDto, UpdateCategoryDto } from '../../core/services/category.service';
import { TeamService } from '../../core/services/team.service';
import { Pagination } from '../../shared/components/pagination/pagination';

interface ImportRow {
  name: string;
  description?: string;
  color?: string;
  isValid: boolean;
  errors: string[];
}

@Component({
  selector: 'app-category',
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './category.html',
  styleUrl: './category.css',
})
export class Category implements OnInit {
  // Modal state
  showModal = signal(false);
  isEditing = signal(false);
  editingCategoryId = signal<string | null>(null);

  // Modal de exclusão
  showDeleteModal = signal(false);
  categoryToDelete = signal<CategoryModel | null>(null);

  // Modal de importação
  showImportModal = signal(false);
  importStep = signal<'upload' | 'preview' | 'importing' | 'done'>('upload');
  importFile = signal<File | null>(null);
  importData = signal<ImportRow[]>([]);
  importProgress = signal(0);
  importResults = signal<{ success: number; errors: number }>({ success: 0, errors: 0 });

  // Formulário
  categoryName = signal('');
  categoryDescription = signal('');
  categoryColor = signal('#6366f1');

  // Busca e paginação
  searchQuery = signal('');
  currentPage = signal(1);
  pageSize = signal(10);
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Stats - usando total do meta de paginação
  totalCategories = computed(() => this.categoryService.paginationMeta()?.total ?? 0);

  categoriesWithProducts = computed(() => {
    // Isso seria calculado com dados reais do backend
    return this.categoryService.categories().filter(c => c.id).length;
  });

  // Cores predefinidas
  presetColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  ];

  // Gerar cor aleatória das cores predefinidas
  private getRandomColor(): string {
    return this.presetColors[Math.floor(Math.random() * this.presetColors.length)];
  }

  constructor(
    public categoryService: CategoryService,
    public teamService: TeamService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      this.categoryService.getByTeam(teamId, {
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.searchQuery() || undefined,
      }).subscribe();
    }
  }

  // Busca com debounce
  onSearchChange(query: string): void {
    this.searchQuery.set(query);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadCategories();
    }, 300);
  }

  // Paginação handlers
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadCategories();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadCategories();
  }

  // Modal handlers
  openCreateModal(): void {
    this.resetForm();
    this.isEditing.set(false);
    this.editingCategoryId.set(null);
    this.showModal.set(true);
  }

  openEditModal(category: CategoryModel): void {
    this.isEditing.set(true);
    this.editingCategoryId.set(category.id);
    this.categoryName.set(category.name);
    this.categoryDescription.set(category.description || '');
    this.categoryColor.set(category.color || '#6366f1');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.categoryName.set('');
    this.categoryDescription.set('');
    this.categoryColor.set('#6366f1');
  }

  selectColor(color: string): void {
    this.categoryColor.set(color);
  }

  // CRUD
  saveCategory(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) return;

    const dto: CreateCategoryDto = {
      name: this.categoryName(),
      description: this.categoryDescription() || undefined,
      color: this.categoryColor(),
    };

    if (this.isEditing() && this.editingCategoryId()) {
      this.categoryService.update(teamId, this.editingCategoryId()!, dto as UpdateCategoryDto).subscribe({
        next: () => {
          this.closeModal();
          this.loadCategories();
        },
      });
    } else {
      this.categoryService.create(teamId, dto).subscribe({
        next: () => {
          this.closeModal();
          this.loadCategories();
        },
      });
    }
  }

  // Delete handlers
  openDeleteModal(category: CategoryModel): void {
    this.categoryToDelete.set(category);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.categoryToDelete.set(null);
  }

  confirmDelete(): void {
    const teamId = this.teamService.currentTeam()?.id;
    const category = this.categoryToDelete();
    if (!teamId || !category) return;

    this.categoryService.delete(teamId, category.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadCategories();
      },
    });
  }

  // Import handlers
  openImportModal(): void {
    this.resetImport();
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    this.resetImport();
  }

  private resetImport(): void {
    this.importStep.set('upload');
    this.importFile.set(null);
    this.importData.set([]);
    this.importProgress.set(0);
    this.importResults.set({ success: 0, errors: 0 });
  }

  backToUpload(): void {
    this.resetImport();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.importFile.set(file);
      this.parseFile(file);
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      this.importFile.set(file);
      this.parseFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private async parseFile(file: File): Promise<void> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      await this.parseCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      await this.parseExcel(file);
    }
  }

  private async parseCSV(file: File): Promise<void> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return;
    }

    // Detectar separador (vírgula ou ponto e vírgula)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const nameIndex = headers.findIndex(h => h === 'nome' || h === 'name');
    const descIndex = headers.findIndex(h => h === 'descrição' || h === 'descricao' || h === 'description');

    const data: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], separator);
      const row = this.createImportRow(
        nameIndex >= 0 ? values[nameIndex] : '',
        descIndex >= 0 ? values[descIndex] : undefined
      );
      data.push(row);
    }

    this.importData.set(data);
    this.importStep.set('preview');
  }

  private parseCSVLine(line: string, separator: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result.map(v => v.replace(/^"|"$/g, ''));
  }

  private async parseExcel(file: File): Promise<void> {
    // Para Excel, usamos a API FileReader e parseamos manualmente
    // Em produção, você usaria uma lib como xlsx ou sheetjs
    // Por simplicidade, vou tratar como CSV se possível
    const text = await file.text();

    // Tenta parsear como texto (funciona para alguns xlsx simples)
    // Em produção, use a biblioteca xlsx
    try {
      await this.parseCSV(file);
    } catch {
      // Se falhar, mostra erro
      const errorRow: ImportRow = {
        name: '',
        isValid: false,
        errors: ['Formato de arquivo não suportado. Use CSV ou instale a biblioteca xlsx.']
      };
      this.importData.set([errorRow]);
      this.importStep.set('preview');
    }
  }

  private createImportRow(name: string, description?: string, existingColor?: string): ImportRow {
    const errors: string[] = [];

    if (!name || name.trim() === '') {
      errors.push('Nome é obrigatório');
    }

    // Verificar duplicatas (usa allCategories para verificar contra TODAS as categorias)
    const existingCategories = this.categoryService.allCategories();
    if (name && existingCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      errors.push('Categoria já existe');
    }

    return {
      name: name?.trim() || '',
      description: description?.trim(),
      color: existingColor || this.getRandomColor(),
      isValid: errors.length === 0,
      errors
    };
  }

  updateImportRow(index: number, field: 'name' | 'description' | 'color', value: string): void {
    const data = [...this.importData()];
    const row = { ...data[index] };

    if (field === 'name') row.name = value;
    else if (field === 'description') row.description = value;
    else if (field === 'color') row.color = value;

    // Revalidar mantendo a cor existente
    const revalidated = this.createImportRow(row.name, row.description, row.color);
    data[index] = revalidated;
    this.importData.set(data);
  }

  removeImportRow(index: number): void {
    const data = [...this.importData()];
    data.splice(index, 1);
    this.importData.set(data);
  }

  removeInvalidRows(): void {
    const validRows = this.importData().filter(r => r.isValid);
    this.importData.set(validRows);
  }

  get validRowsCount(): number {
    return this.importData().filter(r => r.isValid).length;
  }

  get invalidRowsCount(): number {
    return this.importData().filter(r => !r.isValid).length;
  }

  async confirmImport(): Promise<void> {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) return;

    const validRows = this.importData().filter(r => r.isValid);
    if (validRows.length === 0) return;

    this.importStep.set('importing');
    let success = 0;
    let errors = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      try {
        await this.categoryService.create(teamId, {
          name: row.name,
          description: row.description,
          color: row.color,
        }).toPromise();
        success++;
      } catch {
        errors++;
      }

      this.importProgress.set(Math.round(((i + 1) / validRows.length) * 100));
    }

    this.importResults.set({ success, errors });
    this.importStep.set('done');
    this.loadCategories();
  }

  downloadTemplate(): void {
    const csvContent = 'nome;descrição\nEletrônicos;Produtos eletrônicos\nVestuário;Roupas e acessórios\nAlimentos;Produtos alimentícios';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'categorias_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
