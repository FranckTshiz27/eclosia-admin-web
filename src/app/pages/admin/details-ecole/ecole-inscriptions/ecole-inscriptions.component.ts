import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AcademicYearApiResponse, AcademicYearService } from '../../../../services/academic-year.service';
import { CityOption, CityService } from '../../../../services/city.service';
import { ClassroomApiResponse, ClassroomService } from '../../../../services/classroom.service';
import { CommuneOption, CommuneService } from '../../../../services/commune.service';
import { CountryOption, CountryService } from '../../../../services/country.service';
import { CreateEnrollmentDto, EnrollmentApiResponse, EnrollmentService } from '../../../../services/enrollment.service';
import { CreateGuardianDto, GuardianApiResponse, GuardianService, UpdateGuardianDto } from '../../../../services/guardian.service';
import { SchoolApiResponse, SchoolService } from '../../../../services/school.service';

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
  classe: string;
  statut: string;
}

interface StatCard {
  label: string;
  value: string;
  icon: string;
}

interface InscriptionsTab {
  id: 'inscriptions' | 'tuteurs';
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
  guardianId: string;
  classroomId: string;
  enrollmentDate: string;
}

@Component({
  selector: 'app-ecole-inscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-inscriptions.component.html',
  styleUrl: './ecole-inscriptions.component.css'
})
export class EcoleInscriptionsComponent implements OnInit, OnChanges {
  @Input() schoolId = '';
  @Output() schoolIdChange = new EventEmitter<string>();

  readonly tabs: InscriptionsTab[] = [
    { id: 'inscriptions', label: 'Inscription', icon: 'bi-person-plus' },
    { id: 'tuteurs', label: 'Tuteurs', icon: 'bi-people' }
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
  currentPage = 1;
  tutorCurrentPage = 1;
  isEnrollmentModalOpen = false;
  isEnrollmentFormSubmitted = false;
  isSavingEnrollment = false;
  enrollmentSaveError = '';
  isTutorModalOpen = false;
  isTutorEditMode = false;
  editingTutorId = '';
  isSavingTutor = false;
  tutorSaveError = '';
  isTutorFormSubmitted = false;

  isLoadingSchools = false;
  isLoadingYears = false;
  isLoadingTutors = false;
  isLoadingEnrollments = false;
  isLoadingEnrollmentReferences = false;
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
  readonly studentSearchMaxLength = 80;
  readonly tutorSearchMaxLength = 80;
  readonly tutorCommentMaxLength = 300;
  readonly pageSize = 5;
  readonly tutorPageSize = 5;
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
    private readonly schoolService: SchoolService,
    private readonly academicYearService: AcademicYearService,
    private readonly guardianService: GuardianService,
    private readonly classroomService: ClassroomService,
    private readonly countryService: CountryService,
    private readonly cityService: CityService,
    private readonly communeService: CommuneService,
    private readonly enrollmentService: EnrollmentService
  ) {}

  ngOnInit(): void {
    this.loadSchools();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schoolId'] && String(this.schoolId || '').trim() && this.schoolId !== this.selectedSchoolId) {
      this.selectedSchoolId = this.schoolId;
      this.loadCurrentYears();
    }
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
    this.tutorCurrentPage = 1;
    this.loadTutors();
    this.loadEnrollments();
  }

  onStudentSearchChange(): void {
    this.currentPage = 1;
  }

  onTutorSearchChange(): void {
    this.tutorCurrentPage = 1;
  }

  setActiveTab(tabId: InscriptionsTab['id']): void {
    this.activeTab = tabId;
  }

  get selectedSchool(): SchoolOption | undefined {
    return this.schools.find((school) => school.id === this.selectedSchoolId);
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
    const base = this.addressCommuneOptions;
    const term = this.normalize(this.addressCommuneSearchTerm);
    if (!term) return base;
    return base.filter((item) => this.normalize(item.name).includes(term));
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

  get filteredStudents(): StudentRow[] {
    const term = this.normalize(this.studentSearchTerm);
    if (!term) {
      return this.students;
    }

    return this.students.filter((student) => {
      return (
        this.normalize(student.matricule).includes(term) ||
        this.normalize(student.fullName).includes(term) ||
        this.normalize(student.classe).includes(term) ||
        this.normalize(student.statut).includes(term)
      );
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
    const selectedSchool = this.selectedSchool;
    return [
      {
        label: 'Ecole selectionnee',
        value: selectedSchool?.name ?? '—',
        icon: 'bi-building'
      },
      {
        label: 'Capacite eleves',
        value:
          selectedSchool?.capacity !== null && selectedSchool?.capacity !== undefined
            ? String(selectedSchool.capacity)
            : '—',
        icon: 'bi-people-fill'
      },
      {
        label: 'Salles declarees',
        value:
          selectedSchool?.classrooms !== null && selectedSchool?.classrooms !== undefined
            ? String(selectedSchool.classrooms)
            : '—',
        icon: 'bi-door-open'
      },
      {
        label: 'Annees courantes',
        value: String(this.yearOptions.length),
        icon: 'bi-calendar3'
      },
      {
        label: 'Eleves affiches',
        value: String(this.filteredStudents.length),
        icon: 'bi-person-vcard'
      }
    ];
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
    this.isEnrollmentModalOpen = true;
    this.resetEnrollmentSearchTerms();
    this.loadEnrollmentReferences();
  }

  openReinscription(): void {
    // A brancher au workflow de reinscription
  }

  closeEnrollmentModal(): void {
    this.isEnrollmentModalOpen = false;
    this.isSavingEnrollment = false;
    this.isEnrollmentFormSubmitted = false;
    this.enrollmentSaveError = '';
  }

  saveEnrollment(form: NgForm): void {
    this.isEnrollmentFormSubmitted = true;
    this.enrollmentSaveError = '';
    if (form.invalid) {
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
      guardianId: this.enrollmentForm.guardianId,
      academicYearId: this.selectedYearId,
      classroomId: this.enrollmentForm.classroomId,
      enrollmentDate: this.enrollmentForm.enrollmentDate
    };

    this.isSavingEnrollment = true;
    this.enrollmentService.create(payload).subscribe({
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

  openNewTutor(): void {
    if (!this.selectedSchoolId || !this.selectedYearId) {
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
      this.isLoadingTutors = false;
      this.isLoadingEnrollments = false;
      return;
    }

    this.isLoadingYears = true;
    this.isLoadingTutors = true;
    this.loadError = '';
    this.academicYearService.getAll({ schoolId: this.selectedSchoolId }).subscribe({
      next: (rows: AcademicYearApiResponse[]) => {
        this.yearOptions = rows
          .filter((row) => this.isCurrent(row.current))
          .map((row) => {
            const id = String(row.id ?? '');
            const code = (row.code ?? '').trim();
            return {
              id,
              code,
              label: code || this.buildYearLabel(row)
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
        this.isLoadingTutors = false;
        this.isLoadingEnrollments = false;
        this.yearOptions = [];
        this.selectedYearId = '';
        this.tutors = [];
        this.students = [];
        this.loadError = 'Impossible de charger les annees courantes.';
      }
    });
  }

  private loadTutors(): void {
    if (!this.selectedSchoolId || !this.selectedYearId) {
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
      return;
    }

    this.isLoadingEnrollmentReferences = true;
    forkJoin({
      guardians: this.guardianService.getAll(),
      classrooms: this.classroomService.getAll(this.selectedSchoolId),
      countries: this.countryService.getAll(),
      cities: this.cityService.getAll(),
      communes: this.communeService.getAll()
    }).subscribe({
      next: ({ guardians, classrooms, countries, cities, communes }) => {
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

        this.countryOptions = countries.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        this.cityOptions = cities.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        this.communeOptions = communes.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        this.isLoadingEnrollmentReferences = false;
      },
      error: () => {
        this.guardianOptions = [];
        this.classroomOptions = [];
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
      enrollments: this.enrollmentService.getAll({ academicYearId: this.selectedYearId }),
      classrooms: this.classroomService.getAll(this.selectedSchoolId)
    }).subscribe({
      next: ({ enrollments, classrooms }) => {
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
        this.isLoadingEnrollments = false;
      },
      error: () => {
        this.students = [];
        this.isLoadingEnrollments = false;
        this.loadError = "Impossible de charger les inscriptions.";
      }
    });
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
    const enrollmentNumber = this.readString(
      row.enrollmentNumber,
      row.enrollment_number
    );
    const classroomId = this.readString(row.classroomId, row.classroom_id);
    const classroomLabel =
      this.readString(row.classroomName, row.classroom_name, row.classroomLabel) ||
      classById.get(classroomId) ||
      'Classe non definie';

    const composedFullName =
      this.readString(row.fullName, row.full_name, row.studentFullName, row.student_full_name) ||
      [
        this.readString(row.studentLastName, row.student_last_name, row.lastName, row.last_name),
        this.readString(row.studentMiddleName, row.student_middle_name, row.middleName, row.middle_name),
        this.readString(row.studentFirstName, row.student_first_name, row.firstName, row.first_name)
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

    return {
      matricule: enrollmentNumber || this.readString(row.id) || '—',
      fullName: composedFullName || 'Eleve sans nom',
      classe: classroomLabel,
      statut: this.readString(row.status) || 'ACTIVE'
    };
  }

  private isCurrent(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private buildYearLabel(row: AcademicYearApiResponse): string {
    const start = String(row.startDate ?? row.start_date ?? '');
    const end = String(row.endDate ?? row.end_date ?? '');
    const s = start.match(/^(\d{4})/)?.[1];
    const e = end.match(/^(\d{4})/)?.[1];
    if (s && e) {
      return `${s}-${e}`;
    }
    return 'Annee courante';
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
  }
}
