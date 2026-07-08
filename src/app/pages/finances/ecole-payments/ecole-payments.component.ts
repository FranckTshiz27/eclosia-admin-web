import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
  EnrollmentService,
  resolveEnrollmentPhotoUrls,
  resolveEnrollmentStudentIdentity
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
  PaymentApiResponse,
  PaymentMethod,
  PaymentService
} from '../../../services/payment.service';
import { ToastService } from '../../../services/toast.service';
import { PaymentReportService } from '../../../services/payment-report.service';
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
  symbolPosition: 'BEFORE' | 'AFTER';
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
  studentCategoryName: string;
  studentCategoryId: string;
  classroomId: string;
  statusLabel: string;
  statusTone: 'active' | 'inactive';
  photoUrl: string;
  photoFallbackUrls: string[];
  enrollmentAcademicFees: AcademicFeeApiResponse[] | null;
}

interface FeeOption {
  id: string;
  academicFeeId: string;
  feeCategoryId: string;
  installmentId: string;
  displayOrder: number;
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

interface PaymentHistoryItem {
  title: string;
  dateLabel: string;
  amount: number;
}

interface PendingPaymentLine {
  id: string;
  academicFeeId: string;
  feeTitle: string;
  amount: number;
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
export class EcolePaymentsComponent implements OnInit, OnDestroy {
  selectedSchoolId = '';
  selectedYearId = '';
  currentStep: PaymentStep = 1;
  studentSearchTerm = '';
  studentSearchResults: PaymentStudent[] = [];
  hasSearchedStudents = false;
  isSelectingStudent = false;
  selectedStudent: PaymentStudent | null = null;
  selectedFeeOptionId = '';
  amountToPay = '';
  selectedPaymentMethod: PaymentMethod = 'CASH';
  selectedPaymentCurrencyId = '';
  transactionReference = '';
  comment = '';
  paymentDate = '';
  uploadedFileName = '';
  paymentSuccessMessage = '';
  paymentHistory: PaymentHistoryItem[] = [];
  showConfirmation = false;
  isFeeSelectOpen = false;
  feeOptionItems: FeeOption[] = [];

  isLoadingSchools = false;
  isLoadingContext = false;
  isLoadingStudents = false;
  isSearchingStudents = false;
  isSaving = false;
  isDownloadingReceipt = false;
  confirmationReference = '';
  confirmationReferences: string[] = [];
  confirmationReceiptNumbers: string[] = [];
  confirmationPaymentIds: string[] = [];
  pendingPaymentLines: PendingPaymentLine[] = [];

  schools: SelectOption[] = [];
  yearOptions: SelectOption[] = [];
  schoolCurrencies: SchoolCurrencyOption[] = [];
  students: PaymentStudent[] = [];
  feeCategoryOptions: SelectOption[] = [];
  installmentOptions: SelectOption[] = [];
  private installmentDisplayOrderById = new Map<string, number>();

  private academicFees: AcademicFeeApiResponse[] = [];
  private classrooms: ClassroomApiResponse[] = [];
  private sections: AcademicSectionApiResponse[] = [];
  private studentCategories: StudentCategoryApiResponse[] = [];
  private currencyRates: CurrencyRateApiResponse[] = [];
  private paidByAcademicFeeId = new Map<string, number>();
  private pendingPaymentSeq = 0;

  readonly paymentMethods: PaymentMethodOption[] = [
    { value: 'CASH', label: 'Especes', icon: 'bi-cash-stack' },
    { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: 'bi-bank' },
    { value: 'MOBILE_MONEY', label: 'Mobile money', icon: 'bi-phone' },
    { value: 'CHEQUE', label: 'Cheque', icon: 'bi-receipt' },
    { value: 'OTHER', label: 'Autre', icon: 'bi-three-dots' }
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
    private readonly currencyRateService: CurrencyRateService,
    private readonly toastService: ToastService,
    private readonly paymentReportService: PaymentReportService
  ) {}

  ngOnInit(): void {
    this.initPaymentDateTime();
    this.loadSchools();
    document.addEventListener('click', this.handleDocumentClick);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleDocumentClick);
  }

  private handleDocumentClick = (): void => {
    this.isFeeSelectOpen = false;
  };

  get primaryCurrency(): SchoolCurrencyOption | undefined {
    return this.schoolCurrencies.find((item) => item.isDefault);
  }

  get selectedSchoolLabel(): string {
    return this.schools.find((item) => item.value === this.selectedSchoolId)?.label ?? '—';
  }

  get selectedYearLabel(): string {
    return this.yearOptions.find((item) => item.value === this.selectedYearId)?.label ?? '—';
  }

  get primaryCurrencyCode(): string {
    return this.primaryCurrency?.code ?? 'FC';
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

  get selectedPaymentCurrencySymbol(): string {
    const currency = this.selectedCurrency;
    if (!currency) {
      return 'FC';
    }
    return currency.symbol || currency.code;
  }

  get filteredStudents(): PaymentStudent[] {
    return this.studentSearchResults;
  }

  get confirmationReceiptNumberLabel(): string {
    return this.confirmationReceiptNumbers.join(', ');
  }

  get canDownloadReceipt(): boolean {
    return this.confirmationReceiptNumbers.length > 0 || this.confirmationPaymentIds.length > 0;
  }

  onStudentSearchSubmit(event: Event): void {
    event.preventDefault();
    this.searchStudentsByName();
  }

  searchStudentsByName(): void {
    if (!this.selectedSchoolId || !this.selectedYearId) {
      return;
    }

    const name = this.studentSearchTerm.trim();
    this.hasSearchedStudents = false;
    this.studentSearchResults = [];

    if (!name) {
      return;
    }

    this.isSearchingStudents = true;

    this.enrollmentService
      .searchByStudentName({
        name,
        academicYearId: this.selectedYearId,
        schoolId: this.selectedSchoolId
      })
      .pipe(
        catchError((error) => {
          this.toastService.apiError(error, 'Recherche impossible pour le moment.');
          return of([]);
        })
      )
      .subscribe({
        next: (enrollments) => {
          this.studentSearchResults = enrollments
            .map((row) => this.mapEnrollmentToStudent(row))
            .filter((item) => item.id)
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
          this.hasSearchedStudents = true;
          this.isSearchingStudents = false;
        }
      });
  }

  get feeOptions(): FeeOption[] {
    return this.feeOptionItems;
  }

  get selectedFeeOption(): FeeOption | undefined {
    return this.feeOptionItems.find((item) => item.id === this.selectedFeeOptionId);
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
    const academicFeeId = this.selectedFeeOption?.academicFeeId ?? '';
    return academicFeeId ? (this.paidByAcademicFeeId.get(academicFeeId) ?? 0) : 0;
  }

  get amountRemaining(): number {
    return this.selectedFeeOption ? this.resolveRemainingForFee(this.selectedFeeOption) : 0;
  }

  get parsedAmountToPay(): number {
    const amount = Number(this.amountToPay);
    return Number.isFinite(amount) ? amount : 0;
  }

  get isPaymentCurrencyPrimary(): boolean {
    const payment = this.selectedCurrency;
    const primary = this.primaryCurrency;
    return !payment || !primary || payment.id === primary.id;
  }

  get parsedAmountInPrimaryCurrency(): number {
    return this.convertPaymentAmountToPrimary(this.parsedAmountToPay);
  }

  get totalToPayLabel(): string {
    return this.formatMoney(this.parsedAmountToPay, this.selectedCurrencyCode);
  }

  get pendingTotalAmount(): number {
    return this.pendingPaymentLines.reduce((sum, line) => sum + line.amount, 0);
  }

  get submitLines(): PendingPaymentLine[] {
    const lines = [...this.pendingPaymentLines];
    if (this.canAddToPending && this.selectedFeeOption) {
      const distribution = this.buildDistributionLines(this.selectedFeeOption, this.parsedAmountInPrimaryCurrency);
      distribution.lines.forEach((line, index) => {
        lines.push({
          id: `current-draft-${index}`,
          ...line
        });
      });
    }
    return lines;
  }

  get amountDistributionPreview(): string {
    if (!this.selectedFeeOption || this.parsedAmountToPay <= 0) {
      return '';
    }
    const distribution = this.buildDistributionLines(this.selectedFeeOption, this.parsedAmountInPrimaryCurrency);
    if (distribution.lines.length <= 1) {
      return '';
    }
    return distribution.lines
      .map((line) => `${line.feeTitle} : ${this.formatMoney(line.amount, this.primaryCurrencyCode)}`)
      .join(' · ');
  }

  get hasAmountDistribution(): boolean {
    return !!this.amountDistributionPreview;
  }

  get amountDistributionSurplus(): number {
    if (!this.selectedFeeOption || this.parsedAmountToPay <= 0) {
      return 0;
    }
    return this.buildDistributionLines(this.selectedFeeOption, this.parsedAmountInPrimaryCurrency).unallocated;
  }

  get submitTotalAmount(): number {
    return this.submitLines.reduce((sum, line) => sum + line.amount, 0);
  }

  get hasCurrentDraftPayment(): boolean {
    return this.currentDraftLines.length > 0 && this.canAddToPending;
  }

  get currentDraftLines(): Omit<PendingPaymentLine, 'id'>[] {
    if (!this.selectedFeeOption || this.parsedAmountToPay <= 0) {
      return [];
    }
    return this.buildDistributionLines(this.selectedFeeOption, this.parsedAmountInPrimaryCurrency).lines;
  }

  get submitButtonLabel(): string {
    const count = this.submitLines.length;
    if (this.isSaving) {
      return 'Enregistrement...';
    }
    if (count > 1) {
      return `Enregistrer ${count} paiements`;
    }
    if (count === 1) {
      return 'Enregistrer le paiement';
    }
    return 'Enregistrer le paiement';
  }

  get canAddToPending(): boolean {
    const fee = this.selectedFeeOption;
    if (!this.selectedStudent || !fee || this.isFeeBlockedByInstallmentOrder(fee)) {
      return false;
    }
    if (this.resolveRemainingForFee(fee) <= 0) {
      return false;
    }
    if (this.parsedAmountToPay <= 0 || this.parsedAmountInPrimaryCurrency <= 0) {
      return false;
    }
    if (!this.isPaymentCurrencyPrimary && !this.paymentCurrencyRate) {
      return false;
    }
    const distribution = this.buildDistributionLines(fee, this.parsedAmountInPrimaryCurrency);
    return distribution.lines.length > 0 && distribution.unallocated <= 0.005;
  }

  get canSubmit(): boolean {
    return (
      !!this.selectedStudent &&
      this.submitLines.length > 0 &&
      !!this.selectedPaymentCurrencyId &&
      !!this.paymentCurrencyRateId &&
      !!this.paymentDate
    );
  }

  get activeExchangeRate(): CurrencyRateApiResponse | undefined {
    return this.paymentCurrencyRate;
  }

  get paymentCurrencyRate(): CurrencyRateApiResponse | undefined {
    const paymentId = this.selectedPaymentCurrencyId;
    const primaryId = this.primaryCurrency?.id;
    if (!paymentId) {
      return undefined;
    }

    if (primaryId && paymentId !== primaryId) {
      return this.currencyRates.find((row) => {
        if (row.active === false) {
          return false;
        }
        const source = String(row.sourceCurrencyId ?? row.source_currency_id ?? '');
        const target = String(row.targetCurrencyId ?? row.target_currency_id ?? '');
        return (
          (source === paymentId && target === primaryId) ||
          (source === primaryId && target === paymentId)
        );
      });
    }

    return (
      this.findActiveCurrencyRate(paymentId, primaryId ?? paymentId) ??
      this.findActiveCurrencyRate(paymentId, paymentId) ??
      this.currencyRates.find((row) => {
        if (row.active === false) {
          return false;
        }
        const source = String(row.sourceCurrencyId ?? row.source_currency_id ?? '');
        const target = String(row.targetCurrencyId ?? row.target_currency_id ?? '');
        return source === paymentId || target === paymentId;
      })
    );
  }

  get paymentCurrencyRateId(): string {
    return String(this.paymentCurrencyRate?.id ?? '');
  }

  get showExchangeRate(): boolean {
    const rateRow = this.paymentCurrencyRate;
    const payment = this.selectedCurrency;
    const primary = this.primaryCurrency;
    return !!rateRow && !!payment && !!primary && payment.id !== primary.id;
  }

  get exchangeRateActive(): boolean {
    return this.activeExchangeRate?.active !== false;
  }

  get exchangeRateLabel(): string {
    const rateRow = this.activeExchangeRate;
    const payment = this.selectedCurrency;
    const primary = this.primaryCurrency;
    if (!rateRow || !payment || !primary) {
      return '—';
    }

    const value = Number(rateRow.rate ?? 0);
    const source = String(rateRow.sourceCurrencyId ?? rateRow.source_currency_id ?? '');
    if (!value) {
      return '—';
    }

    if (source === payment.id) {
      return `1 ${payment.code} = ${this.formatAmount(value)} ${primary.code}`;
    }
    return `1 ${payment.code} = ${this.formatAmount(1 / value)} ${primary.code}`;
  }

  get showConvertedAmount(): boolean {
    return !this.isPaymentCurrencyPrimary && this.parsedAmountToPay > 0 && !!this.paymentCurrencyRate;
  }

  get remainingBalance(): number {
    return Math.max(this.totalInstallmentDue - this.totalInstallmentPaid, 0);
  }

  get yearTotalPaid(): number {
    return this.paymentHistory.reduce((sum, item) => sum + item.amount, 0);
  }

  get studentFinancialStatus(): string {
    return this.remainingBalance <= 0 ? 'A jour' : 'En attente';
  }

  get selectedPaymentMethodLabel(): string {
    return this.paymentMethods.find((item) => item.value === this.selectedPaymentMethod)?.label ?? '—';
  }

  get selectedPaymentMethodIcon(): string {
    return this.paymentMethods.find((item) => item.value === this.selectedPaymentMethod)?.icon ?? 'bi-wallet2';
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

  selectStudent(student: PaymentStudent): void {
    this.clearPendingPayments();
    this.selectedStudent = student;
    this.isSelectingStudent = false;
    this.studentSearchTerm = student.fullName;
    this.studentSearchResults = [];
    this.hasSearchedStudents = false;
    this.syncFeeSelection();
    this.loadPaidAmounts();
  }

  onStudentPhotoError(student: PaymentStudent): void {
    student.photoUrl = student.photoFallbackUrls.shift() ?? '';
  }

  getStudentInitials(fullName: string): string {
    const parts = String(fullName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) {
      return '?';
    }
    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  changeStudent(): void {
    this.isSelectingStudent = true;
    this.studentSearchTerm = '';
    this.studentSearchResults = [];
    this.hasSearchedStudents = false;
  }

  clearStudent(): void {
    this.selectedStudent = null;
    this.isSelectingStudent = false;
    this.studentSearchTerm = '';
    this.studentSearchResults = [];
    this.hasSearchedStudents = false;
    this.clearFeeSelections();
    this.paymentHistory = [];
  }

  toggleFeeSelectPanel(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isFeeSelectDisabled()) {
      return;
    }
    this.isFeeSelectOpen = !this.isFeeSelectOpen;
  }

  hasFeeSelection(): boolean {
    return !!this.selectedFeeOptionId;
  }

  getSelectedFeeLabel(): string {
    return this.selectedFeeOption?.title ?? '';
  }

  getFeeSelectPlaceholder(): string {
    if (!this.selectedStudent) {
      return 'Selectionnez un eleve';
    }
    if (this.feeOptions.length === 0) {
      return 'Aucun frais disponible';
    }
    return 'Selectionner un frais';
  }

  isFeeSelectDisabled(): boolean {
    return !this.selectedStudent || this.feeOptions.length === 0;
  }

  hasPendingPaymentForFee(option: FeeOption): boolean {
    return this.getPendingAmountForFee(option.academicFeeId) > 0;
  }

  isFeeOptionDisabled(option: FeeOption): boolean {
    return (
      this.isFeeBlockedByInstallmentOrder(option) ||
      (this.resolveRemainingForFee(option) <= 0 && !this.isFeeSelected(option.id))
    );
  }

  isFeeBlockedByInstallmentOrder(option: FeeOption): boolean {
    return !!this.getPriorUnpaidInstallmentFee(option);
  }

  getFeeBlockedReason(option: FeeOption): string {
    const priorFee = this.getPriorUnpaidInstallmentFee(option);
    if (!priorFee) {
      return '';
    }
    return `Soldez d'abord : ${priorFee.title}`;
  }

  private getPriorUnpaidInstallmentFee(option: FeeOption): FeeOption | undefined {
    if (!option.installmentId || option.displayOrder <= 0) {
      return undefined;
    }

    return this.feeOptionItems
      .filter(
        (item) =>
          item.feeCategoryId === option.feeCategoryId &&
          !!item.installmentId &&
          item.displayOrder > 0 &&
          item.displayOrder < option.displayOrder &&
          this.resolveRemainingForFee(item) > 0
      )
      .sort((a, b) => a.displayOrder - b.displayOrder)[0];
  }

  isFeeSelected(feeId: string): boolean {
    return this.selectedFeeOptionId === feeId;
  }

  selectFeeOption(option: FeeOption, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();

    if (this.isFeeBlockedByInstallmentOrder(option)) {
      this.toastService.warning(this.getFeeBlockedReason(option));
      return;
    }

    if (this.resolveRemainingForFee(option) <= 0) {
      return;
    }

    this.selectedFeeOptionId = option.id;
    this.amountToPay = this.formatAmountForInput(
      this.convertPrimaryAmountToPayment(this.resolveRemainingForFee(option))
    );
    this.isFeeSelectOpen = false;
  }

  clearFeeSelection(event?: MouseEvent): void {
    event?.stopPropagation();
    this.selectedFeeOptionId = '';
    this.amountToPay = '';
  }

  clearFeeSelections(): void {
    this.selectedFeeOptionId = '';
    this.amountToPay = '';
  }

  trackFeeOption(_index: number, option: FeeOption): string {
    return option.id;
  }

  onPaymentCurrencyChange(): void {
    if (!this.selectedFeeOption) {
      return;
    }

    const remainingPrimary = this.resolveRemainingForFee(this.selectedFeeOption);
    if (remainingPrimary <= 0) {
      return;
    }

    this.amountToPay = this.formatAmountForInput(
      this.convertPrimaryAmountToPayment(remainingPrimary)
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.uploadedFileName = file?.name ?? '';
  }

  onAmountToPayChange(): void {
    // Le surplus non reparti est signale sous le champ via distribution-warning.
  }

  private convertPaymentAmountToPrimary(amount: number): number {
    const rateRow = this.activeExchangeRate;
    const payment = this.selectedCurrency;
    const primary = this.primaryCurrency;
    if (!amount || !payment || !primary || payment.id === primary.id) {
      return amount;
    }

    const value = Number(rateRow?.rate ?? 0);
    const source = String(rateRow?.sourceCurrencyId ?? rateRow?.source_currency_id ?? '');
    if (!rateRow || !value) {
      return 0;
    }

    const converted = source === payment.id ? amount * value : amount / value;
    return Math.round(converted * 100) / 100;
  }

  private convertPrimaryAmountToPayment(amount: number): number {
    const rateRow = this.activeExchangeRate;
    const payment = this.selectedCurrency;
    const primary = this.primaryCurrency;
    if (!amount || !payment || !primary || payment.id === primary.id) {
      return amount;
    }

    const value = Number(rateRow?.rate ?? 0);
    const source = String(rateRow?.sourceCurrencyId ?? rateRow?.source_currency_id ?? '');
    if (!rateRow || !value) {
      return amount;
    }

    const converted = source === payment.id ? amount / value : amount * value;
    return Math.round(converted * 100) / 100;
  }

  private formatAmountForInput(amount: number): string {
    if (!Number.isFinite(amount) || amount <= 0) {
      return '';
    }
    return String(Math.round(amount * 100) / 100);
  }

  private buildDistributionLines(
    startFee: FeeOption,
    totalAmount: number
  ): { lines: Omit<PendingPaymentLine, 'id'>[]; unallocated: number } {
    let remainingAmount = totalAmount;
    const lines: Omit<PendingPaymentLine, 'id'>[] = [];

    for (const fee of this.getDistributionFeeChain(startFee)) {
      if (remainingAmount <= 0) {
        break;
      }

      const feeRemaining = this.resolveRemainingForFee(fee);
      if (feeRemaining <= 0) {
        continue;
      }

      const allocation = Math.min(remainingAmount, feeRemaining);
      lines.push({
        academicFeeId: fee.academicFeeId,
        feeTitle: fee.title,
        amount: allocation
      });
      remainingAmount -= allocation;
    }

    return { lines, unallocated: Math.max(remainingAmount, 0) };
  }

  private getDistributionFeeChain(startFee: FeeOption): FeeOption[] {
    if (!startFee.installmentId) {
      return [startFee];
    }

    return this.feeOptionItems
      .filter(
        (item) =>
          item.feeCategoryId === startFee.feeCategoryId &&
          !!item.installmentId &&
          item.displayOrder >= startFee.displayOrder
      )
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  resolveRemainingForFee(fee: FeeOption): number {
    const paid = this.paidByAcademicFeeId.get(fee.academicFeeId) ?? 0;
    const pending = this.getPendingAmountForFee(fee.academicFeeId);
    return Math.max(fee.amount - paid - pending, 0);
  }

  getPendingAmountForFee(academicFeeId: string): number {
    return this.pendingPaymentLines
      .filter((line) => line.academicFeeId === academicFeeId)
      .reduce((sum, line) => sum + line.amount, 0);
  }

  getFeePaidAmount(fee: FeeOption): number {
    return (
      (this.paidByAcademicFeeId.get(fee.academicFeeId) ?? 0) + this.getPendingAmountForFee(fee.academicFeeId)
    );
  }

  addPaymentsToPending(): void {
    const fee = this.selectedFeeOption;
    if (!fee) {
      return;
    }

    if (this.isFeeBlockedByInstallmentOrder(fee)) {
      this.toastService.warning(this.getFeeBlockedReason(fee));
      return;
    }

    const distribution = this.buildDistributionLines(fee, this.parsedAmountInPrimaryCurrency);
    if (this.parsedAmountToPay <= 0) {
      this.toastService.warning('Saisissez un montant superieur a zero.');
      return;
    }

    if (!this.isPaymentCurrencyPrimary && !this.paymentCurrencyRate) {
      this.toastService.error('Aucun taux de change actif disponible pour la devise selectionnee.');
      return;
    }

    if (this.parsedAmountInPrimaryCurrency <= 0) {
      this.toastService.error('Impossible de convertir le montant en devise principale.');
      return;
    }

    if (!distribution.lines.length) {
      this.toastService.warning('Aucun frais disponible pour ce montant.');
      return;
    }

    if (distribution.unallocated > 0.005) {
      this.toastService.warning(
        `Surplus de ${this.formatMoney(distribution.unallocated, this.primaryCurrencyCode)} non reparti sur les frais suivants.`
      );
      return;
    }

    distribution.lines.forEach((line) => {
      this.pendingPaymentSeq += 1;
      this.pendingPaymentLines.push({
        id: `pending-${this.pendingPaymentSeq}`,
        ...line
      });
    });

    this.clearFeeSelections();
    this.refreshFeeOptionItems();
  }

  removePendingPaymentLine(lineId: string): void {
    this.pendingPaymentLines = this.pendingPaymentLines.filter((line) => line.id !== lineId);
    this.refreshFeeOptionItems();
  }

  clearPendingPayments(): void {
    this.pendingPaymentLines = [];
    this.refreshFeeOptionItems();
  }

  cancelPaymentDetails(): void {
    this.clearFeeSelections();
    this.clearPendingPayments();
    this.transactionReference = '';
    this.comment = '';
  }

  cancelFlow(): void {
    this.resetFlow();
    this.showConfirmation = false;
    this.initPaymentDateTime();
  }

  submitPayment(): void {
    if (!this.canSubmit || !this.selectedStudent) {
      return;
    }

    const linesToSubmit = this.submitLines;
    if (!linesToSubmit.length) {
      return;
    }

    const sharedComment = [this.transactionReference.trim(), this.comment.trim()].filter(Boolean).join(' | ') || undefined;
    const currencyRateId = this.paymentCurrencyRateId;

    if (!currencyRateId) {
      this.toastService.error('Aucun taux de change actif disponible pour la devise selectionnee.');
      return;
    }

    let payments: CreatePaymentDto[];
    try {
      payments = linesToSubmit.map((line) =>
        this.buildCreatePaymentDto(line.academicFeeId, line.amount, {
          currencyRateId,
          comment: sharedComment
        })
      );
    } catch {
      this.toastService.error('Donnees de paiement invalides.');
      return;
    }

    this.isSaving = true;
    this.paymentSuccessMessage = '';
    this.confirmationReference = '';
    this.confirmationReferences = [];
    this.confirmationReceiptNumbers = [];
    this.confirmationPaymentIds = [];

    this.paymentService.createAll(payments).subscribe({
      next: (responses) => {
        this.isSaving = false;
        this.confirmationReceiptNumbers = this.extractReceiptNumbers(responses);
        this.confirmationPaymentIds = responses
          .map((response) => String(response.id ?? '').trim())
          .filter(Boolean);
        this.confirmationReferences = this.confirmationReceiptNumbers.length
          ? this.confirmationReceiptNumbers
          : responses
              .map((response) =>
                String(
                  response.transactionReference ??
                    response.transaction_reference ??
                    response.id ??
                    ''
                )
              )
              .filter(Boolean);
        this.confirmationReference = this.confirmationReferences.join(', ');

        this.paymentSuccessMessage =
          responses.length > 1
            ? `${responses.length} paiements enregistres avec succes`
            : 'Paiement enregistre avec succes';
        this.showConfirmation = true;
        this.clearPendingPayments();
        this.clearFeeSelections();
        this.loadPaidAmounts();
      },
      error: (error) => {
        this.isSaving = false;
        this.toastService.apiError(error, "Impossible d'enregistrer le paiement.");
      }
    });
  }

  startNewPayment(): void {
    this.resetFlow(false);
    this.confirmationReference = '';
    this.confirmationReferences = [];
    this.confirmationReceiptNumbers = [];
    this.confirmationPaymentIds = [];
    this.paymentSuccessMessage = '';
    this.showConfirmation = false;
    this.isDownloadingReceipt = false;
    this.uploadedFileName = '';
    this.transactionReference = '';
    this.initPaymentDateTime();
  }

  downloadPaymentReceipt(receiptNumber?: string): void {
    if (this.isDownloadingReceipt) {
      return;
    }

    const targetReceiptNumber = String(receiptNumber ?? this.confirmationReceiptNumbers[0] ?? '').trim();
    if (targetReceiptNumber) {
      this.isDownloadingReceipt = true;
      this.paymentReportService.generateByReceiptNumber(targetReceiptNumber).subscribe({
        next: (pdfBlob) => {
          this.isDownloadingReceipt = false;
          this.openPdfBlob(pdfBlob, `recu-${targetReceiptNumber}.pdf`);
        },
        error: (error) => {
          this.isDownloadingReceipt = false;
          this.toastService.apiError(error, 'Impossible de generer le recu PDF.');
        }
      });
      return;
    }

    const paymentId = String(this.confirmationPaymentIds[0] ?? '').trim();
    if (!paymentId) {
      this.toastService.error('Numero de recu indisponible pour ce paiement.');
      return;
    }

    this.isDownloadingReceipt = true;
    this.paymentReportService.generateByPaymentId(paymentId).subscribe({
      next: (pdfBlob) => {
        this.isDownloadingReceipt = false;
        this.openPdfBlob(pdfBlob, `recu-paiement-${paymentId}.pdf`);
      },
      error: (error) => {
        this.isDownloadingReceipt = false;
        this.toastService.apiError(error, 'Impossible de generer le recu PDF.');
      }
    });
  }

  private extractReceiptNumbers(responses: PaymentApiResponse[]): string[] {
    return [
      ...new Set(
        responses
          .map((response) => this.resolveReceiptNumber(response))
          .filter((value): value is string => !!value)
      )
    ];
  }

  private resolveReceiptNumber(response: PaymentApiResponse): string {
    const receiptNumber = String(response.receiptNumber ?? response.receipt_number ?? '').trim();
    return receiptNumber || '';
  }

  private openPdfBlob(pdfBlob: Blob, filename: string): void {
    const blob = new Blob([pdfBlob], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
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
    this.paymentDate = new Date().toISOString().slice(0, 10);
  }

  private buildCreatePaymentDto(
    academicFeeId: string,
    amount: number,
    options: { currencyRateId: string; comment?: string }
  ): CreatePaymentDto {
    const enrollmentId = String(this.selectedStudent?.enrollmentId ?? '').trim();
    const feeId = String(academicFeeId ?? '').trim();
    const currencyRateId = String(options.currencyRateId ?? '').trim();
    const normalizedAmount = Math.round(amount * 100) / 100;

    if (
      !enrollmentId ||
      !feeId ||
      !currencyRateId ||
      normalizedAmount <= 0 ||
      !this.paymentDate ||
      !this.selectedPaymentMethod
    ) {
      throw new Error('Donnees de paiement invalides.');
    }

    const dto: CreatePaymentDto = {
      enrollmentId,
      academicFeeId: feeId,
      currencyRateId,
      amount: normalizedAmount,
      paymentMethod: this.selectedPaymentMethod,
      paymentDate: this.buildPaymentDateTime()
    };

    if (options.comment) {
      dto.comment = options.comment;
    }

    return dto;
  }

  private findActiveCurrencyRate(
    sourceCurrencyId: string,
    targetCurrencyId: string
  ): CurrencyRateApiResponse | undefined {
    return this.currencyRates.find((row) => {
      if (row.active === false) {
        return false;
      }
      const source = String(row.sourceCurrencyId ?? row.source_currency_id ?? '');
      const target = String(row.targetCurrencyId ?? row.target_currency_id ?? '');
      return source === sourceCurrencyId && target === targetCurrencyId;
    });
  }

  private buildPaymentDateTime(): string {
    const date = this.paymentDate.trim();
    if (!date) {
      return '';
    }
    return `${date}T00:00:00`;
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
        this.toastService.error('Impossible de charger les ecoles.');
      }
    });
  }

  private bootstrapContext(): void {
    if (!this.selectedSchoolId) {
      return;
    }

    this.isLoadingContext = true;

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

        this.installmentDisplayOrderById = new Map(
          (installments as PaymentInstallmentApiResponse[])
            .map((row) => [String(row.id ?? ''), Number(row.displayOrder ?? row.display_order ?? 0)] as const)
            .filter(([id]) => !!id)
        );

        const currencyMeta = new Map(
          (currencies as CurrencyApiResponse[]).map((row) => [
            String(row.id ?? ''),
            {
              code: (row.code ?? '').trim().toUpperCase(),
              name: (row.name ?? '').trim(),
              symbol: (row.symbol ?? '').trim(),
              symbolPosition: (row.symbolPosition ?? row.symbol_position ?? 'AFTER') as 'BEFORE' | 'AFTER'
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
              symbolPosition: meta.symbolPosition,
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
        this.toastService.error('Impossible de charger les donnees de reference.');
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
        this.isLoadingStudents = false;
        this.syncFeeSelection();
      },
      error: () => {
        this.students = [];
        this.isLoadingStudents = false;
      }
    });
  }

  private loadPaidAmounts(): void {
    if (!this.selectedStudent) {
      this.paidByAcademicFeeId.clear();
      this.paymentHistory = [];
      return;
    }

    this.paymentService
      .getAll({
        schoolId: this.selectedSchoolId,
        enrollmentId: this.selectedStudent.enrollmentId,
        status: 'COMPLETED'
      })
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (rows) => {
          this.paidByAcademicFeeId.clear();
          this.paymentHistory = rows
            .map((row) => this.mapPaymentHistoryItem(row))
            .sort((a, b) => b.dateLabel.localeCompare(a.dateLabel, 'fr'));
          rows.forEach((row) => {
            const academicFeeId = String(row.academicFeeId ?? row.academic_fee_id ?? '');
            if (!academicFeeId) {
              return;
            }
            const current = this.paidByAcademicFeeId.get(academicFeeId) ?? 0;
            this.paidByAcademicFeeId.set(academicFeeId, current + Number(row.amount ?? 0));
          });
          this.syncFeeSelection();
        }
      });
  }

  private mapPaymentHistoryItem(row: PaymentApiResponse): PaymentHistoryItem {
    const academicFeeId = String(row.academicFeeId ?? row.academic_fee_id ?? '');
    const fee = this.academicFees.find((item) => String(item.id ?? '') === academicFeeId);
    const categoryId = String(fee?.feeCategoryId ?? fee?.fee_category_id ?? '');
    const installmentId = String(fee?.paymentInstallmentId ?? fee?.payment_installment_id ?? '');
    const categoryLabel =
      this.feeCategoryOptions.find((item) => item.value === categoryId)?.label ??
      fee?.feeCategory?.name ??
      fee?.name ??
      'Frais';
    const installmentLabel =
      this.installmentOptions.find((item) => item.value === installmentId)?.label ??
      fee?.paymentInstallment?.name ??
      '';
    const paymentDate = String(row.paymentDate ?? row.payment_date ?? row.createdAt ?? row.created_at ?? '');
    const dateLabel = paymentDate
      ? new Date(paymentDate).toLocaleDateString('fr-FR')
      : this.paymentDate
        ? new Date(this.paymentDate).toLocaleDateString('fr-FR')
        : '—';

    return {
      title: installmentLabel ? `${categoryLabel} - ${installmentLabel}` : categoryLabel,
      dateLabel,
      amount: Number(row.amount ?? 0)
    };
  }

  private mapEnrollmentToStudent(row: EnrollmentApiResponse): PaymentStudent {
    const rowAny = row as Record<string, unknown>;
    const identity = resolveEnrollmentStudentIdentity(rowAny);
    const studentCategoryRef = (row.studentCategory ?? row.student_category) as
      | { id?: string; code?: string; name?: string }
      | undefined;
    const classroomRef = (row.classroom ?? rowAny['classroom']) as
      | {
          id?: string;
          displayName?: string;
          display_name?: string;
        }
      | undefined;
    const id = String(row.studentId ?? row.student_id ?? row.id ?? '');
    const enrollmentId = String(row.id ?? '');
    const classroomId = String(row.classroomId ?? row.classroom_id ?? classroomRef?.id ?? '');
    const classroom = this.classrooms.find((item) => String(item.id ?? '') === classroomId);
    const classroomLabel =
      String(row.classroomName ?? row.classroom_name ?? row.classroomLabel ?? '').trim() ||
      String(classroomRef?.displayName ?? classroomRef?.display_name ?? '').trim() ||
      String(classroom?.displayName ?? classroom?.display_name ?? '').trim() ||
      '—';
    const sectionId = String(classroom?.academicSectionId ?? classroom?.academic_section_id ?? '');
    const sectionRow = this.sections.find((item) => String(item.id ?? '') === sectionId);
    const sectionLabel =
      (sectionRow?.name ?? '').trim() || (sectionRow?.code ?? '').trim() || this.extractSectionFromClassroom(classroomLabel);
    const categoryName = String(
      row.studentCategoryName ?? row.student_category_name ?? studentCategoryRef?.name ?? ''
    ).trim();
    const categoryCode = String(
      row.studentCategoryCode ?? row.student_category_code ?? studentCategoryRef?.code ?? ''
    ).trim();
    const category = this.studentCategories.find(
      (item) => (item.name ?? '').trim() === categoryName || (item.code ?? '').trim() === categoryCode
    );
    const studentCategoryId = String(
      row.studentCategoryId ?? row.student_category_id ?? studentCategoryRef?.id ?? category?.id ?? ''
    );
    const status = String(row.status ?? '').trim().toLowerCase();
    const isActive = !status || status === 'active' || status === 'actif';
    const enrollmentNumber = String(row.enrollmentNumber ?? row.enrollment_number ?? '').trim() || '—';
    const photoCandidates = resolveEnrollmentPhotoUrls(rowAny);

    return {
      id,
      enrollmentId,
      fullName: identity.fullName,
      enrollmentNumber,
      registrationNumber: enrollmentId ? `INS-${enrollmentId.slice(0, 8).toUpperCase()}` : '—',
      classroomLabel,
      sectionLabel,
      studentCategoryName: categoryName || categoryCode || '—',
      studentCategoryId,
      classroomId,
      statusLabel: isActive ? 'Actif' : 'Inactif',
      statusTone: isActive ? 'active' : 'inactive',
      photoUrl: photoCandidates[0] ?? '',
      photoFallbackUrls: photoCandidates.slice(1),
      enrollmentAcademicFees: this.resolveEnrollmentAcademicFees(rowAny)
    };
  }

  private resolveEnrollmentAcademicFees(row: Record<string, unknown>): AcademicFeeApiResponse[] | null {
    if (!('academicFees' in row) && !('academic_fees' in row)) {
      return null;
    }

    const raw = row['academicFees'] ?? row['academic_fees'];
    if (!Array.isArray(raw)) {
      return null;
    }

    return raw as AcademicFeeApiResponse[];
  }

  private getMatchingAcademicFeesForStudent(): AcademicFeeApiResponse[] {
    if (!this.selectedStudent) {
      return [];
    }

    if (this.selectedStudent.enrollmentAcademicFees !== null) {
      return this.selectedStudent.enrollmentAcademicFees.filter((fee) => fee.active !== false);
    }

    const classroom = this.classrooms.find((item) => String(item.id ?? '') === this.selectedStudent?.classroomId);
    const levelId = String(classroom?.academicLevelId ?? classroom?.academic_level_id ?? '');
    const sectionId = String(classroom?.academicSectionId ?? classroom?.academic_section_id ?? '');
    const optionId = String(classroom?.academicOptionId ?? classroom?.academic_option_id ?? '');

    const strictMatches = this.academicFees.filter((fee) => {
      if (fee.active === false) {
        return false;
      }
      const sameStudentCategory =
        !this.selectedStudent?.studentCategoryId ||
        String(fee.studentCategoryId ?? fee.student_category_id ?? '') === this.selectedStudent.studentCategoryId;
      const sameLevel = !levelId || String(fee.academicLevelId ?? fee.academic_level_id ?? '') === levelId;
      const sameSection = !sectionId || String(fee.academicSectionId ?? fee.academic_section_id ?? '') === sectionId;
      const sameOption = !optionId || String(fee.academicOptionId ?? fee.academic_option_id ?? '') === optionId;
      return sameStudentCategory && sameLevel && sameSection && sameOption;
    });

    if (strictMatches.length) {
      return strictMatches;
    }

    if (levelId) {
      const levelMatches = this.academicFees.filter(
        (fee) =>
          fee.active !== false && String(fee.academicLevelId ?? fee.academic_level_id ?? '') === levelId
      );
      if (levelMatches.length) {
        return levelMatches;
      }
    }

    return this.academicFees.filter((fee) => fee.active !== false);
  }

  private mapAcademicFeeToOption(fee: AcademicFeeApiResponse): FeeOption | null {
    const academicFeeId = String(fee.id ?? '');
    if (!academicFeeId) {
      return null;
    }

    const categoryId = String(fee.feeCategoryId ?? fee.fee_category_id ?? '');
    const installmentId = String(fee.paymentInstallmentId ?? fee.payment_installment_id ?? '');
    const categoryLabel =
      this.feeCategoryOptions.find((item) => item.value === categoryId)?.label ??
      fee.feeCategory?.name ??
      fee.name ??
      'Frais';
    const installmentLabel = installmentId
      ? (this.installmentOptions.find((item) => item.value === installmentId)?.label ??
        fee.paymentInstallment?.name ??
        '')
      : '';
    const displayOrder = installmentId
      ? Number(
          this.installmentDisplayOrderById.get(installmentId) ??
            fee.paymentInstallment?.displayOrder ??
            fee.paymentInstallment?.display_order ??
            0
        )
      : 0;
    const periodLabel = installmentLabel || '—';
    const shortInstallment = installmentLabel ? this.extractInstallmentShortLabel(installmentLabel) : '';
    const title = shortInstallment ? `${categoryLabel} - ${shortInstallment}` : categoryLabel;

    return {
      id: academicFeeId,
      academicFeeId,
      feeCategoryId: categoryId,
      installmentId,
      displayOrder,
      title,
      periodLabel,
      amount: Number(fee.amount ?? 0)
    };
  }

  private resolveAcademicFeeFor(
    categoryId: string,
    installmentId: string
  ): AcademicFeeApiResponse | undefined {
    if (!this.selectedStudent || !categoryId || !installmentId) {
      return undefined;
    }

    const strictMatches = this.resolveAcademicFeeMatches(categoryId, installmentId, true);
    if (strictMatches.length) {
      return strictMatches[0];
    }

    const looseMatches = this.resolveAcademicFeeMatches(categoryId, installmentId, false);
    return looseMatches[0];
  }

  private resolveAcademicFeeMatches(
    categoryId: string,
    installmentId: string,
    strict: boolean
  ): AcademicFeeApiResponse[] {
    const classroom = this.classrooms.find((item) => String(item.id ?? '') === this.selectedStudent?.classroomId);
    const levelId = String(classroom?.academicLevelId ?? classroom?.academic_level_id ?? '');
    const sectionId = String(classroom?.academicSectionId ?? classroom?.academic_section_id ?? '');
    const optionId = String(classroom?.academicOptionId ?? classroom?.academic_option_id ?? '');

    return this.academicFees.filter((fee) => {
      if (fee.active === false) {
        return false;
      }
      const sameCategory = String(fee.feeCategoryId ?? fee.fee_category_id ?? '') === categoryId;
      const sameInstallment = String(fee.paymentInstallmentId ?? fee.payment_installment_id ?? '') === installmentId;
      if (!sameCategory || !sameInstallment) {
        return false;
      }
      if (!strict) {
        return true;
      }
      const sameStudentCategory =
        !this.selectedStudent?.studentCategoryId ||
        String(fee.studentCategoryId ?? fee.student_category_id ?? '') === this.selectedStudent.studentCategoryId;
      const sameLevel = !levelId || String(fee.academicLevelId ?? fee.academic_level_id ?? '') === levelId;
      const sameSection = !sectionId || String(fee.academicSectionId ?? fee.academic_section_id ?? '') === sectionId;
      const sameOption = !optionId || String(fee.academicOptionId ?? fee.academic_option_id ?? '') === optionId;
      return sameStudentCategory && sameLevel && sameSection && sameOption;
    });
  }

  private resolveFeeAmountFor(categoryId: string, installmentId: string): number {
    if (!this.selectedStudent || !categoryId || !installmentId) {
      return 0;
    }

    const strictMatches = this.resolveAcademicFeeMatches(categoryId, installmentId, true);
    if (strictMatches.length) {
      return strictMatches.reduce((sum, fee) => sum + Number(fee.amount ?? 0), 0);
    }

    const looseMatches = this.resolveAcademicFeeMatches(categoryId, installmentId, false);
    if (!looseMatches.length) {
      return 0;
    }

    return looseMatches.reduce((sum, fee) => sum + Number(fee.amount ?? 0), 0);
  }

  private resolvePaidAmount(categoryId: string, installmentId: string): number {
    return this.resolveAcademicFeeMatches(categoryId, installmentId, true)
      .concat(this.resolveAcademicFeeMatches(categoryId, installmentId, false))
      .filter((fee, index, rows) => rows.findIndex((item) => String(item.id ?? '') === String(fee.id ?? '')) === index)
      .reduce((sum, fee) => sum + (this.paidByAcademicFeeId.get(String(fee.id ?? '')) ?? 0), 0);
  }

  private syncFeeSelection(): void {
    this.refreshFeeOptionItems();
    const validIds = new Set(this.feeOptionItems.map((item) => item.id));
    if (this.selectedFeeOptionId && !validIds.has(this.selectedFeeOptionId)) {
      this.selectedFeeOptionId = '';
      this.amountToPay = '';
      return;
    }
    if (this.selectedFeeOption && this.isFeeBlockedByInstallmentOrder(this.selectedFeeOption)) {
      this.selectedFeeOptionId = '';
      this.amountToPay = '';
      return;
    }
    if (this.selectedFeeOption) {
      const parsed = Number(this.amountToPay);
      const remaining = this.amountRemaining;
      this.amountToPay =
        Number.isFinite(parsed) && parsed > 0 ? String(Math.min(parsed, remaining)) : String(remaining);
    }
  }

  private refreshFeeOptionItems(): void {
    if (!this.selectedStudent) {
      this.feeOptionItems = [];
      return;
    }

    this.feeOptionItems = this.getMatchingAcademicFeesForStudent()
      .map((fee) => this.mapAcademicFeeToOption(fee))
      .filter((item): item is FeeOption => !!item)
      .filter((item) => item.amount > 0)
      .sort((a, b) => {
        const categoryCompare = a.feeCategoryId.localeCompare(b.feeCategoryId, 'fr');
        if (categoryCompare !== 0) {
          return categoryCompare;
        }
        const orderCompare = a.displayOrder - b.displayOrder;
        if (orderCompare !== 0) {
          return orderCompare;
        }
        return a.title.localeCompare(b.title, 'fr');
      });
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
    this.studentSearchResults = [];
    this.hasSearchedStudents = false;
    this.clearFeeSelections();
    this.clearPendingPayments();
    this.feeOptionItems = [];
    this.isSelectingStudent = false;
    this.comment = '';
    this.transactionReference = '';
    this.uploadedFileName = '';
    this.paymentHistory = [];
    this.paymentSuccessMessage = '';
    this.confirmationReference = '';
    this.paidByAcademicFeeId.clear();
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
