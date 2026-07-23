import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import {
  AcademicPeriodApiResponse,
  AcademicPeriodService,
  AcademicPeriodType,
  CreateAcademicPeriodDto
} from '../../../services/academic-period.service';
import {
  AcademicTermApiResponse,
  AcademicTermService
} from '../../../services/academic-term.service';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../services/academic-year.service';

type StatusLabel = 'Actif' | 'Inactif';

interface SelectOption {
  id: string;
  label: string;
  academicYearId?: string;
}

interface PeriodItem {
  id: string;
  academicTermId: string;
  academicTermLabel: string;
  code: string;
  name: string;
  periodType: AcademicPeriodType;
  periodTypeLabel: string;
  displayOrder: number;
  maximumScoreRatio: number;
  status: StatusLabel;
}

interface PeriodForm {
  academicTermId: string;
  academicTermLabel: string;
  code: string;
  name: string;
  periodType: AcademicPeriodType;
  displayOrder: string;
  maximumScoreRatio: string;
  status: StatusLabel;
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
  termFilter = '';
  termFilterId: string | null = null;
  periodTypeFilter: 'all' | AcademicPeriodType = 'all';
  statusFilter = 'all';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  saveSuccess = '';

  isTermFilterOpen = false;
  isFormTermOpen = false;

  isLoadingLookups = false;
  isLoadingRows = false;
  loadError = '';

  terms: SelectOption[] = [];
  rows: PeriodItem[] = [];

  form: PeriodForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  readonly periodTypeOptions: { value: AcademicPeriodType; label: string }[] = [
    { value: 'PERIOD', label: 'Période' },
    { value: 'EXAM', label: 'Examen' }
  ];

  readonly periodTypeFilterOptions = [
    { value: 'all', label: 'Tous' },
    ...this.periodTypeOptions
  ];

  constructor(
    private readonly academicYearService: AcademicYearService,
    private readonly academicTermService: AcademicTermService,
    private readonly academicPeriodService: AcademicPeriodService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get filteredTermFilterOptions(): SelectOption[] {
    return this.filterOptions(this.terms, this.termFilter);
  }

  get filteredFormTermOptions(): SelectOption[] {
    return this.filterOptions(this.terms, this.form.academicTermLabel);
  }

  get filteredRows(): PeriodItem[] {
    const term = this.normalize(this.searchTerm);
    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.code).includes(term) ||
        this.normalize(row.name).includes(term) ||
        this.normalize(row.academicTermLabel).includes(term) ||
        this.normalize(row.periodTypeLabel).includes(term) ||
        String(row.maximumScoreRatio).includes(term);

      const matchesTerm =
        !this.termFilterId || this.sameId(row.academicTermId, this.termFilterId);
      const matchesPeriodType =
        this.periodTypeFilter === 'all' || row.periodType === this.periodTypeFilter;
      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;

      return matchesSearch && matchesTerm && matchesPeriodType && matchesStatus;
    });
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.form = this.createEmptyForm();
    if (this.termFilterId) {
      this.form.academicTermId = this.termFilterId;
      this.form.academicTermLabel = this.termFilter;
      this.form.displayOrder = String(this.nextDisplayOrder(this.termFilterId));
    }
  }

  openEditModal(item: PeriodItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = this.toPersistedId(item.id);
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.form = {
      academicTermId: item.academicTermId,
      academicTermLabel: item.academicTermLabel,
      code: item.code,
      name: item.name,
      periodType: item.periodType,
      displayOrder: String(item.displayOrder),
      maximumScoreRatio: String(item.maximumScoreRatio),
      status: item.status
    };
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.isFormTermOpen = false;
    this.form = this.createEmptyForm();
  }

  openTermFilterDropdown(): void {
    this.isTermFilterOpen = true;
  }

  closeTermFilterDropdown(): void {
    setTimeout(() => {
      this.isTermFilterOpen = false;
    }, 120);
  }

  onTermFilterInput(): void {
    this.termFilterId = null;
    this.openTermFilterDropdown();
  }

  selectTermFilter(option: SelectOption | null): void {
    if (!option) {
      this.termFilter = '';
      this.termFilterId = null;
    } else {
      this.termFilter = option.label;
      this.termFilterId = option.id;
    }
    this.isTermFilterOpen = false;
    this.loadRows(true);
  }

  openFormTermDropdown(): void {
    this.isFormTermOpen = true;
  }

  closeFormTermDropdown(): void {
    setTimeout(() => {
      this.isFormTermOpen = false;
    }, 120);
  }

  onFormTermInput(): void {
    this.form.academicTermId = '';
    this.openFormTermDropdown();
  }

  selectFormTerm(option: SelectOption): void {
    this.form.academicTermId = option.id;
    this.form.academicTermLabel = option.label;
    this.isFormTermOpen = false;
    if (!this.isEditMode) {
      this.form.displayOrder = String(this.nextDisplayOrder(option.id));
    }
  }

  saveRow(formRef: NgForm): void {
    this.isSubmitted = true;
    this.saveSuccess = '';
    if (!formRef.valid || this.isSaving) {
      formRef.control.markAllAsTouched();
      return;
    }

    const displayOrder = Number(this.form.displayOrder);
    const maximumScoreRatio = Number(String(this.form.maximumScoreRatio).replace(',', '.'));
    const code = this.form.code.trim();
    const name = this.form.name.trim();

    if (!this.form.academicTermId) {
      this.saveError = 'Le trimestre / semestre est obligatoire.';
      return;
    }
    if (!code || !name) {
      this.saveError = 'Le code et le nom sont obligatoires.';
      return;
    }
    if (!this.form.periodType) {
      this.saveError = 'Le type de période est obligatoire.';
      return;
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      this.saveError = "L'ordre d'affichage doit être un entier positif ou nul.";
      return;
    }
    if (!Number.isFinite(maximumScoreRatio) || maximumScoreRatio <= 0) {
      this.saveError = 'Le ratio de score maximum doit être supérieur à 0.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateAcademicPeriodDto = {
      academicTermId: this.form.academicTermId,
      code,
      name,
      periodType: this.form.periodType,
      displayOrder,
      maximumScoreRatio,
      active: this.form.status === 'Actif'
    };

    if (this.isEditMode) {
      if (!this.editingId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre à jour: identifiant invalide.';
        return;
      }

      this.academicPeriodService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.saveSuccess = 'Période mise à jour.';
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

    this.academicPeriodService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = 'Période enregistrée. Vous pouvez en ajouter une autre.';
        this.prepareNextCreate();
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

  deleteRow(item: PeriodItem): void {
    if (!confirm(`Supprimer la période "${item.code} — ${item.name}" ?`)) {
      return;
    }

    const id = this.toPersistedId(item.id);
    if (!id) {
      return;
    }

    this.academicPeriodService.delete(id).subscribe({
      next: () => this.loadRows(false),
      error: (err) => {
        this.loadError = extractApiErrorMessage(err, 'Impossible de supprimer cette période.');
      }
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.termFilter = '';
    this.termFilterId = null;
    this.periodTypeFilter = 'all';
    this.statusFilter = 'all';
    this.isTermFilterOpen = false;
    this.loadRows(true);
  }

  periodTypeLabel(type: AcademicPeriodType | string): string {
    return this.periodTypeOptions.find((item) => item.value === type)?.label || String(type);
  }

  private prepareNextCreate(): void {
    const termId = this.form.academicTermId;
    const termLabel = this.form.academicTermLabel;
    const periodType = this.form.periodType;
    const nextOrder = Number(this.form.displayOrder) + 1;
    const maximumScoreRatio = this.form.maximumScoreRatio;
    const status = this.form.status;
    this.isSubmitted = false;
    this.form = this.createEmptyForm();
    this.form.academicTermId = termId;
    this.form.academicTermLabel = termLabel;
    this.form.periodType = periodType;
    this.form.maximumScoreRatio = maximumScoreRatio;
    this.form.status = status;
    this.form.displayOrder = String(Number.isFinite(nextOrder) ? nextOrder : 1);
  }

  private nextDisplayOrder(termId: string): number {
    if (!termId) {
      return 1;
    }
    const maxOrder = this.rows
      .filter((row) => this.sameId(row.academicTermId, termId))
      .reduce((max, row) => Math.max(max, row.displayOrder), 0);
    return maxOrder + 1;
  }

  private bootstrapData(): void {
    this.isLoadingLookups = true;

    forkJoin({
      years: this.academicYearService.getAll().pipe(catchError(() => of([]))),
      terms: this.academicTermService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ years, terms }) => {
        const yearLabels = new Map<string, string>();
        for (const row of years as AcademicYearApiResponse[]) {
          const id = String(row.id ?? '');
          if (id) {
            yearLabels.set(id, AcademicYearService.buildLabel(row));
          }
        }

        this.terms = (terms as AcademicTermApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '');
            const yearId = String(row.academicYearId ?? row.academic_year_id ?? '');
            const yearLabel = yearLabels.get(yearId) || 'Année';
            const termLabel = this.buildLookupLabel(row.code, row.name);
            return {
              id,
              label: `${yearLabel} · ${termLabel}`,
              academicYearId: yearId
            };
          })
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.isLoadingLookups = false;
        this.loadRows(true);
      },
      error: () => {
        this.isLoadingLookups = false;
        this.loadError = 'Impossible de charger les trimestres / semestres.';
        this.loadRows(true);
      }
    });
  }

  private loadRows(showLoader = true): void {
    if (showLoader) {
      this.isLoadingRows = true;
    }
    this.loadError = '';

    const query = this.termFilterId ? { academicTermId: this.termFilterId } : {};
    this.academicPeriodService.getAll(query).subscribe({
      next: (rows) => {
        this.rows = rows
          .map((row, index) => this.mapApiToItem(row, index))
          .sort((a, b) => {
            const byTerm = a.academicTermLabel.localeCompare(b.academicTermLabel, 'fr');
            if (byTerm !== 0) {
              return byTerm;
            }
            return a.displayOrder - b.displayOrder;
          });
        this.isLoadingRows = false;
      },
      error: (err) => {
        this.rows = [];
        this.isLoadingRows = false;
        this.loadError = extractApiErrorMessage(
          err,
          'Impossible de charger les périodes scolaires.'
        );
      }
    });
  }

  private mapApiToItem(response: AcademicPeriodApiResponse, index: number): PeriodItem {
    const academicTermId = String(response.academicTermId ?? response.academic_term_id ?? '');
    const periodType = this.normalizePeriodType(response.periodType ?? response.period_type);
    const displayOrder = Number(
      response.displayOrder ??
        response.display_order ??
        response.orderNumber ??
        response.order_number ??
        0
    );
    const maximumScoreRatio = Number(
      response.maximumScoreRatio ?? response.maximum_score_ratio ?? 0
    );

    return {
      id: String(response.id ?? `academic-period-${index}`),
      academicTermId,
      academicTermLabel: this.findLabel(this.terms, academicTermId),
      code: (response.code ?? '').trim(),
      name: (response.name ?? '').trim(),
      periodType,
      periodTypeLabel: this.periodTypeLabel(periodType),
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      maximumScoreRatio: Number.isFinite(maximumScoreRatio) ? maximumScoreRatio : 0,
      status: response.active === false ? 'Inactif' : 'Actif'
    };
  }

  private normalizePeriodType(value: string | undefined | null): AcademicPeriodType {
    const raw = String(value ?? '').trim().toUpperCase();
    return raw === 'EXAM' ? 'EXAM' : 'PERIOD';
  }

  private filterOptions(options: SelectOption[], term: string): SelectOption[] {
    const normalized = this.normalize(term);
    if (!normalized) {
      return options;
    }
    return options.filter((option) => this.normalize(option.label).includes(normalized));
  }

  private findLabel(options: SelectOption[], id: string): string {
    return options.find((item) => this.sameId(item.id, id))?.label || '—';
  }

  private buildLookupLabel(code?: string | null, name?: string | null): string {
    const safeCode = (code ?? '').trim();
    const safeName = (name ?? '').trim();
    if (safeCode && safeName) {
      return `${safeCode} — ${safeName}`;
    }
    return safeName || safeCode || '—';
  }

  private sameId(
    left: string | number | undefined | null,
    right: string | number | undefined | null
  ): boolean {
    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }

  private toPersistedId(value: string | number): string | null {
    const id = String(value).trim();
    if (!id || id.startsWith('academic-period-')) {
      return null;
    }
    return id;
  }

  private createEmptyForm(): PeriodForm {
    return {
      academicTermId: '',
      academicTermLabel: '',
      code: '',
      name: '',
      periodType: 'PERIOD',
      displayOrder: '1',
      maximumScoreRatio: '1',
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
