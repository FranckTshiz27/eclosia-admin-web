import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import {
  AcademicTermApiResponse,
  AcademicTermService,
  CreateAcademicTermDto
} from '../../../services/academic-term.service';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../services/academic-year.service';

type StatusLabel = 'Actif' | 'Inactif';

interface SelectOption {
  id: string;
  label: string;
}

interface TermItem {
  id: string;
  academicYearId: string;
  academicYearLabel: string;
  code: string;
  name: string;
  displayOrder: number;
  status: StatusLabel;
}

interface TermForm {
  academicYearId: string;
  academicYearLabel: string;
  code: string;
  name: string;
  displayOrder: string;
  status: StatusLabel;
}

@Component({
  selector: 'app-trimestres-semestres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trimestres-semestres.component.html',
  styleUrl: './trimestres-semestres.component.css'
})
export class TrimestresSemestresComponent implements OnInit {
  searchTerm = '';
  yearFilter = '';
  yearFilterId: string | null = null;
  statusFilter = 'all';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  saveSuccess = '';

  isYearFilterOpen = false;
  isFormYearOpen = false;

  isLoadingLookups = false;
  isLoadingRows = false;
  loadError = '';

  years: SelectOption[] = [];
  rows: TermItem[] = [];

  form: TermForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  constructor(
    private readonly academicYearService: AcademicYearService,
    private readonly academicTermService: AcademicTermService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get filteredYearFilterOptions(): SelectOption[] {
    return this.filterOptions(this.years, this.yearFilter);
  }

  get filteredFormYearOptions(): SelectOption[] {
    return this.filterOptions(this.years, this.form.academicYearLabel);
  }

  get filteredRows(): TermItem[] {
    const term = this.normalize(this.searchTerm);
    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.code).includes(term) ||
        this.normalize(row.name).includes(term) ||
        this.normalize(row.academicYearLabel).includes(term);

      const matchesYear =
        !this.yearFilterId || this.sameId(row.academicYearId, this.yearFilterId);
      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;

      return matchesSearch && matchesYear && matchesStatus;
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
    if (this.yearFilterId) {
      this.form.academicYearId = this.yearFilterId;
      this.form.academicYearLabel = this.yearFilter;
      this.form.displayOrder = String(this.nextDisplayOrder(this.yearFilterId));
    }
  }

  openEditModal(item: TermItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = this.toPersistedId(item.id);
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.form = {
      academicYearId: item.academicYearId,
      academicYearLabel: item.academicYearLabel,
      code: item.code,
      name: item.name,
      displayOrder: String(item.displayOrder),
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
    this.isFormYearOpen = false;
    this.form = this.createEmptyForm();
  }

  openYearFilterDropdown(): void {
    this.isYearFilterOpen = true;
  }

  closeYearFilterDropdown(): void {
    setTimeout(() => {
      this.isYearFilterOpen = false;
    }, 120);
  }

  onYearFilterInput(): void {
    this.yearFilterId = null;
    this.openYearFilterDropdown();
  }

  selectYearFilter(option: SelectOption | null): void {
    if (!option) {
      this.yearFilter = '';
      this.yearFilterId = null;
    } else {
      this.yearFilter = option.label;
      this.yearFilterId = option.id;
    }
    this.isYearFilterOpen = false;
    this.loadRows(true);
  }

  openFormYearDropdown(): void {
    this.isFormYearOpen = true;
  }

  closeFormYearDropdown(): void {
    setTimeout(() => {
      this.isFormYearOpen = false;
    }, 120);
  }

  onFormYearInput(): void {
    this.form.academicYearId = '';
    this.openFormYearDropdown();
  }

  selectFormYear(option: SelectOption): void {
    this.form.academicYearId = option.id;
    this.form.academicYearLabel = option.label;
    this.isFormYearOpen = false;
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
    const code = this.form.code.trim();
    const name = this.form.name.trim();

    if (!this.form.academicYearId) {
      this.saveError = "L'année scolaire est obligatoire.";
      return;
    }
    if (!code || !name) {
      this.saveError = 'Le code et le nom sont obligatoires.';
      return;
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      this.saveError = "L'ordre d'affichage doit être un entier positif ou nul.";
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateAcademicTermDto = {
      academicYearId: this.form.academicYearId,
      code,
      name,
      displayOrder,
      active: this.form.status === 'Actif'
    };

    if (this.isEditMode) {
      if (!this.editingId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre à jour: identifiant invalide.';
        return;
      }

      this.academicTermService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.saveSuccess = 'Trimestre / semestre mis à jour.';
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

    this.academicTermService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = 'Enregistré. Vous pouvez en ajouter un autre.';
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

  deleteRow(item: TermItem): void {
    if (!confirm(`Supprimer "${item.code} — ${item.name}" ?`)) {
      return;
    }

    const id = this.toPersistedId(item.id);
    if (!id) {
      return;
    }

    this.academicTermService.delete(id).subscribe({
      next: () => this.loadRows(false),
      error: (err) => {
        this.loadError = extractApiErrorMessage(
          err,
          'Impossible de supprimer ce trimestre / semestre.'
        );
      }
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.yearFilter = '';
    this.yearFilterId = null;
    this.statusFilter = 'all';
    this.isYearFilterOpen = false;
    this.loadRows(true);
  }

  private prepareNextCreate(): void {
    const yearId = this.form.academicYearId;
    const yearLabel = this.form.academicYearLabel;
    const nextOrder = Number(this.form.displayOrder) + 1;
    const status = this.form.status;
    this.isSubmitted = false;
    this.form = this.createEmptyForm();
    this.form.academicYearId = yearId;
    this.form.academicYearLabel = yearLabel;
    this.form.status = status;
    this.form.displayOrder = String(Number.isFinite(nextOrder) ? nextOrder : 1);
  }

  private nextDisplayOrder(yearId: string): number {
    if (!yearId) {
      return 1;
    }
    const maxOrder = this.rows
      .filter((row) => this.sameId(row.academicYearId, yearId))
      .reduce((max, row) => Math.max(max, row.displayOrder), 0);
    return maxOrder + 1;
  }

  private bootstrapData(): void {
    this.isLoadingLookups = true;

    this.academicYearService
      .getAll()
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (years) => {
          this.years = (years as AcademicYearApiResponse[])
            .map((row) => ({
              id: String(row.id ?? ''),
              label: AcademicYearService.buildLabel(row)
            }))
            .filter((item) => item.id)
            .sort((a, b) => b.label.localeCompare(a.label, 'fr'));

          this.isLoadingLookups = false;
          this.loadRows(true);
        },
        error: () => {
          this.isLoadingLookups = false;
          this.loadError = 'Impossible de charger les années scolaires.';
          this.loadRows(true);
        }
      });
  }

  private loadRows(showLoader = true): void {
    if (showLoader) {
      this.isLoadingRows = true;
    }
    this.loadError = '';

    const query = this.yearFilterId ? { academicYearId: this.yearFilterId } : {};
    this.academicTermService.getAll(query).subscribe({
      next: (rows) => {
        this.rows = rows
          .map((row, index) => this.mapApiToItem(row, index))
          .sort((a, b) => {
            const byYear = a.academicYearLabel.localeCompare(b.academicYearLabel, 'fr');
            if (byYear !== 0) {
              return byYear;
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
          'Impossible de charger les trimestres / semestres.'
        );
      }
    });
  }

  private mapApiToItem(response: AcademicTermApiResponse, index: number): TermItem {
    const academicYearId = String(response.academicYearId ?? response.academic_year_id ?? '');
    const displayOrder = Number(response.displayOrder ?? response.display_order ?? 0);

    return {
      id: String(response.id ?? `academic-term-${index}`),
      academicYearId,
      academicYearLabel: this.findLabel(this.years, academicYearId),
      code: (response.code ?? '').trim(),
      name: (response.name ?? '').trim(),
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      status: response.active === false ? 'Inactif' : 'Actif'
    };
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
    if (!id || id.startsWith('academic-term-')) {
      return null;
    }
    return id;
  }

  private createEmptyForm(): TermForm {
    return {
      academicYearId: '',
      academicYearLabel: '',
      code: '',
      name: '',
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
