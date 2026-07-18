import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AcademicYearApiResponse, AcademicYearService } from '../../../../services/academic-year.service';
import { CityOption, CityService } from '../../../../services/city.service';
import { ClassroomApiResponse, ClassroomService } from '../../../../services/classroom.service';
import { CommuneOption, CommuneService } from '../../../../services/commune.service';
import { CountryOption, CountryService } from '../../../../services/country.service';
import { CreateEnrollmentDto, EnrollmentApiResponse, EnrollmentService, resolveEnrollmentPhotoUrls, resolveEnrollmentStudentIdentity } from '../../../../services/enrollment.service';
import { CreateGuardianDto, GuardianApiResponse, GuardianService, UpdateGuardianDto } from '../../../../services/guardian.service';
import { EnrollmentReportService } from '../../../../services/enrollment-report.service';
import { SchoolApiResponse, SchoolService } from '../../../../services/school.service';
import { StudentCategoryService } from '../../../../services/student-category.service';
import { EcoleStudentCategoriesComponent } from '../ecole-student-categories/ecole-student-categories.component';
import { compressCanvasImage, compressImageFile } from '../../../../core/utils/image-compression';

interface SchoolOption {
  id: string;
  name: string;
  capacity: number | null;
  classrooms: number | null;
}

interface YearOption {
  id: string;
  code: string;
  label: string;
}

interface StudentRow {
  matricule: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  photoUrl: string;
  photoFallbackUrls: string[];
  classe: string;
  category: string;
  tutorName: string;
  tutorPhone: string;
  birthDate: string;
  gender: string;
  statut: string;
}

interface StatCard {
  label: string;
  value: string;
  icon: string;
  hint?: string;
  tone?: 'blue' | 'green' | 'orange' | 'purple';
}

interface InscriptionsTab {
  id: 'inscriptions' | 'tuteurs' | 'categories-eleves';
  label: string;
  icon: string;
}

interface TutorRow {
  id: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  phoneNumber: string;
  email: string;
  familyCode: string;
  occupation: string;
  employer: string;
  address: string;
  comment: string;
  active: boolean;
  linkedStudents: number;
  status: string;
}

interface TutorFormModel {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phoneNumber: string;
  email: string;
  occupation: string;
  employer: string;
  address: string;
  comment: string;
  active: boolean;
}

interface GuardianOption {
  id: string;
  label: string;
  searchText: string;
}

interface ClassroomOption {
  id: string;
  label: string;
  searchText: string;
}

interface CameraOption {
  deviceId: string;
  label: string;
}

interface EnrollmentFormModel {
  lastName: string;
  middleName: string;
  firstName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  birthDate: string;
  birthCountryId: string;
  birthCityId: string;
  birthCommuneId: string;
  nationality: string;
  countryId: string;
  cityId: string;
  communeId: string;
  quarter: string;
  avenue: string;
  number: string;
  phoneNumber: string;
  email: string;
  studentComment: string;
  studentCategoryId: string;
  guardianId: string;
  classroomId: string;
  enrollmentDate: string;
}

interface StudentCategoryOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-ecole-inscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, EcoleStudentCategoriesComponent],
  templateUrl: './ecole-inscriptions.component.html',
  styleUrl: './ecole-inscriptions.component.css'
})
export class EcoleInscriptionsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() schoolId = '';
  @Output() schoolIdChange = new EventEmitter<string>();
  @ViewChild('webcamVideo') webcamVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('photoFileInput') photoFileInputRef?: ElementRef<HTMLInputElement>;

  readonly tabs: InscriptionsTab[] = [
    { id: 'inscriptions', label: 'Inscription', icon: 'bi-person-plus' },
    { id: 'tuteurs', label: 'Tuteurs', icon: 'bi-people' },
    { id: 'categories-eleves', label: 'Categories d eleves', icon: 'bi-collection' }
  ];
  activeTab: InscriptionsTab['id'] = 'inscriptions';
  selectedSchoolId = '';
  selectedYearId = '';
  studentSearchTerm = '';
  tutorSearchTerm = '';
  birthCountrySearchTerm = '';
  birthCitySearchTerm = '';
  addressCountrySearchTerm = '';
  addressCitySearchTerm = '';
  addressCommuneSearchTerm = '';
  guardianSearchTerm = '';
  classroomSearchTerm = '';
  studentCategorySearchTerm = '';
  nationalitySearchTerm = '';
  currentPage = 1;
  tutorCurrentPage = 1;
  isEnrollmentModalOpen = false;
  isEnrollmentFormSubmitted = false;
  isSavingEnrollment = false;
  enrollmentSaveError = '';
  isBirthCountryDropdownOpen = false;
  isBirthCityDropdownOpen = false;
  isAddressCountryDropdownOpen = false;
  isAddressCityDropdownOpen = false;
  isAddressCommuneDropdownOpen = false;
  isGuardianDropdownOpen = false;
  isClassroomDropdownOpen = false;
  isStudentCategoryDropdownOpen = false;
  isNationalityDropdownOpen = false;
  isTutorModalOpen = false;
  isTutorEditMode = false;
  editingTutorId = '';
  isSavingTutor = false;
  tutorSaveError = '';
  isTutorFormSubmitted = false;
  photoMode: 'camera' | 'upload' = 'camera';
  isWebcamOpen = false;
  isStartingWebcam = false;
  webcamError = '';
  studentPhotoPreview = '';
  selectedEnrollmentPhotoFile: File | null = null;
  availableCameras: CameraOption[] = [];
  selectedCameraId = '';

  isLoadingSchools = false;
  isLoadingYears = false;
  isLoadingTutors = false;
  isLoadingEnrollments = false;
  isSearchingStudents = false;
  isLoadingEnrollmentReferences = false;
  isExportingStudentsReport = false;
  loadError = '';

  schools: SchoolOption[] = [];
  yearOptions: YearOption[] = [];
  students: StudentRow[] = [];
  tutors: TutorRow[] = [];
  guardianOptions: GuardianOption[] = [];
  classroomOptions: ClassroomOption[] = [];
  countryOptions: CountryOption[] = [];
  cityOptions: CityOption[] = [];
  communeOptions: CommuneOption[] = [];
  studentCategoryOptions: StudentCategoryOption[] = [];
  readonly studentSearchMaxLength = 80;
  readonly tutorSearchMaxLength = 80;
  readonly tutorCommentMaxLength = 300;
  readonly pageSize = 5;
  readonly tutorPageSize = 5;
  studentClassFilter = 'all';
  studentCategoryFilter = 'all';
  studentStatusFilter = 'all';
  readonly genderOptions: Array<{ value: 'MALE' | 'FEMALE' | 'OTHER'; label: string }> = [
    { value: 'MALE', label: 'Masculin' },
    { value: 'FEMALE', label: 'Feminin' },
    { value: 'OTHER', label: 'Autre' }
  ];
  readonly enrollmentGenderOptions: Array<{ value: 'MALE' | 'FEMALE' | 'OTHER'; label: string }> = [
    { value: 'MALE', label: 'Masculin' },
    { value: 'FEMALE', label: 'Feminin' },
    { value: 'OTHER', label: 'Autre' }
  ];
  tutorForm: TutorFormModel = this.buildEmptyTutorForm();
  enrollmentForm: EnrollmentFormModel = this.buildEmptyEnrollmentForm();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schoolService: SchoolService,
    private readonly academicYearService: AcademicYearService,
    private readonly guardianService: GuardianService,
    private readonly classroomService: ClassroomService,
    private readonly countryService: CountryService,
    private readonly cityService: CityService,
    private readonly communeService: CommuneService,
    private readonly enrollmentService: EnrollmentService,
    private readonly studentCategoryService: StudentCategoryService,
    private readonly enrollmentReportService: EnrollmentReportService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'inscriptions' || tab === 'tuteurs' || tab === 'categories-eleves') {
        this.activeTab = tab;
      }
    });
    this.loadSchools();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schoolId'] && String(this.schoolId || '').trim() && this.schoolId !== this.selectedSchoolId) {
      this.selectedSchoolId = this.schoolId;
      this.loadCurrentYears();
    }
  }

  ngOnDestroy(): void {
    this.stopWebcam();
  }

  onSchoolChange(): void {
    this.currentPage = 1;
    this.tutorCurrentPage = 1;
    this.studentSearchTerm = '';
    this.tutorSearchTerm = '';
    this.schoolIdChange.emit(this.selectedSchoolId);
    this.loadCurrentYears();
  }

  onYearChange(): void {
    this.currentPage = 1;
    this.loadEnrollments();
  }

  onStudentSearchSubmit(event: Event): void {
    event.preventDefault();
    this.searchStudentsByName();
  }

  searchStudentsByName(): void {
    if (!this.selectedSchoolId || !this.selectedYearId) {
      this.loadError = 'Selectionnez une ecole et une annee scolaire.';
      return;
    }

    const name = this.studentSearchTerm.trim();
    this.currentPage = 1;
    this.loadError = '';

    if (!name) {
      this.loadEnrollments();
      return;
    }

    this.isSearchingStudents = true;

    forkJoin({
      enrollments: this.enrollmentService.searchByStudentName({
        name,
        academicYearId: this.selectedYearId,
        schoolId: this.selectedSchoolId
      }),
      classrooms: this.classroomService.getAll(this.selectedSchoolId)
    }).subscribe({
      next: ({ enrollments, classrooms }) => {
        this.applyEnrollmentRows(enrollments, classrooms);
        this.isSearchingStudents = false;
      },
      error: () => {
        this.students = [];
        this.isSearchingStudents = false;
        this.loadError = 'Recherche impossible pour le moment.';
      }
    });
  }

  onStudentFiltersChange(): void {
    this.currentPage = 1;
  }

  resetStudentFilters(): void {
    this.studentSearchTerm = '';
    this.studentClassFilter = 'all';
    this.studentCategoryFilter = 'all';
    this.studentStatusFilter = 'all';
    this.currentPage = 1;
    this.loadEnrollments();
  }

  onTutorSearchChange(): void {
    this.tutorCurrentPage = 1;
  }

  setActiveTab(tabId: InscriptionsTab['id']): void {
    this.activeTab = tabId;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  get selectedSchool(): SchoolOption | undefined {
    return this.schools.find((school) => school.id === this.selectedSchoolId);
  }

  get selectedYearLabel(): string {
    if (!this.selectedYearId) {
      return '';
    }
    return this.yearOptions.find((year) => year.id === this.selectedYearId)?.label ?? '';
  }

  get currentPeriodLabel(): string {
    if (!this.selectedYearLabel) {
      return 'Periode non definie';
    }
    const years = this.selectedYearLabel.match(/\d{4}/g) ?? [];
    if (years.length < 2) {
      return this.selectedYearLabel;
    }
    return `01 Sept. ${years[0]} - 31 Aout ${years[1]}`;
  }

  get studentSearchLength(): number {
    return this.studentSearchTerm.length;
  }

  get tutorSearchLength(): number {
    return this.tutorSearchTerm.length;
  }

  get addressCommuneOptions(): CommuneOption[] {
    if (!this.enrollmentForm.cityId) {
      return this.communeOptions;
    }
    return this.communeOptions.filter((item) => this.sameId(item.cityId, this.enrollmentForm.cityId));
  }

  get filteredBirthCountryOptions(): CountryOption[] {
    const term = this.normalize(this.birthCountrySearchTerm);
    if (!term) return this.countryOptions;
    return this.countryOptions.filter((item) => this.normalize(item.name).includes(term));
  }

  get filteredBirthCityOptions(): CityOption[] {
    const term = this.normalize(this.birthCitySearchTerm);
    if (!term) return this.cityOptions;
    return this.cityOptions.filter((item) => this.normalize(item.name).includes(term));
  }

  get filteredAddressCountryOptions(): CountryOption[] {
    const term = this.normalize(this.addressCountrySearchTerm);
    if (!term) return this.countryOptions;
    return this.countryOptions.filter((item) => this.normalize(item.name).includes(term));
  }

  get filteredAddressCityOptions(): CityOption[] {
    const term = this.normalize(this.addressCitySearchTerm);
    if (!term) return this.cityOptions;
    return this.cityOptions.filter((item) => this.normalize(item.name).includes(term));
  }

  get filteredAddressCommuneOptions(): CommuneOption[] {
    const term = this.normalize(this.addressCommuneSearchTerm);
    if (!term) return this.addressCommuneOptions;
    return this.addressCommuneOptions.filter((item) => this.normalize(item.name).includes(term));
  }

  get filteredGuardianOptions(): GuardianOption[] {
    const term = this.normalize(this.guardianSearchTerm);
    if (!term) return this.guardianOptions;
    return this.guardianOptions.filter((item) => this.normalize(item.searchText).includes(term));
  }

  get filteredClassroomOptions(): ClassroomOption[] {
    const term = this.normalize(this.classroomSearchTerm);
    if (!term) return this.classroomOptions;
    return this.classroomOptions.filter((item) => this.normalize(item.searchText).includes(term));
  }

  get filteredNationalityOptions(): CountryOption[] {
    const term = this.normalize(this.nationalitySearchTerm);
    if (!term) return this.countryOptions;
    return this.countryOptions.filter((item) => this.normalize(item.name).includes(term));
  }

  get filteredStudentCategoryOptions(): StudentCategoryOption[] {
    const term = this.normalize(this.studentCategorySearchTerm);
    if (!term) return this.studentCategoryOptions;
    return this.studentCategoryOptions.filter((item) => this.normalize(item.label).includes(term));
  }

  get filteredStudents(): StudentRow[] {
    return this.students.filter((student) => {
      const matchesClass = this.studentClassFilter === 'all' || this.sameId(student.classe, this.studentClassFilter);
      const matchesCategory =
        this.studentCategoryFilter === 'all' || this.sameId(student.category, this.studentCategoryFilter);
      const matchesStatus = this.studentStatusFilter === 'all' || this.sameId(student.statut, this.studentStatusFilter);

      return matchesClass && matchesCategory && matchesStatus;
    });
  }

  get paginatedStudents(): StudentRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredStudents.slice(start, start + this.pageSize);
  }

  get filteredTutors(): TutorRow[] {
    const term = this.normalize(this.tutorSearchTerm);
    if (!term) {
      return this.tutors;
    }

    return this.tutors.filter((tutor) => {
      return (
        this.normalize(tutor.fullName).includes(term) ||
        this.normalize(tutor.phone).includes(term) ||
        this.normalize(tutor.email).includes(term) ||
        this.normalize(tutor.familyCode).includes(term) ||
        this.normalize(tutor.status).includes(term)
      );
    });
  }

  get paginatedTutors(): TutorRow[] {
    const start = (this.tutorCurrentPage - 1) * this.tutorPageSize;
    return this.filteredTutors.slice(start, start + this.tutorPageSize);
  }

  get tutorTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTutors.length / this.tutorPageSize));
  }

  get tutorPageNumbers(): number[] {
    return Array.from({ length: this.tutorTotalPages }, (_, index) => index + 1);
  }

  get tutorRangeStart(): number {
    if (this.filteredTutors.length === 0) {
      return 0;
    }
    return (this.tutorCurrentPage - 1) * this.tutorPageSize + 1;
  }

  get tutorRangeEnd(): number {
    return Math.min(this.tutorCurrentPage * this.tutorPageSize, this.filteredTutors.length);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredStudents.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get visiblePageItems(): Array<number | string> {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      return this.pageNumbers;
    }

    if (current <= 3) {
      return [1, 2, 3, 4, '...', total];
    }

    if (current >= total - 2) {
      return [1, '...', total - 3, total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  get rangeStart(): number {
    if (this.filteredStudents.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredStudents.length);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  isPageNumber(value: number | string): value is number {
    return typeof value === 'number';
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

  goToTutorPage(page: number): void {
    if (page >= 1 && page <= this.tutorTotalPages) {
      this.tutorCurrentPage = page;
    }
  }

  goToPreviousTutorPage(): void {
    if (this.tutorCurrentPage > 1) {
      this.tutorCurrentPage -= 1;
    }
  }

  goToNextTutorPage(): void {
    if (this.tutorCurrentPage < this.tutorTotalPages) {
      this.tutorCurrentPage += 1;
    }
  }

  get statsCards(): StatCard[] {
    const total = this.students.length;
    const activeCount = this.students.filter((item) => this.sameId(item.statut, 'ACTIVE') || this.sameId(item.statut, 'Actif')).length;
    const newCount = this.students.filter((item) => this.normalize(item.category).includes('nouveau')).length;
    const femaleCount = this.students.filter((item) => this.normalize(item.gender).startsWith('f')).length;
    const maleCount = this.students.filter((item) => this.normalize(item.gender).startsWith('m')).length;
    const fmLabel =
      femaleCount + maleCount > 0
        ? `${Math.round((femaleCount * 100) / Math.max(1, femaleCount + maleCount))}% | ${Math.round(
            (maleCount * 100) / Math.max(1, femaleCount + maleCount)
          )}%`
        : '—';

    return [
      {
        label: 'Total eleves',
        value: String(total),
        icon: 'bi-people',
        hint: 'Tous les eleves',
        tone: 'blue'
      },
      {
        label: 'Eleves actifs',
        value: String(activeCount),
        icon: 'bi-check-circle',
        hint: total > 0 ? `${Math.round((activeCount * 100) / total)}% du total` : '—',
        tone: 'green'
      },
      {
        label: 'Nouvelles inscriptions',
        value: String(newCount),
        icon: 'bi-clock-history',
        hint: 'Cette annee',
        tone: 'orange'
      },
      {
        label: 'Parite F / M',
        value: fmLabel,
        icon: 'bi-gender-ambiguous',
        hint: 'Feminin / Masculin',
        tone: 'purple'
      }
    ];
  }

  get classFilterOptions(): string[] {
    return Array.from(new Set(this.students.map((item) => item.classe).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
  }

  get categoryFilterOptions(): string[] {
    return Array.from(new Set(this.students.map((item) => item.category).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
  }

  get statusFilterOptions(): string[] {
    return Array.from(new Set(this.students.map((item) => item.statut).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
  }

  getStatCardTheme(index: number): string {
    const themes = ['theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5'];
    return themes[index % themes.length];
  }

  openNewInscription(): void {
    if (!this.selectedSchoolId || !this.selectedYearId) {
      return;
    }
    this.isEnrollmentFormSubmitted = false;
    this.enrollmentSaveError = '';
    this.enrollmentForm = this.buildEmptyEnrollmentForm();
    this.photoMode = 'camera';
    this.isWebcamOpen = false;
    this.isStartingWebcam = false;
    this.webcamError = '';
    this.studentPhotoPreview = '';
    this.selectedEnrollmentPhotoFile = null;
    this.isEnrollmentModalOpen = true;
    this.closeEnrollmentDropdowns();
    this.resetEnrollmentSearchTerms();
    this.loadEnrollmentReferences();
  }

  openReinscription(): void {
    // A brancher au workflow de reinscription
  }

  exportStudents(): void {
    if (!this.selectedSchoolId || !this.selectedYearId || this.isExportingStudentsReport) {
      return;
    }

    this.isExportingStudentsReport = true;
    this.enrollmentReportService
      .generateStudentsByClass(this.selectedSchoolId, this.selectedYearId)
      .subscribe({
        next: (pdfBlob) => {
          this.isExportingStudentsReport = false;
          const blob = new Blob([pdfBlob], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const opened = window.open(url, '_blank', 'noopener,noreferrer');
          if (!opened) {
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'liste-eleves-par-classe.pdf';
            anchor.click();
          }
          setTimeout(() => URL.revokeObjectURL(url), 30000);
        },
        error: () => {
          this.isExportingStudentsReport = false;
          this.loadError = "Impossible de generer le rapport PDF des inscriptions.";
        }
      });
  }

  getStudentInitials(fullName: string): string {
    const parts = String(fullName || '')
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      return 'EL';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  getStudentIdentityMeta(student: StudentRow): string {
    const nameDetails = this.getStudentNameDetails(student);
    if (nameDetails) {
      return nameDetails;
    }

    const segments: string[] = [];
    if (student.birthDate && student.birthDate !== '—') {
      segments.push(`Ne le ${this.formatDateForStudentMeta(student.birthDate)}`);
    }
    if (student.gender && student.gender !== '—') {
      segments.push(student.gender.toUpperCase());
    }
    return segments.join(' - ') || 'Informations indisponibles';
  }

  getStudentNameDetails(student: StudentRow): string {
    const parts = [
      student.lastName ? `Nom: ${student.lastName}` : '',
      student.middleName ? `Postnom: ${student.middleName}` : '',
      student.firstName ? `Prenom: ${student.firstName}` : ''
    ].filter(Boolean);

    return parts.join(' · ');
  }

  getCategoryChipClass(value: string): string {
    const normalized = this.normalize(value);
    if (normalized.includes('nouveau')) {
      return 'chip-success';
    }
    if (normalized.includes('ancien')) {
      return 'chip-info';
    }
    if (normalized.includes('boursier')) {
      return 'chip-purple';
    }
    if (normalized.includes('transfere') || normalized.includes('transféré')) {
      return 'chip-warning';
    }
    return 'chip-neutral';
  }

  getStatusChipClass(value: string): string {
    const normalized = this.normalize(value);
    if (normalized.includes('actif') || normalized.includes('active')) {
      return 'chip-success';
    }
    if (normalized.includes('inactif') || normalized.includes('inactive') || normalized.includes('archive')) {
      return 'chip-muted';
    }
    return 'chip-neutral';
  }

  closeEnrollmentModal(): void {
    this.isEnrollmentModalOpen = false;
    this.isSavingEnrollment = false;
    this.isEnrollmentFormSubmitted = false;
    this.enrollmentSaveError = '';
    this.selectedEnrollmentPhotoFile = null;
    this.stopWebcam();
    this.closeEnrollmentDropdowns();
  }

  saveEnrollment(form: NgForm): void {
    this.isEnrollmentFormSubmitted = true;
    this.enrollmentSaveError = '';
    if (form.invalid) {
      return;
    }
    if (
      !this.enrollmentForm.birthCountryId ||
      !this.enrollmentForm.guardianId ||
      !this.enrollmentForm.classroomId ||
      !this.enrollmentForm.studentCategoryId
    ) {
      this.enrollmentSaveError =
        'Selectionnez un pays de naissance, un tuteur, une classe et une categorie d eleve valides.';
      return;
    }

    const payload: CreateEnrollmentDto = {
      lastName: this.enrollmentForm.lastName.trim(),
      middleName: this.enrollmentForm.middleName.trim(),
      firstName: this.enrollmentForm.firstName.trim(),
      gender: this.enrollmentForm.gender,
      birthDate: this.enrollmentForm.birthDate,
      birthCountryId: this.enrollmentForm.birthCountryId,
      birthCityId: this.enrollmentForm.birthCityId || undefined,
      birthCommuneId: this.enrollmentForm.birthCommuneId || undefined,
      nationality: this.enrollmentForm.nationality.trim() || undefined,
      countryId: this.enrollmentForm.countryId || undefined,
      cityId: this.enrollmentForm.cityId || undefined,
      communeId: this.enrollmentForm.communeId || undefined,
      quarter: this.enrollmentForm.quarter.trim() || undefined,
      avenue: this.enrollmentForm.avenue.trim() || undefined,
      number: this.enrollmentForm.number.trim() || undefined,
      phoneNumber: this.enrollmentForm.phoneNumber.trim() || undefined,
      email: this.enrollmentForm.email.trim() || undefined,
      studentComment: this.enrollmentForm.studentComment.trim() || undefined,
      studentCategoryId: this.enrollmentForm.studentCategoryId,
      guardianId: this.enrollmentForm.guardianId,
      academicYearId: this.selectedYearId,
      classroomId: this.enrollmentForm.classroomId,
      enrollmentDate: this.enrollmentForm.enrollmentDate
    };

    this.isSavingEnrollment = true;
    this.enrollmentService.create(payload, this.selectedEnrollmentPhotoFile).subscribe({
      next: () => {
        this.isSavingEnrollment = false;
        this.closeEnrollmentModal();
        this.loadEnrollments();
      },
      error: () => {
        this.isSavingEnrollment = false;
        this.enrollmentSaveError = "Impossible d'enregistrer l'inscription.";
      }
    });
  }

  openBirthCountryDropdown(): void {
    this.isBirthCountryDropdownOpen = true;
  }

  closeBirthCountryDropdown(): void {
    setTimeout(() => {
      this.isBirthCountryDropdownOpen = false;
    }, 120);
  }

  selectBirthCountry(option: CountryOption): void {
    this.birthCountrySearchTerm = option.name;
    this.enrollmentForm.birthCountryId = option.id;
    this.isBirthCountryDropdownOpen = false;
  }

  openBirthCityDropdown(): void {
    this.isBirthCityDropdownOpen = true;
  }

  closeBirthCityDropdown(): void {
    setTimeout(() => {
      this.isBirthCityDropdownOpen = false;
    }, 120);
  }

  selectBirthCity(option: CityOption): void {
    this.birthCitySearchTerm = option.name;
    this.enrollmentForm.birthCityId = option.id;
    this.isBirthCityDropdownOpen = false;
  }

  openAddressCountryDropdown(): void {
    this.isAddressCountryDropdownOpen = true;
  }

  closeAddressCountryDropdown(): void {
    setTimeout(() => {
      this.isAddressCountryDropdownOpen = false;
    }, 120);
  }

  selectAddressCountry(option: CountryOption): void {
    this.addressCountrySearchTerm = option.name;
    this.enrollmentForm.countryId = option.id;
    this.isAddressCountryDropdownOpen = false;
  }

  openAddressCityDropdown(): void {
    this.isAddressCityDropdownOpen = true;
  }

  closeAddressCityDropdown(): void {
    setTimeout(() => {
      this.isAddressCityDropdownOpen = false;
    }, 120);
  }

  selectAddressCity(option: CityOption): void {
    this.addressCitySearchTerm = option.name;
    this.enrollmentForm.cityId = option.id;
    this.enrollmentForm.communeId = '';
    this.addressCommuneSearchTerm = '';
    this.isAddressCityDropdownOpen = false;
  }

  openAddressCommuneDropdown(): void {
    this.isAddressCommuneDropdownOpen = true;
  }

  closeAddressCommuneDropdown(): void {
    setTimeout(() => {
      this.isAddressCommuneDropdownOpen = false;
    }, 120);
  }

  selectAddressCommune(option: CommuneOption): void {
    this.addressCommuneSearchTerm = option.name;
    this.enrollmentForm.communeId = option.id;
    this.isAddressCommuneDropdownOpen = false;
  }

  openGuardianDropdown(): void {
    this.isGuardianDropdownOpen = true;
  }

  closeGuardianDropdown(): void {
    setTimeout(() => {
      this.isGuardianDropdownOpen = false;
    }, 120);
  }

  selectGuardian(option: GuardianOption): void {
    this.guardianSearchTerm = option.label;
    this.enrollmentForm.guardianId = option.id;
    this.isGuardianDropdownOpen = false;
  }

  openClassroomDropdown(): void {
    this.isClassroomDropdownOpen = true;
  }

  closeClassroomDropdown(): void {
    setTimeout(() => {
      this.isClassroomDropdownOpen = false;
    }, 120);
  }

  selectClassroom(option: ClassroomOption): void {
    this.classroomSearchTerm = option.label;
    this.enrollmentForm.classroomId = option.id;
    this.isClassroomDropdownOpen = false;
  }

  openStudentCategoryDropdown(): void {
    this.isStudentCategoryDropdownOpen = true;
  }

  closeStudentCategoryDropdown(): void {
    setTimeout(() => {
      this.isStudentCategoryDropdownOpen = false;
    }, 120);
  }

  onStudentCategorySearchInput(): void {
    const exact = this.studentCategoryOptions.find((item) =>
      this.sameId(item.label, this.studentCategorySearchTerm)
    );
    this.enrollmentForm.studentCategoryId = exact?.id ?? '';
  }

  selectStudentCategory(option: StudentCategoryOption): void {
    this.studentCategorySearchTerm = option.label;
    this.enrollmentForm.studentCategoryId = option.id;
    this.isStudentCategoryDropdownOpen = false;
  }

  openNationalityDropdown(): void {
    this.isNationalityDropdownOpen = true;
  }

  closeNationalityDropdown(): void {
    setTimeout(() => {
      this.isNationalityDropdownOpen = false;
    }, 120);
  }

  selectNationality(option: CountryOption): void {
    this.nationalitySearchTerm = option.name;
    this.enrollmentForm.nationality = option.name;
    this.isNationalityDropdownOpen = false;
  }

  setPhotoMode(mode: 'camera' | 'upload'): void {
    this.photoMode = mode;
    this.webcamError = '';
    if (mode === 'upload') {
      this.stopWebcam();
    }
  }

  async openWebcam(forceRestart = false): Promise<void> {
    if (this.isStartingWebcam) {
      return;
    }
    if (this.isWebcamOpen && !forceRestart) {
      return;
    }

    this.photoMode = 'camera';
    this.webcamError = '';
    this.isStartingWebcam = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.webcamError = 'Votre navigateur ne supporte pas la webcam.';
      this.isStartingWebcam = false;
      return;
    }

    try {
      this.stopWebcam();
      const stream = await this.requestWebcamStream();
      this.webcamStream = stream;
      this.isWebcamOpen = true;
      this.isStartingWebcam = false;
      this.scheduleBindWebcamStream();
      await this.refreshCameraOptions();
    } catch {
      this.webcamError = "Impossible d'acceder a la webcam.";
      this.isWebcamOpen = false;
      this.isStartingWebcam = false;
    }
  }

  closeWebcam(): void {
    this.stopWebcam();
  }

  async onCameraChange(deviceId: string): Promise<void> {
    if (!deviceId || this.selectedCameraId === deviceId) {
      return;
    }
    this.selectedCameraId = deviceId;
    await this.openWebcam(true);
  }

  capturePhotoFromWebcam(): void {
    const video = this.webcamVideoRef?.nativeElement;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      this.webcamError = 'Flux webcam indisponible.';
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      this.webcamError = 'Capture photo indisponible.';
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    void compressCanvasImage(canvas).then(
      (result) => {
        this.studentPhotoPreview = result.dataUrl;
        this.selectedEnrollmentPhotoFile = result.file;
        this.webcamError = '';
      },
      () => {
        this.webcamError = 'Impossible de compresser la photo.';
      }
    );
  }

  triggerPhotoUpload(): void {
    this.setPhotoMode('upload');
    this.photoFileInputRef?.nativeElement.click();
  }

  onPhotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.webcamError = 'Le fichier selectionne doit etre une image.';
      return;
    }

    void compressImageFile(file).then(
      (result) => {
        this.selectedEnrollmentPhotoFile = result.file;
        this.studentPhotoPreview = result.dataUrl;
        this.webcamError = '';
      },
      () => {
        this.webcamError = 'Impossible de compresser l image.';
      }
    );
    input.value = '';
  }

  openNewTutor(): void {
    if (!this.selectedSchoolId) {
      return;
    }
    this.isTutorFormSubmitted = false;
    this.tutorSaveError = '';
    this.isTutorEditMode = false;
    this.editingTutorId = '';
    this.tutorForm = this.buildEmptyTutorForm();
    this.isTutorModalOpen = true;
  }

  openEditTutor(tutor: TutorRow): void {
    if (!tutor.id) {
      return;
    }

    this.isTutorFormSubmitted = false;
    this.tutorSaveError = '';
    this.isTutorEditMode = true;
    this.editingTutorId = tutor.id;
    this.tutorForm = {
      firstName: tutor.firstName,
      middleName: tutor.middleName,
      lastName: tutor.lastName,
      gender: tutor.gender,
      phoneNumber: tutor.phoneNumber,
      email: tutor.email === '—' ? '' : tutor.email,
      occupation: tutor.occupation,
      employer: tutor.employer,
      address: tutor.address,
      comment: tutor.comment,
      active: tutor.active
    };
    this.isTutorModalOpen = true;
  }

  closeTutorModal(): void {
    this.isTutorModalOpen = false;
    this.isSavingTutor = false;
    this.isTutorFormSubmitted = false;
    this.tutorSaveError = '';
    this.isTutorEditMode = false;
    this.editingTutorId = '';
  }

  saveTutor(form: NgForm): void {
    this.isTutorFormSubmitted = true;
    this.tutorSaveError = '';
    if (form.invalid) {
      return;
    }

    const payloadBase: UpdateGuardianDto = {
      firstName: this.tutorForm.firstName.trim(),
      lastName: this.tutorForm.lastName.trim(),
      middleName: this.tutorForm.middleName.trim() || undefined,
      gender: this.tutorForm.gender,
      phoneNumber: this.tutorForm.phoneNumber.trim() || undefined,
      email: this.tutorForm.email.trim() || undefined,
      address: this.tutorForm.address.trim() || undefined,
      occupation: this.tutorForm.occupation.trim() || undefined,
      employer: this.tutorForm.employer.trim() || undefined,
      active: this.tutorForm.active,
      comment: this.tutorForm.comment.trim() || undefined,
      schoolId: this.selectedSchoolId
    };

    this.isSavingTutor = true;
    const request$ =
      this.isTutorEditMode && this.editingTutorId
        ? this.guardianService.update(this.editingTutorId, payloadBase)
        : this.guardianService.create({
            ...payloadBase,
            schoolId: this.selectedSchoolId
          } as CreateGuardianDto);

    request$.subscribe({
      next: () => {
        this.isSavingTutor = false;
        this.closeTutorModal();
        this.loadTutors();
      },
      error: () => {
        this.isSavingTutor = false;
        this.tutorSaveError = this.isTutorEditMode
          ? 'Impossible de modifier le tuteur.'
          : "Impossible d'enregistrer le tuteur.";
      }
    });
  }

  private loadSchools(): void {
    this.isLoadingSchools = true;
    this.schoolService.getAll().subscribe({
      next: (rows: SchoolApiResponse[]) => {
        this.schools = rows
          .map((row) => ({
            id: String(row.id ?? ''),
            name: (row.name ?? '').trim() || 'Ecole sans nom',
            capacity: this.readNullableNumber(row.capacity),
            classrooms: this.readNullableNumber(row.numberOfClassrooms)
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

        if (this.schoolId && this.schools.some((s) => s.id === this.schoolId)) {
          this.selectedSchoolId = this.schoolId;
        } else {
          this.selectedSchoolId = this.schools[0]?.id ?? '';
          if (this.selectedSchoolId) {
            this.schoolIdChange.emit(this.selectedSchoolId);
          }
        }

        this.isLoadingSchools = false;
        this.loadCurrentYears();
      },
      error: () => {
        this.isLoadingSchools = false;
        this.loadError = 'Impossible de charger les ecoles.';
      }
    });
  }

  private loadCurrentYears(): void {
    if (!this.selectedSchoolId) {
      this.yearOptions = [];
      this.selectedYearId = '';
      this.currentPage = 1;
      this.tutors = [];
      this.students = [];
      this.isLoadingEnrollments = false;
      return;
    }

    this.isLoadingYears = true;
    this.loadError = '';
    this.academicYearService.getAll({ schoolId: this.selectedSchoolId }).subscribe({
      next: (rows: AcademicYearApiResponse[]) => {
        this.yearOptions = rows
          .filter((row) => row.active !== false)
          .map((row) => {
            const id = String(row.id ?? '');
            return {
              id,
              code: (row.code ?? '').trim(),
              label: AcademicYearService.buildLabel(row)
            };
          })
          .filter((item) => item.id)
          .sort((a, b) => b.label.localeCompare(a.label, 'fr'));

        this.selectedYearId = this.yearOptions[0]?.id ?? '';
        this.currentPage = 1;
        this.tutorCurrentPage = 1;
        this.isLoadingYears = false;
        this.loadTutors();
        this.loadEnrollments();
      },
      error: () => {
        this.isLoadingYears = false;
        this.isLoadingEnrollments = false;
        this.yearOptions = [];
        this.selectedYearId = '';
        this.students = [];
        this.loadError = this.activeTab === 'inscriptions' ? 'Impossible de charger les annees scolaires.' : '';
        this.loadTutors();
      }
    });
  }

  private loadTutors(): void {
    if (!this.selectedSchoolId) {
      this.tutors = [];
      this.isLoadingTutors = false;
      return;
    }

    this.isLoadingTutors = true;
    this.guardianService.getAll().subscribe({
      next: (rows: GuardianApiResponse[]) => {
        this.tutors = rows
          .filter((row) => {
            const guardianSchoolId = this.readGuardianSchoolId(row);
            return !!guardianSchoolId && this.sameId(guardianSchoolId, this.selectedSchoolId);
          })
          .map((row) => this.mapGuardianToTutorRow(row))
          .filter((row) => !!row.fullName)
          .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
        this.tutorCurrentPage = 1;
        this.isLoadingTutors = false;
      },
      error: () => {
        this.tutors = [];
        this.isLoadingTutors = false;
        this.loadError = 'Impossible de charger les tuteurs.';
      }
    });
  }

  private loadEnrollmentReferences(): void {
    if (!this.selectedSchoolId) {
      this.guardianOptions = [];
      this.classroomOptions = [];
      this.studentCategoryOptions = [];
      return;
    }

    this.isLoadingEnrollmentReferences = true;
    forkJoin({
      guardians: this.guardianService.getAll(),
      classrooms: this.classroomService.getAll(this.selectedSchoolId),
      studentCategories: this.studentCategoryService
        .getAll(this.selectedSchoolId)
        .pipe(catchError(() => of([]))),
      countries: this.countryService.getAll(),
      cities: this.cityService.getAll(),
      communes: this.communeService.getAll()
    }).subscribe({
      next: ({ guardians, classrooms, studentCategories, countries, cities, communes }) => {
        this.guardianOptions = guardians
          .filter((row) => this.sameId(this.readGuardianSchoolId(row), this.selectedSchoolId))
          .map((row) => {
            const firstName = String(row.firstName ?? row.first_name ?? '').trim();
            const middleName = String(row.middleName ?? row.middle_name ?? '').trim();
            const lastName = String(row.lastName ?? row.last_name ?? '').trim();
            const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || 'Tuteur';
            const familyCode = String(row.familyCode ?? row.family_code ?? '').trim();
            return {
              id: String(row.id ?? '').trim(),
              label: familyCode ? `${fullName} (${familyCode})` : fullName,
              searchText: `${fullName} ${familyCode}`.trim()
            };
          })
          .filter((item) => !!item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.classroomOptions = classrooms
          .map((row) => this.mapClassroomOption(row))
          .filter((item) => !!item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.studentCategoryOptions = studentCategories
          .filter((row) => row.active !== false)
          .map((row) => ({
            id: String(row.id ?? '').trim(),
            label: String(row.name ?? '').trim() || String(row.code ?? '').trim()
          }))
          .filter((item) => !!item.id && !!item.label)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        if (this.enrollmentForm.studentCategoryId) {
          const selectedCategory = this.studentCategoryOptions.find((item) =>
            this.sameId(item.id, this.enrollmentForm.studentCategoryId)
          );
          this.studentCategorySearchTerm = selectedCategory?.label ?? '';
          if (!selectedCategory) {
            this.enrollmentForm.studentCategoryId = '';
          }
        }

        this.countryOptions = countries.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        this.cityOptions = cities.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        this.communeOptions = communes.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        this.isLoadingEnrollmentReferences = false;
      },
      error: () => {
        this.guardianOptions = [];
        this.classroomOptions = [];
        this.studentCategoryOptions = [];
        this.countryOptions = [];
        this.cityOptions = [];
        this.communeOptions = [];
        this.isLoadingEnrollmentReferences = false;
      }
    });
  }

  private loadEnrollments(): void {
    if (!this.selectedSchoolId || !this.selectedYearId) {
      this.students = [];
      this.isLoadingEnrollments = false;
      return;
    }

    this.isLoadingEnrollments = true;
    forkJoin({
      enrollments: this.enrollmentService.getByAcademicYearAndSchool({
        academicYearId: this.selectedYearId,
        schoolId: this.selectedSchoolId,
        page: 0,
        size: 500
      }),
      classrooms: this.classroomService.getAll(this.selectedSchoolId)
    }).subscribe({
      next: ({ enrollments, classrooms }) => {
        this.applyEnrollmentRows(enrollments, classrooms);
        this.isLoadingEnrollments = false;
      },
      error: () => {
        this.students = [];
        this.isLoadingEnrollments = false;
        this.loadError = "Impossible de charger les inscriptions.";
      }
    });
  }

  private applyEnrollmentRows(
    enrollments: EnrollmentApiResponse[],
    classrooms: ClassroomApiResponse[]
  ): void {
    const classById = new Map(
      classrooms
        .map((item) => this.mapClassroomOption(item))
        .filter((item) => !!item.id)
        .map((item) => [item.id, item.label] as const)
    );

    this.students = enrollments
      .map((row) => this.mapEnrollmentToStudentRow(row, classById))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
    this.currentPage = 1;
  }

  private mapGuardianToTutorRow(row: GuardianApiResponse): TutorRow {
    const firstName = String(row.firstName ?? row.first_name ?? '').trim();
    const middleName = String(row.middleName ?? row.middle_name ?? '').trim();
    const lastName = String(row.lastName ?? row.last_name ?? '').trim();
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || 'Tuteur sans nom';

    const phoneNumber = String(row.phoneNumber ?? row.phone_number ?? '').trim();
    const phone = phoneNumber || '—';
    const emailRaw = String(row.email ?? '').trim();
    const email = emailRaw || '—';
    const familyCode = String(row.familyCode ?? row.family_code ?? '').trim() || '—';
    const genderValue = String(row.gender ?? '').toUpperCase();
    const gender: 'MALE' | 'FEMALE' | 'OTHER' =
      genderValue === 'FEMALE' ? 'FEMALE' : genderValue === 'OTHER' ? 'OTHER' : 'MALE';
    const occupation = String(row.occupation ?? '').trim();
    const employer = String(row.employer ?? '').trim();
    const address = String(row.address ?? '').trim();
    const comment = String(row.comment ?? '').trim();
    const active = this.readBoolean(row.active, true);

    return {
      id: String(row.id ?? '').trim(),
      fullName,
      firstName,
      middleName,
      lastName,
      gender,
      phone,
      phoneNumber,
      email,
      familyCode,
      occupation,
      employer,
      address,
      comment,
      active,
      linkedStudents: 0,
      status: active ? 'Actif' : 'Inactif'
    };
  }

  private mapClassroomOption(row: ClassroomApiResponse): ClassroomOption {
    const id = String(row.id ?? '').trim();
    const displayName = String(row.displayName ?? row.display_name ?? '').trim();
    const searchText = [
      displayName,
      String(row.description ?? '').trim(),
      String(row.academicLevelId ?? row.academic_level_id ?? '').trim(),
      String(row.academicSectionId ?? row.academic_section_id ?? '').trim(),
      String(row.academicOptionId ?? row.academic_option_id ?? '').trim(),
      String(row.classroomDesignationId ?? row.classroom_designation_id ?? '').trim(),
      id
    ]
      .filter(Boolean)
      .join(' ');
    return {
      id,
      label: displayName || (id ? `Classe ${id.slice(0, 8)}` : 'Classe'),
      searchText
    };
  }

  private mapEnrollmentToStudentRow(row: EnrollmentApiResponse, classById: Map<string, string>): StudentRow {
    const rowAny = row as Record<string, unknown>;
    const enrollmentNumber = this.readString(
      row.enrollmentNumber,
      row.enrollment_number
    );
    const classroomId =
      this.readString(row.classroomId, row.classroom_id) || this.readPathString(rowAny, 'classroom.id');
    const classroomLabel =
      this.readString(row.classroomName, row.classroom_name, row.classroomLabel) ||
      this.readPathString(rowAny, 'classroom.displayName') ||
      this.readPathString(rowAny, 'classroom.display_name') ||
      this.readPathString(rowAny, 'classroom.name') ||
      classById.get(classroomId) ||
      'Classe non definie';

    const identity = resolveEnrollmentStudentIdentity(rowAny);

    const tutorName =
      this.readString(row.guardianName, row.guardian_name, row.guardianFullName, row.guardian_full_name) ||
      this.readPathString(rowAny, 'guardian.fullName') ||
      this.readPathString(rowAny, 'guardian.full_name') ||
      this.buildFullNameFromPath(rowAny, 'guardian') ||
      this.readPathString(rowAny, 'guardian.name') ||
      '—';
    const tutorPhone =
      this.readString(row.guardianPhoneNumber, row.guardian_phone_number, row.guardianPhone) ||
      this.readPathString(rowAny, 'guardian.phoneNumber') ||
      this.readPathString(rowAny, 'guardian.phone_number') ||
      this.readPathString(rowAny, 'guardian.phone') ||
      '—';
    const category =
      this.readString(row.studentCategoryName, row.student_category_name) ||
      this.readPathString(rowAny, 'studentCategory.name') ||
      this.readPathString(rowAny, 'student_category.name') ||
      this.readPathString(rowAny, 'student.studentCategory.name') ||
      this.readPathString(rowAny, 'student.student_category.name') ||
      this.readPathString(rowAny, 'student.category.name') ||
      this.readPathString(rowAny, 'category.name') ||
      '—';
    const gender =
      this.readString(row.gender, row.studentGender, row.student_gender) ||
      this.readPathString(rowAny, 'student.gender') ||
      this.readPathString(rowAny, 'student.sex') ||
      '—';
    const birthDate =
      this.readString(row.birthDate, row.birth_date, row.studentBirthDate, row.student_birth_date) ||
      this.readPathString(rowAny, 'student.birthDate') ||
      this.readPathString(rowAny, 'student.birth_date');
    const photoCandidates = resolveEnrollmentPhotoUrls(rowAny);

    return {
      matricule: enrollmentNumber || this.readString(row.id) || '—',
      fullName: identity.fullName,
      firstName: identity.firstName,
      middleName: identity.middleName,
      lastName: identity.lastName,
      photoUrl: photoCandidates[0] ?? '',
      photoFallbackUrls: photoCandidates.slice(1),
      classe: classroomLabel,
      category,
      tutorName,
      tutorPhone,
      birthDate,
      gender,
      statut: this.readString(row.status) || 'ACTIVE'
    };
  }

  onStudentPhotoError(student: StudentRow): void {
    student.photoUrl = student.photoFallbackUrls.shift() ?? '';
  }

  private readNullableNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private readBoolean(value: unknown, fallback = false): boolean {
    if (value === true || value === false) {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return fallback;
  }

  private readGuardianSchoolId(row: GuardianApiResponse): string {
    return String(row.schoolId ?? row.school_id ?? '').trim();
  }

  private readString(...values: unknown[]): string {
    for (const value of values) {
      const normalized = String(value ?? '').trim();
      if (normalized) {
        return normalized;
      }
    }
    return '';
  }

  private formatDateForStudentMeta(value: string): string {
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return `${iso[3]}/${iso[2]}/${iso[1]}`;
    }
    return value;
  }

  private buildFullNameFromPath(source: unknown, rootPath: string): string {
    const firstName =
      this.readPathString(source, `${rootPath}.firstName`) || this.readPathString(source, `${rootPath}.first_name`);
    const middleName =
      this.readPathString(source, `${rootPath}.middleName`) || this.readPathString(source, `${rootPath}.middle_name`);
    const lastName =
      this.readPathString(source, `${rootPath}.lastName`) || this.readPathString(source, `${rootPath}.last_name`);
    return [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
  }

  private readPathString(source: unknown, path: string): string {
    const value = this.readPathValue(source, path);
    return this.readString(value);
  }

  private readPathValue(source: unknown, path: string): unknown {
    if (!source || typeof source !== 'object' || !path.trim()) {
      return undefined;
    }

    const segments = path.split('.').map((segment) => segment.trim()).filter(Boolean);
    let cursor: unknown = source;

    for (const segment of segments) {
      if (!cursor || typeof cursor !== 'object') {
        return undefined;
      }
      cursor = (cursor as Record<string, unknown>)[segment];
    }

    return cursor;
  }

  private sameId(a: unknown, b: unknown): boolean {
    return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private buildEmptyTutorForm(): TutorFormModel {
    return {
      firstName: '',
      middleName: '',
      lastName: '',
      gender: 'MALE',
      phoneNumber: '',
      email: '',
      occupation: '',
      employer: '',
      address: '',
      comment: '',
      active: true
    };
  }

  private buildEmptyEnrollmentForm(): EnrollmentFormModel {
    const now = new Date();
    const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

    return {
      lastName: '',
      middleName: '',
      firstName: '',
      gender: 'MALE',
      birthDate: '',
      birthCountryId: '',
      birthCityId: '',
      birthCommuneId: '',
      nationality: '',
      countryId: '',
      cityId: '',
      communeId: '',
      quarter: '',
      avenue: '',
      number: '',
      phoneNumber: '',
      email: '',
      studentComment: '',
      studentCategoryId: '',
      guardianId: '',
      classroomId: '',
      enrollmentDate: isoDate
    };
  }

  private resetEnrollmentSearchTerms(): void {
    this.birthCountrySearchTerm = '';
    this.birthCitySearchTerm = '';
    this.addressCountrySearchTerm = '';
    this.addressCitySearchTerm = '';
    this.addressCommuneSearchTerm = '';
    this.guardianSearchTerm = '';
    this.classroomSearchTerm = '';
    this.studentCategorySearchTerm = '';
    this.nationalitySearchTerm = '';
  }

  private closeEnrollmentDropdowns(): void {
    this.isBirthCountryDropdownOpen = false;
    this.isBirthCityDropdownOpen = false;
    this.isAddressCountryDropdownOpen = false;
    this.isAddressCityDropdownOpen = false;
    this.isAddressCommuneDropdownOpen = false;
    this.isGuardianDropdownOpen = false;
    this.isClassroomDropdownOpen = false;
    this.isStudentCategoryDropdownOpen = false;
    this.isNationalityDropdownOpen = false;
  }

  private webcamStream: MediaStream | null = null;

  private async requestWebcamStream(): Promise<MediaStream> {
    const preferredConstraints: MediaTrackConstraints = this.selectedCameraId
      ? {
          deviceId: { exact: this.selectedCameraId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      : {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        };

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: preferredConstraints,
        audio: false
      });
    } catch {
      return navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    }
  }

  private async refreshCameraOptions(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`
        }));

      this.availableCameras = cameras;
      if (this.webcamStream) {
        const trackDeviceId = this.webcamStream.getVideoTracks()[0]?.getSettings().deviceId ?? '';
        if (trackDeviceId) {
          this.selectedCameraId = trackDeviceId;
          return;
        }
      }
      if (!this.selectedCameraId && cameras.length > 0) {
        const nonVirtual = cameras.find((camera) => !/virtual|obs|snap|manycam|droidcam/i.test(camera.label));
        this.selectedCameraId = nonVirtual?.deviceId ?? cameras[0].deviceId;
      }
    } catch {
      // Ignore camera list errors, stream can still work.
    }
  }

  private bindWebcamStream(): void {
    const video = this.webcamVideoRef?.nativeElement;
    if (!video || !this.webcamStream) {
      return;
    }
    if (!this.webcamStream.active) {
      this.webcamError = 'Flux webcam inactif.';
      return;
    }
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = this.webcamStream;
    video.onloadedmetadata = () => {
      video.play().catch(() => {
        this.webcamError = 'Lecture webcam impossible.';
      });
    };
  }

  private scheduleBindWebcamStream(remainingRetries = 8): void {
    const videoReady = !!this.webcamVideoRef?.nativeElement;
    if (videoReady) {
      this.bindWebcamStream();
      return;
    }
    if (remainingRetries <= 0) {
      this.webcamError = 'Initialisation webcam trop lente. Reessayez.';
      return;
    }
    setTimeout(() => this.scheduleBindWebcamStream(remainingRetries - 1), 60);
  }

  private stopWebcam(): void {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach((track) => track.stop());
      this.webcamStream = null;
    }
    const video = this.webcamVideoRef?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
    this.isWebcamOpen = false;
    this.isStartingWebcam = false;
  }
}
