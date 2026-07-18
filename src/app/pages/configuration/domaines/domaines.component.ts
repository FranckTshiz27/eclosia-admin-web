import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CountryOption, CountryService } from '../../../services/country.service';
import {
  CreateSubjectDomainDto,
  SubjectDomainApiResponse,
  SubjectDomainService
} from '../../../services/subject-domain.service';

type DomainStatus = 'Actif' | 'Inactif';

interface DomainItem {
  id: string;
  code: string;
  name: string;
  country: string;
  countryId?: string;
  countryIso2: string;
  displayOrder: number;
  status: DomainStatus;
}

interface DomainForm {
  code: string;
  name: string;
  country: string;
  displayOrder: string;
  status: DomainStatus;
}

interface CountryFilterOption {
  label: string;
  id: string | null;
}

@Component({
  selector: 'app-domaines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './domaines.component.html',
  styleUrl: './domaines.component.css'
})
export class DomainesComponent implements OnInit {
  searchTerm = '';
  countryFilter = '';
  countryFilterId: string | null = null;
  statusFilter = 'all';

  isModalOpen = false;
  isEditMode = false;
  editingDomainId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  isCountryFilterDropdownOpen = false;
  isCountryDropdownOpen = false;
  isLoadingCountries = false;
  isLoadingDomains = false;
  loadError = '';
  countryLoadError = '';

  countries: CountryOption[] = [];
  domains: DomainItem[] = [];

  form: DomainForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  constructor(
    private readonly countryService: CountryService,
    private readonly subjectDomainService: SubjectDomainService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get filteredFilterCountryOptions(): CountryFilterOption[] {
    const term = this.normalize(this.countryFilter);
    const options: CountryFilterOption[] = [{ label: 'Tous les pays', id: null }];
    const seenIds = new Set<string>();

    for (const country of [...this.countries].sort((a, b) => a.name.localeCompare(b.name, 'fr'))) {
      const id = String(country.id);
      if (seenIds.has(id) || !this.countryMatchesSearchTerm(country, term)) {
        continue;
      }
      seenIds.add(id);
      options.push({ label: country.name, id });
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

  get filteredDomains(): DomainItem[] {
    const term = this.normalize(this.searchTerm);

    return this.domains.filter((domain) => {
      const matchesSearch =
        !term ||
        this.normalize(domain.name).includes(term) ||
        this.normalize(domain.code).includes(term) ||
        this.normalize(domain.country).includes(term);

      const matchesCountry = this.matchesCountryFilter(domain);
      const matchesStatus = this.statusFilter === 'all' || domain.status === this.statusFilter;

      return matchesSearch && matchesCountry && matchesStatus;
    });
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingDomainId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = this.createEmptyForm();
  }

  openEditModal(domain: DomainItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingDomainId = this.toPersistedId(domain.id);
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = {
      code: domain.code,
      name: domain.name,
      country: domain.country !== '--' ? domain.country : this.findCountryNameById(domain.countryId),
      displayOrder: String(domain.displayOrder ?? 1),
      status: domain.status
    };
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingDomainId = null;
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
      const selected = this.countries.find((country) => this.sameId(country.id, option.id));
      this.countryFilter = selected?.name ?? option.label;
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

  saveDomain(formRef: NgForm): void {
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

    const dto: CreateSubjectDomainDto = {
      countryId,
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      displayOrder,
      active: this.form.status === 'Actif'
    };

    if (this.isEditMode) {
      if (!this.editingDomainId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre à jour ce domaine: identifiant invalide.';
        return;
      }

      this.subjectDomainService.update(this.editingDomainId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadDomains(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Échec de mise à jour du domaine. Vérifiez l'API puis réessayez.";
        }
      });
      return;
    }

    this.subjectDomainService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadDomains(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Échec de création du domaine. Vérifiez l'API puis réessayez.";
      }
    });
  }

  deleteDomain(domain: DomainItem): void {
    if (!confirm(`Supprimer le domaine "${domain.name}" ?`)) {
      return;
    }

    const id = this.toPersistedId(domain.id);
    if (!id) {
      return;
    }

    this.subjectDomainService.delete(id).subscribe({
      next: () => this.loadDomains(false),
      error: () => {
        this.loadError = 'Impossible de supprimer ce domaine.';
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

  private matchesCountryFilter(domain: DomainItem): boolean {
    if (!this.countryFilter.trim() && !this.countryFilterId) {
      return true;
    }

    if (this.countryFilterId) {
      return Boolean(domain.countryId && this.sameId(domain.countryId, this.countryFilterId));
    }

    const term = this.normalize(this.countryFilter);
    return this.normalize(domain.country).includes(term);
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
    this.isLoadingDomains = true;
    this.countryLoadError = '';

    this.countryService.getAll().subscribe({
      next: (countries) => {
        this.countries = countries;
        this.isLoadingCountries = false;
        if (countries.length === 0) {
          this.countryLoadError = "Aucun pays reçu depuis l'API.";
        }
        this.loadDomains(true);
      },
      error: () => {
        this.isLoadingCountries = false;
        this.countryLoadError = 'Impossible de charger la liste des pays.';
        this.loadDomains(true);
      }
    });
  }

  private loadDomains(showLoader = true): void {
    if (showLoader) {
      this.isLoadingDomains = true;
    }
    this.loadError = '';

    this.subjectDomainService.getAll().subscribe({
      next: (rows) => {
        this.domains = rows
          .map((row, index) => this.mapApiToItem(row, index))
          .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'fr'));
        this.isLoadingDomains = false;
      },
      error: () => {
        this.isLoadingDomains = false;
        this.loadError = 'Impossible de charger la liste des domaines.';
      }
    });
  }

  private mapApiToItem(response: SubjectDomainApiResponse, index: number): DomainItem {
    const countryId = response.countryId ?? response.country_id;

    return {
      id: response.id ?? `domain-${index}`,
      code: response.code ?? '',
      name: response.name ?? '',
      country: this.findCountryNameById(countryId) || '--',
      countryId: countryId ? String(countryId) : undefined,
      countryIso2: this.resolveCountryIso2(countryId),
      displayOrder: response.displayOrder ?? response.display_order ?? 1,
      status: response.active === false ? 'Inactif' : 'Actif'
    };
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
    if (!id || id.startsWith('domain-')) {
      return null;
    }
    return id;
  }

  private closeAllDropdowns(): void {
    this.isCountryFilterDropdownOpen = false;
    this.isCountryDropdownOpen = false;
  }

  private createEmptyForm(): DomainForm {
    return {
      code: '',
      name: '',
      country: '',
      displayOrder: '1',
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
