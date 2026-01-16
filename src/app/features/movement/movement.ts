import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StockMovementService,
  StockMovement,
  CreateStockMovementDto,
  MovementType,
  MovementReason,
} from '../../core/services/stock-movement.service';
import { ProductService, Product } from '../../core/services/product.service';
import { TeamService } from '../../core/services/team.service';
import { ToastService } from '../../core/services/toast.service';
import { Pagination } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-movement',
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './movement.html',
  styleUrl: './movement.css',
})
export class Movement implements OnInit {
  // Modal state
  showModal = signal(false);
  selectedMovement = signal<StockMovement | null>(null);
  showDetailModal = signal(false);

  // Formulário
  selectedProductId = signal<string>('');
  selectedType = signal<MovementType>('ENTRY');
  selectedReason = signal<MovementReason>('PURCHASE');
  quantity = signal<number>(1);
  notes = signal<string>('');

  // Filtros
  searchQuery = signal('');
  filterType = signal<MovementType | ''>('');
  filterReason = signal<MovementReason | ''>('');
  filterProductId = signal<string>('');
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Paginação
  currentPage = signal(1);
  pageSize = signal(10);

  // Products para seleção
  products = computed(() => this.productService.allProducts());

  // Stats
  totalMovements = computed(() => this.movementService.paginationMeta()?.total ?? 0);
  totalEntries = computed(() => {
    return this.movementService.allMovements().filter(m => m.type === 'ENTRY').length;
  });
  totalExits = computed(() => {
    return this.movementService.allMovements().filter(m => m.type === 'EXIT').length;
  });
  totalAdjustments = computed(() => {
    return this.movementService.allMovements().filter(m => m.type === 'ADJUSTMENT').length;
  });

  // Options
  typeOptions: { value: MovementType; label: string; icon: string }[] = [
    { value: 'ENTRY', label: 'Entrada', icon: 'arrow_downward' },
    { value: 'EXIT', label: 'Saída', icon: 'arrow_upward' },
    { value: 'ADJUSTMENT', label: 'Ajuste', icon: 'sync_alt' },
  ];

  reasonOptions: { value: MovementReason; label: string }[] = [
    { value: 'PURCHASE', label: 'Compra' },
    { value: 'SALE', label: 'Venda' },
    { value: 'RETURN', label: 'Devolução' },
    { value: 'LOSS', label: 'Perda' },
    { value: 'ADJUSTMENT', label: 'Ajuste de Estoque' },
    { value: 'OTHER', label: 'Outro' },
  ];

  // Motivos filtrados por tipo
  filteredReasons = computed(() => {
    const type = this.selectedType();
    if (type === 'ENTRY') {
      return this.reasonOptions.filter(r => ['PURCHASE', 'RETURN', 'ADJUSTMENT', 'OTHER'].includes(r.value));
    } else if (type === 'EXIT') {
      return this.reasonOptions.filter(r => ['SALE', 'LOSS', 'OTHER'].includes(r.value));
    }
    return this.reasonOptions.filter(r => ['ADJUSTMENT', 'OTHER'].includes(r.value));
  });

  private toastService = inject(ToastService);

  constructor(
    public movementService: StockMovementService,
    public productService: ProductService,
    public teamService: TeamService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      this.loadMovements();
      // Carregar produtos para o select
      this.productService.getByTeam(teamId, { limit: 1000 }).subscribe();
    }
  }

  private loadMovements(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      this.movementService.getByTeam(teamId, {
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.searchQuery() || undefined,
        type: this.filterType() || undefined,
        reason: this.filterReason() || undefined,
        productId: this.filterProductId() || undefined,
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
      this.loadMovements();
    }, 300);
  }

  onFilterTypeChange(type: string): void {
    this.filterType.set(type as MovementType | '');
    this.currentPage.set(1);
    this.loadMovements();
  }

  onFilterReasonChange(reason: string): void {
    this.filterReason.set(reason as MovementReason | '');
    this.currentPage.set(1);
    this.loadMovements();
  }

  onFilterProductChange(productId: string): void {
    this.filterProductId.set(productId);
    this.currentPage.set(1);
    this.loadMovements();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterType.set('');
    this.filterReason.set('');
    this.filterProductId.set('');
    this.currentPage.set(1);
    this.loadMovements();
  }

  // Paginação handlers
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadMovements();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadMovements();
  }

  // Modal handlers
  openCreateModal(): void {
    this.resetForm();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.selectedProductId.set('');
    this.selectedType.set('ENTRY');
    this.selectedReason.set('PURCHASE');
    this.quantity.set(1);
    this.notes.set('');
  }

  onTypeChange(type: MovementType): void {
    this.selectedType.set(type);
    // Atualizar motivo padrão baseado no tipo
    if (type === 'ENTRY') {
      this.selectedReason.set('PURCHASE');
    } else if (type === 'EXIT') {
      this.selectedReason.set('SALE');
    } else {
      this.selectedReason.set('ADJUSTMENT');
    }
  }

  // CRUD operations
  saveMovement(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId || !this.selectedProductId()) return;

    const dto: CreateStockMovementDto = {
      productId: this.selectedProductId(),
      type: this.selectedType(),
      reason: this.selectedReason(),
      quantity: this.quantity(),
      notes: this.notes() || undefined,
    };

    this.movementService.create(teamId, dto).subscribe({
      next: () => {
        this.closeModal();
        this.loadMovements();
        // Recarregar produtos para atualizar estoque
        this.productService.getByTeam(teamId, { limit: 1000 }).subscribe();
        const typeLabel = this.getTypeLabel(dto.type).toLowerCase();
        this.toastService.success('Movimentação registrada', `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} de estoque realizada com sucesso.`);
      },
      error: () => {
        this.toastService.error('Erro na movimentação', 'Não foi possível registrar a movimentação de estoque.');
      },
    });
  }

  // Detalhes
  openDetailModal(movement: StockMovement): void {
    this.selectedMovement.set(movement);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedMovement.set(null);
  }

  // Helpers
  getTypeLabel(type: MovementType): string {
    const option = this.typeOptions.find(t => t.value === type);
    return option?.label || type;
  }

  getTypeIcon(type: MovementType): string {
    const option = this.typeOptions.find(t => t.value === type);
    return option?.icon || 'swap_vert';
  }

  getTypeClass(type: MovementType): string {
    switch (type) {
      case 'ENTRY': return 'type-entry';
      case 'EXIT': return 'type-exit';
      case 'ADJUSTMENT': return 'type-adjustment';
      default: return '';
    }
  }

  getReasonLabel(reason: MovementReason): string {
    const option = this.reasonOptions.find(r => r.value === reason);
    return option?.label || reason;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  formatShortDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  getSelectedProduct(): Product | undefined {
    return this.products().find(p => p.id === this.selectedProductId());
  }

  getProductStock(): number {
    const product = this.getSelectedProduct();
    return product?.currentStock ?? 0;
  }

  canSave(): boolean {
    if (!this.selectedProductId() || this.quantity() < 1) return false;

    // Para saída, verificar se tem estoque suficiente
    if (this.selectedType() === 'EXIT') {
      const product = this.getSelectedProduct();
      if (!product || product.currentStock < this.quantity()) {
        return false;
      }
    }

    return true;
  }

  getStockChangePreview(): { label: string; value: number; class: string } | null {
    const product = this.getSelectedProduct();
    if (!product) return null;

    const qty = this.quantity();
    const type = this.selectedType();
    let newStock: number;
    let label: string;
    let cssClass: string;

    switch (type) {
      case 'ENTRY':
        newStock = product.currentStock + qty;
        label = `+${qty}`;
        cssClass = 'preview-entry';
        break;
      case 'EXIT':
        newStock = product.currentStock - qty;
        label = `-${qty}`;
        cssClass = 'preview-exit';
        break;
      case 'ADJUSTMENT':
        newStock = qty;
        label = `=${qty}`;
        cssClass = 'preview-adjustment';
        break;
      default:
        return null;
    }

    return { label, value: newStock, class: cssClass };
  }
}
