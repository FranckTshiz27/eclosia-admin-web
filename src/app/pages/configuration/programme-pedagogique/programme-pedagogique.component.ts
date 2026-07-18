import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AcademicCurriculumApiResponse,
  AcademicCurriculumService,
  CreateAcademicCurriculumDto
} from '../../../services/academic-curriculum.service';
import {
  AcademicCycleApiResponse,
  AcademicCycleService
} from '../../../services/academic-cycle.service';
import {
  AcademicLevelApiResponse,
  AcademicLevelService
} from '../../../services/academic-level.service';
import {
  AcademicOptionApiResponse,
  AcademicOptionService
} from '../../../services/academic-option.service';
import {
  AcademicSectionApiResponse,
  AcademicSectionService
} from '../../../services/academic-section.service';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../services/academic-year.service';
import { CountryOption, CountryService } from '../../../services/country.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

type StatusLabel = 'Actif' | 'Inactif';

interface SelectOption {
  id: string;
  label: string;
  countryId?: string;
  cycleId?: string;
  sectionId?: string;
}

interface CurriculumItem {
  id: string;
  code: string;
  name: string;
  academicYearId: string;
  academicYearLabel: string;
  academicCycleId: string;
  academicCycleLabel: string;
  academicLevelId: string;
  academicLevelLabel: string;
  academicSectionId: string | null;
  academicSectionLabel: string;
  academicOptionId: string | null;
  academicOptionLabel: string;
  countryId: string;
  countryLabel: string;
  status: StatusLabel;
}

interface CurriculumForm {
  countryId: string;
  academicYearId: string;
  academicCycleId: string;
  academicLevelId: string;
  academicSectionId: string;
  academicOptionId: string;
  code: string;
  name: string;
  status: StatusLabel;
}

interface CountryFilterOption {
  label: string;
  id: string | null;
}

@Component({
  selector: 'app-programme-pedagogique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './programme-pedagogique.component.html',
  styleUrl: './programme-pedagogique.component.css'
})
export class ProgrammePedagogiqueComponent implements OnInit {
  searchTerm = '';
  countryFilter = '';
  countryFilterId: string | null = null;
  yearFilter = 'all';
  cycleFilter = 'all';
  statusFilter = 'all';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  isCountryFilterDropdownOpen = false;
  isLoadingCountries = false;
  isLoadingLookups = false;
  isLoadingRows = false;
  loadError = '';
  countryLoadError = '';

  countries: CountryOption[] = [];
  years: SelectOption[] = [];
  cycles: SelectOption[] = [];
  levels: SelectOption[] = [];
  sections: SelectOption[] = [];
  options: SelectOption[] = [];
  rows: CurriculumItem[] = [];

  form: CurriculumForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  constructor(
    private readonly countryService: CountryService,
    private readonly academicYearService: AcademicYearService,
    private readonly academicCycleService: AcademicCycleService,
    private readonly academicLevelService: AcademicLevelService,
    private readonly academicSectionService: AcademicSectionService,
    private readonly academicOptionService: AcademicOptionService,
    private readonly academicCurriculumService: AcademicCurriculumService
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

  get yearFilterOptions(): SelectOption[] {
    if (!this.countryFilterId) {
      return this.years;
    }
    return this.years.filter((year) => this.sameId(year.countryId, this.countryFilterId));
  }

  get formYearOptions(): SelectOption[] {
    if (!this.form.countryId) {
      return this.years;
    }
    return this.years.filter((year) => this.sameId(year.countryId, this.form.countryId));
  }

  get formLevelOptions(): SelectOption[] {
    if (!this.form.academicCycleId) {
      return [];
    }
    return this.levels.filter((level) => this.sameId(level.cycleId, this.form.academicCycleId));
  }

  get formSectionOptions(): SelectOption[] {
    if (!this.form.academicCycleId) {
      return [];
    }
    return this.sections.filter((section) => this.sameId(section.cycleId, this.form.academicCycleId));
  }

  get formOptionOptions(): SelectOption[] {
    if (!this.form.academicSectionId) {
      return [];
    }
    return this.options.filter((option) => this.sameId(option.sectionId, this.form.academicSectionId));
  }

  get filteredRows(): CurriculumItem[] {
    const term = this.normalize(this.searchTerm);
    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.name).includes(term) ||
        this.normalize(row.code).includes(term) ||
        this.normalize(row.academicYearLabel).includes(term) ||
        this.normalize(row.academicCycleLabel).includes(term) ||
        this.normalize(row.academicLevelLabel).includes(term) ||
        this.normalize(row.countryLabel).includes(term);

      const matchesCountry =
        !this.countryFilterId || this.sameId(row.countryId, this.countryFilterId);
      const matchesYear = this.yearFilter === 'all' || this.sameId(row.academicYearId, this.yearFilter);
      const matchesCycle =
        this.cycleFilter === 'all' || this.sameId(row.academicCycleId, this.cycleFilter);
      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;

      return matchesSearch && matchesCountry && matchesYear && matchesCycle && matchesStatus;
    });
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.createEmptyForm();
    if (this.countryFilterId) {
      this.form.countryId = this.countryFilterId;
    }
    if (this.yearFilter !== 'all') {
      this.form.academicYearId = this.yearFilter;
      const year = this.years.find((item) => this.sameId(item.id, this.yearFilter));
      if (year?.countryId) {
        this.form.countryId = year.countryId;
      }
    }
  }

  openEditModal(item: CurriculumItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = this.toPersistedId(item.id);
    this.isSubmitted = false;
    this.saveError = '';
    this.form = {
      countryId: item.countryId || '',
      academicYearId: item.academicYearId,
      academicCycleId: item.academicCycleId,
      academicLevelId: item.academicLevelId,
      academicSectionId: item.academicSectionId ?? '',
      academicOptionId: item.academicOptionId ?? '',
      code: item.code,
      name: item.name,
      status: item.status
    };
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
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
    this.yearFilter = 'all';
    this.isCountryFilterDropdownOpen = false;
    this.loadRows(true);
  }

  onFormCountryChange(): void {
    this.form.academicYearId = '';
  }

  onFormCycleChange(): void {
    this.form.academicLevelId = '';
    this.form.academicSectionId = '';
    this.form.academicOptionId = '';
  }

  onFormSectionChange(): void {
    this.form.academicOptionId = '';
  }

  saveRow(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving) {
      formRef.control.markAllAsTouched();
      return;
    }

    if (!this.form.academicYearId || !this.form.academicCycleId || !this.form.academicLevelId) {
      this.saveError = 'Année, cycle et niveau sont obligatoires.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateAcademicCurriculumDto = {
      academicYearId: this.form.academicYearId,
      academicCycleId: this.form.academicCycleId,
      academicLevelId: this.form.academicLevelId,
      academicSectionId: this.form.academicSectionId || null,
      academicOptionId: this.form.academicOptionId || null,
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      active: this.form.status === 'Actif'
    };

    if (this.isEditMode) {
      if (!this.editingId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre à jour ce programme: identifiant invalide.';
        return;
      }

      this.academicCurriculumService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadRows(false);
        },
        error: (err) => {
          this.isSaving = false;
          this.saveError = extractApiErrorMessage(
            err,
            "Échec de mise à jour. Vérifiez l'API puis réessayez."
          );
        }
      });
      return;
    }

    this.academicCurriculumService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadRows(false);
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = extractApiErrorMessage(
          err,
          "Échec de création. Vérifiez l'API puis réessayez."
        );
      }
    });
  }

  deleteRow(item: CurriculumItem): void {
    if (!confirm(`Supprimer le programme pédagogique "${item.code}" ?`)) {
      return;
    }

    const id = this.toPersistedId(item.id);
    if (!id) {
      return;
    }

    this.academicCurriculumService.delete(id).subscribe({
      next: () => this.loadRows(false),
      error: (err) => {
        this.loadError = extractApiErrorMessage(err, 'Impossible de supprimer ce programme.');
      }
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.countryFilter = '';
    this.countryFilterId = null;
    this.yearFilter = 'all';
    this.cycleFilter = 'all';
    this.statusFilter = 'all';
    this.isCountryFilterDropdownOpen = false;
    this.loadRows(true);
  }

  private bootstrapData(): void {
    this.isLoadingCountries = true;
    this.isLoadingLookups = true;
    this.countryLoadError = '';

    forkJoin({
      countries: this.countryService.getAll().pipe(catchError(() => of([]))),
      years: this.academicYearService.getAll().pipe(catchError(() => of([]))),
      cycles: this.academicCycleService.getAll().pipe(catchError(() => of([]))),
      levels: this.academicLevelService.getAll().pipe(catchError(() => of([]))),
      sections: this.academicSectionService.getAll().pipe(catchError(() => of([]))),
      options: this.academicOptionService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ countries, years, cycles, levels, sections, options }) => {
        this.countries = countries as CountryOption[];
        this.isLoadingCountries = false;
        if (this.countries.length === 0) {
          this.countryLoadError = "Aucun pays reçu depuis l'API.";
        }

        this.years = (years as AcademicYearApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: AcademicYearService.buildLabel(row),
            countryId: String(row.countryId ?? row.country_id ?? '')
          }))
          .filter((item) => item.id)
          .sort((a, b) => b.label.localeCompare(a.label, 'fr'));

        this.cycles = (cycles as AcademicCycleApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: this.buildLookupLabel(row.code, row.name)
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.levels = (levels as AcademicLevelApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: this.buildLookupLabel(row.code, row.name),
            cycleId: String(row.academicCycleId ?? row.academic_cycle_id ?? row.academicCycle?.id ?? '')
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.sections = (sections as AcademicSectionApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: this.buildLookupLabel(row.code, row.name),
            cycleId: String(row.academicCycleId ?? row.academic_cycle_id ?? row.academicCycle?.id ?? '')
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.options = (options as AcademicOptionApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: this.buildLookupLabel(row.code, row.name),
            sectionId: String(row.academicSectionId ?? row.academic_section_id ?? '')
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.isLoadingLookups = false;
        this.loadRows(true);
      },
      error: () => {
        this.isLoadingCountries = false;
        this.isLoadingLookups = false;
        this.countryLoadError = 'Impossible de charger les référentiels.';
        this.loadRows(true);
      }
    });
  }

  private loadRows(showLoader = true): void {
    if (showLoader) {
      this.isLoadingRows = true;
    }
    this.loadError = '';

    const query = this.countryFilterId ? { countryId: this.countryFilterId } : {};
    this.academicCurriculumService.getAll(query).subscribe({
      next: (rows) => {
        this.rows = rows
          .map((row, index) => this.mapApiToItem(row, index))
          .sort((a, b) => a.code.localeCompare(b.code, 'fr'));
        this.isLoadingRows = false;
      },
      error: (err) => {
        this.rows = [];
        this.isLoadingRows = false;
        this.loadError = extractApiErrorMessage(err, 'Impossible de charger les programmes pédagogiques.');
      }
    });
  }

  private mapApiToItem(response: AcademicCurriculumApiResponse, index: number): CurriculumItem {
    const academicYearId = String(response.academicYearId ?? response.academic_year_id ?? '');
    const academicCycleId = String(response.academicCycleId ?? response.academic_cycle_id ?? '');
    const academicLevelId = String(response.academicLevelId ?? response.academic_level_id ?? '');
    const academicSectionId = this.readOptionalId(
      response.academicSectionId ?? response.academic_section_id
    );
    const academicOptionId = this.readOptionalId(
      response.academicOptionId ?? response.academic_option_id
    );
    const year = this.years.find((item) => this.sameId(item.id, academicYearId));
    const countryId = year?.countryId ?? '';

    return {
      id: String(response.id ?? `curriculum-${index}`),
      code: (response.code ?? '').trim(),
      name: (response.name ?? '').trim(),
      academicYearId,
      academicYearLabel: year?.label || '—',
      academicCycleId,
      academicCycleLabel: this.findLabel(this.cycles, academicCycleId),
      academicLevelId,
      academicLevelLabel: this.findLabel(this.levels, academicLevelId),
      academicSectionId,
      academicSectionLabel: academicSectionId
        ? this.findLabel(this.sections, academicSectionId)
        : '—',
      academicOptionId,
      academicOptionLabel: academicOptionId ? this.findLabel(this.options, academicOptionId) : '—',
      countryId,
      countryLabel: this.findCountryNameById(countryId) || '—',
      status: response.active === false ? 'Inactif' : 'Actif'
    };
  }

  private findLabel(options: SelectOption[], id: string): string {
    return options.find((item) => this.sameId(item.id, id))?.label || '—';
  }

  private findCountryNameById(countryId: string | undefined | null): string {
    const found = this.countries.find((country) => this.sameId(country.id, countryId));
    return found?.name || '';
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

  private buildLookupLabel(code?: string | null, name?: string | null): string {
    const safeCode = (code ?? '').trim();
    const safeName = (name ?? '').trim();
    if (safeCode && safeName) {
      return `${safeCode} — ${safeName}`;
    }
    return safeName || safeCode || '—';
  }

  private readOptionalId(value: string | null | undefined): string | null {
    const id = String(value ?? '').trim();
    return id || null;
  }

  private sameId(left: string | number | undefined | null, right: string | number | undefined | null): boolean {
    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }

  private toPersistedId(value: string | number): string | null {
    const id = String(value).trim();
    if (!id || id.startsWith('curriculum-')) {
      return null;
    }
    return id;
  }

  private createEmptyForm(): CurriculumForm {
    return {
      countryId: '',
      academicYearId: '',
      academicCycleId: '',
      academicLevelId: '',
      academicSectionId: '',
      academicOptionId: '',
      code: '',
      name: '',
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
