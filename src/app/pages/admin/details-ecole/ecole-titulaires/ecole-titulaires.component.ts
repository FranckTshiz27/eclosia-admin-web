import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../../../core/utils/api-error';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../../services/academic-year.service';
import {
  ClassroomApiResponse,
  ClassroomService
} from '../../../../services/classroom.service';
import {
  CreateTeacherClassAssignmentDto,
  TeacherClassAssignmentResponseDto,
  TeacherClassAssignmentService,
  UpdateTeacherClassAssignmentDto
} from '../../../../services/teacher-class-assignment.service';
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

interface AssignmentItem {
  id: string;
  teacherId: string;
  teacherFullName: string;
  classroomId: string;
  classroomDisplayName: string;
  academicYearId: string;
  academicYearCode: string;
  academicYearName: string;
  active: boolean;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

interface AssignmentForm {
  teacherId: string;
  classroomId: string;
  remarks: string;
  active: boolean;
}

@Component({
  selector: 'app-ecole-titulaires',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  templateUrl: './ecole-titulaires.component.html',
  styleUrl: './ecole-titulaires.component.css'
})
export class EcoleTitulairesComponent implements OnChanges, OnDestroy {
  @Input() schoolId = '';
  @Input() schoolName = '';

  private bodyScrollLocked = false;

  selectedYearId = '';
  searchTerm = '';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoading = false;
  isLoadingLookups = false;
  loadError = '';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  replaceHint = '';

  yearOptions: SelectOption[] = [];
  teacherOptions: SelectOption[] = [];
  classroomOptions: SelectOption[] = [];
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
    private readonly assignmentService: TeacherClassAssignmentService,
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
          this.normalize(item.remarks).includes(term)
        );
      })
      .sort((a, b) => a.classroomDisplayName.localeCompare(b.classroomDisplayName, 'fr'));
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
    this.form = {
      teacherId: item.teacherId,
      classroomId: item.classroomId,
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
    this.form = this.emptyForm();
    this.unlockBodyScroll();
  }

  save(formRef: NgForm): void {
    this.isSubmitted = true;
    if (this.isSaving || !this.schoolId || !this.selectedYearId) {
      return;
    }
    if (!this.isEditMode && (!this.form.classroomId || !this.form.teacherId)) {
      formRef.control.markAllAsTouched();
      return;
    }
    if (this.isYearClosed) {
      this.saveError = 'Année scolaire clôturée';
      this.toastService.warning(this.saveError);
      return;
    }

    const remarks = this.form.remarks.trim() || null;
    if (remarks && remarks.length > 1000) {
      this.saveError = 'Les remarques ne peuvent pas dépasser 1000 caractères.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.replaceHint = '';

    if (this.isEditMode && this.editingId) {
      const dto: UpdateTeacherClassAssignmentDto = {
        remarks,
        active: this.form.active
      };
      this.assignmentService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.toastService.success('Affectation titulaire mise à jour.');
          this.closeModal();
          this.loadAssignments();
        },
        error: (err) => this.handleSaveError(err, 'Échec de la mise à jour.')
      });
      return;
    }

    const dto: CreateTeacherClassAssignmentDto = {
      teacherId: this.form.teacherId,
      schoolId: this.schoolId,
      academicYearId: this.selectedYearId,
      classroomId: this.form.classroomId,
      remarks
    };

    this.assignmentService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.toastService.success('Titulaire affecté.');
        this.closeModal();
        this.loadAssignments();
      },
      error: (err) => this.handleCreateConflict(err, dto)
    });
  }

  replaceAndCreate(): void {
    if (!this.form.classroomId || !this.selectedYearId || this.isSaving) {
      return;
    }
    this.isSaving = true;
    this.saveError = '';

    const remarks = this.form.remarks.trim() || null;
    const createDto: CreateTeacherClassAssignmentDto = {
      teacherId: this.form.teacherId,
      schoolId: this.schoolId,
      academicYearId: this.selectedYearId,
      classroomId: this.form.classroomId,
      remarks
    };

    this.assignmentService
      .getActiveByClassroom(this.form.classroomId, this.selectedYearId)
      .pipe(
        switchMap((current) => {
          const currentId = String(current.id ?? '');
          if (!currentId) {
            return this.assignmentService.create(createDto);
          }
          return this.assignmentService.deactivate(currentId).pipe(
            switchMap(() => this.assignmentService.create(createDto))
          );
        }),
        catchError((err) => {
          this.handleSaveError(err, 'Impossible de remplacer le titulaire.');
          return of(null);
        })
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.isSaving = false;
        this.toastService.success('Titulaire remplacé.');
        this.closeModal();
        this.loadAssignments();
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
    const message = item.active
      ? `Désactiver le titulaire « ${item.teacherFullName} » pour la classe « ${item.classroomDisplayName} » ?`
      : '';
    if (!confirm(message)) {
      return;
    }

    this.assignmentService.deactivate(item.id).subscribe({
      next: () => {
        this.toastService.success('Titulaire désactivé.');
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

    forkJoin({
      years: this.academicYearService.getAll({ schoolId: this.schoolId }).pipe(catchError(() => of([]))),
      teachers: this.teacherService.getAll({ schoolId: this.schoolId }).pipe(catchError(() => of([]))),
      classrooms: this.classroomService.getAll(this.schoolId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ years, teachers, classrooms }) => {
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
            active: classroom.active !== false
          }))
          .filter((classroom) => classroom.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        const preferred =
          this.yearOptions.find((year) => year.active)?.id ?? this.yearOptions[0]?.id ?? '';
        this.selectedYearId = preferred;
        this.loadAssignments();
      },
      error: (err) => {
        this.isLoadingLookups = false;
        this.loadError = extractApiErrorMessage(err, 'Impossible de charger les référentiels.');
      }
    });
  }

  private loadAssignments(): void {
    if (!this.schoolId || !this.selectedYearId) {
      this.assignments = [];
      return;
    }

    this.isLoading = true;
    this.loadError = '';
    this.assignmentService.listBySchoolAndYear(this.schoolId, this.selectedYearId).subscribe({
      next: (rows) => {
        this.isLoading = false;
        this.assignments = rows.map((row) => this.mapAssignment(row));
        this.currentPage = 1;
      },
      error: (err) => {
        this.isLoading = false;
        this.assignments = [];
        this.loadError = extractApiErrorMessage(
          err,
          'Impossible de charger les titulaires de classe.'
        );
        this.toastService.apiError(err, this.loadError);
      }
    });
  }

  private handleCreateConflict(err: unknown, dto: CreateTeacherClassAssignmentDto): void {
    const message = extractApiErrorMessage(err, 'Échec de l’affectation titulaire.');
    const lower = message.toLowerCase();
    if (
      lower.includes('already has an active titular') ||
      (lower.includes('titulaire') && lower.includes('actif'))
    ) {
      this.isSaving = false;
      this.saveError = message;
      this.replaceHint =
        'Cette classe a déjà un titulaire actif. Vous pouvez le remplacer (désactivation puis nouvelle affectation).';
      this.toastService.warning(message);
      return;
    }
    this.handleSaveError(err, message);
  }

  private handleSaveError(err: unknown, fallback: string): void {
    this.isSaving = false;
    this.saveError = extractApiErrorMessage(err, fallback);
    if (this.saveError.toLowerCase().includes('closed') || this.saveError.toLowerCase().includes('clôtur')) {
      this.saveError = 'Année scolaire clôturée';
    }
    this.toastService.error(this.saveError);
  }

  private mapAssignment(row: TeacherClassAssignmentResponseDto): AssignmentItem {
    return {
      id: String(row.id ?? ''),
      teacherId: String(row.teacherId ?? row.teacher_id ?? ''),
      teacherFullName: String(row.teacherFullName ?? row.teacher_full_name ?? '—'),
      classroomId: String(row.classroomId ?? row.classroom_id ?? ''),
      classroomDisplayName: String(
        row.classroomDisplayName ?? row.classroom_display_name ?? '—'
      ),
      academicYearId: String(row.academicYearId ?? row.academic_year_id ?? ''),
      academicYearCode: String(row.academicYearCode ?? row.academic_year_code ?? ''),
      academicYearName: String(row.academicYearName ?? row.academic_year_name ?? ''),
      active: row.active !== false,
      remarks: String(row.remarks ?? ''),
      createdAt: String(row.createdAt ?? row.created_at ?? ''),
      updatedAt: String(row.updatedAt ?? row.updated_at ?? '')
    };
  }

  private emptyForm(): AssignmentForm {
    return {
      teacherId: '',
      classroomId: '',
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
    this.yearOptions = [];
    this.teacherOptions = [];
    this.classroomOptions = [];
    this.assignments = [];
    this.loadError = '';
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
