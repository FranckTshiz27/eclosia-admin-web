import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import {
  AcademicCurriculumApiResponse,
  AcademicCurriculumService
} from '../../../services/academic-curriculum.service';
import {
  AcademicCurriculumSubjectApiResponse,
  AcademicCurriculumSubjectService,
  CreateAcademicCurriculumSubjectDto
} from '../../../services/academic-curriculum-subject.service';
import { SubjectApiResponse, SubjectService } from '../../../services/subject.service';

type StatusLabel = 'Actif' | 'Inactif';
type MandatoryLabel = 'Oui' | 'Non';

interface SelectOption {
  id: string;
  label: string;
}

interface CurriculumSubjectItem {
  id: string;
  academicCurriculumId: string;
  academicCurriculumLabel: string;
  subjectId: string;
  subjectLabel: string;
  coefficient: number;
  maximumPoints: number;
  displayOrder: number;
  mandatory: MandatoryLabel;
  status: StatusLabel;
}

interface CurriculumSubjectForm {
  academicCurriculumId: string;
  academicCurriculumLabel: string;
  subjectId: string;
  subjectLabel: string;
  coefficient: string;
  maximumPoints: string;
  displayOrder: string;
  mandatory: MandatoryLabel;
  status: StatusLabel;
}

@Component({
  selector: 'app-matieres-programme',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matieres-programme.component.html',
  styleUrl: './matieres-programme.component.css'
})
export class MatieresProgrammeComponent implements OnInit {
  searchTerm = '';
  curriculumFilter = '';
  curriculumFilterId: string | null = null;
  subjectFilter = '';
  subjectFilterId: string | null = null;
  statusFilter = 'all';
  mandatoryFilter = 'all';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  saveSuccess = '';

  isCurriculumFilterOpen = false;
  isSubjectFilterOpen = false;
  isFormCurriculumOpen = false;
  isFormSubjectOpen = false;

  isLoadingLookups = false;
  isLoadingRows = false;
  loadError = '';

  curricula: SelectOption[] = [];
  subjects: SelectOption[] = [];
  rows: CurriculumSubjectItem[] = [];

  form: CurriculumSubjectForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  readonly mandatoryOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Oui', label: 'Obligatoire' },
    { value: 'Non', label: 'Optionnel' }
  ];

  constructor(
    private readonly academicCurriculumService: AcademicCurriculumService,
    private readonly subjectService: SubjectService,
    private readonly academicCurriculumSubjectService: AcademicCurriculumSubjectService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get filteredCurriculumFilterOptions(): SelectOption[] {
    return this.filterOptions(this.curricula, this.curriculumFilter);
  }

  get filteredSubjectFilterOptions(): SelectOption[] {
    return this.filterOptions(this.subjects, this.subjectFilter);
  }

  get filteredFormCurriculumOptions(): SelectOption[] {
    return this.filterOptions(this.curricula, this.form.academicCurriculumLabel);
  }

  get filteredFormSubjectOptions(): SelectOption[] {
    return this.filterOptions(this.subjects, this.form.subjectLabel);
  }

  get filteredRows(): CurriculumSubjectItem[] {
    const term = this.normalize(this.searchTerm);
    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.academicCurriculumLabel).includes(term) ||
        this.normalize(row.subjectLabel).includes(term) ||
        String(row.coefficient).includes(term) ||
        String(row.maximumPoints).includes(term);

      const matchesCurriculum =
        !this.curriculumFilterId || this.sameId(row.academicCurriculumId, this.curriculumFilterId);
      const matchesSubject =
        !this.subjectFilterId || this.sameId(row.subjectId, this.subjectFilterId);
      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;
      const matchesMandatory =
        this.mandatoryFilter === 'all' || row.mandatory === this.mandatoryFilter;

      return (
        matchesSearch && matchesCurriculum && matchesSubject && matchesStatus && matchesMandatory
      );
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
    if (this.curriculumFilterId) {
      this.form.academicCurriculumId = this.curriculumFilterId;
      this.form.academicCurriculumLabel = this.curriculumFilter;
    }
    if (this.subjectFilterId) {
      this.form.subjectId = this.subjectFilterId;
      this.form.subjectLabel = this.subjectFilter;
    }
    this.form.displayOrder = String(this.nextDisplayOrder(this.form.academicCurriculumId));
  }

  openEditModal(item: CurriculumSubjectItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = this.toPersistedId(item.id);
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.form = {
      academicCurriculumId: item.academicCurriculumId,
      academicCurriculumLabel: item.academicCurriculumLabel,
      subjectId: item.subjectId,
      subjectLabel: item.subjectLabel,
      coefficient: String(item.coefficient),
      maximumPoints: String(item.maximumPoints),
      displayOrder: String(item.displayOrder),
      mandatory: item.mandatory,
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
    this.isFormCurriculumOpen = false;
    this.isFormSubjectOpen = false;
    this.form = this.createEmptyForm();
  }

  openCurriculumFilterDropdown(): void {
    this.isCurriculumFilterOpen = true;
  }

  closeCurriculumFilterDropdown(): void {
    setTimeout(() => {
      this.isCurriculumFilterOpen = false;
    }, 120);
  }

  onCurriculumFilterInput(): void {
    this.curriculumFilterId = null;
    this.openCurriculumFilterDropdown();
  }

  selectCurriculumFilter(option: SelectOption | null): void {
    if (!option) {
      this.curriculumFilter = '';
      this.curriculumFilterId = null;
    } else {
      this.curriculumFilter = option.label;
      this.curriculumFilterId = option.id;
    }
    this.isCurriculumFilterOpen = false;
    this.loadRows(true);
  }

  openSubjectFilterDropdown(): void {
    this.isSubjectFilterOpen = true;
  }

  closeSubjectFilterDropdown(): void {
    setTimeout(() => {
      this.isSubjectFilterOpen = false;
    }, 120);
  }

  onSubjectFilterInput(): void {
    this.subjectFilterId = null;
    this.openSubjectFilterDropdown();
  }

  selectSubjectFilter(option: SelectOption | null): void {
    if (!option) {
      this.subjectFilter = '';
      this.subjectFilterId = null;
    } else {
      this.subjectFilter = option.label;
      this.subjectFilterId = option.id;
    }
    this.isSubjectFilterOpen = false;
    this.loadRows(true);
  }

  openFormCurriculumDropdown(): void {
    this.isFormCurriculumOpen = true;
  }

  closeFormCurriculumDropdown(): void {
    setTimeout(() => {
      this.isFormCurriculumOpen = false;
    }, 120);
  }

  onFormCurriculumInput(): void {
    this.form.academicCurriculumId = '';
    this.openFormCurriculumDropdown();
  }

  selectFormCurriculum(option: SelectOption): void {
    this.form.academicCurriculumId = option.id;
    this.form.academicCurriculumLabel = option.label;
    this.isFormCurriculumOpen = false;
    if (!this.isEditMode) {
      this.form.displayOrder = String(this.nextDisplayOrder(option.id));
    }
  }

  openFormSubjectDropdown(): void {
    this.isFormSubjectOpen = true;
  }

  closeFormSubjectDropdown(): void {
    setTimeout(() => {
      this.isFormSubjectOpen = false;
    }, 120);
  }

  onFormSubjectInput(): void {
    this.form.subjectId = '';
    this.openFormSubjectDropdown();
  }

  selectFormSubject(option: SelectOption): void {
    this.form.subjectId = option.id;
    this.form.subjectLabel = option.label;
    this.isFormSubjectOpen = false;
  }

  saveRow(formRef: NgForm): void {
    this.isSubmitted = true;
    this.saveSuccess = '';
    if (!formRef.valid || this.isSaving) {
      formRef.control.markAllAsTouched();
      return;
    }

    const coefficient = Number(String(this.form.coefficient).replace(',', '.'));
    const maximumPoints = Number(String(this.form.maximumPoints).replace(',', '.'));
    const displayOrder = Number(this.form.displayOrder);

    if (!this.form.academicCurriculumId || !this.form.subjectId) {
      this.saveError = 'Le programme et la matière sont obligatoires.';
      return;
    }
    if (!Number.isFinite(coefficient) || coefficient <= 0) {
      this.saveError = 'Le coefficient doit être supérieur à 0.';
      return;
    }
    if (!Number.isFinite(maximumPoints) || maximumPoints <= 0) {
      this.saveError = 'Le maximum de points doit être supérieur à 0.';
      return;
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      this.saveError = "L'ordre d'affichage doit être un entier positif ou nul.";
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateAcademicCurriculumSubjectDto = {
      academicCurriculumId: this.form.academicCurriculumId,
      subjectId: this.form.subjectId,
      coefficient,
      maximumPoints,
      displayOrder,
      mandatory: this.form.mandatory === 'Oui',
      active: this.form.status === 'Actif'
    };

    if (this.isEditMode) {
      if (!this.editingId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre à jour: identifiant invalide.';
        return;
      }

      this.academicCurriculumSubjectService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.saveSuccess = 'Matière mise à jour.';
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

    this.academicCurriculumSubjectService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = 'Matière enregistrée. Vous pouvez en ajouter une autre.';
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

  deleteRow(item: CurriculumSubjectItem): void {
    if (
      !confirm(
        `Supprimer la matière "${item.subjectLabel}" du programme "${item.academicCurriculumLabel}" ?`
      )
    ) {
      return;
    }

    const id = this.toPersistedId(item.id);
    if (!id) {
      return;
    }

    this.academicCurriculumSubjectService.delete(id).subscribe({
      next: () => this.loadRows(false),
      error: (err) => {
        this.loadError = extractApiErrorMessage(err, 'Impossible de supprimer cette association.');
      }
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.curriculumFilter = '';
    this.curriculumFilterId = null;
    this.subjectFilter = '';
    this.subjectFilterId = null;
    this.statusFilter = 'all';
    this.mandatoryFilter = 'all';
    this.isCurriculumFilterOpen = false;
    this.isSubjectFilterOpen = false;
    this.loadRows(true);
  }

  private prepareNextCreate(): void {
    const curriculumId = this.form.academicCurriculumId;
    const curriculumLabel = this.form.academicCurriculumLabel;
    const nextOrder = Number(this.form.displayOrder) + 1;
    const coefficient = this.form.coefficient;
    const maximumPoints = this.form.maximumPoints;
    const mandatory = this.form.mandatory;
    const status = this.form.status;
    this.isSubmitted = false;
    this.form = this.createEmptyForm();
    this.form.academicCurriculumId = curriculumId;
    this.form.academicCurriculumLabel = curriculumLabel;
    this.form.coefficient = coefficient;
    this.form.maximumPoints = maximumPoints;
    this.form.mandatory = mandatory;
    this.form.status = status;
    this.form.displayOrder = String(Number.isFinite(nextOrder) ? nextOrder : 1);
  }

  private nextDisplayOrder(curriculumId: string): number {
    if (!curriculumId) {
      return 1;
    }
    const maxOrder = this.rows
      .filter((row) => this.sameId(row.academicCurriculumId, curriculumId))
      .reduce((max, row) => Math.max(max, row.displayOrder), 0);
    return maxOrder + 1;
  }

  private bootstrapData(): void {
    this.isLoadingLookups = true;

    forkJoin({
      curricula: this.academicCurriculumService.getAll().pipe(catchError(() => of([]))),
      subjects: this.subjectService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ curricula, subjects }) => {
        this.curricula = (curricula as AcademicCurriculumApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: this.buildLookupLabel(row.code, row.name)
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.subjects = (subjects as SubjectApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: this.buildLookupLabel(row.code, row.name)
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.isLoadingLookups = false;
        this.loadRows(true);
      },
      error: () => {
        this.isLoadingLookups = false;
        this.loadError = 'Impossible de charger les référentiels.';
        this.loadRows(true);
      }
    });
  }

  private loadRows(showLoader = true): void {
    if (showLoader) {
      this.isLoadingRows = true;
    }
    this.loadError = '';

    const query: { academicCurriculumId?: string; subjectId?: string } = {};
    if (this.curriculumFilterId) {
      query.academicCurriculumId = this.curriculumFilterId;
    }
    if (this.subjectFilterId) {
      query.subjectId = this.subjectFilterId;
    }

    this.academicCurriculumSubjectService.getAll(query).subscribe({
      next: (rows) => {
        this.rows = rows
          .map((row, index) => this.mapApiToItem(row, index))
          .sort((a, b) => {
            const byCurriculum = a.academicCurriculumLabel.localeCompare(
              b.academicCurriculumLabel,
              'fr'
            );
            if (byCurriculum !== 0) {
              return byCurriculum;
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
          'Impossible de charger les matières du programme.'
        );
      }
    });
  }

  private mapApiToItem(
    response: AcademicCurriculumSubjectApiResponse,
    index: number
  ): CurriculumSubjectItem {
    const academicCurriculumId = String(
      response.academicCurriculumId ?? response.academic_curriculum_id ?? ''
    );
    const subjectId = String(response.subjectId ?? response.subject_id ?? '');
    const coefficient = Number(response.coefficient ?? 0);
    const maximumPoints = Number(response.maximumPoints ?? response.maximum_points ?? 0);
    const displayOrder = Number(response.displayOrder ?? response.display_order ?? 0);

    return {
      id: String(response.id ?? `curriculum-subject-${index}`),
      academicCurriculumId,
      academicCurriculumLabel: this.findLabel(this.curricula, academicCurriculumId),
      subjectId,
      subjectLabel: this.findLabel(this.subjects, subjectId),
      coefficient: Number.isFinite(coefficient) ? coefficient : 0,
      maximumPoints: Number.isFinite(maximumPoints) ? maximumPoints : 0,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      mandatory: response.mandatory === false ? 'Non' : 'Oui',
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
    if (!id || id.startsWith('curriculum-subject-')) {
      return null;
    }
    return id;
  }

  private createEmptyForm(): CurriculumSubjectForm {
    return {
      academicCurriculumId: '',
      academicCurriculumLabel: '',
      subjectId: '',
      subjectLabel: '',
      coefficient: '1',
      maximumPoints: '20',
      displayOrder: '1',
      mandatory: 'Oui',
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
