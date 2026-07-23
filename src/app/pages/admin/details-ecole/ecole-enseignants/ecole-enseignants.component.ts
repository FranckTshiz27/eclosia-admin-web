import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../../../core/utils/api-error';
import { compressImageFile } from '../../../../core/utils/image-compression';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../../services/academic-year.service';
import { RoleApiResponse, RoleService } from '../../../../services/role.service';
import {
  TeacherClassAssignmentService
} from '../../../../services/teacher-class-assignment.service';
import {
  TeacherCourseAssignmentService
} from '../../../../services/teacher-course-assignment.service';
import {
  CreateTeacherDto,
  Gender,
  TeacherApiResponse,
  TeacherService,
  UpdateTeacherDto
} from '../../../../services/teacher.service';

type StatusLabel = 'Actif' | 'Inactif';

interface SelectOption {
  id: string;
  label: string;
  code: string;
}

interface TeacherItem {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName: string;
  gender: Gender;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  username: string;
  schoolId: string;
  schoolName: string;
  registrationNumber: string;
  hiringDate: string;
  leavingDate: string;
  qualification: string;
  specialty: string;
  grade: string;
  signature: string;
  titular: boolean;
  active: boolean;
  status: StatusLabel;
  remarks: string;
  roleIds: string[];
  roleLabels: string;
}

interface TeacherForm {
  firstName: string;
  lastName: string;
  middleName: string;
  gender: Gender | '';
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  username: string;
  password: string;
  roleIds: string[];
  registrationNumber: string;
  hiringDate: string;
  leavingDate: string;
  qualification: string;
  specialty: string;
  grade: string;
  signature: string;
  titular: boolean;
  active: boolean;
  remarks: string;
}

interface CredentialsModal {
  username: string;
  temporaryPassword: string;
}

interface YearOption {
  id: string;
  label: string;
}

interface TeacherClassAssignmentView {
  classroomDisplayName: string;
  academicYearLabel: string;
  active: boolean;
  remarks: string;
}

interface TeacherCourseAssignmentView {
  classroomDisplayName: string;
  subjectLabel: string;
  weeklyHours: number | null;
  coefficient: number | null;
  active: boolean;
}

@Component({
  selector: 'app-ecole-enseignants',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-enseignants.component.html',
  styleUrl: './ecole-enseignants.component.css'
})
export class EcoleEnseignantsComponent implements OnChanges, OnDestroy {
  @Input() schoolId = '';
  @Input() schoolName = '';

  private bodyScrollLocked = false;

  searchTerm = '';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoading = false;
  isLoadingRoles = false;
  loadError = '';
  rolesError = '';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  roleSearchTerm = '';

  isCredentialsModalOpen = false;
  credentials: CredentialsModal | null = null;
  credentialsCopied = false;
  isCompressingSignature = false;
  signatureError = '';

  isAssignmentsModalOpen = false;
  assignmentsTeacherId = '';
  assignmentsTeacherName = '';
  assignmentsTab: 'classes' | 'cours' = 'classes';
  assignmentsYearId = '';
  assignmentYearOptions: YearOption[] = [];
  isLoadingAssignmentYears = false;
  isLoadingAssignments = false;
  assignmentsError = '';
  teacherClassAssignments: TeacherClassAssignmentView[] = [];
  teacherCourseAssignments: TeacherCourseAssignmentView[] = [];

  roles: SelectOption[] = [];
  teachers: TeacherItem[] = [];
  form: TeacherForm = this.buildEmptyForm();

  readonly genderOptions: { value: Gender; label: string }[] = [
    { value: 'MALE', label: 'Masculin' },
    { value: 'FEMALE', label: 'Féminin' },
    { value: 'OTHER', label: 'Autre' }
  ];
  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];
  readonly pageSizeOptions = [10, 25, 50];

  constructor(
    private readonly teacherService: TeacherService,
    private readonly roleService: RoleService,
    private readonly academicYearService: AcademicYearService,
    private readonly teacherClassAssignmentService: TeacherClassAssignmentService,
    private readonly teacherCourseAssignmentService: TeacherCourseAssignmentService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schoolId']) {
      this.currentPage = 1;
      this.closeModal();
      this.closeCredentialsModal();
      this.closeAssignmentsModal();
      this.loadRoles();
      this.loadTeachers(true);
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  get filteredRoleOptions(): SelectOption[] {
    const term = this.normalize(this.roleSearchTerm);
    if (!term) {
      return this.roles;
    }
    return this.roles.filter(
      (role) =>
        this.normalize(role.label).includes(term) || this.normalize(role.code).includes(term)
    );
  }

  get filteredTeachers(): TeacherItem[] {
    const term = this.normalize(this.searchTerm);
    return this.teachers
      .filter((item) => {
        const matchesSearch =
          !term ||
          this.normalize(item.fullName).includes(term) ||
          this.normalize(item.registrationNumber).includes(term) ||
          this.normalize(item.phone).includes(term) ||
          this.normalize(item.email).includes(term) ||
          this.normalize(item.roleLabels).includes(term) ||
          this.normalize(item.username).includes(term) ||
          this.normalize(item.qualification).includes(term) ||
          this.normalize(item.specialty).includes(term);

        const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
  }

  get paginatedTeachers(): TeacherItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTeachers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTeachers.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredTeachers.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredTeachers.length);
  }

  get remarksLength(): number {
    return this.form.remarks.length;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.currentPage = 1;
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

  openCreateModal(): void {
    if (!this.schoolId) {
      return;
    }
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.roleSearchTerm = '';
    this.signatureError = '';
    this.form = this.buildEmptyForm();
    this.lockBodyScroll();
  }

  openEditModal(item: TeacherItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.roleSearchTerm = '';
    this.signatureError = '';
    this.form = this.toFormFields(item);
    this.lockBodyScroll();

    this.teacherService.getById(item.id).subscribe({
      next: (row) => {
        this.form = this.toFormFields(this.mapApiToItem(row));
      },
      error: (error) => {
        this.saveError = extractApiErrorMessage(
          error,
          'Impossible de charger le détail de l’enseignant.'
        );
      }
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.roleSearchTerm = '';
    this.signatureError = '';
    this.form = this.buildEmptyForm();
    if (!this.isCredentialsModalOpen) {
      this.unlockBodyScroll();
    }
  }

  closeCredentialsModal(): void {
    this.isCredentialsModalOpen = false;
    this.credentials = null;
    this.credentialsCopied = false;
    this.unlockBodyScroll();
  }

  get activeWeeklyHoursTotal(): number {
    return this.teacherCourseAssignments
      .filter((item) => item.active)
      .reduce((sum, item) => sum + (item.weeklyHours ?? 0), 0);
  }

  openAssignmentsModal(item: TeacherItem): void {
    this.assignmentsTeacherId = item.id;
    this.assignmentsTeacherName = item.fullName;
    this.assignmentsTab = 'classes';
    this.assignmentsYearId = '';
    this.assignmentsError = '';
    this.teacherClassAssignments = [];
    this.teacherCourseAssignments = [];
    this.isAssignmentsModalOpen = true;
    this.lockBodyScroll();
    this.loadAssignmentYearsThenAssignments();
  }

  closeAssignmentsModal(): void {
    this.isAssignmentsModalOpen = false;
    this.assignmentsTeacherId = '';
    this.assignmentsTeacherName = '';
    this.assignmentsYearId = '';
    this.assignmentsError = '';
    this.teacherClassAssignments = [];
    this.teacherCourseAssignments = [];
    if (!this.isModalOpen && !this.isCredentialsModalOpen) {
      this.unlockBodyScroll();
    }
  }

  onAssignmentsYearChange(): void {
    this.loadTeacherAssignments();
  }

  private loadAssignmentYearsThenAssignments(): void {
    if (!this.schoolId) {
      this.loadTeacherAssignments();
      return;
    }
    this.isLoadingAssignmentYears = true;
    this.academicYearService
      .getAll({ schoolId: this.schoolId })
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (years) => {
          this.isLoadingAssignmentYears = false;
          this.assignmentYearOptions = (years as AcademicYearApiResponse[])
            .map((year) => ({
              id: String(year.id ?? ''),
              label: AcademicYearService.buildLabel(year)
            }))
            .filter((year) => year.id);
          const preferred = (years as AcademicYearApiResponse[]).find((year) => year.active !== false);
          this.assignmentsYearId = preferred ? String(preferred.id ?? '') : '';
          this.loadTeacherAssignments();
        },
        error: () => {
          this.isLoadingAssignmentYears = false;
          this.loadTeacherAssignments();
        }
      });
  }

  private loadTeacherAssignments(): void {
    if (!this.assignmentsTeacherId) {
      return;
    }
    this.isLoadingAssignments = true;
    this.assignmentsError = '';
    const yearId = this.assignmentsYearId || undefined;

    forkJoin({
      classes: this.teacherClassAssignmentService
        .listByTeacher(this.assignmentsTeacherId, yearId)
        .pipe(catchError(() => of([]))),
      courses: this.teacherCourseAssignmentService
        .listByTeacher(this.assignmentsTeacherId, yearId)
        .pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ classes, courses }) => {
        this.isLoadingAssignments = false;
        this.teacherClassAssignments = classes.map((row) => ({
          classroomDisplayName: String(
            row.classroomDisplayName ?? row.classroom_display_name ?? '—'
          ),
          academicYearLabel:
            [row.academicYearCode ?? row.academic_year_code, row.academicYearName ?? row.academic_year_name]
              .filter(Boolean)
              .join(' — ') || '—',
          active: row.active !== false,
          remarks: String(row.remarks ?? '')
        }));
        this.teacherCourseAssignments = courses.map((row) => {
          const code = String(row.subjectCode ?? row.subject_code ?? '').trim();
          const name = String(row.subjectName ?? row.subject_name ?? '').trim();
          return {
            classroomDisplayName: String(
              row.classroomDisplayName ?? row.classroom_display_name ?? '—'
            ),
            subjectLabel: code && name ? `${code} — ${name}` : code || name || '—',
            weeklyHours: row.weeklyHours ?? row.weekly_hours ?? null,
            coefficient: row.coefficient ?? null,
            active: row.active !== false
          };
        });
      },
      error: (error) => {
        this.isLoadingAssignments = false;
        this.assignmentsError = extractApiErrorMessage(
          error,
          'Impossible de charger les affectations.'
        );
      }
    });
  }

  async copyCredentials(): Promise<void> {
    if (!this.credentials) {
      return;
    }
    const text = `Identifiant : ${this.credentials.username}\nMot de passe temporaire : ${this.credentials.temporaryPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      this.credentialsCopied = true;
    } catch {
      this.credentialsCopied = false;
    }
  }

  isRoleSelected(id: string): boolean {
    return this.form.roleIds.some((item) => this.sameId(item, id));
  }

  toggleRole(id: string): void {
    if (this.isRoleSelected(id)) {
      this.form.roleIds = this.form.roleIds.filter((item) => !this.sameId(item, id));
      return;
    }
    this.form.roleIds = [...this.form.roleIds, id];
  }

  selectAllRoles(): void {
    const selected = new Set(this.form.roleIds.map((id) => id.toLowerCase()));
    for (const role of this.filteredRoleOptions) {
      selected.add(role.id.toLowerCase());
    }
    this.form.roleIds = this.roles
      .filter((role) => selected.has(role.id.toLowerCase()))
      .map((role) => role.id);
  }

  clearRoles(): void {
    const visible = new Set(this.filteredRoleOptions.map((role) => role.id.toLowerCase()));
    this.form.roleIds = this.form.roleIds.filter((id) => !visible.has(id.toLowerCase()));
  }

  toggleTitular(): void {
    this.form.titular = !this.form.titular;
  }

  toggleActive(): void {
    this.form.active = !this.form.active;
  }

  onSignatureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.signatureError = 'La signature doit être une image (PNG, JPG…).';
      return;
    }

    this.signatureError = '';
    this.isCompressingSignature = true;
    void compressImageFile(file, { maxWidth: 800, maxHeight: 400, quality: 0.85 })
      .then((result) => {
        this.form.signature = result.dataUrl;
        this.isCompressingSignature = false;
      })
      .catch(() => {
        this.isCompressingSignature = false;
        this.signatureError = 'Impossible de traiter l’image de signature.';
      });
  }

  clearSignature(): void {
    this.form.signature = '';
    this.signatureError = '';
  }

  deleteTeacher(item: TeacherItem): void {
    if (!confirm(`Supprimer l’enseignant « ${item.fullName} » ?`)) {
      return;
    }
    this.teacherService.delete(item.id).subscribe({
      next: () => this.loadTeachers(false),
      error: (error) => {
        this.loadError = extractApiErrorMessage(error, 'Échec de suppression de l’enseignant.');
      }
    });
  }

  saveTeacher(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving || !this.schoolId) {
      formRef.control.markAllAsTouched();
      return;
    }
    if (!this.form.roleIds.length) {
      this.saveError = 'Au moins un rôle est requis.';
      return;
    }
    if (!this.form.gender) {
      this.saveError = 'Le sexe est obligatoire.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    if (this.isEditMode) {
      if (!this.editingId) {
        this.isSaving = false;
        this.saveError = 'Identifiant enseignant invalide.';
        return;
      }
      const dto = this.toUpdateDto();
      this.teacherService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadTeachers(false);
        },
        error: (error) => {
          this.isSaving = false;
          this.saveError = extractApiErrorMessage(
            error,
            'Échec de mise à jour de l’enseignant.'
          );
        }
      });
      return;
    }

    const dto = this.toCreateDto();
    this.teacherService.create(dto).subscribe({
      next: (created) => {
        this.isSaving = false;
        const credentials = this.extractCreatedCredentials(created, dto);
        this.closeModal();
        this.loadTeachers(false);

        if (credentials) {
          // Ouvre après fermeture du formulaire pour éviter un conflit d’affichage.
          setTimeout(() => {
            this.credentials = credentials;
            this.credentialsCopied = false;
            this.isCredentialsModalOpen = true;
            this.lockBodyScroll();
          });
        }
      },
      error: (error) => {
        this.isSaving = false;
        this.saveError = extractApiErrorMessage(error, 'Échec de création de l’enseignant.');
      }
    });
  }

  genderLabel(gender: Gender): string {
    return this.genderOptions.find((item) => item.value === gender)?.label ?? gender;
  }

  /** Extrait username + MDP temporaire de la réponse create (champs plats ou encapsulés). */
  private extractCreatedCredentials(
    created: TeacherApiResponse | Record<string, unknown> | null | undefined,
    dto: CreateTeacherDto
  ): CredentialsModal | null {
    const root = (created ?? {}) as Record<string, unknown>;
    const nested =
      (root['data'] as Record<string, unknown> | undefined) ??
      (root['value'] as Record<string, unknown> | undefined) ??
      (root['result'] as Record<string, unknown> | undefined) ??
      root;

    const temporaryPassword = String(
      nested['temporaryPassword'] ??
        nested['temporary_password'] ??
        root['temporaryPassword'] ??
        root['temporary_password'] ??
        ''
    ).trim();

    if (!temporaryPassword) {
      return null;
    }

    const username = String(
      nested['username'] ??
        root['username'] ??
        dto.username ??
        dto.email ??
        ''
    ).trim();

    return {
      username: username || '—',
      temporaryPassword
    };
  }

  private loadRoles(): void {
    this.isLoadingRoles = true;
    this.rolesError = '';
    this.roleService
      .getAll()
      .pipe(catchError(() => of([] as RoleApiResponse[])))
      .subscribe({
        next: (rows) => {
          this.roles = rows
            .filter((row) => this.isActive(row.active))
            .map((row) => ({
              id: String(row.id ?? ''),
              code: String(row.code ?? '').trim(),
              label: String(row.name ?? row.code ?? '').trim() || 'Rôle'
            }))
            .filter((role) => role.id)
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
          this.isLoadingRoles = false;
          if (!this.roles.length) {
            this.rolesError = 'Aucun rôle actif disponible.';
          }
        },
        error: () => {
          this.isLoadingRoles = false;
          this.rolesError = 'Impossible de charger les rôles.';
        }
      });
  }

  private loadTeachers(showLoader: boolean): void {
    if (!this.schoolId) {
      this.teachers = [];
      return;
    }
    if (showLoader) {
      this.isLoading = true;
    }
    this.loadError = '';

    this.teacherService.getAll({ schoolId: this.schoolId }).subscribe({
      next: (rows) => {
        this.teachers = rows.map((row) => this.mapApiToItem(row)).filter((item) => item.id);
        this.isLoading = false;
        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.teachers = [];
        this.loadError = extractApiErrorMessage(
          error,
          'Impossible de charger les enseignants de cette école.'
        );
      }
    });
  }

  private toCreateDto(): CreateTeacherDto {
    const username = this.form.username.trim();
    const password = this.form.password.trim();
    return {
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      middleName: this.optional(this.form.middleName),
      gender: this.form.gender as Gender,
      birthDate: this.optional(this.form.birthDate),
      email: this.form.email.trim(),
      phone: this.form.phone.trim(),
      address: this.optional(this.form.address),
      username: username || undefined,
      password: password || undefined,
      roleIds: [...this.form.roleIds],
      schoolId: this.schoolId,
      registrationNumber: this.form.registrationNumber.trim(),
      hiringDate: this.form.hiringDate,
      leavingDate: this.optional(this.form.leavingDate),
      qualification: this.optional(this.form.qualification),
      specialty: this.optional(this.form.specialty),
      grade: this.optional(this.form.grade),
      signature: this.optional(this.form.signature) ?? null,
      titular: this.form.titular,
      remarks: this.optional(this.form.remarks) ?? null
    };
  }

  private toUpdateDto(): UpdateTeacherDto {
    return {
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      middleName: this.optional(this.form.middleName),
      gender: this.form.gender as Gender,
      birthDate: this.optional(this.form.birthDate),
      email: this.form.email.trim(),
      phone: this.form.phone.trim(),
      address: this.optional(this.form.address),
      roleIds: [...this.form.roleIds],
      schoolId: this.schoolId,
      registrationNumber: this.form.registrationNumber.trim(),
      hiringDate: this.form.hiringDate,
      leavingDate: this.optional(this.form.leavingDate),
      qualification: this.optional(this.form.qualification),
      specialty: this.optional(this.form.specialty),
      grade: this.optional(this.form.grade),
      signature: this.optional(this.form.signature) ?? null,
      titular: this.form.titular,
      active: this.form.active,
      remarks: this.optional(this.form.remarks) ?? null
    };
  }

  private mapApiToItem(row: TeacherApiResponse): TeacherItem {
    const firstName = String(row.firstName ?? row.first_name ?? '').trim();
    const lastName = String(row.lastName ?? row.last_name ?? '').trim();
    const middleName = String(row.middleName ?? row.middle_name ?? '').trim();
    const roles = Array.isArray(row.roles) ? row.roles : [];
    const roleIds = roles.map((role) => String(role.id ?? '')).filter(Boolean);
    const roleLabels = roles
      .map((role) => String(role.name ?? role.code ?? '').trim())
      .filter(Boolean)
      .join(', ');
    const active = this.isActive(row.active);

    return {
      id: String(row.id ?? ''),
      fullName: [firstName, middleName, lastName].filter(Boolean).join(' '),
      firstName,
      lastName,
      middleName,
      gender: (row.gender as Gender) || 'OTHER',
      birthDate: this.toDateInput(row.birthDate ?? row.birth_date),
      email: String(row.email ?? '').trim(),
      phone: String(row.phone ?? '').trim(),
      address: String(row.address ?? '').trim(),
      username: String(row.username ?? '').trim(),
      schoolId: String(row.schoolId ?? row.school_id ?? this.schoolId),
      schoolName: String(row.schoolName ?? row.school_name ?? this.schoolName).trim(),
      registrationNumber: String(
        row.registrationNumber ?? row.registration_number ?? ''
      ).trim(),
      hiringDate: this.toDateInput(row.hiringDate ?? row.hiring_date),
      leavingDate: this.toDateInput(row.leavingDate ?? row.leaving_date),
      qualification: String(row.qualification ?? '').trim(),
      specialty: String(row.specialty ?? '').trim(),
      grade: String(row.grade ?? '').trim(),
      signature: String(row.signature ?? '').trim(),
      titular: row.titular === true,
      active,
      status: active ? 'Actif' : 'Inactif',
      remarks: String(row.remarks ?? '').trim(),
      roleIds,
      roleLabels: roleLabels || '—'
    };
  }

  private toFormFields(item: TeacherItem): TeacherForm {
    return {
      firstName: item.firstName,
      lastName: item.lastName,
      middleName: item.middleName,
      gender: item.gender,
      birthDate: item.birthDate,
      email: item.email,
      phone: item.phone,
      address: item.address,
      username: item.username,
      password: '',
      roleIds: [...item.roleIds],
      registrationNumber: item.registrationNumber,
      hiringDate: item.hiringDate,
      leavingDate: item.leavingDate,
      qualification: item.qualification,
      specialty: item.specialty,
      grade: item.grade,
      signature: item.signature,
      titular: item.titular,
      active: item.active,
      remarks: item.remarks
    };
  }

  private buildEmptyForm(): TeacherForm {
    return {
      firstName: '',
      lastName: '',
      middleName: '',
      gender: '',
      birthDate: '',
      email: '',
      phone: '',
      address: '',
      username: '',
      password: '',
      roleIds: [],
      registrationNumber: '',
      hiringDate: this.toInputDate(new Date()),
      leavingDate: '',
      qualification: '',
      specialty: '',
      grade: '',
      signature: '',
      titular: false,
      active: true,
      remarks: ''
    };
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

  private toDateInput(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw || raw === 'null') {
      return '';
    }
    const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return isoMatch ? isoMatch[1] : raw;
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private optional(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  private isActive(active: unknown): boolean {
    return active !== false && active !== 'false' && active !== 0 && active !== '0';
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private sameId(left: string, right: string): boolean {
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }
}
