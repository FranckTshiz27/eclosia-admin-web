import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AcademicFeeApiResponse,
  AcademicFeeService
} from '../../../services/academic-fee.service';
import {
  AcademicSectionApiResponse,
  AcademicSectionService
} from '../../../services/academic-section.service';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../services/academic-year.service';
import { ClassroomApiResponse, ClassroomService } from '../../../services/classroom.service';
import {
  CurrencyApiResponse,
  CurrencyService
} from '../../../services/currency.service';
import {
  CurrencyRateApiResponse,
  CurrencyRateService
} from '../../../services/currency-rate.service';
import {
  EnrollmentApiResponse,
  EnrollmentService
} from '../../../services/enrollment.service';
import {
  FeeCategoryApiResponse,
  FeeCategoryService
} from '../../../services/fee-category.service';
import {
  PaymentInstallmentApiResponse,
  PaymentInstallmentService
} from '../../../services/payment-installment.service';
import {
  CreatePaymentDto,
  PaymentMethod,
  PaymentService
} from '../../../services/payment.service';
import { SchoolApiResponse, SchoolService } from '../../../services/school.service';
import {
  SchoolCurrencyApiResponse,
  SchoolCurrencyService
} from '../../../services/school-currency.service';
import {
  StudentCategoryApiResponse,
  StudentCategoryService
} from '../../../services/student-category.service';

type PaymentStep = 1 | 2 | 3;

interface SelectOption {
  value: string;
  label: string;
}

interface SchoolCurrencyOption {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
}

interface PaymentStudent {
  id: string;
  enrollmentId: string;
  fullName: string;
  enrollmentNumber: string;
  registrationNumber: string;
  classroomLabel: string;
  sectionLabel: string;
  classFilterValue: string;
  sectionFilterValue: string;
  studentCategoryName: string;
  studentCategoryId: string;
  classroomId: string;
  statusLabel: string;
  statusTone: 'active' | 'inactive';
}

interface FeeOption {
  id: string;
  feeCategoryId: string;
  installmentId: string;
  title: string;
  periodLabel: string;
  amount: number;
}

interface InstallmentChartItem {
  label: string;
  code: string;
  paid: number;
  due: number;
  color: string;
}

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-ecole-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-payments.component.html',
  styleUrl: './ecole-payments.component.css'
})
export class EcolePaymentsComponent implements OnInit {
  selectedSchoolId = '';
  selectedYearId = '';
  currentStep: PaymentStep = 1;
  studentSearchTerm = '';
  classFilter = 'all';
  sectionFilter = 'all';
  feeDropdownOpen = false;
  selectedStudent: PaymentStudent | null = null;
  selectedFeeOptionId = '';
  amountToPay = '';
  selectedPaymentMethod: PaymentMethod = 'CASH';
  selectedPaymentCurrencyId = '';
  comment = '';
  paymentDate = '';
  paymentTime = '';

  isLoadingSchools = false;
  isLoadingContext = false;
  isLoadingStudents = false;
  isSaving = false;
  loadError = '';
  saveError = '';
  confirmationReference = '';

  schools: SelectOption[] = [];
  yearOptions: SelectOption[] = [];
  schoolCurrencies: SchoolCurrencyOption[] = [];
  students: PaymentStudent[] = [];
  feeCategoryOptions: SelectOption[] = [];
  installmentOptions: SelectOption[] = [];
  classFilterOptions: SelectOption[] = [{ value: 'all', label: 'Toutes les classes' }];
  sectionFilterOptions: SelectOption[] = [{ value: 'all', label: 'Toutes les sections' }];

  private academicFees: AcademicFeeApiResponse[] = [];
  private classrooms: ClassroomApiResponse[] = [];
  private sections: AcademicSectionApiResponse[] = [];
  private studentCategories: StudentCategoryApiResponse[] = [];
  private currencyRates: CurrencyRateApiResponse[] = [];
  private paidByFeeKey = new Map<string, number>();

  readonly paymentMethods: PaymentMethodOption[] = [
    { value: 'CASH', label: 'Especes', icon: 'bi-cash-stack' },
    { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: 'bi-bank' },
    { value: 'MOBILE_MONEY', label: 'Mobile money', icon: 'bi-phone' },
    { value: 'CHECK', label: 'Cheque', icon: 'bi-receipt' },
    { value: 'OTHER', label: 'Autre', icon: 'bi-three-dots' }
  ];

  readonly steps = [
    { number: 1, title: 'Informations du paiement', hint: 'Saisir les informations' },
    { number: 2, title: 'Verification', hint: 'Verifier le recapitulatif' },
    { number: 3, title: 'Confirmation', hint: 'Enregistrer le paiement' }
  ];

  readonly chartColors = ['#22c55e', '#0a53de', '#f59e0b', '#8b5cf6', '#ef4444'];

  constructor(
    private readonly schoolService: SchoolService,
    private readonly academicYearService: AcademicYearService,
    private readonly enrollmentService: EnrollmentService,
    private readonly classroomService: ClassroomService,
    private readonly academicSectionService: AcademicSectionService,
    private readonly studentCategoryService: StudentCategoryService,
    private readonly feeCategoryService: FeeCategoryService,
    private readonly paymentInstallmentService: PaymentInstallmentService,
    private readonly academicFeeService: AcademicFeeService,
    private readonly paymentService: PaymentService,
    private readonly currencyService: CurrencyService,
    private readonly schoolCurrencyService: SchoolCurrencyService,
    private readonly currencyRateService: CurrencyRateService
  ) {}

  ngOnInit(): void {
    this.initPaymentDateTime();
    this.loadSchools();
  }

  get primaryCurrency(): SchoolCurrencyOption | undefined {
    return this.schoolCurrencies.find((item) => item.isDefault);
  }

  get selectedSchoolLabel(): string {
    return this.schools.find((item) => item.value === this.selectedSchoolId)?.label ?? '—';
  }

  get selectedYearLabel(): string {
    return this.yearOptions.find((item) => item.value === this.selectedYearId)?.label ?? '—';
  }

  get selectedCurrency(): SchoolCurrencyOption | undefined {
    return (
      this.schoolCurrencies.find((item) => item.id === this.selectedPaymentCurrencyId) ??
      this.primaryCurrency
    );
  }

  get selectedCurrencyCode(): string {
    return this.selectedCurrency?.code ?? 'FC';
  }

  get filteredStudents(): PaymentStudent[] {
    const term = this.normalize(this.studentSearchTerm);
    return this.students
      .filter((student) => {
        const matchesClass = this.classFilter === 'all' || student.classFilterValue === this.classFilter;
        const matchesSection =
          this.sectionFilter === 'all' || student.sectionFilterValue === this.sectionFilter;
        const matchesSearch =
          !term ||
          this.normalize(student.fullName).includes(term) ||
          this.normalize(student.enrollmentNumber).includes(term) ||
          this.normalize(student.registrationNumber).includes(term) ||
          this.normalize(student.classroomLabel).includes(term);
        return matchesClass && matchesSection && matchesSearch;
      })
      .slice(0, 8);
  }

  get feeOptions(): FeeOption[] {
    if (!this.selectedStudent) {
      return [];
    }

    const options: FeeOption[] = [];
    for (const category of this.feeCategoryOptions) {
      for (const installment of this.installmentOptions) {
        const amount = this.resolveFeeAmountFor(category.value, installment.value);
        if (amount <= 0) {
          continue;
        }
        const periodLabel = installment.label;
        options.push({
          id: `${category.value}:${installment.value}`,
          feeCategoryId: category.value,
          installmentId: installment.value,
          title: `${category.label} - ${this.extractInstallmentShortLabel(periodLabel)}`,
          periodLabel,
          amount
        });
      }
    }
    return options;
  }

  get selectedFeeOption(): FeeOption | undefined {
    return this.feeOptions.find((item) => item.id === this.selectedFeeOptionId);
  }

  get selectedFeeCategoryId(): string {
    return this.selectedFeeOption?.feeCategoryId ?? '';
  }

  get selectedInstallmentId(): string {
    return this.selectedFeeOption?.installmentId ?? '';
  }

  get selectedFeeCategoryLabel(): string {
    return this.feeCategoryOptions.find((item) => item.value === this.selectedFeeCategoryId)?.label ?? '—';
  }

  get selectedInstallmentLabel(): string {
    return this.selectedFeeOption?.periodLabel ?? '—';
  }

  get amountDue(): number {
    return this.selectedFeeOption?.amount ?? 0;
  }

  get amountPaid(): number {
    return this.resolvePaidAmount(this.selectedFeeCategoryId, this.selectedInstallmentId);
  }

  get amountRemaining(): number {
    return Math.max(this.amountDue - this.amountPaid, 0);
  }

  get parsedAmountToPay(): number {
    const amount = Number(this.amountToPay);
    return Number.isFinite(amount) ? amount : 0;
  }

  get totalToPayLabel(): string {
    return this.formatMoney(this.parsedAmountToPay);
  }

  get selectedPaymentMethodLabel(): string {
    return this.paymentMethods.find((item) => item.value === this.selectedPaymentMethod)?.label ?? '—';
  }

  get canGoNext(): boolean {
    if (this.currentStep === 1) {
      return (
        !!this.selectedStudent &&
        !!this.selectedFeeOptionId &&
        !!this.selectedPaymentCurrencyId &&
        this.parsedAmountToPay > 0 &&
        this.parsedAmountToPay <= this.amountRemaining &&
        !!this.paymentDate &&
        !!this.paymentTime
      );
    }
    return true;
  }

  get installmentChartItems(): InstallmentChartItem[] {
    if (!this.selectedStudent) {
      return [];
    }

    return this.installmentOptions.map((installment, index) => {
      const categoryId = this.selectedFeeCategoryId || this.feeCategoryOptions[0]?.value || '';
      const due = categoryId ? this.resolveFeeAmountFor(categoryId, installment.value) : 0;
      const paid = this.resolvePaidAmount(categoryId, installment.value);
      const code = installment.label.match(/T\d+/)?.[0] ?? `T${index + 1}`;
      return {
        label: installment.label,
        code,
        paid,
        due,
        color: this.chartColors[index % this.chartColors.length]
      };
    });
  }

  get totalInstallmentPaid(): number {
    return this.installmentChartItems.reduce((sum, item) => sum + item.paid, 0);
  }

  get totalInstallmentDue(): number {
    return this.installmentChartItems.reduce((sum, item) => sum + item.due, 0);
  }

  get chartPaidPercent(): number {
    if (!this.totalInstallmentDue) {
      return 0;
    }
    return Math.min(100, Math.round((this.totalInstallmentPaid / this.totalInstallmentDue) * 100));
  }

  get chartCircumference(): number {
    return 2 * Math.PI * 42;
  }

  get chartPaidOffset(): number {
    return this.chartCircumference * (1 - this.chartPaidPercent / 100);
  }

  onSchoolChange(): void {
    this.resetFlow();
    this.bootstrapContext();
  }

  onYearChange(): void {
    this.resetFlow(false);
    this.loadStudentsAndFees();
  }

  resetStudentFilters(): void {
    this.classFilter = 'all';
    this.sectionFilter = 'all';
  }

  selectStudent(student: PaymentStudent): void {
    this.selectedStudent = student;
    this.studentSearchTerm = student.fullName;
    this.syncFeeSelection();
    this.loadPaidAmounts();
  }

  clearStudent(): void {
    this.selectedStudent = null;
    this.studentSearchTerm = '';
    this.selectedFeeOptionId = '';
    this.amountToPay = '';
    this.feeDropdownOpen = false;
  }

  selectFeeOption(option: FeeOption): void {
    this.selectedFeeOptionId = option.id;
    this.feeDropdownOpen = false;
    this.refreshAmountToPay();
  }

  toggleFeeDropdown(): void {
    if (!this.selectedStudent || this.feeOptions.length === 0) {
      return;
    }
    this.feeDropdownOpen = !this.feeDropdownOpen;
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
  }

  onAmountToPayChange(): void {
    const max = this.amountRemaining;
    if (this.parsedAmountToPay > max) {
      this.amountToPay = String(max);
    }
  }

  goNext(): void {
    if (!this.canGoNext || this.currentStep >= 3) {
      return;
    }
    this.currentStep = (this.currentStep + 1) as PaymentStep;
  }

  goBack(): void {
    if (this.currentStep > 1) {
      this.currentStep = (this.currentStep - 1) as PaymentStep;
    }
  }

  cancelFlow(): void {
    this.resetFlow();
    this.currentStep = 1;
    this.initPaymentDateTime();
  }

  submitPayment(): void {
    if (!this.selectedStudent || !this.selectedSchoolId || !this.selectedYearId || !this.selectedFeeOption) {
      return;
    }

    const dto: CreatePaymentDto = {
      schoolId: this.selectedSchoolId,
      academicYearId: this.selectedYearId,
      enrollmentId: this.selectedStudent.enrollmentId,
      feeCategoryId: this.selectedFeeOption.feeCategoryId,
      paymentInstallmentId: this.selectedFeeOption.installmentId,
      amount: this.parsedAmountToPay,
      paymentMethod: this.selectedPaymentMethod,
      paymentCurrencyId: this.selectedPaymentCurrencyId || null,
      comment: this.comment.trim() || undefined,
      paymentDate: this.buildPaymentDateTime()
    };

    this.isSaving = true;
    this.saveError = '';

    this.paymentService.create(dto).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.confirmationReference = String(response.id ?? `PAY-${Date.now()}`);
        this.currentStep = 3;
      },
      error: () => {
        this.isSaving = false;
        this.confirmationReference = `PAY-${Date.now()}`;
        this.currentStep = 3;
        this.saveError =
          "L'API de paiement n'est pas encore disponible. Le flux a ete simule localement.";
      }
    });
  }

  startNewPayment(): void {
    this.resetFlow(false);
    this.confirmationReference = '';
    this.saveError = '';
    this.currentStep = 1;
    this.initPaymentDateTime();
  }

  formatMoney(value: number, currencyCode?: string): string {
    const code = currencyCode ?? this.selectedCurrencyCode;
    const formatted = this.formatAmount(value);
    return code ? `${formatted} ${code}` : formatted;
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private initPaymentDateTime(): void {
    const now = new Date();
    this.paymentDate = now.toISOString().slice(0, 10);
    this.paymentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  private buildPaymentDateTime(): string {
    return `${this.paymentDate}T${this.paymentTime}:00`;
  }

  private loadSchools(): void {
    this.isLoadingSchools = true;
    this.schoolService.getAll().subscribe({
      next: (rows: SchoolApiResponse[]) => {
        this.schools = rows
          .map((row) => ({
            value: String(row.id ?? ''),
            label: (row.name ?? '').trim() || 'Ecole sans nom'
          }))
          .filter((item) => item.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
        this.selectedSchoolId = this.schools[0]?.value ?? '';
        this.isLoadingSchools = false;
        this.bootstrapContext();
      },
      error: () => {
        this.isLoadingSchools = false;
        this.loadError = 'Impossible de charger les ecoles.';
      }
    });
  }

  private bootstrapContext(): void {
    if (!this.selectedSchoolId) {
      return;
    }

    this.isLoadingContext = true;
    this.loadError = '';

    forkJoin({
      years: this.academicYearService.getAll({ schoolId: this.selectedSchoolId }).pipe(catchError(() => of([]))),
      categories: this.feeCategoryService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      installments: this.paymentInstallmentService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      currencies: this.currencyService.getAll().pipe(catchError(() => of([]))),
      schoolCurrencies: this.schoolCurrencyService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      rates: this.currencyRateService.getAll({ schoolId: this.selectedSchoolId }).pipe(catchError(() => of([]))),
      studentCategories: this.studentCategoryService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      sections: this.academicSectionService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ years, categories, installments, currencies, schoolCurrencies, rates, studentCategories, sections }) => {
        this.yearOptions = (years as AcademicYearApiResponse[])
          .map((row) => ({ value: String(row.id ?? ''), label: this.buildYearLabel(row) }))
          .filter((item) => item.value)
          .sort((a, b) => b.label.localeCompare(a.label, 'fr'));
        this.selectedYearId = this.yearOptions[0]?.value ?? '';

        this.feeCategoryOptions = (categories as FeeCategoryApiResponse[])
          .map((row) => ({
            value: String(row.id ?? ''),
            label: (row.name ?? '').trim() || (row.code ?? '').trim()
          }))
          .filter((item) => item.value && item.label);

        this.installmentOptions = (installments as PaymentInstallmentApiResponse[])
          .map((row) => ({
            value: String(row.id ?? ''),
            label: this.buildInstallmentLabel(row)
          }))
          .filter((item) => item.value);

        const currencyMeta = new Map(
          (currencies as CurrencyApiResponse[]).map((row) => [
            String(row.id ?? ''),
            {
              code: (row.code ?? '').trim().toUpperCase(),
              name: (row.name ?? '').trim(),
              symbol: (row.symbol ?? '').trim()
            }
          ])
        );

        this.schoolCurrencies = (schoolCurrencies as SchoolCurrencyApiResponse[])
          .map((row) => {
            const currencyId = String(row.currencyId ?? row.currency_id ?? '');
            const meta = currencyMeta.get(currencyId);
            if (!currencyId || !meta) {
              return null;
            }
            return {
              id: currencyId,
              code: meta.code,
              name: meta.name,
              symbol: meta.symbol,
              isDefault: row.isDefault === true || row.is_default === true
            };
          })
          .filter((item): item is SchoolCurrencyOption => !!item);

        this.currencyRates = rates as CurrencyRateApiResponse[];
        this.studentCategories = studentCategories as StudentCategoryApiResponse[];
        this.sections = sections as AcademicSectionApiResponse[];
        this.selectedPaymentCurrencyId = this.primaryCurrency?.id ?? this.schoolCurrencies[0]?.id ?? '';
        this.isLoadingContext = false;
        this.loadStudentsAndFees();
      },
      error: () => {
        this.isLoadingContext = false;
        this.loadError = 'Impossible de charger les donnees de reference.';
      }
    });
  }

  private loadStudentsAndFees(): void {
    if (!this.selectedSchoolId || !this.selectedYearId) {
      this.students = [];
      this.academicFees = [];
      return;
    }

    this.isLoadingStudents = true;

    forkJoin({
      enrollments: this.enrollmentService
        .getByAcademicYearAndSchool({
          schoolId: this.selectedSchoolId,
          academicYearId: this.selectedYearId,
          size: 500
        })
        .pipe(catchError(() => of([]))),
      classrooms: this.classroomService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      fees: this.academicFeeService
        .getAll({ schoolId: this.selectedSchoolId, academicYearId: this.selectedYearId })
        .pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ enrollments, classrooms, fees }) => {
        this.classrooms = classrooms as ClassroomApiResponse[];
        this.academicFees = fees as AcademicFeeApiResponse[];
        this.students = (enrollments as EnrollmentApiResponse[])
          .map((row) => this.mapEnrollmentToStudent(row))
          .filter((item) => item.id)
          .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
        this.rebuildStudentFilters();
        this.isLoadingStudents = false;
        this.syncFeeSelection();
      },
      error: () => {
        this.students = [];
        this.isLoadingStudents = false;
      }
    });
  }

  private rebuildStudentFilters(): void {
    const classes = Array.from(new Set(this.students.map((item) => item.classFilterValue).filter(Boolean))).sort();
    const sections = Array.from(new Set(this.students.map((item) => item.sectionFilterValue).filter(Boolean))).sort();
    this.classFilterOptions = [
      { value: 'all', label: 'Toutes les classes' },
      ...classes.map((value) => ({ value, label: value }))
    ];
    this.sectionFilterOptions = [
      { value: 'all', label: 'Toutes les sections' },
      ...sections.map((value) => ({ value, label: value }))
    ];
  }

  private loadPaidAmounts(): void {
    if (!this.selectedStudent) {
      this.paidByFeeKey.clear();
      return;
    }

    this.paymentService
      .getAll({
        schoolId: this.selectedSchoolId,
        academicYearId: this.selectedYearId,
        enrollmentId: this.selectedStudent.enrollmentId
      })
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (rows) => {
          this.paidByFeeKey.clear();
          rows.forEach((row) => {
            const key = this.buildFeeKey(
              String(row.feeCategoryId ?? row.fee_category_id ?? ''),
              String(row.paymentInstallmentId ?? row.payment_installment_id ?? '')
            );
            const current = this.paidByFeeKey.get(key) ?? 0;
            this.paidByFeeKey.set(key, current + Number(row.amount ?? 0));
          });
          this.refreshAmountToPay();
        }
      });
  }

  private mapEnrollmentToStudent(row: EnrollmentApiResponse): PaymentStudent {
    const id = String(row.studentId ?? row.student_id ?? row.id ?? '');
    const enrollmentId = String(row.id ?? '');
    const firstName = String(row.firstName ?? row.first_name ?? row.studentFirstName ?? row.student_first_name ?? '').trim();
    const middleName = String(row.middleName ?? row.middle_name ?? row.studentMiddleName ?? row.student_middle_name ?? '').trim();
    const lastName = String(row.lastName ?? row.last_name ?? row.studentLastName ?? row.student_last_name ?? '').trim();
    const fullName =
      String(row.fullName ?? row.full_name ?? row.studentFullName ?? row.student_full_name ?? '').trim() ||
      [firstName, middleName, lastName].filter(Boolean).join(' ').trim() ||
      'Eleve';
    const classroomId = String(row.classroomId ?? row.classroom_id ?? '');
    const classroom = this.classrooms.find((item) => String(item.id ?? '') === classroomId);
    const classroomLabel =
      String(row.classroomName ?? row.classroom_name ?? row.classroomLabel ?? '').trim() ||
      String(classroom?.displayName ?? classroom?.display_name ?? '').trim() ||
      '—';
    const sectionId = String(classroom?.academicSectionId ?? classroom?.academic_section_id ?? '');
    const sectionRow = this.sections.find((item) => String(item.id ?? '') === sectionId);
    const sectionLabel =
      (sectionRow?.name ?? '').trim() || (sectionRow?.code ?? '').trim() || this.extractSectionFromClassroom(classroomLabel);
    const categoryName = String(row.studentCategoryName ?? row.student_category_name ?? '').trim();
    const categoryCode = String(row.studentCategoryCode ?? row.student_category_code ?? '').trim();
    const category = this.studentCategories.find(
      (item) => (item.name ?? '').trim() === categoryName || (item.code ?? '').trim() === categoryCode
    );
    const status = String(row.status ?? '').trim().toLowerCase();
    const isActive = !status || status === 'active' || status === 'actif';
    const enrollmentNumber = String(row.enrollmentNumber ?? row.enrollment_number ?? '').trim() || '—';

    return {
      id,
      enrollmentId,
      fullName,
      enrollmentNumber,
      registrationNumber: enrollmentId ? `INS-${enrollmentId.slice(0, 8).toUpperCase()}` : '—',
      classroomLabel,
      sectionLabel,
      classFilterValue: classroomLabel,
      sectionFilterValue: sectionLabel,
      studentCategoryName: categoryName || categoryCode || '—',
      studentCategoryId: String(category?.id ?? ''),
      classroomId,
      statusLabel: isActive ? 'Actif' : 'Inactif',
      statusTone: isActive ? 'active' : 'inactive'
    };
  }

  private resolveFeeAmountFor(categoryId: string, installmentId: string): number {
    if (!this.selectedStudent || !categoryId || !installmentId) {
      return 0;
    }

    const classroom = this.classrooms.find((item) => String(item.id ?? '') === this.selectedStudent?.classroomId);
    const levelId = String(classroom?.academicLevelId ?? classroom?.academic_level_id ?? '');
    const sectionId = String(classroom?.academicSectionId ?? classroom?.academic_section_id ?? '');
    const optionId = String(classroom?.academicOptionId ?? classroom?.academic_option_id ?? '');

    const matches = this.academicFees.filter((fee) => {
      const sameCategory = String(fee.feeCategoryId ?? fee.fee_category_id ?? '') === categoryId;
      const sameInstallment = String(fee.paymentInstallmentId ?? fee.payment_installment_id ?? '') === installmentId;
      const sameStudentCategory =
        !this.selectedStudent?.studentCategoryId ||
        String(fee.studentCategoryId ?? fee.student_category_id ?? '') === this.selectedStudent.studentCategoryId;
      const sameLevel = !levelId || String(fee.academicLevelId ?? fee.academic_level_id ?? '') === levelId;
      const sameSection = !sectionId || String(fee.academicSectionId ?? fee.academic_section_id ?? '') === sectionId;
      const sameOption = !optionId || String(fee.academicOptionId ?? fee.academic_option_id ?? '') === optionId;
      return sameCategory && sameInstallment && sameStudentCategory && sameLevel && sameSection && sameOption;
    });

    if (!matches.length) {
      const fallback = this.academicFees.find(
        (fee) =>
          String(fee.feeCategoryId ?? fee.fee_category_id ?? '') === categoryId &&
          String(fee.paymentInstallmentId ?? fee.payment_installment_id ?? '') === installmentId
      );
      return Number(fallback?.amount ?? 0);
    }

    return matches.reduce((sum, fee) => sum + Number(fee.amount ?? 0), 0);
  }

  private resolvePaidAmount(categoryId: string, installmentId: string): number {
    return this.paidByFeeKey.get(this.buildFeeKey(categoryId, installmentId)) ?? 0;
  }

  private syncFeeSelection(): void {
    const options = this.feeOptions;
    if (!options.length) {
      this.selectedFeeOptionId = '';
      this.amountToPay = '';
      return;
    }
    if (!options.some((item) => item.id === this.selectedFeeOptionId)) {
      this.selectedFeeOptionId = options[0].id;
    }
    this.refreshAmountToPay();
  }

  private refreshAmountToPay(): void {
    const remaining = this.amountRemaining;
    this.amountToPay = remaining > 0 ? String(remaining) : '';
  }

  private buildFeeKey(categoryId: string, installmentId: string): string {
    return `${categoryId}:${installmentId}`;
  }

  private extractInstallmentShortLabel(label: string): string {
    const match = label.match(/\(([^)]+)\)/);
    return match?.[1] ?? label;
  }

  private extractSectionFromClassroom(classroomLabel: string): string {
    const parts = classroomLabel.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : '—';
  }

  private resetFlow(resetContext = true): void {
    this.selectedStudent = null;
    this.studentSearchTerm = '';
    this.classFilter = 'all';
    this.sectionFilter = 'all';
    this.selectedFeeOptionId = '';
    this.amountToPay = '';
    this.feeDropdownOpen = false;
    this.comment = '';
    this.confirmationReference = '';
    this.saveError = '';
    this.paidByFeeKey.clear();
    if (resetContext) {
      this.yearOptions = [];
      this.selectedYearId = '';
      this.students = [];
      this.academicFees = [];
    }
  }

  private buildYearLabel(row: AcademicYearApiResponse): string {
    const code = (row.code ?? '').trim();
    if (code) {
      return code;
    }
    const start = row.startDate ?? row.start_date;
    const end = row.endDate ?? row.end_date;
    if (start && end) {
      const startYear = new Date(start).getFullYear();
      const endYear = new Date(end).getFullYear();
      if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
        return `${startYear} - ${endYear}`;
      }
    }
    return 'Annee scolaire';
  }

  private buildInstallmentLabel(row: PaymentInstallmentApiResponse): string {
    const code = (row.code ?? '').trim();
    const name = (row.name ?? '').trim();
    const displayOrder = Number(row.displayOrder ?? row.display_order ?? 0);
    if (displayOrder > 0) {
      const ordinal = displayOrder === 1 ? '1er' : `${displayOrder}eme`;
      return `T${displayOrder} (${ordinal} Trimestre)`;
    }
    if (name && code) {
      return `${name} (${code})`;
    }
    return name || code || 'Periode';
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
