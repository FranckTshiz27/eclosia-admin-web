import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  CurrencyApiResponse,
  CurrencyService
} from '../../../services/currency.service';
import {
  CreateCurrencyRateDto,
  CurrencyRateApiResponse,
  CurrencyRateService,
  RateSource
} from '../../../services/currency-rate.service';
import { SchoolApiResponse, SchoolService } from '../../../services/school.service';
import {
  SchoolCurrencyApiResponse,
  SchoolCurrencyService
} from '../../../services/school-currency.service';

interface SelectOption {
  value: string;
  label: string;
}

interface SchoolCurrencyOption {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  iconTone: string;
}

interface ExchangeRateItem {
  id: string;
  sourceCurrencyId: string;
  targetCurrencyId: string;
  fromCode: string;
  toCode: string;
  fromName: string;
  toName: string;
  fromSymbol: string;
  toSymbol: string;
  fromTone: string;
  toTone: string;
  rate: number;
  rateLabel: string;
  source: RateSource;
  sourceLabel: string;
  effectiveDate: string;
  effectiveDateLabel: string;
  status: 'Actif' | 'Inactif';
  updatedAt: string;
  updatedAtLabel: string;
  comment: string;
}

interface ExchangeRateForm {
  sourceCurrencyId: string;
  targetCurrencyId: string;
  rate: string;
  effectiveDate: string;
  source: RateSource;
  comment: string;
  active: boolean;
}

interface ChartPoint {
  x: number;
  y: number;
  label: string;
  valueLabel: string;
}

interface SummaryCard {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone: 'blue' | 'green' | 'orange' | 'purple';
}

@Component({
  selector: 'app-ecole-exchange-rates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-exchange-rates.component.html',
  styleUrl: './ecole-exchange-rates.component.css'
})
export class EcoleExchangeRatesComponent implements OnInit {
  selectedSchoolId = '';
  fromCurrencyFilter = 'all';
  toCurrencyFilter = 'all';
  statusFilter = 'all';
  searchTerm = '';
  pageSize = 10;
  currentPage = 1;

  isLoadingSchools = false;
  isLoading = false;
  loadError = '';

  isModalOpen = false;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  schools: SelectOption[] = [];
  schoolCurrencies: SchoolCurrencyOption[] = [];
  rates: ExchangeRateItem[] = [];
  form: ExchangeRateForm = this.buildEmptyForm();

  readonly sourceOptions: { value: RateSource; label: string }[] = [
    { value: 'MANUAL', label: 'Manuel' }
  ];
  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];
  readonly pageSizeOptions = [10, 25, 50];

  private currencyById = new Map<string, SchoolCurrencyOption>();

  constructor(
    private readonly schoolService: SchoolService,
    private readonly currencyService: CurrencyService,
    private readonly schoolCurrencyService: SchoolCurrencyService,
    private readonly currencyRateService: CurrencyRateService
  ) {}

  ngOnInit(): void {
    this.loadSchools();
  }

  get currencyFilterOptions(): SelectOption[] {
    return [
      { value: 'all', label: 'Toutes' },
      ...this.schoolCurrencies.map((item) => ({
        value: item.id,
        label: `${item.code} - ${item.name}`
      }))
    ];
  }

  get principalCurrency(): SchoolCurrencyOption | undefined {
    return this.schoolCurrencies.find((item) => item.isDefault);
  }

  get sourceCurrencyOptions(): SchoolCurrencyOption[] {
    const principalId = this.principalCurrency?.id;
    return this.schoolCurrencies.filter((item) => item.id !== principalId);
  }

  get summaryCards(): SummaryCard[] {
    const primary = this.schoolCurrencies.find((item) => item.isDefault);
    const activeRates = this.rates.filter((item) => item.status === 'Actif');
    const latest = [...this.rates].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
    const latestSource = latest?.sourceLabel ?? '—';

    return [
      {
        label: 'Devise principale',
        value: primary ? `${primary.code} (${primary.name})` : '—',
        icon: 'bi-currency-dollar',
        tone: 'blue'
      },
      {
        label: 'Derniere mise a jour',
        value: latest?.updatedAtLabel ?? '—',
        hint: latest ? 'Par Admin' : undefined,
        icon: 'bi-clock-history',
        tone: 'green'
      },
      {
        label: 'Source des taux',
        value: latestSource,
        icon: 'bi-bank',
        tone: 'purple'
      },
      {
        label: 'Taux actifs',
        value: String(activeRates.length),
        hint: 'Paires de devises',
        icon: 'bi-arrow-left-right',
        tone: 'orange'
      }
    ];
  }

  get filteredRates(): ExchangeRateItem[] {
    const term = this.normalize(this.searchTerm);

    return this.rates
      .filter((item) => {
        const matchesSearch =
          !term ||
          this.normalize(item.fromCode).includes(term) ||
          this.normalize(item.toCode).includes(term) ||
          this.normalize(item.fromName).includes(term) ||
          this.normalize(item.toName).includes(term) ||
          this.normalize(item.rateLabel).includes(term);

        const matchesFrom = this.fromCurrencyFilter === 'all' || item.sourceCurrencyId === this.fromCurrencyFilter;
        const matchesTo = this.toCurrencyFilter === 'all' || item.targetCurrencyId === this.toCurrencyFilter;
        const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;

        return matchesSearch && matchesFrom && matchesTo && matchesStatus;
      })
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  }

  get paginatedRates(): ExchangeRateItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRates.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRates.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredRates.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredRates.length);
  }

  get recentRates(): ExchangeRateItem[] {
    return [...this.rates]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
  }

  get chartTitle(): string {
    const from = this.getCurrencyLabel(this.form.sourceCurrencyId);
    const to = this.getCurrencyLabel(this.form.targetCurrencyId);
    if (!from || !to) {
      return 'Evolution du taux';
    }
    return `Evolution du taux ${from} -> ${to}`;
  }

  get chartPoints(): ChartPoint[] {
    const sourceId = this.form.sourceCurrencyId;
    const targetId = this.form.targetCurrencyId;
    if (!sourceId || !targetId) {
      return [];
    }

    const history = this.rates
      .filter((item) => item.sourceCurrencyId === sourceId && item.targetCurrencyId === targetId)
      .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
      .slice(-8);

    if (!history.length) {
      return [];
    }

    const values = history.map((item) => item.rate);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 100;
    const height = 60;
    const step = history.length > 1 ? width / (history.length - 1) : 0;

    return history.map((item, index) => ({
      x: history.length > 1 ? index * step : width / 2,
      y: height - ((item.rate - min) / range) * height,
      label: item.effectiveDateLabel,
      valueLabel: item.rateLabel
    }));
  }

  get chartPolyline(): string {
    return this.chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
  }

  get hasChartData(): boolean {
    return this.chartPoints.length > 0;
  }

  onSchoolChange(): void {
    this.currentPage = 1;
    this.closeModal();
    this.bootstrapSchoolData(true);
  }

  resetFilters(): void {
    this.fromCurrencyFilter = 'all';
    this.toCurrencyFilter = 'all';
    this.statusFilter = 'all';
    this.searchTerm = '';
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

  openCreateForm(): void {
    this.isModalOpen = true;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
    this.syncPrincipalTarget();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  deleteRate(item: ExchangeRateItem): void {
    if (!confirm(`Supprimer le taux ${item.fromCode} -> ${item.toCode} ?`)) {
      return;
    }

    this.currencyRateService.delete(item.id).subscribe({
      next: () => this.loadRates(false),
      error: () => {
        this.loadError = 'Echec de suppression du taux de change.';
      }
    });
  }

  saveRate(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving || !this.selectedSchoolId) {
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

    const dto: CreateCurrencyRateDto = {
      schoolId: this.selectedSchoolId,
      sourceCurrencyId: this.form.sourceCurrencyId,
      targetCurrencyId: this.principalCurrency?.id ?? this.form.targetCurrencyId,
      rate: Number(this.form.rate),
      effectiveDate: this.form.effectiveDate,
      source: this.form.source,
      comment: this.form.comment.trim() || undefined,
      active: this.form.active
    };

    this.currencyRateService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadRates(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec d'enregistrement. Verifiez l'API puis reessayez.";
      }
    });
  }

  getCurrencyLabel(currencyId: string): string {
    const item = this.currencyById.get(currencyId);
    return item?.code ?? '';
  }

  private loadSchools(): void {
    this.isLoadingSchools = true;
    this.loadError = '';

    this.schoolService.getAll().subscribe({
      next: (rows: SchoolApiResponse[]) => {
        this.schools = rows
          .map((row) => ({
            value: String(row.id ?? ''),
            label: (row.name ?? '').trim() || 'Ecole sans nom'
          }))
          .filter((item) => item.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.selectedSchoolId = this.schools[0]?.value ?? '';
        this.isLoadingSchools = false;
        this.bootstrapSchoolData(true);
      },
      error: () => {
        this.isLoadingSchools = false;
        this.loadError = 'Impossible de charger les ecoles.';
      }
    });
  }

  private bootstrapSchoolData(showLoader = true): void {
    if (!this.selectedSchoolId) {
      this.schoolCurrencies = [];
      this.rates = [];
      this.currencyById.clear();
      return;
    }

    if (showLoader) {
      this.isLoading = true;
    }
    this.loadError = '';

    forkJoin({
      currencies: this.currencyService.getAll().pipe(catchError(() => of([]))),
      schoolCurrencies: this.schoolCurrencyService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      rates: this.currencyRateService.getAll({ schoolId: this.selectedSchoolId }).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ currencies, schoolCurrencies, rates }) => {
        const currencyRows = currencies as CurrencyApiResponse[];
        const currencyMeta = new Map(
          currencyRows.map((row) => [
            String(row.id ?? ''),
            {
              code: (row.code ?? '').trim().toUpperCase(),
              name: (row.name ?? '').trim(),
              symbol: (row.symbol ?? '').trim()
            }
          ])
        );

        this.schoolCurrencies = (schoolCurrencies as SchoolCurrencyApiResponse[])
          .map((row) => {
            const currencyId = String(row.currencyId ?? row.currency_id ?? '');
            const meta = currencyMeta.get(currencyId);
            if (!currencyId || !meta) {
              return null;
            }
            const code = meta.code;
            return {
              id: currencyId,
              code,
              name: meta.name,
              symbol: meta.symbol,
              isDefault: row.isDefault === true || row.is_default === true,
              iconTone: this.resolveCurrencyTone(code)
            };
          })
          .filter((item): item is SchoolCurrencyOption => !!item)
          .sort((a, b) => a.code.localeCompare(b.code, 'fr'));

        this.currencyById = new Map(this.schoolCurrencies.map((item) => [item.id, item]));
        this.rates = (rates as CurrencyRateApiResponse[])
          .map((row) => this.mapApiToItem(row))
          .filter((item) => item.id);

        this.isLoading = false;
        this.form = this.buildEmptyForm();
        this.syncPrincipalTarget();
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les donnees de taux.';
        this.schoolCurrencies = [];
        this.rates = [];
      }
    });
  }

  private loadRates(showLoader = true): void {
    if (!this.selectedSchoolId) {
      this.rates = [];
      return;
    }

    if (showLoader) {
      this.isLoading = true;
    }

    this.currencyRateService.getAll({ schoolId: this.selectedSchoolId }).subscribe({
      next: (rows) => {
        this.rates = rows.map((row) => this.mapApiToItem(row)).filter((item) => item.id);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les taux de change.';
        this.rates = [];
      }
    });
  }

  private mapApiToItem(row: CurrencyRateApiResponse): ExchangeRateItem {
    const sourceCurrencyId = String(row.sourceCurrencyId ?? row.source_currency_id ?? '');
    const targetCurrencyId = String(row.targetCurrencyId ?? row.target_currency_id ?? '');
    const from = this.currencyById.get(sourceCurrencyId);
    const to = this.currencyById.get(targetCurrencyId);
    const rate = Number(row.rate ?? 0);
    const source = this.normalizeSource(row.source ?? row.rate_source);
    const effectiveDate = this.toInputDate(String(row.effectiveDate ?? row.effective_date ?? ''));
    const updatedAt = String(row.updatedAt ?? row.updated_at ?? row.createdAt ?? row.created_at ?? '');

    return {
      id: String(row.id ?? ''),
      sourceCurrencyId,
      targetCurrencyId,
      fromCode: from?.code ?? '—',
      toCode: to?.code ?? '—',
      fromName: from?.name ?? '—',
      toName: to?.name ?? '—',
      fromSymbol: from?.symbol ?? '?',
      toSymbol: to?.symbol ?? '?',
      fromTone: from?.iconTone ?? 'tone-slate',
      toTone: to?.iconTone ?? 'tone-slate',
      rate,
      rateLabel: this.formatRate(rate),
      source,
      sourceLabel: 'Manuel',
      effectiveDate,
      effectiveDateLabel: this.formatDisplayDate(effectiveDate),
      status: row.active === false ? 'Inactif' : 'Actif',
      updatedAt,
      updatedAtLabel: this.formatRelativeDate(updatedAt),
      comment: (row.comment ?? '').trim()
    };
  }

  private validateForm(): string {
    if (!this.principalCurrency) {
      return 'Aucune devise principale definie pour cette ecole.';
    }
    if (!this.form.sourceCurrencyId) {
      return 'Selectionnez la devise source.';
    }
    if (!this.form.targetCurrencyId) {
      return 'Selectionnez la devise cible.';
    }
    if (this.form.sourceCurrencyId === this.form.targetCurrencyId) {
      return 'Les devises source et cible doivent etre differentes.';
    }
    const rate = Number(this.form.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return 'Le taux doit etre un nombre positif.';
    }
    if (!this.form.effectiveDate) {
      return "La date d'effet est obligatoire.";
    }
    return '';
  }

  private syncPrincipalTarget(): void {
    if (this.principalCurrency) {
      this.form.targetCurrencyId = this.principalCurrency.id;
    }
  }

  private buildEmptyForm(): ExchangeRateForm {
    const principal = this.principalCurrency;
    const defaultTarget = principal?.id ?? '';
    const defaultSource = this.sourceCurrencyOptions[0]?.id ?? '';

    return {
      sourceCurrencyId: defaultSource,
      targetCurrencyId: defaultTarget,
      rate: '',
      effectiveDate: this.todayInputDate(),
      source: 'MANUAL',
      comment: '',
      active: true
    };
  }

  private resetForm(): void {
    this.closeModal();
  }

  private normalizeSource(value: unknown): RateSource {
    return 'MANUAL';
  }

  private resolveCurrencyTone(code: string): string {
    switch (code) {
      case 'USD':
        return 'tone-green';
      case 'CDF':
        return 'tone-teal';
      case 'EUR':
        return 'tone-blue';
      case 'GBP':
        return 'tone-purple';
      case 'JPY':
        return 'tone-orange';
      default:
        return 'tone-slate';
    }
  }

  private formatRate(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private formatDisplayDate(value: string): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('fr-FR').format(date);
  }

  private formatRelativeDate(value: string): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (sameDay) {
      return `Aujourd'hui ${new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)}`;
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private toInputDate(value: string): string {
    const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (displayMatch) {
      return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
    }
    const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return isoMatch ? isoMatch[1] : value;
  }

  private todayInputDate(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
