import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../../services/academic-year.service';
import {
  CurrencyApiResponse,
  CurrencyService
} from '../../../../services/currency.service';
import {
  SchoolCurrencyApiResponse,
  SchoolCurrencyService
} from '../../../../services/school-currency.service';

type InnerTab = 'configuration' | 'historique';

interface AcademicYearOption {
  id: string;
  label: string;
  active: boolean;
}

interface PlatformCurrencyRow {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  active: boolean;
  iconTone: string;
  codeTone: string;
}

interface SchoolCurrencyLink {
  id: string;
  currencyId: string;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
}

interface CurrencyHistoryRow {
  code: string;
  name: string;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
}

interface SavedConfiguration {
  selectedCurrencyIds: string[];
  primaryCurrencyId: string;
}

@Component({
  selector: 'app-ecole-academic-year-currencies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-academic-year-currencies.component.html',
  styleUrl: './ecole-academic-year-currencies.component.css'
})
export class EcoleAcademicYearCurrenciesComponent implements OnInit, OnChanges {
  @Input() schoolId = '';
  @Input() schoolName = '';

  innerTab: InnerTab = 'configuration';
  selectedYearId = '';

  isLoading = false;
  isSaving = false;
  loadError = '';
  saveError = '';

  platformCurrencies: PlatformCurrencyRow[] = [];
  yearOptions: AcademicYearOption[] = [];
  selectedCurrencyIds = new Set<string>();
  primaryCurrencyId = '';
  historyRows: CurrencyHistoryRow[] = [];

  private schoolCurrencyLinks: SchoolCurrencyLink[] = [];
  private savedConfiguration: SavedConfiguration = {
    selectedCurrencyIds: [],
    primaryCurrencyId: ''
  };

  constructor(
    private readonly academicYearService: AcademicYearService,
    private readonly currencyService: CurrencyService,
    private readonly schoolCurrencyService: SchoolCurrencyService
  ) {}

  ngOnInit(): void {
    if (this.schoolId) {
      this.bootstrap();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schoolId'] && !changes['schoolId'].firstChange) {
      this.bootstrap();
    }
  }

  get selectedYear(): AcademicYearOption | undefined {
    return this.yearOptions.find((year) => year.id === this.selectedYearId);
  }

  get selectedCurrencyCount(): number {
    return this.selectedCurrencyIds.size;
  }

  get primaryCurrencyLabel(): string {
    if (!this.primaryCurrencyId) {
      return '—';
    }
    const row = this.platformCurrencies.find((item) => item.id === this.primaryCurrencyId);
    return row ? `${row.code} - ${row.name}` : '—';
  }

  get selectedCurrencyOptions(): PlatformCurrencyRow[] {
    return this.platformCurrencies.filter((item) => this.selectedCurrencyIds.has(item.id));
  }

  get canSave(): boolean {
    return (
      !!this.schoolId &&
      !!this.selectedYearId &&
      this.selectedCurrencyIds.size > 0 &&
      !!this.primaryCurrencyId &&
      this.selectedCurrencyIds.has(this.primaryCurrencyId) &&
      !this.isSaving
    );
  }

  get hasUnsavedChanges(): boolean {
    const savedIds = [...this.savedConfiguration.selectedCurrencyIds].sort().join('|');
    const currentIds = [...this.selectedCurrencyIds].sort().join('|');
    return (
      savedIds !== currentIds ||
      this.primaryCurrencyId !== this.savedConfiguration.primaryCurrencyId
    );
  }

  setInnerTab(tab: InnerTab): void {
    this.innerTab = tab;
    if (tab === 'historique') {
      this.buildHistoryRows();
    }
  }

  onYearChange(): void {
    this.saveError = '';
  }

  isCurrencySelected(currencyId: string): boolean {
    return this.selectedCurrencyIds.has(currencyId);
  }

  toggleCurrencySelection(currencyId: string, selected: boolean): void {
    const next = new Set(this.selectedCurrencyIds);

    if (!selected) {
      next.delete(currencyId);
      this.selectedCurrencyIds = next;
      if (this.primaryCurrencyId === currencyId) {
        this.primaryCurrencyId = this.selectedCurrencyOptions[0]?.id ?? '';
      }
      return;
    }

    next.add(currencyId);
    this.selectedCurrencyIds = next;
    if (!this.primaryCurrencyId || !this.selectedCurrencyIds.has(this.primaryCurrencyId)) {
      this.primaryCurrencyId = currencyId;
    }
  }

  selectPrimaryCurrency(currencyId: string): void {
    if (!this.selectedCurrencyIds.has(currencyId)) {
      return;
    }
    this.primaryCurrencyId = currencyId;
  }

  cancelChanges(): void {
    this.applyConfiguration(this.savedConfiguration);
    this.saveError = '';
  }

  saveConfiguration(): void {
    if (!this.canSave || !this.schoolId) {
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const selectedIds = [...this.selectedCurrencyIds];
    const existingByCurrencyId = new Map(
      this.schoolCurrencyLinks.map((link) => [link.currencyId, link])
    );

    const operations: Observable<unknown>[] = [];

    for (const link of this.schoolCurrencyLinks) {
      if (!selectedIds.includes(link.currencyId)) {
        operations.push(this.schoolCurrencyService.delete(link.id).pipe(catchError(() => of(null))));
      }
    }

    for (const currencyId of selectedIds) {
      const isDefault = currencyId === this.primaryCurrencyId;
      const existing = existingByCurrencyId.get(currencyId);

      if (existing) {
        operations.push(
          this.schoolCurrencyService
            .update(existing.id, {
              schoolId: this.schoolId,
              currencyId,
              isDefault,
              active: true
            })
            .pipe(catchError(() => of(null)))
        );
        continue;
      }

      operations.push(
        this.schoolCurrencyService
          .create({
            schoolId: this.schoolId,
            currencyId,
            isDefault,
            active: true
          })
          .pipe(catchError(() => of(null)))
      );
    }

    if (!operations.length) {
      this.isSaving = false;
      return;
    }

    forkJoin(operations).subscribe({
      next: (results) => {
        if (results.some((result) => result === null)) {
          this.isSaving = false;
          this.saveError = "Echec d'enregistrement partiel. Rechargez puis reessayez.";
          this.loadSchoolConfiguration(false);
          return;
        }

        this.isSaving = false;
        this.loadSchoolConfiguration(false);
        if (this.innerTab === 'historique') {
          this.buildHistoryRows();
        }
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec d'enregistrement. Verifiez l'API puis reessayez.";
      }
    });
  }

  getYearStatusClass(active: boolean): string {
    return active ? 'status-open' : 'status-closed';
  }

  private bootstrap(): void {
    if (!this.schoolId) {
      this.resetState();
      return;
    }

    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      years: this.academicYearService.getAll({ schoolId: this.schoolId }).pipe(catchError(() => of([]))),
      currencies: this.currencyService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ years, currencies }) => {
        this.yearOptions = (years as AcademicYearApiResponse[])
          .filter((row) => row.active !== false)
          .map((row) => this.mapYearOption(row))
          .filter((item) => item.id)
          .sort((a, b) => b.label.localeCompare(a.label, 'fr'));

        this.platformCurrencies = (currencies as CurrencyApiResponse[])
          .map((row) => this.mapCurrencyRow(row))
          .filter((item) => item.id && item.active);

        this.selectedYearId = this.yearOptions[0]?.id ?? '';

        this.isLoading = false;
        this.loadSchoolConfiguration(true);
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les donnees de reference.';
        this.resetState();
      }
    });
  }

  private loadSchoolConfiguration(showLoader = false): void {
    if (!this.schoolId) {
      this.applyConfiguration({ selectedCurrencyIds: [], primaryCurrencyId: '' });
      this.savedConfiguration = { selectedCurrencyIds: [], primaryCurrencyId: '' };
      this.schoolCurrencyLinks = [];
      return;
    }

    if (showLoader) {
      this.isLoading = true;
    }
    this.loadError = '';

    this.schoolCurrencyService.getAll(this.schoolId).pipe(catchError(() => of([]))).subscribe({
      next: (rows) => {
        this.schoolCurrencyLinks = (rows as SchoolCurrencyApiResponse[])
          .map((row) => this.mapSchoolCurrencyLink(row))
          .filter((item) => item.id && item.currencyId);

        this.captureSavedState(rows as SchoolCurrencyApiResponse[]);
        this.isLoading = false;
        if (this.innerTab === 'historique') {
          this.buildHistoryRows();
        }
      },
      error: () => {
        this.schoolCurrencyLinks = [];
        this.applyConfiguration({ selectedCurrencyIds: [], primaryCurrencyId: '' });
        this.savedConfiguration = { selectedCurrencyIds: [], primaryCurrencyId: '' };
        this.isLoading = false;
        this.loadError = 'Impossible de charger la configuration des devises.';
      }
    });
  }

  private buildHistoryRows(): void {
    this.historyRows = this.schoolCurrencyLinks
      .map((link) => {
        const currency = this.platformCurrencies.find((item) => item.id === link.currencyId);
        return {
          code: currency?.code ?? '—',
          name: currency?.name ?? '—',
          isDefault: link.isDefault,
          active: link.active,
          createdAt: this.formatDate(link.createdAt)
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt, 'fr'));
  }

  private captureSavedState(rows: SchoolCurrencyApiResponse[]): void {
    const links = rows
      .map((row) => this.mapSchoolCurrencyLink(row))
      .filter((item) => item.id && item.currencyId);

    this.schoolCurrencyLinks = links;

    const selectedCurrencyIds = links.map((link) => link.currencyId);
    const defaultLink = links.find((link) => link.isDefault);

    const configuration: SavedConfiguration = {
      selectedCurrencyIds,
      primaryCurrencyId:
        defaultLink?.currencyId && selectedCurrencyIds.includes(defaultLink.currencyId)
          ? defaultLink.currencyId
          : selectedCurrencyIds[0] ?? ''
    };

    this.savedConfiguration = {
      selectedCurrencyIds: [...configuration.selectedCurrencyIds],
      primaryCurrencyId: configuration.primaryCurrencyId
    };
    this.applyConfiguration(configuration);
  }

  private mapSchoolCurrencyLink(row: SchoolCurrencyApiResponse): SchoolCurrencyLink {
    return {
      id: String(row.id ?? ''),
      currencyId: String(row.currencyId ?? row.currency_id ?? ''),
      isDefault: row.isDefault === true || row.is_default === true,
      active: row.active !== false,
      createdAt: String(row.createdAt ?? row.created_at ?? '')
    };
  }

  private applyConfiguration(configuration: SavedConfiguration): void {
    this.selectedCurrencyIds = new Set(configuration.selectedCurrencyIds);
    this.primaryCurrencyId = configuration.primaryCurrencyId;
  }

  private resetState(): void {
    this.yearOptions = [];
    this.platformCurrencies = [];
    this.selectedYearId = '';
    this.historyRows = [];
    this.schoolCurrencyLinks = [];
    this.applyConfiguration({ selectedCurrencyIds: [], primaryCurrencyId: '' });
    this.savedConfiguration = { selectedCurrencyIds: [], primaryCurrencyId: '' };
  }

  private mapYearOption(row: AcademicYearApiResponse): AcademicYearOption {
    return {
      id: String(row.id ?? ''),
      label: AcademicYearService.buildLabel(row),
      active: row.active !== false
    };
  }

  private mapCurrencyRow(row: CurrencyApiResponse): PlatformCurrencyRow {
    const code = (row.code ?? '').trim().toUpperCase();
    const tones = this.resolveCurrencyTones(code);
    return {
      id: String(row.id ?? ''),
      code,
      name: (row.name ?? '').trim(),
      symbol: (row.symbol ?? '').trim(),
      decimalPlaces: Number(row.decimalPlaces ?? row.decimal_places ?? 2),
      active: row.active !== false,
      iconTone: tones.iconTone,
      codeTone: tones.codeTone
    };
  }

  private resolveCurrencyTones(code: string): { iconTone: string; codeTone: string } {
    switch (code) {
      case 'USD':
        return { iconTone: 'tone-green', codeTone: 'code-green' };
      case 'CDF':
        return { iconTone: 'tone-teal', codeTone: 'code-teal' };
      case 'EUR':
        return { iconTone: 'tone-blue', codeTone: 'code-blue' };
      case 'GBP':
        return { iconTone: 'tone-purple', codeTone: 'code-purple' };
      case 'JPY':
        return { iconTone: 'tone-orange', codeTone: 'code-orange' };
      default:
        return { iconTone: 'tone-slate', codeTone: 'code-slate' };
    }
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
}
