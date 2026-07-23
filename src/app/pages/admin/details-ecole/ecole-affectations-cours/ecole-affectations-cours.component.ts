import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../../../core/utils/api-error';
import {
  AcademicCurriculumApiResponse,
  AcademicCurriculumService
} from '../../../../services/academic-curriculum.service';
import {
  AcademicCurriculumSubjectApiResponse,
  AcademicCurriculumSubjectService
} from '../../../../services/academic-curriculum-subject.service';
import {
  AcademicLevelApiResponse,
  AcademicLevelService
} from '../../../../services/academic-level.service';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../../services/academic-year.service';
import {
  ClassroomApiResponse,
  ClassroomService
} from '../../../../services/classroom.service';
import { SchoolService } from '../../../../services/school.service';
import { SubjectApiResponse, SubjectService } from '../../../../services/subject.service';
import {
  CreateTeacherCourseAssignmentDto,
  TeacherCourseAssignmentResponseDto,
  TeacherCourseAssignmentService,
  UpdateTeacherCourseAssignmentDto
} from '../../../../services/teacher-course-assignment.service';
import { TeacherApiResponse, TeacherService } from '../../../../services/teacher.service';
import { ToastService } from '../../../../services/toast.service';
import {
  SearchableSelectComponent,
  SearchableSelectOption
} from '../../../../shared/searchable-select/searchable-select.component';

interface SelectOption {
  id: string;
  label: string;
  active: boolean;
}

interface ClassroomOption extends SelectOption {
  academicLevelId: string;
  academicSectionId: string | null;
  academicOptionId: string | null;
}

interface SubjectOption extends SelectOption {
  coefficient: number | null;
}

interface AssignmentItem {
  id: string;
  teacherId: string;
  teacherFullName: string;
  classroomId: string;
  classroomDisplayName: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  weeklyHours: number | null;
  coefficient: number | null;
  active: boolean;
  remarks: string;
}

interface AssignmentForm {
  teacherId: string;
  classroomId: string;
  subjectId: string;
  subjectIds: string[];
  weeklyHours: string;
  coefficient: string;
  remarks: string;
  active: boolean;
}

@Component({
  selector: 'app-ecole-affectations-cours',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  templateUrl: './ecole-affectations-cours.component.html',
  styleUrl: './ecole-affectations-cours.component.css'
})
export class EcoleAffectationsCoursComponent implements OnChanges, OnDestroy {
  @Input() schoolId = '';
  @Input() schoolName = '';

  private bodyScrollLocked = false;
  private countryId = '';
  private subjectLabels = new Map<string, string>();
  private levelsById = new Map<string, AcademicLevelApiResponse>();

  selectedYearId = '';
  searchTerm = '';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoading = false;
  isLoadingLookups = false;
  isLoadingSubjects = false;
  loadError = '';
  subjectsError = '';
  subjectSearchTerm = '';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  replaceHint = '';
  existingConflictId: string | null = null;

  yearOptions: SelectOption[] = [];
  teacherOptions: SelectOption[] = [];
  classroomOptions: ClassroomOption[] = [];
  subjectOptions: SubjectOption[] = [];
  assignments: AssignmentItem[] = [];

  form: AssignmentForm = this.emptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'active', label: 'Actifs' },
    { value: 'inactive', label: 'Inactifs (historique)' }
  ];
  readonly pageSizeOptions = [10, 25, 50];

  constructor(
    private readonly academicYearService: AcademicYearService,
    private readonly classroomService: ClassroomService,
    private readonly teacherService: TeacherService,
    private readonly subjectService: SubjectService,
    private readonly schoolService: SchoolService,
    private readonly academicLevelService: AcademicLevelService,
    private readonly academicCurriculumService: AcademicCurriculumService,
    private readonly academicCurriculumSubjectService: AcademicCurriculumSubjectService,
    private readonly assignmentService: TeacherCourseAssignmentService,
    private readonly toastService: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schoolId']) {
      this.resetState();
      if (this.schoolId) {
        this.bootstrap();
      }
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  get selectedYear(): SelectOption | undefined {
    return this.yearOptions.find((year) => year.id === this.selectedYearId);
  }

  get isYearClosed(): boolean {
    return !!this.selectedYear && !this.selectedYear.active;
  }

  get yearSelectOptions(): SearchableSelectOption[] {
    return this.yearOptions.map((year) => ({
      id: year.id,
      label: year.active ? year.label : `${year.label} (clôturée)`
    }));
  }

  get statusSelectOptions(): SearchableSelectOption[] {
    return this.statusOptions.map((option) => ({
      id: option.value,
      label: option.label
    }));
  }

  get classroomSelectOptions(): SearchableSelectOption[] {
    return this.classroomOptions.map((item) => ({
      id: item.id,
      label: item.active ? item.label : `${item.label} (inactive)`,
      disabled: !item.active
    }));
  }

  get teacherSelectOptions(): SearchableSelectOption[] {
    return this.teacherOptions.map((item) => ({
      id: item.id,
      label: item.active ? item.label : `${item.label} (inactif)`,
      disabled: !item.active
    }));
  }

  get subjectSelectOptions(): SearchableSelectOption[] {
    return this.subjectOptions.map((item) => ({
      id: item.id,
      label: item.active ? item.label : `${item.label} (inactive)`,
      disabled: !item.active
    }));
  }

  get availableSubjectOptions(): SubjectOption[] {
    const assignedIds = this.getAssignedSubjectIdsForClassroom(this.form.classroomId);
    return this.subjectOptions.filter(
      (item) => !assignedIds.has(item.id.trim().toLowerCase())
    );
  }

  get filteredSubjectOptions(): SubjectOption[] {
    const available = this.availableSubjectOptions;
    const term = this.normalize(this.subjectSearchTerm);
    if (!term) {
      return available;
    }
    return available.filter((item) => this.normalize(item.label).includes(term));
  }

  get selectedSubjectsCount(): number {
    return this.form.subjectIds.length;
  }

  get pageSizeSelectOptions(): SearchableSelectOption[] {
    return this.pageSizeOptions.map((size) => ({
      id: String(size),
      label: String(size)
    }));
  }

  get pageSizeValue(): string {
    return String(this.pageSize);
  }

  set pageSizeValue(value: string) {
    const parsed = Number(value);
    this.pageSize = this.pageSizeOptions.includes(parsed) ? parsed : this.pageSizeOptions[0];
    this.onPageSizeChange();
  }

  get filteredAssignments(): AssignmentItem[] {
    const term = this.normalize(this.searchTerm);
    return this.assignments
      .filter((item) => {
        if (this.statusFilter === 'active' && !item.active) {
          return false;
        }
        if (this.statusFilter === 'inactive' && item.active) {
          return false;
        }
        if (!term) {
          return true;
        }
        return (
          this.normalize(item.classroomDisplayName).includes(term) ||
          this.normalize(item.teacherFullName).includes(term) ||
          this.normalize(item.subjectCode).includes(term) ||
          this.normalize(item.subjectName).includes(term) ||
          this.normalize(item.remarks).includes(term)
        );
      })
      .sort((a, b) => {
        const classCmp = a.classroomDisplayName.localeCompare(b.classroomDisplayName, 'fr');
        if (classCmp !== 0) {
          return classCmp;
        }
        return a.subjectCode.localeCompare(b.subjectCode, 'fr');
      });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAssignments.length / this.pageSize));
  }

  get paginatedAssignments(): AssignmentItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredAssignments.slice(start, start + this.pageSize);
  }

  get rangeStart(): number {
    return this.filteredAssignments.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredAssignments.length);
  }

  onYearChange(): void {
    this.currentPage = 1;
    this.loadAssignments();
    if (this.isModalOpen && !this.isEditMode && this.form.classroomId) {
      this.loadSubjectsForClassroom(this.form.classroomId);
    }
  }

  onClassroomChange(classroomId: string): void {
    this.form.classroomId = classroomId;
    this.form.subjectId = '';
    this.form.subjectIds = [];
    this.form.coefficient = '';
    this.subjectSearchTerm = '';
    this.subjectsError = '';
    this.subjectOptions = [];
    if (classroomId) {
      this.loadSubjectsForClassroom(classroomId);
    }
  }

  onSubjectChange(subjectId: string): void {
    this.form.subjectId = subjectId;
    const selected = this.subjectOptions.find((item) => item.id === subjectId);
    if (selected?.coefficient != null && !this.form.coefficient.trim()) {
      this.form.coefficient = String(selected.coefficient);
    }
  }

  isSubjectSelected(id: string): boolean {
    return this.form.subjectIds.some((item) => this.sameId(item, id));
  }

  toggleSubject(id: string): void {
    if (this.isSubjectSelected(id)) {
      this.form.subjectIds = this.form.subjectIds.filter((item) => !this.sameId(item, id));
      return;
    }
    this.form.subjectIds = [...this.form.subjectIds, id];
  }

  selectAllSubjects(): void {
    const selected = new Set(this.form.subjectIds.map((id) => id.toLowerCase()));
    for (const subject of this.filteredSubjectOptions) {
      if (!subject.active || selected.has(subject.id.toLowerCase())) {
        continue;
      }
      this.form.subjectIds = [...this.form.subjectIds, subject.id];
    }
  }

  clearSelectedSubjects(): void {
    this.form.subjectIds = [];
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
  }

  labelOf(id: string, options: SelectOption[]): string {
    return options.find((option) => option.id === id)?.label || id || '—';
  }

  subjectLabel(item: AssignmentItem): string {
    const code = item.subjectCode?.trim();
    const name = item.subjectName?.trim();
    if (code && name) {
      return `${code} — ${name}`;
    }
    return code || name || '—';
  }

  openCreateModal(): void {
    if (!this.schoolId || !this.selectedYearId) {
      return;
    }
    if (this.isYearClosed) {
      this.toastService.warning('Année scolaire clôturée');
      return;
    }
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.isSaving = false;
    this.saveError = '';
    this.replaceHint = '';
    this.existingConflictId = null;
    this.subjectsError = '';
    this.subjectOptions = [];
    this.subjectSearchTerm = '';
    this.form = this.emptyForm();
    this.isModalOpen = true;
    this.lockBodyScroll();
  }

  openEditModal(item: AssignmentItem): void {
    if (this.isYearClosed) {
      this.toastService.warning('Année scolaire clôturée');
      return;
    }
    this.isEditMode = true;
    this.editingId = item.id;
    this.isSubmitted = false;
    this.isSaving = false;
    this.saveError = '';
    this.replaceHint = '';
    this.existingConflictId = null;
    this.form = {
      teacherId: item.teacherId,
      classroomId: item.classroomId,
      subjectId: item.subjectId,
      subjectIds: [item.subjectId],
      weeklyHours: item.weeklyHours == null ? '' : String(item.weeklyHours),
      coefficient: item.coefficient == null ? '' : String(item.coefficient),
      remarks: item.remarks,
      active: item.active
    };
    this.isModalOpen = true;
    this.lockBodyScroll();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.isSaving = false;
    this.saveError = '';
    this.replaceHint = '';
    this.existingConflictId = null;
    this.subjectsError = '';
    this.subjectOptions = [];
    this.subjectSearchTerm = '';
    this.form = this.emptyForm();
    this.unlockBodyScroll();
  }

  save(): void {
    this.isSubmitted = true;
    if (this.isSaving || !this.schoolId || !this.selectedYearId) {
      if (!this.selectedYearId) {
        this.saveError = 'Sélectionnez une année scolaire.';
        this.toastService.warning(this.saveError);
      }
      return;
    }
    if (!this.isEditMode) {
      if (!this.form.classroomId) {
        this.saveError = 'La classe est obligatoire.';
        this.toastService.warning(this.saveError);
        return;
      }
      if (!this.form.teacherId) {
        this.saveError = 'L’enseignant est obligatoire.';
        this.toastService.warning(this.saveError);
        return;
      }
      if (this.form.subjectIds.length === 0) {
        this.saveError = 'Sélectionnez au moins une branche.';
        this.toastService.warning(this.saveError);
        return;
      }
    }
    if (this.isYearClosed) {
      this.saveError = 'Année scolaire clôturée';
      this.toastService.warning(this.saveError);
      return;
    }

    const weeklyHours = this.parseOptionalNumber(this.form.weeklyHours, 'Heures / semaine');
    if (weeklyHours === false) {
      return;
    }
    const coefficient = this.parseOptionalNumber(this.form.coefficient, 'Coefficient');
    if (coefficient === false) {
      return;
    }

    const remarks = this.form.remarks.trim() || null;
    if (remarks && remarks.length > 1000) {
      this.saveError = 'Les remarques ne peuvent pas dépasser 1000 caractères.';
      this.toastService.warning(this.saveError);
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.replaceHint = '';
    this.existingConflictId = null;

    if (this.isEditMode && this.editingId) {
      const dto: UpdateTeacherCourseAssignmentDto = {
        weeklyHours,
        coefficient,
        remarks,
        active: this.form.active
      };
      this.assignmentService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.toastService.success('Affectation de cours mise à jour.');
          this.closeModal();
          this.loadAssignments();
        },
        error: (err) => this.handleSaveError(err, 'Échec de la mise à jour.')
      });
      return;
    }

    const payload: CreateTeacherCourseAssignmentDto[] = this.form.subjectIds.map((subjectId) => {
      const subject = this.subjectOptions.find((item) => this.sameId(item.id, subjectId));
      const subjectCoefficient =
        coefficient != null
          ? coefficient
          : subject?.coefficient != null
            ? subject.coefficient
            : null;
      return {
        teacherId: this.form.teacherId,
        schoolId: this.schoolId,
        academicYearId: this.selectedYearId,
        classroomId: this.form.classroomId,
        subjectId,
        weeklyHours,
        coefficient: subjectCoefficient,
        remarks
      };
    });

    if (!payload.length) {
      this.isSaving = false;
      this.saveError = 'Sélectionnez au moins une branche.';
      this.toastService.warning(this.saveError);
      return;
    }

    this.assignmentService.createAll(payload).subscribe({
      next: (created) => {
        this.isSaving = false;
        const count = created.length || payload.length;
        this.toastService.success(
          count === 1 ? 'Cours affecté.' : `${count} branches affectées.`
        );
        this.closeModal();
        this.loadAssignments();
      },
      error: (err) => this.handleCreateConflict(err)
    });
  }

  replaceAndCreate(): void {
    if (this.isSaving || !this.selectedYearId) {
      return;
    }

    const weeklyHours = this.parseOptionalNumber(this.form.weeklyHours, 'Heures / semaine');
    if (weeklyHours === false) {
      return;
    }
    const coefficient = this.parseOptionalNumber(this.form.coefficient, 'Coefficient');
    if (coefficient === false) {
      return;
    }

    const subjectId = this.form.subjectIds[0] || this.form.subjectId;
    if (!subjectId) {
      this.saveError = 'Sélectionnez au moins une branche.';
      return;
    }

    const createDto: CreateTeacherCourseAssignmentDto = {
      teacherId: this.form.teacherId,
      schoolId: this.schoolId,
      academicYearId: this.selectedYearId,
      classroomId: this.form.classroomId,
      subjectId,
      weeklyHours,
      coefficient,
      remarks: this.form.remarks.trim() || null
    };

    this.isSaving = true;
    this.saveError = '';

    const existingFromList = this.assignments.find(
      (item) =>
        item.active &&
        item.teacherId === this.form.teacherId &&
        item.classroomId === this.form.classroomId &&
        item.subjectId === subjectId
    );
    const existingId = this.existingConflictId || existingFromList?.id || '';

    const createAfterDeactivate = (): void => {
      this.assignmentService.createAll([createDto]).subscribe({
        next: () => {
          this.isSaving = false;
          this.toastService.success('Affectation remplacée.');
          this.closeModal();
          this.loadAssignments();
        },
        error: (err) => this.handleSaveError(err, 'Impossible de créer la nouvelle affectation.')
      });
    };

    if (!existingId) {
      createAfterDeactivate();
      return;
    }

    this.assignmentService.deactivate(existingId).subscribe({
      next: () => createAfterDeactivate(),
      error: (err) => this.handleSaveError(err, 'Impossible de désactiver l’affectation existante.')
    });
  }

  deactivate(item: AssignmentItem): void {
    if (this.isYearClosed) {
      this.toastService.warning('Année scolaire clôturée');
      return;
    }
    if (!item.active) {
      return;
    }
    if (
      !confirm(
        `Désactiver l’affectation « ${this.subjectLabel(item)} » (${item.classroomDisplayName}) pour ${item.teacherFullName} ?`
      )
    ) {
      return;
    }

    this.assignmentService.deactivate(item.id).subscribe({
      next: () => {
        this.toastService.success('Affectation désactivée.');
        this.loadAssignments();
      },
      error: (err) => {
        this.toastService.apiError(err, 'Impossible de désactiver cette affectation.');
      }
    });
  }

  private bootstrap(): void {
    this.isLoadingLookups = true;
    this.loadError = '';

    this.schoolService
      .getById(this.schoolId)
      .pipe(
        catchError(() => of(null)),
        switchMap((school) => {
          this.countryId = String(school?.countryId ?? school?.country_id ?? '').trim();
          return forkJoin({
            years: this.academicYearService
              .getAll({ schoolId: this.schoolId })
              .pipe(catchError(() => of([]))),
            teachers: this.teacherService
              .getAll({ schoolId: this.schoolId })
              .pipe(catchError(() => of([]))),
            classrooms: this.classroomService
              .getAll(this.schoolId)
              .pipe(catchError(() => of([]))),
            subjects: this.subjectService
              .getAll(this.countryId ? { countryId: this.countryId } : undefined)
              .pipe(catchError(() => of([]))),
            levels: this.academicLevelService.getAll().pipe(catchError(() => of([])))
          });
        })
      )
      .subscribe({
        next: ({ years, teachers, classrooms, subjects, levels }) => {
          this.isLoadingLookups = false;
          this.yearOptions = (years as AcademicYearApiResponse[])
            .map((year) => ({
              id: String(year.id ?? ''),
              label: AcademicYearService.buildLabel(year),
              active: year.active !== false
            }))
            .filter((year) => year.id)
            .sort((a, b) => b.label.localeCompare(a.label, 'fr'));

          this.teacherOptions = (teachers as TeacherApiResponse[])
            .map((teacher) => {
              const first = String(teacher.firstName ?? teacher.first_name ?? '').trim();
              const middle = String(teacher.middleName ?? teacher.middle_name ?? '').trim();
              const last = String(teacher.lastName ?? teacher.last_name ?? '').trim();
              const fullName = [first, middle, last].filter(Boolean).join(' ');
              return {
                id: String(teacher.id ?? ''),
                label: fullName || String(teacher.email ?? teacher.username ?? 'Enseignant'),
                active: teacher.active !== false
              };
            })
            .filter((teacher) => teacher.id)
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

          this.classroomOptions = (classrooms as ClassroomApiResponse[])
            .map((classroom) => ({
              id: String(classroom.id ?? ''),
              label:
                String(classroom.displayName ?? classroom.display_name ?? '').trim() || 'Classe',
              active: classroom.active !== false,
              academicLevelId: String(
                classroom.academicLevelId ?? classroom.academic_level_id ?? ''
              ),
              academicSectionId: this.readOptionalId(
                classroom.academicSectionId ?? classroom.academic_section_id
              ),
              academicOptionId: this.readOptionalId(
                classroom.academicOptionId ?? classroom.academic_option_id
              )
            }))
            .filter((classroom) => classroom.id)
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

          this.levelsById.clear();
          for (const level of levels as AcademicLevelApiResponse[]) {
            const id = String(level.id ?? '');
            if (id) {
              this.levelsById.set(id, level);
            }
          }

          this.subjectLabels.clear();
          for (const subject of subjects as SubjectApiResponse[]) {
            const id = String(subject.id ?? '');
            if (!id) {
              continue;
            }
            const code = String(subject.code ?? '').trim();
            const name = String(subject.name ?? '').trim();
            this.subjectLabels.set(
              id,
              code && name ? `${code} — ${name}` : code || name || 'Matière'
            );
          }

          this.subjectOptions = [];
          this.selectedYearId =
            this.yearOptions.find((year) => year.active)?.id ?? this.yearOptions[0]?.id ?? '';
          this.loadAssignments();
        },
        error: (err) => {
          this.isLoadingLookups = false;
          this.loadError = extractApiErrorMessage(err, 'Impossible de charger les référentiels.');
        }
      });
  }

  private loadSubjectsForClassroom(classroomId: string): void {
    if (!classroomId || !this.selectedYearId) {
      this.subjectOptions = [];
      this.subjectsError = !this.selectedYearId
        ? 'Sélectionnez d’abord une année scolaire.'
        : '';
      return;
    }

    const classroom = this.classroomOptions.find((item) => item.id === classroomId);
    if (!classroom?.academicLevelId) {
      this.subjectOptions = [];
      this.subjectsError = 'Impossible de déterminer le niveau de cette classe.';
      return;
    }

    const level = this.levelsById.get(classroom.academicLevelId);
    const cycleId = String(
      level?.academicCycleId ?? level?.academic_cycle_id ?? level?.academicCycle?.id ?? ''
    );

    this.isLoadingSubjects = true;
    this.subjectsError = '';
    this.subjectOptions = [];

    this.academicCurriculumService
      .getAll({
        academicYearId: this.selectedYearId,
        academicLevelId: classroom.academicLevelId,
        academicCycleId: cycleId || undefined
      })
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (curricula) => {
          const matched = this.pickCurriculum(
            curricula as AcademicCurriculumApiResponse[],
            classroom
          );
          if (!matched?.id) {
            this.isLoadingSubjects = false;
            this.subjectOptions = [];
            this.subjectsError =
              'Aucune branche trouvée : programme pédagogique introuvable pour cette classe et année.';
            return;
          }

          this.academicCurriculumSubjectService
            .getAll({ academicCurriculumId: String(matched.id) })
            .subscribe({
              next: (rows) => {
                this.isLoadingSubjects = false;
                this.subjectOptions = (rows as AcademicCurriculumSubjectApiResponse[])
                  .filter((row) => row.active !== false)
                  .map((row) => {
                    const subjectId = String(row.subjectId ?? row.subject_id ?? '');
                    const coefficientRaw = row.coefficient;
                    const coefficient =
                      coefficientRaw == null || coefficientRaw === ''
                        ? null
                        : Number(coefficientRaw);
                    return {
                      id: subjectId,
                      label: this.subjectLabels.get(subjectId) || subjectId || 'Branche',
                      active: true,
                      coefficient: Number.isFinite(coefficient as number)
                        ? (coefficient as number)
                        : null
                    };
                  })
                  .filter((item) => item.id)
                  .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

                this.pruneSelectedSubjects();

                if (!this.subjectOptions.length) {
                  this.subjectsError =
                    'Aucune branche active dans le programme pédagogique de cette classe.';
                } else if (!this.availableSubjectOptions.length) {
                  this.subjectsError =
                    'Toutes les branches de cette classe sont déjà affectées pour cette année.';
                }
              },
              error: (err) => {
                this.isLoadingSubjects = false;
                this.subjectOptions = [];
                this.subjectsError = extractApiErrorMessage(
                  err,
                  'Impossible de charger les branches de cette classe.'
                );
              }
            });
        },
        error: (err) => {
          this.isLoadingSubjects = false;
          this.subjectOptions = [];
          this.subjectsError = extractApiErrorMessage(
            err,
            'Impossible de charger le programme pédagogique.'
          );
        }
      });
  }

  private getAssignedSubjectIdsForClassroom(classroomId: string): Set<string> {
    if (!classroomId) {
      return new Set();
    }
    return new Set(
      this.assignments
        .filter((item) => item.active && this.sameId(item.classroomId, classroomId))
        .map((item) => item.subjectId.trim().toLowerCase())
        .filter(Boolean)
    );
  }

  private pruneSelectedSubjects(): void {
    const availableIds = new Set(
      this.availableSubjectOptions.map((item) => item.id.trim().toLowerCase())
    );
    this.form.subjectIds = this.form.subjectIds.filter((id) =>
      availableIds.has(id.trim().toLowerCase())
    );
  }

  private pickCurriculum(
    curricula: AcademicCurriculumApiResponse[],
    classroom: ClassroomOption
  ): AcademicCurriculumApiResponse | null {
    const active = curricula.filter((row) => row.active !== false);
    const pool = active.length ? active : curricula;

    const exact = pool.find((row) => {
      const levelId = String(row.academicLevelId ?? row.academic_level_id ?? '');
      const sectionId = this.readOptionalId(row.academicSectionId ?? row.academic_section_id);
      const optionId = this.readOptionalId(row.academicOptionId ?? row.academic_option_id);
      return (
        this.sameId(levelId, classroom.academicLevelId) &&
        this.sameOptionalId(sectionId, classroom.academicSectionId) &&
        this.sameOptionalId(optionId, classroom.academicOptionId)
      );
    });
    if (exact) {
      return exact;
    }

    return (
      pool.find((row) =>
        this.sameId(
          String(row.academicLevelId ?? row.academic_level_id ?? ''),
          classroom.academicLevelId
        )
      ) ?? null
    );
  }

  private readOptionalId(value: unknown): string | null {
    const id = String(value ?? '').trim();
    return id ? id : null;
  }

  private sameId(left: string, right: string): boolean {
    return left.trim().toLowerCase() === right.trim().toLowerCase();
  }

  private sameOptionalId(left: string | null, right: string | null): boolean {
    if (!left && !right) {
      return true;
    }
    if (!left || !right) {
      return false;
    }
    return this.sameId(left, right);
  }

  private loadAssignments(): void {
    if (!this.schoolId || !this.selectedYearId) {
      this.assignments = [];
      return;
    }

    this.isLoading = true;
    this.loadError = '';
    this.assignmentService.listByYear(this.selectedYearId, this.schoolId).subscribe({
      next: (rows) => {
        this.isLoading = false;
        this.assignments = rows.map((row) => this.mapAssignment(row));
        this.currentPage = 1;
        if (this.isModalOpen && !this.isEditMode) {
          this.pruneSelectedSubjects();
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.assignments = [];
        this.loadError = extractApiErrorMessage(
          err,
          'Impossible de charger les affectations de cours.'
        );
        this.toastService.apiError(err, this.loadError);
      }
    });
  }

  private handleCreateConflict(messageOrError: unknown): void {
    const message =
      typeof messageOrError === 'string'
        ? messageOrError
        : extractApiErrorMessage(messageOrError, 'Échec de l’affectation de cours.');
    const lower = message.toLowerCase();
    this.isSaving = false;
    if (
      lower.includes('already exists') ||
      (lower.includes('affectation') && lower.includes('existe'))
    ) {
      this.saveError = message;
      this.replaceHint =
        this.form.subjectIds.length <= 1
          ? 'Une affectation active existe déjà pour ce triplet enseignant / classe / matière. Vous pouvez la remplacer.'
          : 'Certaines branches ont déjà une affectation active. Désactivez-les puis réessayez, ou sélectionnez uniquement les branches manquantes.';
      const subjectId = this.form.subjectIds[0] || this.form.subjectId;
      const existing = this.assignments.find(
        (item) =>
          item.active &&
          item.teacherId === this.form.teacherId &&
          item.classroomId === this.form.classroomId &&
          item.subjectId === subjectId
      );
      this.existingConflictId = existing?.id ?? null;
      this.toastService.warning(message);
      return;
    }
    this.saveError = message;
    this.toastService.error(this.saveError);
  }

  private handleSaveError(err: unknown, fallback: string): void {
    this.isSaving = false;
    this.saveError = extractApiErrorMessage(err, fallback);
    if (
      this.saveError.toLowerCase().includes('closed') ||
      this.saveError.toLowerCase().includes('clôtur')
    ) {
      this.saveError = 'Année scolaire clôturée';
    }
    this.toastService.error(this.saveError);
  }

  private parseOptionalNumber(raw: string, label: string): number | null | false {
    const value = raw.trim();
    if (!value) {
      return null;
    }
    const parsed = Number(value.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed < 0) {
      this.saveError = `${label} doit être un nombre ≥ 0.`;
      this.isSaving = false;
      return false;
    }
    return parsed;
  }

  private mapAssignment(row: TeacherCourseAssignmentResponseDto): AssignmentItem {
    return {
      id: String(row.id ?? ''),
      teacherId: String(row.teacherId ?? row.teacher_id ?? ''),
      teacherFullName: String(row.teacherFullName ?? row.teacher_full_name ?? '—'),
      classroomId: String(row.classroomId ?? row.classroom_id ?? ''),
      classroomDisplayName: String(
        row.classroomDisplayName ?? row.classroom_display_name ?? '—'
      ),
      subjectId: String(row.subjectId ?? row.subject_id ?? ''),
      subjectCode: String(row.subjectCode ?? row.subject_code ?? ''),
      subjectName: String(row.subjectName ?? row.subject_name ?? ''),
      weeklyHours:
        row.weeklyHours ?? row.weekly_hours ?? null,
      coefficient: row.coefficient ?? null,
      active: row.active !== false,
      remarks: String(row.remarks ?? '')
    };
  }

  private emptyForm(): AssignmentForm {
    return {
      teacherId: '',
      classroomId: '',
      subjectId: '',
      subjectIds: [],
      weeklyHours: '',
      coefficient: '',
      remarks: '',
      active: true
    };
  }

  private resetState(): void {
    this.closeModal();
    this.selectedYearId = '';
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.currentPage = 1;
    this.countryId = '';
    this.yearOptions = [];
    this.teacherOptions = [];
    this.classroomOptions = [];
    this.subjectOptions = [];
    this.assignments = [];
    this.loadError = '';
    this.subjectsError = '';
    this.subjectLabels.clear();
    this.levelsById.clear();
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private lockBodyScroll(): void {
    if (this.bodyScrollLocked || typeof document === 'undefined') {
      return;
    }
    document.body.style.overflow = 'hidden';
    this.bodyScrollLocked = true;
  }

  private unlockBodyScroll(): void {
    if (!this.bodyScrollLocked || typeof document === 'undefined') {
      return;
    }
    document.body.style.overflow = '';
    this.bodyScrollLocked = false;
  }
}
