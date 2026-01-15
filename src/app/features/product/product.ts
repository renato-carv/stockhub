import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ProductService, Product as ProductModel, CreateProductDto, UpdateProductDto } from '../../core/services/product.service';
import { TeamService } from '../../core/services/team.service';
import { CategoryService, Category, CreateCategoryDto } from '../../core/services/category.service';
import { Pagination } from '../../shared/components/pagination/pagination';

interface ImportRow {
  name: string;
  sku: string;
  description?: string;
  barcode?: string;
  categoryId?: string;
  categoryName?: string;
  unit: string;
  currentStock: number;
  costPrice: number;
  salePrice: number;
  minStock: number;
  maxStock?: number;
  isValid: boolean;
  errors: string[];
}

@Component({
  selector: 'app-product',
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './product.html',
  styleUrl: './product.css',
})
export class Product implements OnInit {
  // Modal state
  showModal = signal(false);
  isEditing = signal(false);
  editingProductId = signal<string | null>(null);

  // Modal para confirmação de exclusão
  showDeleteModal = signal(false);
  productToDelete = signal<ProductModel | null>(null);

  // Modal de categorias
  showCategoryModal = signal(false);
  newCategoryName = signal('');
  newCategoryDescription = signal('');
  newCategoryColor = signal('#6366f1');

  // Modal de importação
  showImportModal = signal(false);
  importStep = signal<'upload' | 'preview' | 'importing' | 'done'>('upload');
  importFile = signal<File | null>(null);
  importData = signal<ImportRow[]>([]);
  importProgress = signal(0);
  importResults = signal<{ success: number; errors: number }>({ success: 0, errors: 0 });

  // Formulário do produto
  productName = signal('');
  productSku = signal('');
  productDescription = signal('');
  productCategoryId = signal<string | null>(null);
  productUnit = signal('un');
  productCostPrice = signal<number>(0);
  productSalePrice = signal<number>(0);
  productMinStock = signal<number>(0);
  productMaxStock = signal<number | null>(null);

  // Busca e paginação
  searchQuery = signal('');
  selectedCategory = signal('');
  currentPage = signal(1);
  pageSize = signal(10);
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Categorias disponíveis (usa allCategories para ter TODAS as categorias, não só paginadas)
  categories = computed(() => this.categoryService.allCategories());

  // Stats - usando allProducts para ter valores corretos
  totalProducts = computed(() => this.productService.paginationMeta()?.total ?? 0);
  totalValue = computed(() => {
    return this.productService.allProducts().reduce((acc, p) => acc + (p.currentStock * (p.costPrice ?? 0)), 0);
  });
  lowStockCount = computed(() => {
    return this.productService.allProducts().filter((p) => p.currentStock <= p.minStock && p.currentStock > 0).length;
  });
  outOfStockCount = computed(() => {
    return this.productService.allProducts().filter((p) => p.currentStock === 0).length;
  });

  // Unidades disponíveis
  unitOptions = [
    { value: 'un', label: 'Unidade (un)' },
    { value: 'kg', label: 'Quilograma (kg)' },
    { value: 'g', label: 'Grama (g)' },
    { value: 'l', label: 'Litro (l)' },
    { value: 'ml', label: 'Mililitro (ml)' },
    { value: 'm', label: 'Metro (m)' },
    { value: 'cm', label: 'Centímetro (cm)' },
    { value: 'cx', label: 'Caixa (cx)' },
    { value: 'pc', label: 'Pacote (pc)' },
  ];

  constructor(
    public productService: ProductService,
    public teamService: TeamService,
    public categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      this.loadProducts();
      this.categoryService.getByTeam(teamId, { limit: 1000 }).subscribe();
    }
  }

  private loadProducts(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      this.productService.getByTeam(teamId, {
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.searchQuery() || undefined,
        categoryId: this.selectedCategory() || undefined,
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
      this.loadProducts();
    }, 300);
  }

  onCategoryFilterChange(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    this.currentPage.set(1);
    this.loadProducts();
  }

  // Paginação handlers
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadProducts();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadProducts();
  }

  // Modal handlers
  openCreateModal(): void {
    this.resetForm();
    this.isEditing.set(false);
    this.editingProductId.set(null);
    this.showModal.set(true);
  }

  openEditModal(product: ProductModel): void {
    this.isEditing.set(true);
    this.editingProductId.set(product.id);

    this.productName.set(product.name);
    this.productSku.set(product.sku);
    this.productDescription.set(product.description || '');
    this.productCategoryId.set(product.categoryId || null);
    this.productUnit.set(product.unit);
    this.productCostPrice.set(product.costPrice ?? 0);
    this.productSalePrice.set(product.salePrice ?? 0);
    this.productMinStock.set(product.minStock);
    this.productMaxStock.set(product.maxStock || null);

    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.productName.set('');
    this.productSku.set('');
    this.productDescription.set('');
    this.productCategoryId.set(null);
    this.productUnit.set('un');
    this.productCostPrice.set(0);
    this.productSalePrice.set(0);
    this.productMinStock.set(0);
    this.productMaxStock.set(null);
  }

  // SKU generation
  generateSku(): void {
    const name = this.productName();
    if (name) {
      const sku = name
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 10);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.productSku.set(`${sku}-${random}`);
    }
  }

  // CRUD operations
  saveProduct(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) return;

    const dto: CreateProductDto = {
      name: this.productName(),
      sku: this.productSku(),
      description: this.productDescription() || undefined,
      categoryId: this.productCategoryId() || undefined,
      unit: this.productUnit(),
      costPrice: this.productCostPrice(),
      salePrice: this.productSalePrice(),
      minStock: this.productMinStock(),
      maxStock: this.productMaxStock() || undefined,
    };

    if (this.isEditing() && this.editingProductId()) {
      this.productService.update(teamId, this.editingProductId()!, dto as UpdateProductDto).subscribe({
        next: () => {
          this.closeModal();
          this.loadProducts();
        },
      });
    } else {
      this.productService.create(teamId, dto).subscribe({
        next: () => {
          this.closeModal();
          this.loadProducts();
        },
      });
    }
  }

  // Delete handlers
  openDeleteModal(product: ProductModel): void {
    this.productToDelete.set(product);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const teamId = this.teamService.currentTeam()?.id;
    const product = this.productToDelete();

    if (!teamId || !product) return;

    this.productService.delete(teamId, product.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadProducts();
      },
    });
  }

  // Helpers
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  getStockStatus(product: ProductModel): 'ok' | 'low' | 'out' {
    if (product.currentStock === 0) return 'out';
    if (product.currentStock <= product.minStock) return 'low';
    return 'ok';
  }

  getStockStatusLabel(product: ProductModel): string {
    const status = this.getStockStatus(product);
    switch (status) {
      case 'out': return 'Sem estoque';
      case 'low': return 'Estoque baixo';
      default: return 'Normal';
    }
  }

  // Category helpers
  getCategoryName(categoryId: string | undefined): string {
    if (!categoryId) return '';
    const category = this.categoryService.allCategories().find(c => c.id === categoryId);
    return category?.name || '';
  }

  getCategoryColor(categoryId: string | undefined): string {
    if (!categoryId) return '#6366f1';
    const category = this.categoryService.allCategories().find(c => c.id === categoryId);
    return category?.color || '#6366f1';
  }

  // Category modal handlers
  openCategoryModal(): void {
    this.resetCategoryForm();
    this.showCategoryModal.set(true);
  }

  closeCategoryModal(): void {
    this.showCategoryModal.set(false);
    this.resetCategoryForm();
  }

  private resetCategoryForm(): void {
    this.newCategoryName.set('');
    this.newCategoryDescription.set('');
    this.newCategoryColor.set('#6366f1');
  }

  saveCategory(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId || !this.newCategoryName()) return;

    const dto: CreateCategoryDto = {
      name: this.newCategoryName(),
      description: this.newCategoryDescription() || undefined,
      color: this.newCategoryColor(),
    };

    this.categoryService.create(teamId, dto).subscribe({
      next: () => {
        this.closeCategoryModal();
        this.categoryService.getByTeam(teamId, { limit: 1000 }).subscribe();
      },
    });
  }

  deleteCategory(categoryId: string): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) return;

    this.categoryService.delete(teamId, categoryId).subscribe({
      next: () => {
        this.categoryService.getByTeam(teamId, { limit: 1000 }).subscribe();
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
    // Garante que as categorias estejam carregadas antes de parsear
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      await firstValueFrom(this.categoryService.getByTeam(teamId, { limit: 1000 }));
    }

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

    // Mapear índices das colunas
    const nameIndex = headers.findIndex(h => h === 'nome' || h === 'name');
    const skuIndex = headers.findIndex(h => h === 'sku' || h === 'código' || h === 'codigo');
    const descIndex = headers.findIndex(h => h === 'descrição' || h === 'descricao' || h === 'description');
    const barcodeIndex = headers.findIndex(h => h === 'código de barras' || h === 'codigo de barras' || h === 'barcode' || h === 'ean');
    const categoryIndex = headers.findIndex(h => h === 'categoria' || h === 'category');
    const unitIndex = headers.findIndex(h => h === 'unidade' || h === 'unit');
    const costIndex = headers.findIndex(h => h === 'preço custo' || h === 'preco custo' || h === 'custo' || h === 'cost');
    const saleIndex = headers.findIndex(h => h === 'preço venda' || h === 'preco venda' || h === 'venda' || h === 'sale' || h === 'price');
    const currentStockIndex = headers.findIndex(h => h === 'estoque atual' || h === 'estoque' || h === 'current stock' || h === 'stock' || h === 'quantidade');
    const minStockIndex = headers.findIndex(h => h === 'estoque mínimo' || h === 'estoque minimo' || h === 'min stock');
    const maxStockIndex = headers.findIndex(h => h === 'estoque máximo' || h === 'estoque maximo' || h === 'max stock');

    const data: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], separator);
      const row = this.createImportRow(
        nameIndex >= 0 ? values[nameIndex] : '',
        skuIndex >= 0 ? values[skuIndex] : '',
        descIndex >= 0 ? values[descIndex] : undefined,
        barcodeIndex >= 0 ? values[barcodeIndex] : undefined,
        categoryIndex >= 0 ? values[categoryIndex] : undefined,
        unitIndex >= 0 ? values[unitIndex] : 'un',
        currentStockIndex >= 0 ? parseInt(values[currentStockIndex]) || 0 : 0,
        costIndex >= 0 ? parseFloat(values[costIndex]) || 0 : 0,
        saleIndex >= 0 ? parseFloat(values[saleIndex]) || 0 : 0,
        minStockIndex >= 0 ? parseInt(values[minStockIndex]) || 0 : 0,
        maxStockIndex >= 0 ? parseInt(values[maxStockIndex]) || undefined : undefined
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
    // Para Excel, tenta como CSV
    try {
      await this.parseCSV(file);
    } catch {
      const errorRow: ImportRow = {
        name: '',
        sku: '',
        unit: 'un',
        currentStock: 0,
        costPrice: 0,
        salePrice: 0,
        minStock: 0,
        isValid: false,
        errors: ['Formato de arquivo não suportado. Use CSV.']
      };
      this.importData.set([errorRow]);
      this.importStep.set('preview');
    }
  }

  private createImportRow(
    name: string,
    sku: string,
    description?: string,
    barcode?: string,
    categoryName?: string,
    unit?: string,
    currentStock?: number,
    costPrice?: number,
    salePrice?: number,
    minStock?: number,
    maxStock?: number
  ): ImportRow {
    const errors: string[] = [];

    if (!name || name.trim() === '') {
      errors.push('Nome é obrigatório');
    }

    if (!sku || sku.trim() === '') {
      errors.push('SKU é obrigatório');
    }

    // Verificar SKU duplicado
    const existingProducts = this.productService.allProducts();
    if (sku && existingProducts.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
      errors.push('SKU já existe');
    }

    // Encontrar categoria pelo nome
    let categoryId: string | undefined;
    if (categoryName) {
      const category = this.categoryService.allCategories().find(
        c => c.name.toLowerCase() === categoryName.toLowerCase()
      );
      if (category) {
        categoryId = category.id;
      } else {
        errors.push(`Categoria "${categoryName}" não encontrada`);
      }
    }

    // Validar unidade
    const validUnits = this.unitOptions.map(u => u.value);
    const normalizedUnit = (unit || 'un').toLowerCase();
    if (!validUnits.includes(normalizedUnit)) {
      errors.push(`Unidade "${unit}" inválida`);
    }

    return {
      name: name?.trim() || '',
      sku: sku?.trim() || '',
      description: description?.trim(),
      barcode: barcode?.trim(),
      categoryId,
      categoryName: categoryName?.trim(),
      unit: validUnits.includes(normalizedUnit) ? normalizedUnit : 'un',
      currentStock: currentStock || 0,
      costPrice: costPrice || 0,
      salePrice: salePrice || 0,
      minStock: minStock || 0,
      maxStock: maxStock,
      isValid: errors.length === 0,
      errors
    };
  }

  updateImportRow(index: number, field: keyof ImportRow, value: any): void {
    const data = [...this.importData()];
    const row = { ...data[index] };

    // Atualiza o campo
    (row as any)[field] = value;

    // Se mudou a categoria por nome, atualiza categoryId
    if (field === 'categoryName') {
      const category = this.categoryService.allCategories().find(
        c => c.name.toLowerCase() === value.toLowerCase()
      );
      row.categoryId = category?.id;
    }

    // Se mudou a categoria por ID, atualiza categoryName
    if (field === 'categoryId') {
      const category = this.categoryService.allCategories().find(c => c.id === value);
      row.categoryName = category?.name || '';
    }

    // Revalidar a linha
    row.errors = [];

    if (!row.name?.trim()) {
      row.errors.push('Nome é obrigatório');
    }

    if (!row.sku?.trim()) {
      row.errors.push('SKU é obrigatório');
    } else {
      // Verifica SKU duplicado
      const duplicateIndex = data.findIndex((r, i) => i !== index && r.sku === row.sku);
      if (duplicateIndex !== -1) {
        row.errors.push('SKU duplicado no arquivo');
      }
    }

    row.isValid = row.errors.length === 0;

    data[index] = row;
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
    this.importProgress.set(50);

    const products = validRows.map(row => ({
      name: row.name,
      sku: row.sku,
      description: row.description,
      barcode: row.barcode,
      categoryId: row.categoryId,
      unit: row.unit,
      currentStock: row.currentStock,
      costPrice: row.costPrice,
      salePrice: row.salePrice,
      minStock: row.minStock,
      maxStock: row.maxStock,
    }));

    try {
      const result = await firstValueFrom(this.productService.bulkCreate(teamId, products));
      this.importResults.set({ success: result.created, errors: result.errors });
    } catch {
      this.importResults.set({ success: 0, errors: validRows.length });
    }

    this.importProgress.set(100);
    this.importStep.set('done');
    this.loadProducts();
  }

  downloadTemplate(): void {
    const csvContent = 'nome;sku;descrição;código de barras;categoria;unidade;estoque atual;preço custo;preço venda;estoque mínimo;estoque máximo\nCamiseta Básica;CAM-001;Camiseta 100% algodão;7891234567890;Vestuário;un;50;25.00;49.90;10;100\nCalça Jeans;CAL-001;Calça jeans tradicional;7891234567891;Vestuário;un;30;45.00;99.90;5;50';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'produtos_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Template helpers para evitar arrow functions e funções globais no template
  hasSkuError(row: ImportRow): boolean {
    return row.errors.some(e => e.includes('SKU'));
  }

  hasCategoryError(row: ImportRow): boolean {
    return row.errors.some(e => e.includes('Categoria'));
  }

  parseNumber(value: string): number {
    return parseFloat(value) || 0;
  }

  parseInteger(value: string): number {
    return parseInt(value, 10) || 0;
  }
}
