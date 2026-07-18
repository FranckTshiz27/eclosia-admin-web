import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CountryOption, CountryService } from '../../../services/country.service';
import {
  AcademicPeriodApiResponse,
  AcademicPeriodService,
  CreateAcademicPeriodDto
} from '../../../services/academic-period.service';

type StatusLabel = 'Actif' | 'Inactif';

interface PeriodItem {
  id: string;
  code: string;
  name: string;
  country: string;
  countryId?: string;
  countryIso2: string;
  orderNumber: number;
  status: StatusLabel;
}

interface PeriodForm {
  code: string;
  name: string;
  country: string;
  orderNumber: string;
  status: StatusLabel;
}

interface CountryFilterOption {
  label: string;
  id: string | null;
}

@Component({
  selector: 'app-periodes-scolaires',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './periodes-scolaires.component.html',
  styleUrl: './periodes-scolaires.component.css'
})
export class PeriodesScolairesComponent implements OnInit {
  searchTerm = '';
  countryFilter = '';
  countryFilterId: string | null = null;
  statusFilter = 'all';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  isCountryFilterDropdownOpen = false;
  isCountryDropdownOpen = false;
  isLoadingCountries = false;
  isLoadingRows = false;
  loadError = '';
  countryLoadError = '';

  countries: CountryOption[] = [];
  rows: PeriodItem[] = [];

  form: PeriodForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  constructor(
    private readonly countryService: CountryService,
    private readonly academicPeriodService: AcademicPeriodService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get filteredFilterCountryOptions(): CountryFilterOption[] {
    const term = this.normalize(this.countryFilter);
    const options: CountryFilterOption[] = [{ label: 'Tous les pays', id: null }];

    for (const country of [...this.countries].sort((a, b) => a.name.localeCompare(b.name, 'fr'))) {
      if (!this.countryMatchesSearchTerm(country, term)) {
        continue;
      }
      options.push({ label: country.name, id: String(country.id) });
    }

    return options;
  }

  get filteredCountryOptions(): CountryOption[] {
    const term = this.normalize(this.form.country);
    if (!term) {
      return this.countries;
    }
    return this.countries.filter((country) => this.countryMatchesSearchTerm(country, term));
  }

  get filteredRows(): PeriodItem[] {
    const term = this.normalize(this.searchTerm);

    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.name).includes(term) ||
        this.normalize(row.code).includes(term) ||
        this.normalize(row.country).includes(term);

      const matchesCountry = this.matchesCountryFilter(row);
      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;

      return matchesSearch && matchesCountry && matchesStatus;
    });
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = this.createEmptyForm();
    if (this.countryFilterId) {
      this.form.country = this.findCountryNameById(this.countryFilterId);
    }
  }

  openEditModal(item: PeriodItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = this.toPersistedId(item.id);
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = {
      code: item.code,
      name: item.name,
      country: item.country !== '--' ? item.country : this.findCountryNameById(item.countryId),
      orderNumber: String(item.orderNumber ?? 1),
      status: item.status
    };
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = this.createEmptyForm();
  }

  openCountryFilterDropdown(): void {
    this.isCountryFilterDropdownOpen = true;
  }

  closeCountryFilterDropdown(): void {
    setTimeout(() => {
      this.isCountryFilterDropdownOpen = false;
    }, 120);
  }

  onCountryFilterInput(): void {
    this.countryFilterId = null;
    this.openCountryFilterDropdown();
  }

  selectFilterCountry(option: CountryFilterOption): void {
    if (!option.id) {
      this.countryFilter = '';
      this.countryFilterId = null;
    } else {
      this.countryFilter = option.label;
      this.countryFilterId = option.id;
    }
    this.isCountryFilterDropdownOpen = false;
  }

  openCountryDropdown(): void {
    this.isCountryDropdownOpen = true;
  }

  closeCountryDropdown(): void {
    setTimeout(() => {
      this.isCountryDropdownOpen = false;
    }, 120);
  }

  selectCountry(countryName: string): void {
    this.form.country = countryName;
    this.isCountryDropdownOpen = false;
  }

  saveRow(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving) {
      formRef.control.markAllAsTouched();
      return;
    }

    const countryId = this.findCountryIdByName(this.form.country.trim());
    if (!countryId) {
      this.saveError = 'Veuillez sélectionner un pays valide.';
      return;
    }

    const orderNumber = Number(this.form.orderNumber);
    if (!Number.isFinite(orderNumber) || orderNumber < 1) {
      this.saveError = "Le numéro d'ordre doit être un entier positif.";
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateAcademicPeriodDto = {
      countryId,
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      orderNumber,
      active: this.form.status === 'Actif'
    };

    if (this.isEditMode) {
      if (!this.editingId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre à jour cette période: identifiant invalide.';
        return;
      }

      this.academicPeriodService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadRows(false);
        },
        error: (err) => {
          this.isSaving = false;
          this.saveError = this.extractApiError(
            err,
            "Échec de mise à jour de la période scolaire. Vérifiez l'API puis réessayez."
          );
        }
      });
      return;
    }

    this.academicPeriodService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadRows(false);
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = this.extractApiError(
          err,
          "Échec de création de la période scolaire. Vérifiez l'API puis réessayez."
        );
      }
    });
  }

  deleteRow(item: PeriodItem): void {
    if (!confirm(`Supprimer la période scolaire "${item.name}" ?`)) {
      return;
    }

    const id = this.toPersistedId(item.id);
    if (!id) {
      return;
    }

    this.academicPeriodService.delete(id).subscribe({
      next: () => this.loadRows(false),
      error: () => {
        this.loadError = 'Impossible de supprimer cette période scolaire.';
      }
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.countryFilter = '';
    this.countryFilterId = null;
    this.statusFilter = 'all';
    this.isCountryFilterDropdownOpen = false;
  }

  getCountryFlag(iso2: string): string {
    if (!iso2 || iso2 === 'INT') {
      return '🌐';
    }
    return iso2
      .toUpperCase()
      .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
  }

  private matchesCountryFilter(row: PeriodItem): boolean {
    if (!this.countryFilter.trim() && !this.countryFilterId) {
      return true;
    }

    if (this.countryFilterId) {
      return Boolean(row.countryId && this.sameId(row.countryId, this.countryFilterId));
    }

    return this.normalize(row.country).includes(this.normalize(this.countryFilter));
  }

  private countryMatchesSearchTerm(country: CountryOption, term: string): boolean {
    if (!term) {
      return true;
    }
    return (
      this.normalize(country.name).includes(term) ||
      this.normalize(country.iso2 ?? '').includes(term) ||
      this.normalize(country.iso3 ?? '').includes(term)
    );
  }

  private bootstrapData(): void {
    this.isLoadingCountries = true;
    this.isLoadingRows = true;
    this.countryLoadError = '';

    this.countryService.getAll().subscribe({
      next: (countries) => {
        this.countries = countries;
        this.isLoadingCountries = false;
        if (countries.length === 0) {
          this.countryLoadError = "Aucun pays reçu depuis l'API.";
        }
        this.loadRows(true);
      },
      error: () => {
        this.isLoadingCountries = false;
        this.countryLoadError = 'Impossible de charger la liste des pays.';
        this.loadRows(true);
      }
    });
  }

  private loadRows(showLoader = true): void {
    if (showLoader) {
      this.isLoadingRows = true;
    }
    this.loadError = '';

    this.academicPeriodService.getAll().subscribe({
      next: (rows) => {
        this.rows = rows
          .map((row, index) => this.mapApiToItem(row, index))
          .sort((a, b) => a.orderNumber - b.orderNumber || a.name.localeCompare(b.name, 'fr'));
        this.isLoadingRows = false;
      },
      error: () => {
        this.isLoadingRows = false;
        this.loadError = 'Impossible de charger la liste des périodes scolaires.';
      }
    });
  }

  private mapApiToItem(response: AcademicPeriodApiResponse, index: number): PeriodItem {
    const countryId = response.countryId ?? response.country_id;

    return {
      id: response.id ?? `period-${index}`,
      code: response.code ?? '',
      name: response.name ?? '',
      country: this.findCountryNameById(countryId) || '--',
      countryId: countryId ? String(countryId) : undefined,
      countryIso2: this.resolveCountryIso2(countryId),
      orderNumber: response.orderNumber ?? response.order_number ?? 1,
      status: response.active === false ? 'Inactif' : 'Actif'
    };
  }

  private extractApiError(err: unknown, fallback: string): string {
    const message = (err as { error?: { message?: string } })?.error?.message;
    return message?.trim() || fallback;
  }

  private findCountryIdByName(countryName: string): string | undefined {
    const selected = this.countries.find(
      (country) => this.normalize(country.name) === this.normalize(countryName)
    );
    return selected ? String(selected.id) : undefined;
  }

  private findCountryNameById(countryId: string | undefined | null): string {
    const found = this.countries.find((country) => this.sameId(country.id, countryId));
    return found?.name || '';
  }

  private resolveCountryIso2(countryId?: string | null): string {
    const country = this.countries.find((item) => this.sameId(item.id, countryId));
    return country?.iso2?.toUpperCase() ?? 'INT';
  }

  private sameId(left: string | number | undefined | null, right: string | number | undefined | null): boolean {
    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }

  private toPersistedId(value: string | number): string | null {
    const id = String(value).trim();
    if (!id || id.startsWith('period-')) {
      return null;
    }
    return id;
  }

  private closeAllDropdowns(): void {
    this.isCountryFilterDropdownOpen = false;
    this.isCountryDropdownOpen = false;
  }

  private createEmptyForm(): PeriodForm {
    return {
      code: '',
      name: '',
      country: '',
      orderNumber: '1',
      status: 'Actif'
    };
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
