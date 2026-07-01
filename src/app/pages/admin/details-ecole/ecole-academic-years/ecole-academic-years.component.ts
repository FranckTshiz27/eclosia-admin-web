import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AcademicYearApiResponse,
  AcademicYearService,
  AcademicYearStatus,
  CreateAcademicYearDto
} from '../../../../services/academic-year.service';
import { AcademicModelService, AcademicModelApiResponse } from '../../../../services/academic-model.service';
import {
  SchoolAcademicModelApiResponse,
  SchoolAcademicModelService
} from '../../../../services/school-academic-model.service';

interface FilterOption {
  value: string;
  label: string;
}

interface AcademicYearItem {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  current: boolean;
  status: string;
  statusLabel: string;
  description: string;
  schoolId: string;
  schoolAcademicModelId: string;
  modelLabel: string;
}

interface AcademicYearForm {
  schoolAcademicModelId: string;
  code: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus | string;
  current: boolean;
  description: string;
}

@Component({
  selector: 'app-ecole-academic-years',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-academic-years.component.html',
  styleUrl: './ecole-academic-years.component.css'
})
export class EcoleAcademicYearsComponent implements OnInit, OnChanges {
  @Input() schoolId = '';

  searchTerm = '';
  modelFilter = 'all';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoading = false;
  isLoadingFilters = false;
  loadError = '';

  isModalOpen = false;
  isEditMode = false;
  editingYearId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  years: AcademicYearItem[] = [];
  modelFilterOptions: FilterOption[] = [{ value: 'all', label: 'Tous les modeles' }];
  modelFormOptions: FilterOption[] = [];
  form: AcademicYearForm = {
    schoolAcademicModelId: '',
    code: '',
    startDate: '',
    endDate: '',
    status: 'PLANNED',
    current: false,
    description: ''
  };

  readonly descriptionMaxLength = 500;
  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'PLANNED', label: 'Planifiee' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'CLOSED', label: 'Cloturee' },
    { value: 'ARCHIVED', label: 'Archivee' }
  ];
  readonly statusFormOptions = this.statusOptions.filter((option) => option.value !== 'all');
  readonly pageSizeOptions = [10, 25, 50];

  private yearApiRows: AcademicYearApiResponse[] = [];
  private modelLabelByAssociationId = new Map<string, string>();

  constructor(
    private readonly academicYearService: AcademicYearService,
    private readonly schoolAcademicModelService: SchoolAcademicModelService,
    private readonly academicModelService: AcademicModelService
  ) {}

  ngOnInit(): void {
    if (this.schoolId) {
      this.bootstrap();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schoolId'] && !changes['schoolId'].firstChange) {
      this.currentPage = 1;
      this.closeModal();
      this.bootstrap();
    }
  }

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get filteredYears(): AcademicYearItem[] {
    const term = this.normalize(this.searchTerm);

    return this.years
      .filter((item) => {
        const matchesSearch =
          !term ||
          this.normalize(item.code).includes(term) ||
          this.normalize(item.modelLabel).includes(term) ||
          this.normalize(item.description).includes(term) ||
          this.normalize(item.statusLabel).includes(term);

        const matchesModel = this.modelFilter === 'all' || item.schoolAcademicModelId === this.modelFilter;
        const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;

        return matchesSearch && matchesModel && matchesStatus;
      })
      .sort((a, b) => this.parseDate(b.startDate).getTime() - this.parseDate(a.startDate).getTime());
  }

  get paginatedYears(): AcademicYearItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredYears.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredYears.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredYears.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredYears.length);
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.modelFilter = 'all';
    this.statusFilter = 'all';
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

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingYearId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.createEmptyForm();
  }

  openEditModal(item: AcademicYearItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingYearId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toFormFields(item);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingYearId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.createEmptyForm();
  }

  deleteYear(item: AcademicYearItem): void {
    if (!confirm(`Supprimer l annee scolaire "${item.code}" ?`)) {
      return;
    }

    this.academicYearService.delete(item.id).subscribe({
      next: () => this.loadYears(false),
      error: () => {
        this.loadError = 'Echec de suppression de l annee scolaire.';
      }
    });
  }

  saveYear(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving || !this.schoolId) {
      formRef.control.markAllAsTouched();
      return;
    }

    if (!this.form.schoolAcademicModelId) {
      this.saveError = 'Veuillez selectionner un modele academique associe.';
      return;
    }

    if (this.form.startDate && this.form.endDate && this.form.endDate < this.form.startDate) {
      this.saveError = 'La date de fin doit etre posterieure a la date de debut.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateAcademicYearDto = {
      code: this.form.code.trim().toUpperCase(),
      startDate: this.form.startDate,
      endDate: this.form.endDate,
      current: true,
      status: this.form.status,
      description: this.form.description.trim() || undefined,
      schoolId: this.schoolId,
      schoolAcademicModelId: this.form.schoolAcademicModelId
    };

    if (this.isEditMode) {
      if (!this.editingYearId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour cette annee scolaire: identifiant invalide.';
        return;
      }

      this.academicYearService.update(this.editingYearId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadYears(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.academicYearService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadYears(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation. Verifiez l'API puis reessayez.";
      }
    });
  }

  formatDisplayDate(value: string): string {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!isoMatch) {
      return value || '—';
    }
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  private bootstrap(): void {
    if (!this.schoolId) {
      this.years = [];
      this.modelFilterOptions = [{ value: 'all', label: 'Tous les modeles' }];
      this.modelFormOptions = [];
      return;
    }

    this.isLoadingFilters = true;
    this.loadReferenceData(() => {
      this.isLoadingFilters = false;
      this.loadYears(true);
    });
  }

  private loadReferenceData(onComplete: () => void): void {
    if (!this.schoolId) {
      onComplete();
      return;
    }

    forkJoin({
      associations: this.schoolAcademicModelService.getAll({ schoolId: this.schoolId }).pipe(catchError(() => of([]))),
      models: this.academicModelService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({
        associations,
        models
      }: {
        associations: SchoolAcademicModelApiResponse[];
        models: AcademicModelApiResponse[];
      }) => {
        const activeModelIds = new Set(
          models
            .filter((row) => this.readBoolean(row.active))
            .map((row) => String(row.id ?? ''))
            .filter(Boolean)
        );

        const activeAssociations = associations.filter((row) => {
          const associationIsActive = this.readBoolean(row.active);
          const modelId = String(row.academicModelId ?? row.academic_model_id ?? '');
          return associationIsActive && activeModelIds.has(modelId);
        });

        const modelLabelById = new Map(
          models
            .map((row) => {
              const id = String(row.id ?? '');
              const code = (row.code ?? '').trim();
              const name = (row.name ?? '').trim();
              const version = String(row.version ?? '').trim();
              const label = [code, name, version ? `(Version ${version})` : ''].filter(Boolean).join(' ');
              return [id, label] as const;
            })
            .filter((entry) => entry[0])
        );

        this.modelLabelByAssociationId = new Map(
          activeAssociations
            .map((row) => {
              const associationId = String(row.id ?? '');
              const modelId = String(row.academicModelId ?? row.academic_model_id ?? '');
              return [associationId, modelLabelById.get(modelId) ?? 'Modele academique'] as const;
            })
            .filter((entry) => entry[0])
        );

        const modelOptions = activeAssociations
          .map((row) => {
            const id = String(row.id ?? '');
            return {
              value: id,
              label: this.modelLabelByAssociationId.get(id) ?? 'Modele academique'
            };
          })
          .filter((option) => option.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.modelFormOptions = modelOptions;
        this.modelFilterOptions = [{ value: 'all', label: 'Tous les modeles' }, ...modelOptions];
        onComplete();
      },
      error: () => onComplete()
    });
  }

  private loadYears(showLoader = true): void {
    if (!this.schoolId) {
      this.years = [];
      return;
    }

    if (showLoader) {
      this.isLoading = true;
    }
    this.loadError = '';

    this.academicYearService.getAll({ schoolId: this.schoolId }).subscribe({
      next: (rows) => {
        this.yearApiRows = rows.filter((row) => this.readBoolean(row.current));
        this.remapYears();
        this.isLoading = false;
      },
      error: () => {
        this.years = [];
        this.isLoading = false;
        this.loadError = 'Impossible de charger les annees scolaires depuis l API.';
      }
    });
  }

  private remapYears(): void {
    this.years = this.yearApiRows
      .map((row) => this.mapApiToItem(row))
      .filter((item) => item.id && this.modelLabelByAssociationId.has(item.schoolAcademicModelId));
  }

  private mapApiToItem(row: AcademicYearApiResponse): AcademicYearItem {
    const schoolAcademicModelId = String(row.schoolAcademicModelId ?? row.school_academic_model_id ?? '');
    const status = String(row.status ?? 'PLANNED').trim().toUpperCase();

    return {
      id: String(row.id ?? ''),
      code: (row.code ?? '').trim(),
      startDate: this.toInputDate(String(row.startDate ?? row.start_date ?? '')),
      endDate: this.toInputDate(String(row.endDate ?? row.end_date ?? '')),
      current: this.readBoolean(row.current),
      status,
      statusLabel: this.resolveStatusLabel(status),
      description: (row.description ?? '').trim() || '—',
      schoolId: String(row.schoolId ?? row.school_id ?? this.schoolId),
      schoolAcademicModelId,
      modelLabel: this.modelLabelByAssociationId.get(schoolAcademicModelId) ?? '—'
    };
  }

  private createEmptyForm(): AcademicYearForm {
    const currentYear = new Date().getFullYear();
    return {
      schoolAcademicModelId: this.modelFormOptions[0]?.value ?? '',
      code: `${currentYear}-${currentYear + 1}`,
      startDate: `${currentYear}-09-01`,
      endDate: `${currentYear + 1}-06-30`,
      status: 'PLANNED',
      current: true,
      description: ''
    };
  }

  private toFormFields(item: AcademicYearItem): AcademicYearForm {
    return {
      schoolAcademicModelId: item.schoolAcademicModelId,
      code: item.code,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      current: item.current,
      description: item.description === '—' ? '' : item.description
    };
  }

  private resolveStatusLabel(status: string): string {
    return this.statusFormOptions.find((option) => option.value === status)?.label ?? status;
  }

  private toInputDate(value: string): string {
    const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (displayMatch) {
      return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
    }
    const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return isoMatch ? isoMatch[1] : value;
  }

  private parseDate(value: string): Date {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }

  private readBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
