import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  CreateCurrencyDto,
  CurrencyApiResponse,
  CurrencyService,
  CurrencySymbolPosition
} from '../../../services/currency.service';

type CurrencyStatus = 'Actif' | 'Inactif';

interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  numericCode: string;
  symbolPosition: CurrencySymbolPosition;
  symbolPositionLabel: string;
  formatPreview: string;
  status: CurrencyStatus;
  comment: string;
  createdAt: string;
}

interface CurrencyForm {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: string;
  numericCode: string;
  symbolPosition: CurrencySymbolPosition;
  active: boolean;
  comment: string;
}

interface StatCard {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone: 'blue' | 'green' | 'orange';
}

@Component({
  selector: 'app-ecole-currencies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-currencies.component.html',
  styleUrl: './ecole-currencies.component.css'
})
export class EcoleCurrenciesComponent implements OnInit, OnDestroy {
  searchTerm = '';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoading = false;
  loadError = '';

  isModalOpen = false;
  isEditMode = false;
  editingCurrencyId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  openActionMenuId: string | null = null;

  currencies: CurrencyItem[] = [];
  form: CurrencyForm = this.buildEmptyForm();

  readonly commentMaxLength = 500;
  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];
  readonly symbolPositionOptions: { value: CurrencySymbolPosition; label: string }[] = [
    { value: 'BEFORE', label: 'Avant le montant' },
    { value: 'AFTER', label: 'Apres le montant' }
  ];
  readonly pageSizeOptions = [10, 25, 50];

  constructor(private readonly currencyService: CurrencyService) {}

  ngOnInit(): void {
    this.loadCurrencies(true);
    document.addEventListener('click', this.closeActionMenu);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.closeActionMenu);
  }

  private closeActionMenu = (): void => {
    this.openActionMenuId = null;
  };

  get commentLength(): number {
    return this.form.comment.length;
  }

  get formatPreview(): string {
    const amount = this.formatPreviewAmount();
    const symbol = this.form.symbol.trim() || '?';
    return this.form.symbolPosition === 'AFTER' ? `${amount} ${symbol}` : `${symbol}${amount}`;
  }

  get statsCards(): StatCard[] {
    const total = this.currencies.length;
    const activeCount = this.currencies.filter((item) => item.status === 'Actif').length;
    const inactiveCount = total - activeCount;
    const activePercent = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    const inactivePercent = total > 0 ? Math.round((inactiveCount / total) * 100) : 0;

    return [
      {
        label: 'Total devises',
        value: String(total),
        icon: 'bi-currency-exchange',
        tone: 'blue'
      },
      {
        label: 'Devises actives',
        value: String(activeCount),
        hint: `${activePercent}% du total`,
        icon: 'bi-check-circle',
        tone: 'green'
      },
      {
        label: 'Devises inactives',
        value: String(inactiveCount),
        hint: `${inactivePercent}% du total`,
        icon: 'bi-pause-circle',
        tone: 'orange'
      }
    ];
  }

  get filteredCurrencies(): CurrencyItem[] {
    const term = this.normalize(this.searchTerm);

    return this.currencies
      .filter((item) => {
        const matchesSearch =
          !term ||
          this.normalize(item.name).includes(term) ||
          this.normalize(item.code).includes(term) ||
          this.normalize(item.symbol).includes(term) ||
          this.normalize(item.numericCode).includes(term);

        const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.code.localeCompare(b.code, 'fr'));
  }

  get paginatedCurrencies(): CurrencyItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCurrencies.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCurrencies.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredCurrencies.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredCurrencies.length);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.currentPage = 1;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingCurrencyId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  openEditModal(item: CurrencyItem): void {
    this.openActionMenuId = null;
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingCurrencyId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toFormFields(item);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingCurrencyId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  toggleActiveStatus(): void {
    this.form = { ...this.form, active: !this.form.active };
  }

  toggleActionMenu(itemId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openActionMenuId = this.openActionMenuId === itemId ? null : itemId;
  }

  deleteCurrency(item: CurrencyItem): void {
    this.openActionMenuId = null;
    if (!confirm(`Supprimer la devise "${item.name}" (${item.code}) ?`)) {
      return;
    }

    this.currencyService.delete(item.id).subscribe({
      next: () => this.loadCurrencies(false),
      error: () => {
        this.loadError = 'Echec de suppression de la devise.';
      }
    });
  }

  saveCurrency(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving) {
      formRef.control.markAllAsTouched();
      return;
    }

    const validationError = this.validateForm();
    if (validationError) {
      this.saveError = validationError;
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateCurrencyDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      symbol: this.form.symbol.trim(),
      decimalPlaces: Number(this.form.decimalPlaces),
      numericCode: this.form.numericCode.trim() || undefined,
      symbolPosition: this.form.symbolPosition,
      active: this.form.active,
      comment: this.form.comment.trim() || undefined
    };

    if (this.isEditMode) {
      if (!this.editingCurrencyId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour cette devise: identifiant invalide.';
        return;
      }

      this.currencyService.update(this.editingCurrencyId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadCurrencies(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.currencyService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadCurrencies(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation. Verifiez l'API puis reessayez.";
      }
    });
  }

  private loadCurrencies(showLoader = true): void {
    if (showLoader) {
      this.isLoading = true;
    }
    this.loadError = '';

    this.currencyService.getAll().subscribe({
      next: (rows: CurrencyApiResponse[]) => {
        this.currencies = rows
          .map((row) => this.mapApiToItem(row))
          .filter((item) => item.id);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les devises.';
        this.currencies = [];
      }
    });
  }

  private mapApiToItem(row: CurrencyApiResponse): CurrencyItem {
    const code = (row.code ?? '').trim().toUpperCase();
    const symbol = (row.symbol ?? '').trim();
    const decimalPlaces = Number(row.decimalPlaces ?? row.decimal_places ?? 2);
    const symbolPosition = (row.symbolPosition ?? row.symbol_position ?? 'BEFORE') as CurrencySymbolPosition;
    const numericCode = (row.numericCode ?? row.numeric_code ?? '').trim();

    return {
      id: String(row.id ?? ''),
      code,
      name: (row.name ?? '').trim(),
      symbol,
      decimalPlaces: Number.isFinite(decimalPlaces) ? decimalPlaces : 2,
      numericCode: numericCode || '—',
      symbolPosition,
      symbolPositionLabel: this.resolveSymbolPositionLabel(symbolPosition),
      formatPreview: this.buildFormatPreview(symbol, symbolPosition, decimalPlaces),
      status: this.resolveStatus(row.active),
      comment: (row.comment ?? '').trim(),
      createdAt: this.formatDate(row.createdAt ?? row.created_at)
    };
  }

  private validateForm(): string {
    if (!this.form.code.trim()) {
      return 'Le code est obligatoire.';
    }
    if (this.form.code.trim().length !== 3) {
      return 'Le code doit contenir exactement 3 caracteres.';
    }
    if (!this.form.name.trim()) {
      return 'Le libelle est obligatoire.';
    }
    if (!this.form.symbol.trim()) {
      return 'Le symbole est obligatoire.';
    }
    const decimalPlaces = Number(this.form.decimalPlaces);
    if (!Number.isFinite(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 4) {
      return 'Le nombre de decimales doit etre compris entre 0 et 4.';
    }
    if (this.form.numericCode.trim().length > 3) {
      return 'Le code numerique ne peut pas depasser 3 caracteres.';
    }
    return '';
  }

  private buildEmptyForm(): CurrencyForm {
    return {
      code: '',
      name: '',
      symbol: '',
      decimalPlaces: '2',
      numericCode: '',
      symbolPosition: 'BEFORE',
      active: true,
      comment: ''
    };
  }

  private toFormFields(item: CurrencyItem): CurrencyForm {
    return {
      code: item.code,
      name: item.name,
      symbol: item.symbol,
      decimalPlaces: String(item.decimalPlaces),
      numericCode: item.numericCode === '—' ? '' : item.numericCode,
      symbolPosition: item.symbolPosition,
      active: item.status === 'Actif',
      comment: item.comment
    };
  }

  private resolveSymbolPositionLabel(position: CurrencySymbolPosition): string {
    return position === 'AFTER' ? 'Apres le montant' : 'Avant le montant';
  }

  private buildFormatPreview(
    symbol: string,
    position: CurrencySymbolPosition,
    decimalPlaces: number
  ): string {
    const amount = (1000).toLocaleString('fr-FR', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
    const safeSymbol = symbol || '?';
    return position === 'AFTER' ? `${amount} ${safeSymbol}` : `${safeSymbol}${amount}`;
  }

  private formatPreviewAmount(): string {
    const decimalPlaces = Number(this.form.decimalPlaces);
    const safeDecimals = Number.isFinite(decimalPlaces) ? Math.min(Math.max(decimalPlaces, 0), 4) : 2;
    return (1000).toLocaleString('fr-FR', {
      minimumFractionDigits: safeDecimals,
      maximumFractionDigits: safeDecimals
    });
  }

  private resolveStatus(active: unknown): CurrencyStatus {
    if (active === false || active === 'false' || active === 0 || active === '0') {
      return 'Inactif';
    }
    return 'Actif';
  }

  private formatDate(value: string | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
