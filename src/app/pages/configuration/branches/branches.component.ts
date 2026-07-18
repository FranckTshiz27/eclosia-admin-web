import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CountryOption, CountryService } from '../../../services/country.service';
import {
  SubjectDomainApiResponse,
  SubjectDomainService
} from '../../../services/subject-domain.service';
import {
  SubjectSubDomainApiResponse,
  SubjectSubDomainService
} from '../../../services/subject-sub-domain.service';
import {
  CreateSubjectDto,
  SubjectApiResponse,
  SubjectService
} from '../../../services/subject.service';

type StatusLabel = 'Actif' | 'Inactif';

interface SelectOption {
  id: string;
  label: string;
  countryId?: string;
  subjectDomainId?: string;
}

interface BranchItem {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  countryId: string;
  countryLabel: string;
  countryIso2: string;
  subjectDomainId: string | null;
  domainLabel: string;
  subjectSubDomainId: string | null;
  subDomainLabel: string;
  displayOrder: number;
  status: StatusLabel;
}

interface BranchForm {
  country: string;
  subjectDomainId: string;
  subjectSubDomainId: string;
  code: string;
  name: string;
  abbreviation: string;
  displayOrder: string;
  status: StatusLabel;
}

interface CountryFilterOption {
  label: string;
  id: string | null;
}

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css'
})
export class BranchesComponent implements OnInit {
  searchTerm = '';
  countryFilter = '';
  countryFilterId: string | null = null;
  domainFilter = 'all';
  subDomainFilter = 'all';
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
  isLoadingLookups = false;
  isLoadingRows = false;
  loadError = '';
  countryLoadError = '';

  countries: CountryOption[] = [];
  domains: SelectOption[] = [];
  subDomains: SelectOption[] = [];
  rows: BranchItem[] = [];

  form: BranchForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  constructor(
    private readonly countryService: CountryService,
    private readonly subjectDomainService: SubjectDomainService,
    private readonly subjectSubDomainService: SubjectSubDomainService,
    private readonly subjectService: SubjectService
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

  get formDomainOptions(): SelectOption[] {
    const countryId = this.findCountryIdByName(this.form.country.trim());
    if (!countryId) {
      return this.domains;
    }
    return this.domains.filter((domain) => !domain.countryId || this.sameId(domain.countryId, countryId));
  }

  get formSubDomainOptions(): SelectOption[] {
    if (!this.form.subjectDomainId) {
      return [];
    }
    return this.subDomains.filter((item) => this.sameId(item.subjectDomainId, this.form.subjectDomainId));
  }

  get filterDomainOptions(): SelectOption[] {
    if (!this.countryFilterId) {
      return this.domains;
    }
    return this.domains.filter(
      (domain) => !domain.countryId || this.sameId(domain.countryId, this.countryFilterId)
    );
  }

  get filterSubDomainOptions(): SelectOption[] {
    if (this.domainFilter === 'all') {
      return this.subDomains;
    }
    return this.subDomains.filter((item) => this.sameId(item.subjectDomainId, this.domainFilter));
  }

  get filteredRows(): BranchItem[] {
    const term = this.normalize(this.searchTerm);

    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.name).includes(term) ||
        this.normalize(row.code).includes(term) ||
        this.normalize(row.abbreviation).includes(term) ||
        this.normalize(row.domainLabel).includes(term) ||
        this.normalize(row.subDomainLabel).includes(term);

      const matchesCountry =
        (!this.countryFilter.trim() && !this.countryFilterId) ||
        (this.countryFilterId
          ? this.sameId(row.countryId, this.countryFilterId)
          : this.normalize(row.countryLabel).includes(this.normalize(this.countryFilter)));

      const matchesDomain =
        this.domainFilter === 'all' || this.sameId(row.subjectDomainId, this.domainFilter);
      const matchesSubDomain =
        this.subDomainFilter === 'all' || this.sameId(row.subjectSubDomainId, this.subDomainFilter);
      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;

      return matchesSearch && matchesCountry && matchesDomain && matchesSubDomain && matchesStatus;
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
    if (this.domainFilter !== 'all') {
      this.form.subjectDomainId = this.domainFilter;
    }
    if (this.subDomainFilter !== 'all') {
      this.form.subjectSubDomainId = this.subDomainFilter;
    }
  }

  openEditModal(item: BranchItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = this.toPersistedId(item.id);
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = {
      country: item.countryLabel !== '--' ? item.countryLabel : this.findCountryNameById(item.countryId),
      subjectDomainId: item.subjectDomainId ?? '',
      subjectSubDomainId: item.subjectSubDomainId ?? '',
      code: item.code,
      name: item.name,
      abbreviation: item.abbreviation,
      displayOrder: String(item.displayOrder ?? 1),
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
    this.domainFilter = 'all';
    this.subDomainFilter = 'all';
    this.isCountryFilterDropdownOpen = false;
  }

  onDomainFilterChange(): void {
    this.subDomainFilter = 'all';
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
    const countryId = this.findCountryIdByName(countryName);
    if (
      this.form.subjectDomainId &&
      !this.domains.some(
        (domain) =>
          this.sameId(domain.id, this.form.subjectDomainId) &&
          (!countryId || !domain.countryId || this.sameId(domain.countryId, countryId))
      )
    ) {
      this.form.subjectDomainId = '';
      this.form.subjectSubDomainId = '';
    }
  }

  onFormDomainChange(): void {
    if (
      this.form.subjectSubDomainId &&
      !this.formSubDomainOptions.some((item) => this.sameId(item.id, this.form.subjectSubDomainId))
    ) {
      this.form.subjectSubDomainId = '';
    }
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

    const displayOrder = Number(this.form.displayOrder);
    if (!Number.isFinite(displayOrder) || displayOrder < 1) {
      this.saveError = "L'ordre d'affichage doit être un entier positif.";
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateSubjectDto = {
      countryId,
      subjectDomainId: this.form.subjectDomainId || null,
      subjectSubDomainId: this.form.subjectSubDomainId || null,
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      abbreviation: this.form.abbreviation.trim() || null,
      displayOrder,
      active: this.form.status === 'Actif'
    };

    if (this.isEditMode) {
      if (!this.editingId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre à jour cette branche: identifiant invalide.';
        return;
      }

      this.subjectService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadRows(false);
        },
        error: (err) => {
          this.isSaving = false;
          this.saveError = this.extractApiError(
            err,
            "Échec de mise à jour de la branche. Vérifiez l'API puis réessayez."
          );
        }
      });
      return;
    }

    this.subjectService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadRows(false);
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = this.extractApiError(
          err,
          "Échec de création de la branche. Vérifiez l'API puis réessayez."
        );
      }
    });
  }

  deleteRow(item: BranchItem): void {
    if (!confirm(`Supprimer la branche "${item.name}" ?`)) {
      return;
    }

    const id = this.toPersistedId(item.id);
    if (!id) {
      return;
    }

    this.subjectService.delete(id).subscribe({
      next: () => this.loadRows(false),
      error: () => {
        this.loadError = 'Impossible de supprimer cette branche.';
      }
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.countryFilter = '';
    this.countryFilterId = null;
    this.domainFilter = 'all';
    this.subDomainFilter = 'all';
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

  private bootstrapData(): void {
    this.isLoadingCountries = true;
    this.isLoadingLookups = true;
    this.isLoadingRows = true;
    this.countryLoadError = '';

    this.countryService.getAll().subscribe({
      next: (countries) => {
        this.countries = countries;
        this.isLoadingCountries = false;
        if (countries.length === 0) {
          this.countryLoadError = "Aucun pays reçu depuis l'API.";
        }
        this.loadLookupsAndRows();
      },
      error: () => {
        this.isLoadingCountries = false;
        this.countryLoadError = 'Impossible de charger la liste des pays.';
        this.loadLookupsAndRows();
      }
    });
  }

  private loadLookupsAndRows(): void {
    this.isLoadingLookups = true;

    forkJoin({
      domains: this.subjectDomainService.getAll().pipe(catchError(() => of([]))),
      subDomains: this.subjectSubDomainService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ domains, subDomains }) => {
        this.domains = (domains as SubjectDomainApiResponse[])
          .map((row, index) => this.mapDomainOption(row, index))
          .filter((item) => !!item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.subDomains = (subDomains as SubjectSubDomainApiResponse[])
          .map((row, index) => this.mapSubDomainOption(row, index))
          .filter((item) => !!item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.isLoadingLookups = false;
        this.loadRows(true);
      },
      error: () => {
        this.isLoadingLookups = false;
        this.loadRows(true);
      }
    });
  }

  private loadRows(showLoader = true): void {
    if (showLoader) {
      this.isLoadingRows = true;
    }
    this.loadError = '';

    this.subjectService.getAll().subscribe({
      next: (rows) => {
        this.rows = rows
          .map((row, index) => this.mapApiToItem(row, index))
          .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'fr'));
        this.isLoadingRows = false;
      },
      error: () => {
        this.isLoadingRows = false;
        this.loadError = 'Impossible de charger la liste des branches.';
      }
    });
  }

  private mapDomainOption(row: SubjectDomainApiResponse, index: number): SelectOption {
    const id = row.id ? String(row.id) : '';
    const code = row.code ?? '';
    const name = row.name ?? '';
    return {
      id: id || `domain-${index}`,
      label: code ? `${code} — ${name}` : name || id,
      countryId: row.countryId ?? row.country_id ? String(row.countryId ?? row.country_id) : undefined
    };
  }

  private mapSubDomainOption(row: SubjectSubDomainApiResponse, index: number): SelectOption {
    const id = row.id ? String(row.id) : '';
    const code = row.code ?? '';
    const name = row.name ?? '';
    return {
      id: id || `sub-domain-${index}`,
      label: code ? `${code} — ${name}` : name || id,
      subjectDomainId: row.subjectDomainId ?? row.subject_domain_id
        ? String(row.subjectDomainId ?? row.subject_domain_id)
        : undefined
    };
  }

  private mapApiToItem(response: SubjectApiResponse, index: number): BranchItem {
    const countryId = String(response.countryId ?? response.country_id ?? '');
    const subjectDomainId = response.subjectDomainId ?? response.subject_domain_id ?? null;
    const subjectSubDomainId = response.subjectSubDomainId ?? response.subject_sub_domain_id ?? null;
    const domain = this.domains.find((item) => this.sameId(item.id, subjectDomainId));
    const subDomain = this.subDomains.find((item) => this.sameId(item.id, subjectSubDomainId));

    return {
      id: response.id ?? `branch-${index}`,
      code: response.code ?? '',
      name: response.name ?? '',
      abbreviation: response.abbreviation ?? '',
      countryId,
      countryLabel: this.findCountryNameById(countryId) || '--',
      countryIso2: this.resolveCountryIso2(countryId),
      subjectDomainId: subjectDomainId ? String(subjectDomainId) : null,
      domainLabel: domain?.label || '—',
      subjectSubDomainId: subjectSubDomainId ? String(subjectSubDomainId) : null,
      subDomainLabel: subDomain?.label || '—',
      displayOrder: response.displayOrder ?? response.display_order ?? 1,
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

  private createEmptyForm(): BranchForm {
    return {
      country: '',
      subjectDomainId: '',
      subjectSubDomainId: '',
      code: '',
      name: '',
      abbreviation: '',
      displayOrder: '1',
      status: 'Actif'
    };
  }

  private toPersistedId(value: string | number): string | null {
    const id = String(value).trim();
    if (!id || id.startsWith('branch-')) {
      return null;
    }
    return id;
  }

  private closeAllDropdowns(): void {
    this.isCountryFilterDropdownOpen = false;
    this.isCountryDropdownOpen = false;
  }

  private sameId(left: string | number | undefined | null, right: string | number | undefined | null): boolean {
    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
