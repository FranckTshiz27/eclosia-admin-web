import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  AcademicModelApiResponse,
  AcademicModelCountryApiResponse,
  AcademicModelService,
  CreateAcademicModelDto
} from '../../../services/academic-model.service';
import { CountryOption, CountryService } from '../../../services/country.service';

type ModelStatus = 'Actif' | 'Inactif';

interface AcademicModelItem {
  id: string;
  code: string;
  name: string;
  version: number;
  country: string;
  countryId?: string;
  countryIso2: string;
  startYear: number;
  endYear: number | null;
  validityPeriod: string;
  status: ModelStatus;
  isCurrent?: boolean;
}

interface AcademicModelForm {
  code: string;
  name: string;
  version: string;
  country: string;
  startYear: string;
  endYear: string;
  status: ModelStatus;
}

interface CountryFilterOption {
  label: string;
  id: string | null;
}

@Component({
  selector: 'app-modele-academique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modele-academique.component.html',
  styleUrl: './modele-academique.component.css'
})
export class ModeleAcademiqueComponent implements OnInit {
  searchTerm = '';
  countryFilter = '';
  countryFilterId: string | null = null;
  statusFilter = 'all';
  periodFilter = 'all';
  isModalOpen = false;
  isEditMode = false;
  editingModelId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  isCountryFilterDropdownOpen = false;
  isCountryDropdownOpen = false;
  isLoadingCountries = false;
  isLoadingModels = false;
  loadError = '';
  countryLoadError = '';

  countries: CountryOption[] = [];
  form: AcademicModelForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  readonly periodOptions = [
    { value: 'all', label: 'Toutes les periodes' },
    { value: 'ongoing', label: 'En cours' },
    { value: 'ended', label: 'Terminee' }
  ];

  models: AcademicModelItem[] = [];
  private modelApiRows: AcademicModelApiResponse[] = [];

  constructor(
    private readonly countryService: CountryService,
    private readonly academicModelService: AcademicModelService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get filteredFilterCountryOptions(): CountryFilterOption[] {
    const term = this.normalize(this.countryFilter);
    const options: CountryFilterOption[] = [{ label: 'Tous les pays', id: null }];
    const seenIds = new Set<string>();

    const sortedCountries = [...this.countries].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    for (const country of sortedCountries) {
      const id = String(country.id);
      if (seenIds.has(id) || !this.countryMatchesSearchTerm(country, term)) {
        continue;
      }
      seenIds.add(id);
      options.push({ label: country.name, id });
    }

    for (const model of this.models) {
      if (!model.countryId || seenIds.has(model.countryId)) {
        continue;
      }
      const countryName =
        model.country !== '--' ? model.country : this.findCountryNameById(model.countryId);
      if (!countryName || !this.normalize(countryName).includes(term)) {
        continue;
      }
      seenIds.add(model.countryId);
      options.push({ label: countryName, id: model.countryId });
    }

    if (
      !term ||
      this.normalize('International').includes(term) ||
      term === 'int'
    ) {
      options.push({ label: 'International', id: 'INT' });
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

  get filteredModels(): AcademicModelItem[] {
    const term = this.normalize(this.searchTerm);

    return this.models.filter((model) => {
      const matchesSearch =
        !term ||
        this.normalize(model.name).includes(term) ||
        this.normalize(model.code).includes(term) ||
        this.normalize(model.country).includes(term);

      const matchesCountry = this.matchesCountryFilter(model);
      const matchesStatus = this.statusFilter === 'all' || model.status === this.statusFilter;
      const matchesPeriod =
        this.periodFilter === 'all' ||
        (this.periodFilter === 'ongoing' && model.validityPeriod.includes('En cours')) ||
        (this.periodFilter === 'ended' && !model.validityPeriod.includes('En cours'));

      return matchesSearch && matchesCountry && matchesStatus && matchesPeriod;
    });
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingModelId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = this.createEmptyForm();
  }

  openEditModal(model: AcademicModelItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingModelId = this.toPersistedModelId(model.id);
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = this.toForm(model, this.findApiRow(model.id));
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingModelId = null;
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
    if (!option.id && option.label === 'Tous les pays') {
      this.countryFilter = '';
      this.countryFilterId = null;
    } else if (option.id === 'INT') {
      this.countryFilter = 'International';
      this.countryFilterId = 'INT';
    } else if (option.id) {
      const selected = this.countries.find((country) => this.sameId(country.id, option.id));
      this.countryFilter = selected?.name ?? option.label;
      this.countryFilterId = option.id;
    } else {
      this.countryFilter = option.label;
      this.countryFilterId = null;
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

  saveModel(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving) {
      formRef.control.markAllAsTouched();
      return;
    }

    const version = String(this.form.version ?? '').trim();
    const startYear = Number(this.form.startYear);
    const endYear = this.form.endYear.trim() ? Number(this.form.endYear) : null;

    if (!version || !Number.isFinite(startYear)) {
      this.saveError = 'La version et l annee de debut doivent etre valides.';
      return;
    }

    if (endYear !== null && (!Number.isFinite(endYear) || endYear < startYear)) {
      this.saveError = "L annee de fin doit etre superieure ou egale a l annee de debut.";
      return;
    }

    const countryId = this.findCountryIdByName(this.form.country.trim());
    if (!countryId) {
      this.saveError = 'Veuillez selectionner un pays valide.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto = this.toUpsertDto(version, startYear, endYear, countryId);

    if (this.isEditMode) {
      if (!this.editingModelId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour ce modele: identifiant invalide.';
        return;
      }

      this.academicModelService.update(this.editingModelId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadModels(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour du modele academique. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.academicModelService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadModels(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation du modele academique. Verifiez l'API puis reessayez.";
      }
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.countryFilter = '';
    this.countryFilterId = null;
    this.statusFilter = 'all';
    this.periodFilter = 'all';
    this.isCountryFilterDropdownOpen = false;
  }

  getCountryFlag(iso2: string): string {
    if (iso2 === 'INT') {
      return '🌐';
    }
    return iso2
      .toUpperCase()
      .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
  }

  private matchesCountryFilter(model: AcademicModelItem): boolean {
    if (!this.countryFilter.trim() && !this.countryFilterId) {
      return true;
    }

    if (this.countryFilterId === 'INT') {
      return (
        model.countryIso2 === 'INT' ||
        this.normalize(model.country) === this.normalize('International')
      );
    }

    if (this.countryFilterId) {
      return Boolean(model.countryId && this.sameId(model.countryId, this.countryFilterId));
    }

    const term = this.normalize(this.countryFilter);
    if (!term) {
      return true;
    }

    if (this.normalize('International').includes(term) || term === 'int') {
      return model.countryIso2 === 'INT';
    }

    const matchingCountries = this.countries.filter((country) =>
      this.countryMatchesSearchTerm(country, term)
    );
    if (matchingCountries.some((country) => this.modelMatchesCountry(model, country))) {
      return true;
    }

    return (
      this.normalize(model.country).includes(term) ||
      model.countryIso2.toLowerCase().includes(term)
    );
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

  private modelMatchesCountry(model: AcademicModelItem, country: CountryOption): boolean {
    if (model.countryId && this.sameId(model.countryId, country.id)) {
      return true;
    }

    if (
      country.iso2 &&
      model.countryIso2 &&
      country.iso2.toUpperCase() === model.countryIso2.toUpperCase()
    ) {
      return true;
    }

    return this.normalize(model.country) === this.normalize(country.name);
  }

  private bootstrapData(): void {
    this.isLoadingCountries = true;
    this.isLoadingModels = true;
    this.countryLoadError = '';

    this.countryService.getAll().subscribe({
      next: (countries) => {
        this.countries = countries;
        this.isLoadingCountries = false;
        if (countries.length === 0) {
          this.countryLoadError = "Aucun pays recu depuis l'API.";
        }
        this.fetchModels(true);
      },
      error: () => {
        this.isLoadingCountries = false;
        this.countryLoadError = 'Impossible de charger la liste des pays.';
        this.fetchModels(true);
      }
    });
  }

  private loadModels(showLoader = true): void {
    this.fetchModels(showLoader);
  }

  private fetchModels(showLoader: boolean): void {
    if (showLoader) {
      this.isLoadingModels = true;
    }
    this.loadError = '';
    this.academicModelService.getAll().subscribe({
      next: (models) => {
        this.modelApiRows = models;
        this.remapModels();
        this.isLoadingModels = false;
      },
      error: () => {
        this.isLoadingModels = false;
        this.loadError = 'Impossible de charger la liste des modeles academiques.';
      }
    });
  }

  private toUpsertDto(
    version: string,
    startYear: number,
    endYear: number | null,
    countryId: string
  ): CreateAcademicModelDto {
    const dto: CreateAcademicModelDto = {
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      version,
      startYear,
      active: this.form.status === 'Actif',
      countryId
    };

    if (endYear !== null) {
      dto.endYear = endYear;
    }

    return dto;
  }

  private toForm(model: AcademicModelItem, apiRow?: AcademicModelApiResponse): AcademicModelForm {
    return {
      code: model.code,
      name: model.name,
      version: String(model.version),
      country: this.resolveCountryLabel(model.country, model.countryId, apiRow),
      startYear: String(model.startYear),
      endYear: model.endYear !== null ? String(model.endYear) : '',
      status: model.status
    };
  }

  private resolveCountryLabel(
    modelCountry: string,
    countryId?: string,
    apiRow?: AcademicModelApiResponse
  ): string {
    if (apiRow?.country) {
      const nestedCountryName = this.extractCountryNameFromRelation(apiRow.country);
      if (nestedCountryName) {
        return this.canonicalCountryName(nestedCountryName) ?? nestedCountryName;
      }
    }

    const resolvedId = countryId ?? (apiRow ? this.extractCountryId(apiRow) : undefined);
    const fromId = this.findCountryNameById(resolvedId);
    if (fromId) {
      return fromId;
    }

    if (modelCountry && modelCountry !== '--') {
      return this.canonicalCountryName(modelCountry) ?? modelCountry;
    }

    return '';
  }

  private canonicalCountryName(countryName: string): string | undefined {
    return this.countries.find(
      (country) => this.normalize(country.name) === this.normalize(countryName)
    )?.name;
  }

  private findApiRow(id: string): AcademicModelApiResponse | undefined {
    return this.modelApiRows.find((row) => this.sameId(row.id, id));
  }

  private syncEditFormCountry(): void {
    const editingId = this.editingModelId;
    if (!this.isModalOpen || !this.isEditMode || !editingId) {
      return;
    }

    const model = this.models.find((item) => this.sameId(item.id, editingId));
    const apiRow = this.findApiRow(editingId);
    if (!model && !apiRow) {
      return;
    }

    const country = model
      ? this.resolveCountryLabel(model.country, model.countryId, apiRow)
      : apiRow
        ? this.resolveCountryLabel('', this.extractCountryId(apiRow), apiRow)
        : '';

    if (country) {
      this.form.country = country;
    }
  }

  private remapModels(): void {
    this.models = this.modelApiRows.map((model, index) => this.mapApiToItem(model, index));
    this.syncEditFormCountry();
  }

  private mapApiToItem(response: AcademicModelApiResponse, index: number): AcademicModelItem {
    const startYear = response.startYear ?? response.start_year ?? 0;
    const endYear = response.endYear ?? response.end_year ?? null;
    const active = response.active ?? true;
    const versionValue = response.version ?? '';
    const versionNumber = typeof versionValue === 'number' ? versionValue : Number(versionValue) || 0;
    const countryId = this.extractCountryId(response);
    const countryFromRelation = response.country
      ? this.extractCountryNameFromRelation(response.country)
      : '';
    const resolvedCountryName = this.findCountryNameById(countryId);
    const country = countryFromRelation || resolvedCountryName || '--';

    return {
      id: response.id ?? `model-${index}`,
      code: response.code ?? '',
      name: response.name ?? '',
      version: versionNumber,
      country,
      countryId,
      countryIso2: this.resolveCountryIso2(country, countryId, response.country),
      startYear,
      endYear,
      validityPeriod: endYear ? `${startYear} - ${endYear}` : `${startYear} - En cours`,
      status: active ? 'Actif' : 'Inactif',
      isCurrent: active && !endYear
    };
  }

  private extractCountryId(response: AcademicModelApiResponse): string | undefined {
    if (response.country?.id) {
      return String(response.country.id);
    }
    const fallbackId = response.countryId ?? response.country_id;
    return fallbackId ? String(fallbackId) : undefined;
  }

  private extractCountryNameFromRelation(country: AcademicModelCountryApiResponse): string {
    return (
      country.nameFr ||
      country.name_fr ||
      country.nameEn ||
      country.name_en ||
      ''
    ).trim();
  }

  private findCountryIdByName(countryName: string): string | undefined {
    const selected = this.countries.find(
      (country) => this.normalize(country.name) === this.normalize(countryName)
    );
    return selected ? String(selected.id) : undefined;
  }

  private findCountryNameById(countryId: string | undefined): string {
    const found = this.countries.find((country) => this.sameId(country.id, countryId));
    return found?.name || '';
  }

  private resolveCountryIso2(
    countryName: string,
    countryId?: string,
    countryRelation?: AcademicModelCountryApiResponse | null
  ): string {
    if (countryRelation?.iso2) {
      return countryRelation.iso2.toUpperCase();
    }

    if (this.normalize(countryName) === this.normalize('International')) {
      return 'INT';
    }

    const countryById = countryId
      ? this.countries.find((item) => this.sameId(item.id, countryId))
      : undefined;
    if (countryById?.iso2) {
      return countryById.iso2;
    }

    const country = this.countries.find(
      (item) => this.normalize(item.name) === this.normalize(countryName)
    );
    return country?.iso2 ?? 'INT';
  }

  private sameId(left: string | number | undefined, right: string | number | undefined | null): boolean {
    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }

  private toPersistedModelId(value: string | number): string | null {
    const id = String(value).trim();
    if (!id || id.startsWith('model-')) {
      return null;
    }
    return id;
  }

  private closeAllDropdowns(): void {
    this.isCountryFilterDropdownOpen = false;
    this.isCountryDropdownOpen = false;
  }

  private createEmptyForm(): AcademicModelForm {
    return {
      code: '',
      name: '',
      version: '',
      country: '',
      startYear: '',
      endYear: '',
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
