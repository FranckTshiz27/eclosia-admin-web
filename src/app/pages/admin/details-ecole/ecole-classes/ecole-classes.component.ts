import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AcademicLevelService, AcademicLevelApiResponse } from '../../../../services/academic-level.service';
import {
  AcademicOptionService,
  AcademicOptionApiResponse
} from '../../../../services/academic-option.service';
import {
  AcademicSectionService,
  AcademicSectionApiResponse
} from '../../../../services/academic-section.service';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../../services/academic-year.service';
import {
  ClassroomApiResponse,
  ClassroomService,
  CreateClassroomDto
} from '../../../../services/classroom.service';
import {
  ClassroomDesignationApiResponse,
  ClassroomDesignationService
} from '../../../../services/classroom-designation.service';
import { TeacherClassAssignmentService } from '../../../../services/teacher-class-assignment.service';
import { TeacherCourseAssignmentService } from '../../../../services/teacher-course-assignment.service';
import { extractApiErrorMessage } from '../../../../core/utils/api-error';

type ClassStatus = 'Active' | 'Inactive';

interface FilterOption {
  value: string;
  label: string;
}

interface ClassroomItem {
  id: string;
  displayName: string;
  designationId: string;
  designationCode: string;
  designationName: string;
  levelId: string;
  levelName: string;
  sectionId: string;
  sectionName: string;
  optionId: string;
  optionName: string;
  capacity: number;
  description: string;
  status: ClassStatus;
  schoolId: string;
}

interface ClassroomForm {
  classroomDesignationId: string;
  academicLevelId: string;
  academicSectionId: string;
  academicOptionId: string;
  capacity: string;
  description: string;
  active: boolean;
}

interface LevelRequirements {
  requiresSection: boolean;
  requiresOption: boolean;
}

@Component({
  selector: 'app-ecole-classes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-classes.component.html',
  styleUrl: './ecole-classes.component.css'
})
export class EcoleClassesComponent implements OnInit, OnChanges {
  @Input() schoolId = '';

  searchTerm = '';
  levelFilter = 'all';
  sectionFilter = 'all';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoadingClasses = false;
  isLoadingFilters = false;
  loadError = '';

  isModalOpen = false;
  isEditMode = false;
  editingClassroomId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  isAssignmentsModalOpen = false;
  assignmentsClassroomId = '';
  assignmentsClassroomName = '';
  assignmentsYearId = '';
  assignmentYearOptions: { id: string; label: string; active: boolean }[] = [];
  isLoadingAssignments = false;
  assignmentsError = '';
  activeTitularName = '';
  classroomCourseAssignments: {
    subjectLabel: string;
    teacherFullName: string;
    weeklyHours: number | null;
    active: boolean;
  }[] = [];

  levelFilterOptions: FilterOption[] = [{ value: 'all', label: 'Tous les niveaux' }];
  sectionFilterOptions: FilterOption[] = [{ value: 'all', label: 'Toutes les sections' }];
  designationFormOptions: FilterOption[] = [];
  levelFormOptions: FilterOption[] = [];
  sectionFormOptions: FilterOption[] = [];

  classes: ClassroomItem[] = [];
  form: ClassroomForm = {
    classroomDesignationId: '',
    academicLevelId: '',
    academicSectionId: '',
    academicOptionId: '',
    capacity: '30',
    description: '',
    active: true
  };

  readonly descriptionMaxLength = 500;
  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
  ];
  readonly pageSizeOptions = [10, 25, 50];

  private classroomApiRows: ClassroomApiResponse[] = [];
  private levelNameById = new Map<string, string>();
  private sectionNameById = new Map<string, string>();
  private optionNameById = new Map<string, string>();
  private optionSectionById = new Map<string, string>();
  private designationById = new Map<string, { code: string; name: string }>();
  private levelRequirementsById = new Map<string, LevelRequirements>();

  constructor(
    private readonly classroomService: ClassroomService,
    private readonly classroomDesignationService: ClassroomDesignationService,
    private readonly academicLevelService: AcademicLevelService,
    private readonly academicSectionService: AcademicSectionService,
    private readonly academicOptionService: AcademicOptionService,
    private readonly academicYearService: AcademicYearService,
    private readonly teacherClassAssignmentService: TeacherClassAssignmentService,
    private readonly teacherCourseAssignmentService: TeacherCourseAssignmentService
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
      this.closeAssignmentsModal();
      this.bootstrap();
    }
  }

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get selectedLevelRequirements(): LevelRequirements {
    return (
      this.levelRequirementsById.get(this.form.academicLevelId) ?? {
        requiresSection: false,
        requiresOption: false
      }
    );
  }

  get isSectionFieldAvailable(): boolean {
    return this.selectedLevelRequirements.requiresSection;
  }

  get isOptionFieldAvailable(): boolean {
    return this.selectedLevelRequirements.requiresOption;
  }

  get isOptionSelectDisabled(): boolean {
    if (!this.isOptionFieldAvailable) {
      return true;
    }
    return this.isSectionFieldAvailable && !this.form.academicSectionId;
  }

  get optionPlaceholder(): string {
    if (!this.isOptionFieldAvailable) {
      return 'Non applicable pour ce niveau';
    }
    if (this.isSectionFieldAvailable && !this.form.academicSectionId) {
      return 'Selectionnez d abord une section';
    }
    return 'Aucune option';
  }

  get optionFormOptions(): FilterOption[] {
    if (!this.isOptionFieldAvailable) {
      return [];
    }

    if (!this.isSectionFieldAvailable) {
      return Array.from(this.optionNameById.entries())
        .map(([optionId, label]) => ({ value: optionId, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    }

    if (!this.form.academicSectionId) {
      return [];
    }

    return Array.from(this.optionSectionById.entries())
      .filter(([, sectionId]) => this.sameId(sectionId, this.form.academicSectionId))
      .map(([optionId]) => ({
        value: optionId,
        label: this.optionNameById.get(optionId) ?? 'Option'
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }

  get filteredClasses(): ClassroomItem[] {
    const term = this.normalize(this.searchTerm);

    return this.classes.filter((item) => {
      const matchesSearch =
        !term ||
        this.normalize(item.displayName).includes(term) ||
        this.normalize(item.designationCode).includes(term) ||
        this.normalize(item.designationName).includes(term) ||
        this.normalize(item.levelName).includes(term) ||
        this.normalize(item.sectionName).includes(term) ||
        this.normalize(item.optionName).includes(term) ||
        this.normalize(item.description).includes(term);

      const matchesLevel = this.levelFilter === 'all' || item.levelId === this.levelFilter;
      const matchesSection =
        this.sectionFilter === 'all' ||
        (this.sectionFilter === 'none' ? !item.sectionId : item.sectionId === this.sectionFilter);
      const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;

      return matchesSearch && matchesLevel && matchesSection && matchesStatus;
    });
  }

  get paginatedClasses(): ClassroomItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredClasses.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredClasses.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredClasses.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredClasses.length);
  }

  onFilterChange(): void {
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

  resetFilters(): void {
    this.searchTerm = '';
    this.levelFilter = 'all';
    this.sectionFilter = 'all';
    this.statusFilter = 'all';
    this.currentPage = 1;
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingClassroomId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
    this.applyLevelFieldConstraints();
  }

  openEditModal(item: ClassroomItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingClassroomId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toFormFields(item);
    this.applyLevelFieldConstraints();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingClassroomId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
    this.applyLevelFieldConstraints();
  }

  openAssignmentsModal(item: ClassroomItem): void {
    this.assignmentsClassroomId = item.id;
    this.assignmentsClassroomName = item.displayName;
    this.assignmentsError = '';
    this.activeTitularName = '';
    this.classroomCourseAssignments = [];
    this.isAssignmentsModalOpen = true;
    this.loadClassroomAssignmentYears();
  }

  closeAssignmentsModal(): void {
    this.isAssignmentsModalOpen = false;
    this.assignmentsClassroomId = '';
    this.assignmentsClassroomName = '';
    this.assignmentsYearId = '';
    this.assignmentsError = '';
    this.activeTitularName = '';
    this.classroomCourseAssignments = [];
  }

  onClassroomAssignmentsYearChange(): void {
    this.loadClassroomAssignments();
  }

  private loadClassroomAssignmentYears(): void {
    if (!this.schoolId) {
      return;
    }
    this.academicYearService
      .getAll({ schoolId: this.schoolId })
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (years) => {
          this.assignmentYearOptions = (years as AcademicYearApiResponse[])
            .map((year) => ({
              id: String(year.id ?? ''),
              label: AcademicYearService.buildLabel(year),
              active: year.active !== false
            }))
            .filter((year) => year.id);
          this.assignmentsYearId =
            this.assignmentYearOptions.find((year) => year.active)?.id ??
            this.assignmentYearOptions[0]?.id ??
            '';
          this.loadClassroomAssignments();
        },
        error: (error) => {
          this.assignmentsError = extractApiErrorMessage(
            error,
            'Impossible de charger les années scolaires.'
          );
        }
      });
  }

  private loadClassroomAssignments(): void {
    if (!this.assignmentsClassroomId || !this.assignmentsYearId) {
      return;
    }
    this.isLoadingAssignments = true;
    this.assignmentsError = '';
    this.activeTitularName = '';

    forkJoin({
      titular: this.teacherClassAssignmentService
        .getActiveByClassroom(this.assignmentsClassroomId, this.assignmentsYearId)
        .pipe(catchError(() => of(null))),
      courses: this.teacherCourseAssignmentService
        .listByClassroom(this.assignmentsClassroomId, this.assignmentsYearId)
        .pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ titular, courses }) => {
        this.isLoadingAssignments = false;
        if (titular) {
          this.activeTitularName = String(
            titular.teacherFullName ?? titular.teacher_full_name ?? ''
          ).trim();
        }
        this.classroomCourseAssignments = courses.map((row) => {
          const code = String(row.subjectCode ?? row.subject_code ?? '').trim();
          const name = String(row.subjectName ?? row.subject_name ?? '').trim();
          return {
            subjectLabel: code && name ? `${code} — ${name}` : code || name || '—',
            teacherFullName: String(row.teacherFullName ?? row.teacher_full_name ?? '—'),
            weeklyHours: row.weeklyHours ?? row.weekly_hours ?? null,
            active: row.active !== false
          };
        });
      },
      error: (error) => {
        this.isLoadingAssignments = false;
        this.assignmentsError = extractApiErrorMessage(
          error,
          'Impossible de charger les affectations de la classe.'
        );
      }
    });
  }

  onFormLevelChange(): void {
    this.applyLevelFieldConstraints();
  }

  onFormSectionChange(sectionId: string): void {
    this.form = { ...this.form, academicSectionId: sectionId, academicOptionId: '' };
  }

  onFormOptionChange(optionId: string): void {
    this.form = { ...this.form, academicOptionId: optionId };
  }

  compareSelectValues(left: string, right: string): boolean {
    return this.sameId(left, right);
  }

  trackFilterOption(_index: number, option: FilterOption): string {
    return option.value;
  }

  toggleActiveStatus(): void {
    this.form = { ...this.form, active: !this.form.active };
  }

  deleteClassroom(item: ClassroomItem): void {
    const label = [item.designationCode, item.levelName].filter(Boolean).join(' - ');
    if (!confirm(`Supprimer la classe "${label}" ?`)) {
      return;
    }

    this.classroomService.delete(item.id).subscribe({
      next: () => this.loadClassrooms(false),
      error: () => {
        this.loadError = 'Echec de suppression de la classe.';
      }
    });
  }

  saveClassroom(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving || !this.schoolId) {
      formRef.control.markAllAsTouched();
      return;
    }

    const capacity = Number(this.form.capacity);
    if (!Number.isFinite(capacity) || capacity < 1) {
      this.saveError = 'La capacite doit etre un nombre superieur a 0.';
      return;
    }

    const { requiresSection, requiresOption } = this.selectedLevelRequirements;
    if (requiresSection && !this.form.academicSectionId) {
      this.saveError = 'La section est obligatoire pour ce niveau.';
      return;
    }
    if (requiresOption && !this.form.academicOptionId) {
      this.saveError = 'L option est obligatoire pour ce niveau.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateClassroomDto = {
      capacity,
      active: this.form.active,
      description: this.form.description.trim() || undefined,
      schoolId: this.schoolId,
      academicLevelId: this.form.academicLevelId,
      classroomDesignationId: this.form.classroomDesignationId,
      academicSectionId: requiresSection ? this.form.academicSectionId || undefined : undefined,
      academicOptionId: requiresOption ? this.form.academicOptionId || undefined : undefined
    };

    if (this.isEditMode) {
      if (!this.editingClassroomId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour cette classe: identifiant invalide.';
        return;
      }

      this.classroomService.update(this.editingClassroomId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadClassrooms(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.classroomService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadClassrooms(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation. Verifiez l'API puis reessayez.";
      }
    });
  }

  private bootstrap(): void {
    if (!this.schoolId) {
      this.classes = [];
      this.designationFormOptions = [];
      this.isLoadingClasses = false;
      this.isLoadingFilters = false;
      this.loadError = '';
      return;
    }

    this.isLoadingFilters = true;
    this.loadReferenceData(() => {
      this.isLoadingFilters = false;
      this.loadClassrooms(true);
    });
  }

  private loadReferenceData(onComplete: () => void): void {
    if (!this.schoolId) {
      onComplete();
      return;
    }

    forkJoin({
      levels: this.academicLevelService.getAll().pipe(catchError(() => of([]))),
      sections: this.academicSectionService.getAll().pipe(catchError(() => of([]))),
      options: this.academicOptionService.getAll().pipe(catchError(() => of([]))),
      designations: this.classroomDesignationService.getAll(this.schoolId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({
        levels,
        sections,
        options,
        designations
      }: {
        levels: AcademicLevelApiResponse[];
        sections: AcademicSectionApiResponse[];
        options: AcademicOptionApiResponse[];
        designations: ClassroomDesignationApiResponse[];
      }) => {
        this.levelNameById = new Map(
          levels
            .map((row) => [String(row.id ?? ''), (row.name ?? row.code ?? '').trim()] as const)
            .filter((entry) => entry[0])
        );
        this.levelRequirementsById = new Map(
          levels
            .map((row) => {
              const id = String(row.id ?? '');
              return [
                id,
                {
                  requiresSection: this.readRequiresSection(row),
                  requiresOption: this.readRequiresOption(row)
                }
              ] as const;
            })
            .filter((entry) => entry[0])
        );
        this.levelFilterOptions = [
          { value: 'all', label: 'Tous les niveaux' },
          ...levels
            .map((row) => ({
              value: String(row.id ?? ''),
              label: (row.name ?? row.code ?? 'Niveau').trim()
            }))
            .filter((option) => option.value)
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
        ];
        this.levelFormOptions = this.levelFilterOptions.filter((option) => option.value !== 'all');

        this.sectionNameById = new Map(
          sections
            .map((row) => [String(row.id ?? ''), (row.name ?? row.code ?? '').trim()] as const)
            .filter((entry) => entry[0])
        );
        this.sectionFilterOptions = [
          { value: 'all', label: 'Toutes les sections' },
          ...sections
            .map((row) => ({
              value: String(row.id ?? ''),
              label: (row.name ?? row.code ?? 'Section').trim()
            }))
            .filter((option) => option.value)
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
        ];
        this.sectionFormOptions = this.sectionFilterOptions.filter((option) => option.value !== 'all');

        this.optionNameById = new Map(
          options
            .map((row) => [String(row.id ?? ''), (row.name ?? row.code ?? '').trim()] as const)
            .filter((entry) => entry[0])
        );
        this.optionSectionById = new Map(
          options
            .map((row) => [
              String(row.id ?? ''),
              String(row.academicSectionId ?? row.academic_section_id ?? '')
            ] as const)
            .filter((entry) => entry[0] && entry[1])
        );

        this.designationById = new Map(
          designations
            .map((row) => {
              const id = String(row.id ?? '');
              return [id, { code: (row.code ?? '').trim(), name: (row.name ?? '').trim() }] as const;
            })
            .filter((entry) => entry[0])
        );
        this.designationFormOptions = designations
          .filter((row) => row.active !== false)
          .map((row) => {
            const id = String(row.id ?? '');
            const code = (row.code ?? '').trim();
            const name = (row.name ?? '').trim();
            return {
              value: id,
              label: [code, name].filter(Boolean).join(' - ')
            };
          })
          .filter((option) => option.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        onComplete();
      },
      error: () => onComplete()
    });
  }

  private loadClassrooms(showLoader = true): void {
    if (!this.schoolId) {
      this.classes = [];
      return;
    }

    if (showLoader) {
      this.isLoadingClasses = true;
    }
    this.loadError = '';

    this.classroomService.getAll(this.schoolId).subscribe({
      next: (rows: ClassroomApiResponse[]) => {
        this.classroomApiRows = rows;
        this.remapClassrooms();
        this.isLoadingClasses = false;
      },
      error: () => {
        this.classes = [];
        this.isLoadingClasses = false;
        this.loadError = 'Impossible de charger les classes depuis l API.';
      }
    });
  }

  private remapClassrooms(): void {
    this.classes = this.classroomApiRows
      .map((row) => this.mapApiToItem(row))
      .filter((item) => item.id)
      .sort((a, b) => this.compareClassrooms(a, b));
  }

  private mapApiToItem(row: ClassroomApiResponse): ClassroomItem {
    const designationId = String(row.classroomDesignationId ?? row.classroom_designation_id ?? '');
    const designation = this.designationById.get(designationId);
    const levelId = String(row.academicLevelId ?? row.academic_level_id ?? '');
    const sectionId = String(row.academicSectionId ?? row.academic_section_id ?? '');
    const optionId = String(row.academicOptionId ?? row.academic_option_id ?? '');

    return {
      id: String(row.id ?? ''),
      displayName: this.resolveDisplayName(row, {
        levelName: this.levelNameById.get(levelId) ?? '',
        sectionName: sectionId ? this.sectionNameById.get(sectionId) ?? '' : '',
        optionName: optionId ? this.optionNameById.get(optionId) ?? '' : '',
        designationCode: designation?.code ?? '',
        designationName: designation?.name ?? ''
      }),
      designationId,
      designationCode: designation?.code ?? '--',
      designationName: designation?.name ?? 'Designation inconnue',
      levelId,
      levelName: this.levelNameById.get(levelId) ?? '--',
      sectionId,
      sectionName: sectionId ? this.sectionNameById.get(sectionId) ?? '--' : '—',
      optionId,
      optionName: optionId ? this.optionNameById.get(optionId) ?? '--' : '—',
      capacity: this.readNumber(row.capacity),
      description: (row.description ?? '').trim() || '—',
      status: this.resolveStatus(row.active),
      schoolId: String(row.schoolId ?? row.school_id ?? this.schoolId)
    };
  }

  private compareClassrooms(a: ClassroomItem, b: ClassroomItem): number {
    const byDisplayName = a.displayName.localeCompare(b.displayName, 'fr');
    if (byDisplayName !== 0) {
      return byDisplayName;
    }
    const byLevel = a.levelName.localeCompare(b.levelName, 'fr');
    if (byLevel !== 0) {
      return byLevel;
    }
    const byDesignation = a.designationCode.localeCompare(b.designationCode, 'fr');
    if (byDesignation !== 0) {
      return byDesignation;
    }
    return a.sectionName.localeCompare(b.sectionName, 'fr');
  }

  private buildEmptyForm(): ClassroomForm {
    return {
      classroomDesignationId: this.designationFormOptions[0]?.value ?? '',
      academicLevelId: this.levelFormOptions[0]?.value ?? '',
      academicSectionId: '',
      academicOptionId: '',
      capacity: '30',
      description: '',
      active: true
    };
  }

  private toFormFields(item: ClassroomItem): ClassroomForm {
    return {
      classroomDesignationId: item.designationId,
      academicLevelId: item.levelId,
      academicSectionId: item.sectionId,
      academicOptionId: item.optionId,
      capacity: String(item.capacity || 1),
      description: item.description === '—' ? '' : item.description,
      active: item.status === 'Active'
    };
  }

  private applyLevelFieldConstraints(): void {
    const { requiresSection, requiresOption } = this.selectedLevelRequirements;

    let sectionId = requiresSection ? this.form.academicSectionId : '';
    let optionId = requiresOption ? this.form.academicOptionId : '';

    if (requiresOption && requiresSection && !sectionId) {
      optionId = '';
    }

    if (
      requiresOption &&
      requiresSection &&
      optionId &&
      !this.sameId(this.optionSectionById.get(optionId), sectionId)
    ) {
      optionId = '';
    }

    this.form = {
      ...this.form,
      academicSectionId: sectionId,
      academicOptionId: optionId
    };
  }

  private readRequiresSection(row: AcademicLevelApiResponse): boolean {
    return this.readBoolean(
      row.requiresSection ??
        row.requires_section ??
        row.sectionRequired ??
        row.section_required
    );
  }

  private readRequiresOption(row: AcademicLevelApiResponse): boolean {
    return this.readBoolean(
      row.requiresOption ?? row.requires_option ?? row.optionRequired ?? row.option_required
    );
  }

  private readBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private resolveStatus(active: unknown): ClassStatus {
    if (active === false || active === 'false' || active === 0 || active === '0') {
      return 'Inactive';
    }
    return 'Active';
  }

  private readNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private resolveDisplayName(
    row: ClassroomApiResponse,
    parts: {
      levelName: string;
      sectionName: string;
      optionName: string;
      designationCode: string;
      designationName: string;
    }
  ): string {
    const fromApi = (row.displayName ?? row.display_name ?? '').trim();
    if (fromApi) {
      return fromApi;
    }

    return [
      parts.levelName,
      parts.sectionName,
      parts.optionName,
      parts.designationCode || parts.designationName
    ]
      .filter(Boolean)
      .join(' - ');
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private sameId(left: string | undefined | null, right: string | undefined | null): boolean {
    return this.normalize(String(left ?? '')) === this.normalize(String(right ?? ''));
  }
}
