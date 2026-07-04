import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AcademicCycleApiResponse,
  AcademicCycleService
} from '../../../services/academic-cycle.service';
import {
  AcademicLevelApiResponse,
  AcademicLevelService
} from '../../../services/academic-level.service';
import {
  AcademicOptionApiResponse,
  AcademicOptionService
} from '../../../services/academic-option.service';
import {
  AcademicSectionApiResponse,
  AcademicSectionService
} from '../../../services/academic-section.service';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../services/academic-year.service';
import {
  FeeCategoryApiResponse,
  FeeCategoryService
} from '../../../services/fee-category.service';
import {
  PaymentInstallmentApiResponse,
  PaymentInstallmentService
} from '../../../services/payment-installment.service';
import { SchoolApiResponse, SchoolService } from '../../../services/school.service';
import {
  CreateSchoolFeeDto,
  SchoolFeeApiResponse,
  SchoolFeeService
} from '../../../services/school-fee.service';
import {
  AcademicModelApiResponse,
  AcademicModelService
} from '../../../services/academic-model.service';
import {
  SchoolAcademicModelApiResponse,
  SchoolAcademicModelService
} from '../../../services/school-academic-model.service';
import {
  StudentCategoryApiResponse,
  StudentCategoryService
} from '../../../services/student-category.service';

type FeeStatus = 'Actif' | 'Inactif';
type MultiSelectField = 'cycle' | 'level' | 'section' | 'option' | 'installment';
type FormMultiSelectField = 'form-level' | 'form-section' | 'form-option' | 'form-student-category';

interface SelectOption {
  value: string;
  label: string;
}

interface SchoolFeeItem {
  id: string;
  code: string;
  codeTone: string;
  name: string;
  amount: number;
  amountLabel: string;
  categoryId: string;
  categoryName: string;
  categoryTone: string;
  categoryIcon: string;
  installmentId: string;
  installmentLabel: string;
  installmentTone: string;
  allowInstallments: boolean;
  status: FeeStatus;
  schoolId: string;
  academicYearId: string;
  academicCycleId: string;
  academicLevelId: string;
  academicSectionId: string;
  academicOptionId: string;
  studentCategoryId: string;
  studentCategoryName: string;
  description: string;
  comment: string;
}

interface SchoolFeeForm {
  code: string;
  name: string;
  amount: string;
  feeCategoryId: string;
  paymentByInstallment: boolean;
  description: string;
  active: boolean;
  displayOrder: string;
  formYearId: string;
  formCycleId: string;
  selectedLevelIds: string[];
  selectedSectionIds: string[];
  selectedOptionIds: string[];
  selectedStudentCategoryIds: string[];
  selectedInstallmentIds: string[];
  installmentAmounts: Record<string, string>;
}

@Component({
  selector: 'app-ecole-school-fees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-school-fees.component.html',
  styleUrl: './ecole-school-fees.component.css'
})
export class EcoleSchoolFeesComponent implements OnInit, OnDestroy {
  @ViewChild('feeFormBackdrop') feeFormBackdrop?: ElementRef<HTMLElement>;

  private readonly renderer = inject(Renderer2);
  selectedSchoolId = '';
  selectedYearId = '';
  cycleFilter = 'all';
  selectedLevelIds: string[] = [];
  selectedSectionIds: string[] = [];
  selectedOptionIds: string[] = [];
  categoryFilter = 'all';
  studentCategoryFilter = 'all';
  selectedInstallmentIds: string[] = [];
  searchTerm = '';
  installmentPaymentFilter = 'all';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoadingSchools = false;
  isLoadingReferences = false;
  isLoading = false;
  loadError = '';
  cyclesHint = '';

  isModalOpen = false;
  isEditMode = false;
  editingFeeId: string | null = null;
  editingInstallmentId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  openActionMenuId: string | null = null;
  openMultiSelectField: MultiSelectField | null = null;
  openFormMultiSelectField: FormMultiSelectField | null = null;
  openFormCycleSelect = false;

  schools: SelectOption[] = [];
  yearOptions: SelectOption[] = [];
  cycleFilterOptions: SelectOption[] = [{ value: 'all', label: 'Tous les cycles' }];
  levelFilterOptions: SelectOption[] = [];
  sectionFilterOptions: SelectOption[] = [];
  optionFilterOptions: SelectOption[] = [];
  categoryFilterOptions: SelectOption[] = [{ value: 'all', label: 'Toutes les categories' }];
  studentCategoryFilterOptions: SelectOption[] = [{ value: 'all', label: 'Toutes les categories' }];
  installmentFilterOptions: SelectOption[] = [];

  categoryFormOptions: SelectOption[] = [];
  formLevelOptions: SelectOption[] = [];
  formSectionOptions: SelectOption[] = [];
  formOptionOptions: SelectOption[] = [];
  formStudentCategoryOptions: SelectOption[] = [];
  formInstallmentOptions: SelectOption[] = [];
  cycleFormOptions: SelectOption[] = [];

  fees: SchoolFeeItem[] = [];
  form: SchoolFeeForm = this.buildEmptyForm();

  private cycleRows: AcademicCycleApiResponse[] = [];
  private levelRows: AcademicLevelApiResponse[] = [];
  private sectionRows: AcademicSectionApiResponse[] = [];
  private optionRows: AcademicOptionApiResponse[] = [];
  private categoryRows: FeeCategoryApiResponse[] = [];
  private studentCategoryRows: StudentCategoryApiResponse[] = [];
  private installmentRows: PaymentInstallmentApiResponse[] = [];
  private activeAcademicModelIds: string[] = [];
  private schoolCycleIds = new Set<string>();

  readonly descriptionMaxLength = 255;
  readonly formDescriptionMaxLength = 255;
  readonly installmentPaymentOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'yes', label: 'Oui' },
    { value: 'no', label: 'Non' }
  ];
  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];
  readonly pageSizeOptions = [10, 25, 50];

  constructor(
    private readonly schoolService: SchoolService,
    private readonly academicYearService: AcademicYearService,
    private readonly schoolAcademicModelService: SchoolAcademicModelService,
    private readonly academicModelService: AcademicModelService,
    private readonly academicCycleService: AcademicCycleService,
    private readonly academicLevelService: AcademicLevelService,
    private readonly academicSectionService: AcademicSectionService,
    private readonly academicOptionService: AcademicOptionService,
    private readonly feeCategoryService: FeeCategoryService,
    private readonly paymentInstallmentService: PaymentInstallmentService,
    private readonly studentCategoryService: StudentCategoryService,
    private readonly schoolFeeService: SchoolFeeService
  ) {}

  ngOnInit(): void {
    this.loadSchools();
    document.addEventListener('click', this.handleDocumentClick);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleDocumentClick);
    this.restoreBodyAfterModal();
  }

  private handleDocumentClick = (): void => {
    this.openActionMenuId = null;
    this.openMultiSelectField = null;
    this.openFormMultiSelectField = null;
    this.openFormCycleSelect = false;
  };

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get commentLength(): number {
    return 0;
  }

  get selectedCategoryAllowsInstallments(): boolean {
    return this.categoryAllowsInstallments(this.form.feeCategoryId);
  }

  get formInstallmentsEnabled(): boolean {
    return this.selectedCategoryAllowsInstallments && this.form.paymentByInstallment;
  }

  get selectedSchoolLabel(): string {
    return this.schools.find((school) => school.value === this.selectedSchoolId)?.label ?? '—';
  }

  get summaryCategoryName(): string {
    return this.categoryFormOptions.find((option) => option.value === this.form.feeCategoryId)?.label ?? '—';
  }

  get summaryYearLabel(): string {
    return this.yearOptions.find((option) => option.value === this.form.formYearId)?.label ?? '—';
  }

  get summaryAmountLabel(): string {
    if (this.formInstallmentsEnabled) {
      const total = this.getInstallmentAmountTotal();
      return `${this.formatAmount(total)} USD`;
    }
    const amount = Number(this.form.amount);
    if (!Number.isFinite(amount)) {
      return '0,00 USD';
    }
    return `${this.formatAmount(amount)} USD`;
  }

  get summaryInstallmentAmounts(): { code: string; amountLabel: string }[] {
    return this.getFilledInstallmentAmounts().map((entry) => {
      const option = this.formInstallmentOptions.find((item) => item.value === entry.id);
      const match = option?.label.match(/\(([^)]+)\)/);
      return {
        code: match?.[1] ?? option?.label ?? entry.id,
        amountLabel: `${this.formatAmount(entry.amount)} USD`
      };
    });
  }

  get summarySelectionCount(): { levels: number; sections: number; options: number; studentCategories: number } {
    return {
      levels: this.form.selectedLevelIds.length,
      sections: this.form.selectedSectionIds.length,
      options: this.form.selectedOptionIds.length,
      studentCategories: this.form.selectedStudentCategoryIds.length
    };
  }

  get summaryCycleLabel(): string {
    if (!this.form.formCycleId) {
      return '—';
    }
    return this.cycleFormOptions.find((option) => option.value === this.form.formCycleId)?.label ?? '—';
  }

  formatSummaryCount(count: number): string {
    if (!count) {
      return '—';
    }
    return `${count} sélectionné(s)`;
  }

  get selectedFilterCategoryAllowsInstallments(): boolean {
    if (this.categoryFilter === 'all') {
      return true;
    }
    return this.categoryAllowsInstallments(this.categoryFilter);
  }

  get filteredFees(): SchoolFeeItem[] {
    const term = this.normalize(this.searchTerm);

    return this.fees
      .filter((item) => {
        const matchesSearch =
          !term ||
          this.normalize(item.name).includes(term) ||
          this.normalize(item.code).includes(term) ||
          this.normalize(item.categoryName).includes(term);

        const matchesCycle = this.cycleFilter === 'all' || item.academicCycleId === this.cycleFilter;
        const matchesLevel = this.matchesMultiFilter(this.selectedLevelIds, item.academicLevelId);
        const matchesSection = this.matchesMultiFilter(this.selectedSectionIds, item.academicSectionId);
        const matchesOption = this.matchesMultiFilter(this.selectedOptionIds, item.academicOptionId);
        const matchesCategory =
          this.categoryFilter === 'all' || item.categoryId === this.categoryFilter;
        const matchesStudentCategory =
          this.studentCategoryFilter === 'all' || item.studentCategoryId === this.studentCategoryFilter;
        const matchesInstallment = this.matchesMultiFilter(this.selectedInstallmentIds, item.installmentId);
        const matchesInstallmentPayment =
          this.installmentPaymentFilter === 'all' ||
          (this.installmentPaymentFilter === 'yes' && item.allowInstallments) ||
          (this.installmentPaymentFilter === 'no' && !item.allowInstallments);
        const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;

        return (
          matchesSearch &&
          matchesCycle &&
          matchesLevel &&
          matchesSection &&
          matchesOption &&
          matchesCategory &&
          matchesStudentCategory &&
          matchesInstallment &&
          matchesInstallmentPayment &&
          matchesStatus
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  get paginatedFees(): SchoolFeeItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredFees.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredFees.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredFees.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredFees.length);
  }

  onSchoolChange(): void {
    this.currentPage = 1;
    this.bootstrapReferences();
  }

  onYearChange(): void {
    this.currentPage = 1;
    this.loadFees(true);
  }

  onCycleFilterChange(): void {
    this.currentPage = 1;
    this.selectedLevelIds = [];
    this.selectedSectionIds = [];
    this.selectedOptionIds = [];
    this.rebuildDependentFilterOptions();
  }

  selectCycleFilter(value: string, event?: MouseEvent): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.cycleFilter = value;
    this.openMultiSelectField = null;
    this.onCycleFilterChange();
  }

  clearCycleFilter(event: MouseEvent): void {
    event.stopPropagation();
    this.selectCycleFilter('all');
  }

  getCycleLabel(cycleId: string): string {
    if (!cycleId || cycleId === 'all') {
      return 'Tous les cycles';
    }
    return this.cycleFilterOptions.find((option) => option.value === cycleId)?.label ?? 'Cycle';
  }

  hasCycleSelection(): boolean {
    return this.cycleFilter !== 'all';
  }

  isCycleSelectDisabled(): boolean {
    return this.isLoadingReferences || this.getCycleOptionsExcludingAll().length === 0;
  }

  getCycleOptionsExcludingAll(): SelectOption[] {
    return this.cycleFilterOptions.filter((option) => option.value !== 'all');
  }

  onLevelFiltersChange(): void {
    this.currentPage = 1;
    this.selectedOptionIds = [];
    this.rebuildOptionFilterOptions();
  }

  onSectionFiltersChange(): void {
    this.currentPage = 1;
    this.selectedOptionIds = [];
    this.rebuildOptionFilterOptions();
  }

  toggleMultiSelectPanel(field: MultiSelectField, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isMultiSelectDisabled(field)) {
      return;
    }
    this.openMultiSelectField = this.openMultiSelectField === field ? null : field;
    this.openActionMenuId = null;
  }

  isMultiSelectDisabled(field: MultiSelectField): boolean {
    if (field === 'cycle') {
      return this.isCycleSelectDisabled();
    }
    if (field === 'installment') {
      return this.isInstallmentFilterDisabled() || this.isLoadingReferences || this.getOptionsForField(field).length === 0;
    }
    return this.isLoadingReferences || this.getOptionsForField(field).length === 0;
  }

  hasMultiSelection(field: MultiSelectField): boolean {
    if (field === 'cycle') {
      return this.hasCycleSelection();
    }
    return this.getSelectedIds(field).length > 0;
  }

  getSelectedOptions(field: MultiSelectField): SelectOption[] {
    const selected = new Set(this.getSelectedIds(field));
    return this.getOptionsForField(field).filter((option) => selected.has(option.value));
  }

  isMultiSelected(field: MultiSelectField, value: string): boolean {
    return this.getSelectedIds(field).includes(value);
  }

  toggleMultiValue(field: MultiSelectField, value: string): void {
    const current = [...this.getSelectedIds(field)];
    const index = current.indexOf(value);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(value);
    }
    this.setSelectedIds(field, current);
    this.onMultiSelectChange(field);
  }

  removeMultiValue(field: MultiSelectField, value: string, event: MouseEvent): void {
    event.stopPropagation();
    this.setSelectedIds(
      field,
      this.getSelectedIds(field).filter((id) => id !== value)
    );
    this.onMultiSelectChange(field);
  }

  selectAllMulti(field: MultiSelectField): void {
    const allValues = this.getOptionsForField(field).map((option) => option.value);
    this.setSelectedIds(field, allValues);
    this.onMultiSelectChange(field);
  }

  clearMulti(field: MultiSelectField): void {
    this.setSelectedIds(field, []);
    this.onMultiSelectChange(field);
  }

  private onMultiSelectChange(field: MultiSelectField): void {
    if (field === 'level') {
      this.onLevelFiltersChange();
      return;
    }
    if (field === 'section') {
      this.onSectionFiltersChange();
      return;
    }
    this.onFiltersChange();
  }

  private getSelectedIds(field: MultiSelectField): string[] {
    switch (field) {
      case 'cycle':
        return this.cycleFilter === 'all' ? [] : [this.cycleFilter];
      case 'level':
        return this.selectedLevelIds;
      case 'section':
        return this.selectedSectionIds;
      case 'option':
        return this.selectedOptionIds;
      case 'installment':
        return this.selectedInstallmentIds;
      default:
        return [];
    }
  }

  private setSelectedIds(field: MultiSelectField, ids: string[]): void {
    switch (field) {
      case 'cycle':
        this.cycleFilter = ids[0] ?? 'all';
        break;
      case 'level':
        this.selectedLevelIds = ids;
        break;
      case 'section':
        this.selectedSectionIds = ids;
        break;
      case 'option':
        this.selectedOptionIds = ids;
        break;
      case 'installment':
        this.selectedInstallmentIds = ids;
        break;
    }
  }

  private getOptionsForField(field: MultiSelectField): SelectOption[] {
    switch (field) {
      case 'cycle':
        return this.cycleFilterOptions;
      case 'level':
        return this.levelFilterOptions;
      case 'section':
        return this.sectionFilterOptions;
      case 'option':
        return this.optionFilterOptions;
      case 'installment':
        return this.installmentFilterOptions;
      default:
        return [];
    }
  }

  private matchesMultiFilter(selectedIds: string[], value: string): boolean {
    if (!selectedIds.length) {
      return true;
    }
    return selectedIds.includes(value);
  }

  private sanitizeMultiSelection(selectedIds: string[], options: SelectOption[]): string[] {
    const validIds = new Set(options.map((option) => option.value));
    return selectedIds.filter((id) => validIds.has(id));
  }

  onFiltersChange(): void {
    this.currentPage = 1;
  }

  onCategoryFilterChange(): void {
    this.currentPage = 1;
    if (!this.selectedFilterCategoryAllowsInstallments) {
      this.selectedInstallmentIds = [];
    }
  }

  isInstallmentFilterDisabled(): boolean {
    return !this.selectedFilterCategoryAllowsInstallments;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.cycleFilter = 'all';
    this.selectedLevelIds = [];
    this.selectedSectionIds = [];
    this.selectedOptionIds = [];
    this.categoryFilter = 'all';
    this.studentCategoryFilter = 'all';
    this.selectedInstallmentIds = [];
    this.installmentPaymentFilter = 'all';
    this.statusFilter = 'all';
    this.currentPage = 1;
    this.rebuildDependentFilterOptions();
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
    this.editingFeeId = null;
    this.editingInstallmentId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = { ...this.buildEmptyForm(), active: true };
    this.rebuildFormAcademicOptions();
    this.onFormCategoryChange();
    this.portalModalToBody();
  }

  openEditModal(item: SchoolFeeItem): void {
    this.openActionMenuId = null;
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingFeeId = item.id;
    this.editingInstallmentId = item.installmentId || null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toFormFields(item);
    this.rebuildFormAcademicOptions();
    this.onFormCategoryChange();
    this.portalModalToBody();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingFeeId = null;
    this.editingInstallmentId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.openFormMultiSelectField = null;
    this.openFormCycleSelect = false;
    this.form = this.buildEmptyForm();
    this.restoreBodyAfterModal();
  }

  private portalModalToBody(): void {
    setTimeout(() => {
      if (!this.isModalOpen) {
        return;
      }
      const backdrop = this.feeFormBackdrop?.nativeElement;
      if (backdrop && backdrop.parentElement !== document.body) {
        this.renderer.appendChild(document.body, backdrop);
      }
      this.renderer.addClass(document.body, 'school-fee-modal-open');
    });
  }

  private restoreBodyAfterModal(): void {
    this.renderer.removeClass(document.body, 'school-fee-modal-open');
  }

  toggleActiveStatus(): void {
    this.form = { ...this.form, active: !this.form.active };
  }

  onFormCategoryChange(): void {
    if (!this.selectedCategoryAllowsInstallments) {
      this.form = {
        ...this.form,
        paymentByInstallment: false,
        selectedInstallmentIds: [],
        installmentAmounts: {}
      };
      return;
    }

    this.form = {
      ...this.form,
      paymentByInstallment: true,
      selectedInstallmentIds: [],
      installmentAmounts: {}
    };
  }

  getInstallmentAmount(installmentId: string): string {
    return this.form.installmentAmounts[installmentId] ?? '';
  }

  setInstallmentAmount(installmentId: string, value: string): void {
    this.form = {
      ...this.form,
      installmentAmounts: {
        ...this.form.installmentAmounts,
        [installmentId]: value
      }
    };
  }

  isFormInstallmentSelected(installmentId: string): boolean {
    return this.form.selectedInstallmentIds.includes(installmentId);
  }

  toggleFormInstallmentSelection(installmentId: string): void {
    if (this.isFormInstallmentSelected(installmentId)) {
      const { [installmentId]: _removed, ...restAmounts } = this.form.installmentAmounts;
      this.form = {
        ...this.form,
        selectedInstallmentIds: this.form.selectedInstallmentIds.filter((id) => id !== installmentId),
        installmentAmounts: restAmounts
      };
      return;
    }

    this.form = {
      ...this.form,
      selectedInstallmentIds: [...this.form.selectedInstallmentIds, installmentId]
    };
  }

  getInstallmentAmountTotal(): number {
    return this.getFilledInstallmentAmounts().reduce((sum, entry) => sum + entry.amount, 0);
  }

  private getFilledInstallmentAmounts(): { id: string; amount: number }[] {
    const selectedIds = new Set(this.form.selectedInstallmentIds);
    return this.formInstallmentOptions
      .filter((option) => selectedIds.has(option.value))
      .map((option) => ({
        id: option.value,
        amount: Number(this.form.installmentAmounts[option.value] ?? '')
      }))
      .filter((entry) => Number.isFinite(entry.amount) && entry.amount > 0);
  }

  private sanitizeInstallmentAmounts(): Record<string, string> {
    const validIds = new Set(this.form.selectedInstallmentIds);
    return Object.fromEntries(
      Object.entries(this.form.installmentAmounts).filter(([id]) => validIds.has(id))
    );
  }

  private sanitizeSelectedInstallmentIds(): string[] {
    const validIds = new Set(this.formInstallmentOptions.map((option) => option.value));
    return this.form.selectedInstallmentIds.filter((id) => validIds.has(id));
  }

  toggleFormMultiSelectPanel(field: FormMultiSelectField, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isFormMultiSelectDisabled(field)) {
      return;
    }
    this.openFormMultiSelectField = this.openFormMultiSelectField === field ? null : field;
    this.openFormCycleSelect = false;
    this.openMultiSelectField = null;
    this.openActionMenuId = null;
  }

  toggleFormCycleSelectPanel(event: MouseEvent): void {
    event.stopPropagation();
    if (this.cycleFormOptions.length === 0) {
      return;
    }
    this.openFormCycleSelect = !this.openFormCycleSelect;
    this.openFormMultiSelectField = null;
    this.openMultiSelectField = null;
    this.openActionMenuId = null;
  }

  hasFormCycleSelection(): boolean {
    return !!this.form.formCycleId;
  }

  getFormCycleLabel(): string {
    if (!this.form.formCycleId) {
      return 'Sélectionner...';
    }
    return this.cycleFormOptions.find((option) => option.value === this.form.formCycleId)?.label ?? 'Cycle';
  }

  selectFormCycle(value: string, event?: MouseEvent): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.form = {
      ...this.form,
      formCycleId: value,
      selectedLevelIds: [],
      selectedSectionIds: [],
      selectedOptionIds: []
    };
    this.openFormCycleSelect = false;
    this.rebuildFormAcademicOptions();
  }

  clearFormCycle(event: MouseEvent): void {
    event.stopPropagation();
    this.form = {
      ...this.form,
      formCycleId: '',
      selectedLevelIds: [],
      selectedSectionIds: [],
      selectedOptionIds: []
    };
    this.rebuildFormAcademicOptions();
  }

  isFormMultiSelectDisabled(field: FormMultiSelectField): boolean {
    return this.getFormOptionsForField(field).length === 0;
  }

  hasFormMultiSelection(field: FormMultiSelectField): boolean {
    return this.getFormSelectedIds(field).length > 0;
  }

  getFormSelectedOptions(field: FormMultiSelectField): SelectOption[] {
    const selected = new Set(this.getFormSelectedIds(field));
    return this.getFormOptionsForField(field).filter((option) => selected.has(option.value));
  }

  isFormMultiSelected(field: FormMultiSelectField, value: string): boolean {
    return this.getFormSelectedIds(field).includes(value);
  }

  toggleFormMultiValue(field: FormMultiSelectField, value: string): void {
    const current = [...this.getFormSelectedIds(field)];
    const index = current.indexOf(value);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(value);
    }
    this.setFormSelectedIds(field, current);
    this.onFormMultiSelectChange(field);
    this.openFormMultiSelectField = null;
  }

  removeFormMultiValue(field: FormMultiSelectField, value: string, event: MouseEvent): void {
    event.stopPropagation();
    this.setFormSelectedIds(
      field,
      this.getFormSelectedIds(field).filter((id) => id !== value)
    );
    this.onFormMultiSelectChange(field);
  }

  selectAllFormMulti(field: FormMultiSelectField): void {
    this.setFormSelectedIds(
      field,
      this.getFormOptionsForField(field).map((option) => option.value)
    );
    this.onFormMultiSelectChange(field);
  }

  clearFormMulti(field: FormMultiSelectField): void {
    this.setFormSelectedIds(field, []);
    this.onFormMultiSelectChange(field);
  }

  getFormPlaceholder(field: FormMultiSelectField, emptyLabel: string): string {
    if (this.isFormMultiSelectDisabled(field)) {
      return 'Aucune option disponible';
    }
    return emptyLabel;
  }

  private onFormMultiSelectChange(field: FormMultiSelectField): void {
    if (field === 'form-level') {
      this.form = { ...this.form, selectedOptionIds: [] };
      this.rebuildFormAcademicOptions();
      return;
    }
    if (field === 'form-section') {
      this.rebuildFormAcademicOptions();
    }
  }

  private getFormSelectedIds(field: FormMultiSelectField): string[] {
    switch (field) {
      case 'form-level':
        return this.form.selectedLevelIds;
      case 'form-section':
        return this.form.selectedSectionIds;
      case 'form-option':
        return this.form.selectedOptionIds;
      case 'form-student-category':
        return this.form.selectedStudentCategoryIds;
      default:
        return [];
    }
  }

  private setFormSelectedIds(field: FormMultiSelectField, ids: string[]): void {
    switch (field) {
      case 'form-level':
        this.form = { ...this.form, selectedLevelIds: ids };
        break;
      case 'form-section':
        this.form = { ...this.form, selectedSectionIds: ids };
        break;
      case 'form-option':
        this.form = { ...this.form, selectedOptionIds: ids };
        break;
      case 'form-student-category':
        this.form = { ...this.form, selectedStudentCategoryIds: ids };
        break;
    }
  }

  private getFormOptionsForField(field: FormMultiSelectField): SelectOption[] {
    switch (field) {
      case 'form-level':
        return this.formLevelOptions;
      case 'form-section':
        return this.formSectionOptions;
      case 'form-option':
        return this.formOptionOptions;
      case 'form-student-category':
        return this.formStudentCategoryOptions;
      default:
        return [];
    }
  }

  private sanitizeFormMultiSelection(selectedIds: string[], options: SelectOption[]): string[] {
    const validIds = new Set(options.map((option) => option.value));
    return selectedIds.filter((id) => validIds.has(id));
  }

  private categoryAllowsInstallments(categoryId: string): boolean {
    if (!categoryId) {
      return false;
    }
    const category = this.categoryRows.find((row) => String(row.id ?? '') === categoryId);
    return this.resolveBoolean(category?.allowInstallments ?? category?.allow_installments);
  }

  toggleActionMenu(itemId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openActionMenuId = this.openActionMenuId === itemId ? null : itemId;
  }

  deleteFee(item: SchoolFeeItem): void {
    this.openActionMenuId = null;
    if (!confirm(`Supprimer le frais "${item.name}" ?`)) {
      return;
    }

    this.schoolFeeService.delete(item.id).subscribe({
      next: () => this.loadFees(false),
      error: () => {
        this.loadError = 'Echec de suppression du frais scolaire.';
      }
    });
  }

  saveFee(formRef: NgForm): void {
    this.isSubmitted = true;
    if (this.isSaving || !this.selectedSchoolId) {
      return;
    }

    const validationError = this.validateForm();
    if (validationError) {
      this.saveError = validationError;
      formRef.control.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    if (this.isEditMode) {
      if (!this.editingFeeId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour ce frais: identifiant invalide.';
        return;
      }

      this.schoolFeeService.update(this.editingFeeId, this.buildSingleDto()).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadFees(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    const payloads = this.buildCreatePayloads();
    if (!payloads.length) {
      this.isSaving = false;
      this.saveError = 'Aucune combinaison valide a enregistrer.';
      return;
    }

    forkJoin(payloads.map((dto) => this.schoolFeeService.create(dto))).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadFees(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation. Verifiez l'API puis reessayez.";
      }
    });
  }

  private validateForm(): string {
    if (this.isEditMode) {
      if (!this.form.code.trim()) return 'Le code est obligatoire.';
      if (!this.form.name.trim()) return 'Le libelle est obligatoire.';
    }
    if (!this.form.feeCategoryId) return 'La categorie de frais est obligatoire.';
    if (!this.form.formYearId) return "L'annee scolaire est obligatoire.";
    if (!this.form.formCycleId) return 'Selectionnez un cycle.';
    if (!this.form.selectedLevelIds.length) return 'Selectionnez au moins un niveau.';
    if (this.formInstallmentsEnabled) {
      if (!this.form.selectedInstallmentIds.length) {
        return 'Selectionnez au moins une tranche.';
      }
      if (!this.getFilledInstallmentAmounts().length) {
        return 'Saisissez un montant valide pour chaque tranche selectionnee.';
      }
      return '';
    }
    if (!this.form.amount.trim()) return 'Le montant est obligatoire.';
    const amount = Number(this.form.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return 'Le montant doit etre un nombre positif.';
    }
    return '';
  }

  private buildSingleDto(): CreateSchoolFeeDto {
    const installmentEntry = this.resolveSingleInstallmentEntry();
    const amount = installmentEntry?.amount ?? Number(this.form.amount);

    return {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      amount,
      feeCategoryId: this.form.feeCategoryId,
      paymentInstallmentId: installmentEntry?.id ?? null,
      schoolId: this.selectedSchoolId,
      academicYearId: this.form.formYearId,
      academicCycleId: this.form.formCycleId,
      academicLevelId: this.form.selectedLevelIds[0] ?? '',
      academicSectionId: this.form.selectedSectionIds[0] || null,
      academicOptionId: this.form.selectedOptionIds[0] || null,
      studentCategoryId: this.form.selectedStudentCategoryIds[0] || null,
      description: this.form.description.trim() || undefined,
      active: this.form.active
    };
  }

  private resolveSingleInstallmentEntry(): { id: string; amount: number } | null {
    if (!this.formInstallmentsEnabled) {
      return null;
    }
    const filled = this.getFilledInstallmentAmounts();
    if (!filled.length) {
      return null;
    }
    if (this.editingInstallmentId) {
      return filled.find((entry) => entry.id === this.editingInstallmentId) ?? filled[0];
    }
    return filled[0];
  }

  private resolveCreateFeeCode(): string {
    const row = this.categoryRows.find((item) => String(item.id ?? '') === this.form.feeCategoryId);
    return (row?.code ?? '').trim().toUpperCase() || 'FRAIS';
  }

  private resolveCreateFeeName(): string {
    const row = this.categoryRows.find((item) => String(item.id ?? '') === this.form.feeCategoryId);
    return (row?.name ?? '').trim() || this.summaryCategoryName || 'Frais scolaire';
  }

  private buildCreatePayloads(): CreateSchoolFeeDto[] {
    const sections = this.form.selectedSectionIds.length ? this.form.selectedSectionIds : [null];
    const options = this.form.selectedOptionIds.length ? this.form.selectedOptionIds : [null];
    const studentCategories = this.form.selectedStudentCategoryIds.length
      ? this.form.selectedStudentCategoryIds
      : [null];
    const installmentEntries = this.formInstallmentsEnabled
      ? this.getFilledInstallmentAmounts()
      : [{ id: null as string | null, amount: Number(this.form.amount) }];
    const cycleId = this.form.formCycleId;
    const code = this.resolveCreateFeeCode();
    const name = this.resolveCreateFeeName();
    const payloads: CreateSchoolFeeDto[] = [];

    for (const levelId of this.form.selectedLevelIds) {
      for (const sectionId of sections) {
        for (const optionId of options) {
          for (const studentCategoryId of studentCategories) {
            for (const installment of installmentEntries) {
              payloads.push({
                code,
                name,
                amount: installment.amount,
                feeCategoryId: this.form.feeCategoryId,
                paymentInstallmentId: installment.id,
                schoolId: this.selectedSchoolId,
                academicYearId: this.form.formYearId,
                academicCycleId: cycleId,
                academicLevelId: levelId,
                academicSectionId: sectionId,
                academicOptionId: optionId,
                studentCategoryId,
                active: true
              });
            }
          }
        }
      }
    }

    return payloads;
  }

  private loadSchools(): void {
    this.isLoadingSchools = true;
    this.loadError = '';

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
        this.bootstrapReferences();
      },
      error: () => {
        this.isLoadingSchools = false;
        this.loadError = 'Impossible de charger les ecoles.';
      }
    });
  }

  private bootstrapReferences(): void {
    if (!this.selectedSchoolId) {
      this.resetReferenceData();
      return;
    }

    this.isLoadingReferences = true;
    this.loadError = '';

    forkJoin({
      years: this.academicYearService.getAll({ schoolId: this.selectedSchoolId }).pipe(catchError(() => of([]))),
      associations: this.schoolAcademicModelService
        .getAll({ schoolId: this.selectedSchoolId })
        .pipe(catchError(() => of([]))),
      models: this.academicModelService.getAll().pipe(catchError(() => of([]))),
      cycles: this.academicCycleService.getAll().pipe(catchError(() => of([]))),
      levels: this.academicLevelService.getAll().pipe(catchError(() => of([]))),
      sections: this.academicSectionService.getAll().pipe(catchError(() => of([]))),
      options: this.academicOptionService.getAll().pipe(catchError(() => of([]))),
      categories: this.feeCategoryService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      studentCategories: this.studentCategoryService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      installments: this.paymentInstallmentService.getAll(this.selectedSchoolId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ years, associations, models, cycles, levels, sections, options, categories, studentCategories, installments }) => {
        this.yearOptions = (years as AcademicYearApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '');
            const code = (row.code ?? '').trim();
            return { value: id, label: code || this.buildYearLabel(row) };
          })
          .filter((item) => item.value)
          .sort((a, b) => b.label.localeCompare(a.label, 'fr'));

        this.selectedYearId = this.yearOptions[0]?.value ?? '';

        this.activeAcademicModelIds = this.resolveActiveSchoolModelIds(
          associations as SchoolAcademicModelApiResponse[],
          models as AcademicModelApiResponse[]
        );

        const allCycles = (cycles as AcademicCycleApiResponse[]).filter((row) => this.isRowActive(row));
        const schoolCycles = this.filterCyclesForSchool(allCycles, this.activeAcademicModelIds);
        this.cycleRows = schoolCycles.length > 0 ? schoolCycles : allCycles;
        this.schoolCycleIds = new Set(this.cycleRows.map((row) => String(row.id ?? '')).filter(Boolean));
        this.cyclesHint = this.buildCyclesHint(allCycles.length, this.cycleRows.length, this.activeAcademicModelIds.length);

        this.levelRows = (levels as AcademicLevelApiResponse[]).filter((row) => {
          const cycleId = this.resolveCycleIdFromLevel(row);
          return this.schoolCycleIds.has(cycleId) && this.isRowActive(row);
        });
        this.sectionRows = (sections as AcademicSectionApiResponse[]).filter((row) => {
          const cycleId = this.resolveCycleIdFromSection(row);
          return this.schoolCycleIds.has(cycleId) && this.isRowActive(row);
        });
        this.optionRows = (options as AcademicOptionApiResponse[]).filter((row) => this.isRowActive(row));
        this.categoryRows = categories as FeeCategoryApiResponse[];
        this.studentCategoryRows = (studentCategories as StudentCategoryApiResponse[]).filter((row) =>
          this.isRowActive(row)
        );
        this.installmentRows = installments as PaymentInstallmentApiResponse[];

        this.categoryFormOptions = this.categoryRows
          .map((row) => ({
            value: String(row.id ?? ''),
            label: (row.name ?? '').trim() || (row.code ?? '').trim()
          }))
          .filter((item) => item.value);

        this.categoryFilterOptions = [
          { value: 'all', label: 'Toutes les categories' },
          ...this.categoryFormOptions
        ];

        this.formStudentCategoryOptions = this.studentCategoryRows
          .map((row) => ({
            value: String(row.id ?? ''),
            label: (row.name ?? '').trim() || (row.code ?? '').trim()
          }))
          .filter((item) => item.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.studentCategoryFilterOptions = [
          { value: 'all', label: 'Toutes les categories' },
          ...this.formStudentCategoryOptions
        ];

        if (
          this.studentCategoryFilter !== 'all' &&
          !this.studentCategoryFilterOptions.some((option) => option.value === this.studentCategoryFilter)
        ) {
          this.studentCategoryFilter = 'all';
        }

        this.formInstallmentOptions = this.installmentRows
          .map((row) => ({
            value: String(row.id ?? ''),
            label: this.buildInstallmentLabel(row)
          }))
          .filter((item) => item.value);

        this.installmentFilterOptions = this.formInstallmentOptions;
        this.selectedInstallmentIds = this.sanitizeMultiSelection(
          this.selectedInstallmentIds,
          this.installmentFilterOptions
        );

        this.rebuildDependentFilterOptions();
        this.isLoadingReferences = false;
        this.loadFees(true);
      },
      error: () => {
        this.isLoadingReferences = false;
        this.loadError = 'Impossible de charger les donnees de reference.';
      }
    });
  }

  private loadFees(showLoader = true): void {
    if (!this.selectedSchoolId || !this.selectedYearId) {
      this.fees = [];
      return;
    }

    if (showLoader) {
      this.isLoading = true;
    }
    this.loadError = '';

    this.schoolFeeService
      .getAll({ schoolId: this.selectedSchoolId, academicYearId: this.selectedYearId })
      .subscribe({
        next: (rows: SchoolFeeApiResponse[]) => {
          this.fees = rows
            .map((row) => this.mapApiToItem(row))
            .filter((item) => item.id);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.loadError = 'Impossible de charger les frais scolaires.';
          this.fees = [];
        }
      });
  }

  private mapApiToItem(row: SchoolFeeApiResponse): SchoolFeeItem {
    const category = row.feeCategory;
    const installment = row.paymentInstallment;
    const studentCategory = row.studentCategory;
    const categoryId = String(row.feeCategoryId ?? row.fee_category_id ?? category?.id ?? '');
    const categoryName = (category?.name ?? '').trim() || this.findCategoryName(categoryId);
    const studentCategoryId = String(
      row.studentCategoryId ?? row.student_category_id ?? studentCategory?.id ?? ''
    );
    const studentCategoryName =
      (studentCategory?.name ?? '').trim() || this.findStudentCategoryName(studentCategoryId);
    const installmentId = String(
      row.paymentInstallmentId ?? row.payment_installment_id ?? installment?.id ?? ''
    );
    const displayOrder = Number(installment?.displayOrder ?? installment?.display_order ?? 0);
    const allowInstallments = this.resolveBoolean(
      category?.allowInstallments ?? category?.allow_installments ?? this.findCategoryAllowsInstallments(categoryId)
    );

    const code = (row.code ?? '').trim();

    return {
      id: String(row.id ?? ''),
      code,
      codeTone: this.resolveCodeTone(code),
      name: (row.name ?? '').trim(),
      amount: Number(row.amount ?? 0),
      amountLabel: this.formatAmount(row.amount),
      categoryId,
      categoryName,
      categoryTone: this.resolveCategoryTone(categoryName),
      categoryIcon: this.resolveCategoryIcon(categoryName),
      installmentId,
      installmentLabel: installmentId
        ? this.buildInstallmentLabel(installment ?? this.findInstallment(installmentId))
        : '—',
      installmentTone: installmentId ? this.resolveInstallmentTone(displayOrder) : '',
      allowInstallments,
      status: this.resolveStatus(row.active),
      schoolId: String(row.schoolId ?? row.school_id ?? this.selectedSchoolId),
      academicYearId: String(row.academicYearId ?? row.academic_year_id ?? this.selectedYearId),
      academicCycleId: String(
        row.academicCycleId ?? row.academic_cycle_id ?? row.academicCycle?.id ?? ''
      ),
      academicLevelId: String(row.academicLevelId ?? row.academic_level_id ?? ''),
      academicSectionId: String(row.academicSectionId ?? row.academic_section_id ?? ''),
      academicOptionId: String(row.academicOptionId ?? row.academic_option_id ?? ''),
      studentCategoryId,
      studentCategoryName,
      description: (row.description ?? '').trim(),
      comment: (row.comment ?? '').trim()
    };
  }

  private rebuildDependentFilterOptions(): void {
    const cycles = this.cycleRows
      .map((row) => ({
        value: String(row.id ?? ''),
        label: this.buildCycleLabel(row),
        order: this.readDisplayOrder(row)
      }))
      .filter((item) => item.value)
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'fr'));

    this.cycleFilterOptions = [{ value: 'all', label: 'Tous les cycles' }, ...cycles];

    if (
      this.cycleFilter !== 'all' &&
      !this.cycleFilterOptions.some((option) => option.value === this.cycleFilter)
    ) {
      this.cycleFilter = 'all';
    }

    const availableCycleIds = this.cycleFilter === 'all'
      ? this.schoolCycleIds
      : new Set([this.cycleFilter]);

    const levels = this.levelRows
      .filter((row) => {
        const cycleId = this.resolveCycleIdFromLevel(row);
        return availableCycleIds.has(cycleId);
      })
      .map((row) => ({
        value: String(row.id ?? ''),
        label: this.buildLevelLabel(row),
        order: this.readLevelOrder(row)
      }))
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'fr'));

    this.levelFilterOptions = levels.filter((item) => item.value);
    this.selectedLevelIds = this.sanitizeMultiSelection(this.selectedLevelIds, this.levelFilterOptions);

    const sections = this.sectionRows
      .filter((row) => {
        const cycleId = this.resolveCycleIdFromSection(row);
        return availableCycleIds.has(cycleId);
      })
      .map((row) => ({
        value: String(row.id ?? ''),
        label: (row.name ?? '').trim() || (row.code ?? '').trim()
      }));

    this.sectionFilterOptions = sections.filter((item) => item.value);
    this.selectedSectionIds = this.sanitizeMultiSelection(this.selectedSectionIds, this.sectionFilterOptions);

    this.rebuildOptionFilterOptions();
    this.cycleFormOptions = cycles;
  }

  private rebuildOptionFilterOptions(): void {
    const availableSectionIds = new Set(this.sectionFilterOptions.map((option) => option.value));
    const sectionScope = this.selectedSectionIds.length
      ? new Set(this.selectedSectionIds)
      : availableSectionIds;

    const options = this.optionRows
      .filter((row) => {
        const sectionId = String(row.academicSectionId ?? row.academic_section_id ?? '');
        return sectionScope.has(sectionId);
      })
      .map((row) => ({
        value: String(row.id ?? ''),
        label: (row.name ?? '').trim() || (row.code ?? '').trim()
      }));

    this.optionFilterOptions = options.filter((item) => item.value);
    this.selectedOptionIds = this.sanitizeMultiSelection(this.selectedOptionIds, this.optionFilterOptions);
  }

  private rebuildFormAcademicOptions(): void {
    const selectedCycles = this.form.formCycleId ? new Set([this.form.formCycleId]) : new Set<string>();

    this.formLevelOptions = this.levelRows
      .filter((row) => selectedCycles.has(this.resolveCycleIdFromLevel(row)))
      .map((row) => ({
        value: String(row.id ?? ''),
        label: this.buildLevelLabel(row),
        order: this.readLevelOrder(row)
      }))
      .filter((item) => item.value)
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'fr'));

    this.form.selectedLevelIds = this.sanitizeFormMultiSelection(
      this.form.selectedLevelIds,
      this.formLevelOptions
    );

    this.formSectionOptions = this.sectionRows
      .filter((row) => selectedCycles.has(this.resolveCycleIdFromSection(row)))
      .map((row) => ({
        value: String(row.id ?? ''),
        label: (row.name ?? '').trim() || (row.code ?? '').trim()
      }))
      .filter((item) => item.value);

    this.form.selectedSectionIds = this.sanitizeFormMultiSelection(
      this.form.selectedSectionIds,
      this.formSectionOptions
    );

    const sectionScope = this.form.selectedSectionIds.length
      ? new Set(this.form.selectedSectionIds)
      : new Set(this.formSectionOptions.map((option) => option.value));

    this.formOptionOptions = this.optionRows
      .filter((row) => {
        const sectionId = String(row.academicSectionId ?? row.academic_section_id ?? '');
        return sectionScope.has(sectionId);
      })
      .map((row) => ({
        value: String(row.id ?? ''),
        label: (row.name ?? '').trim() || (row.code ?? '').trim()
      }))
      .filter((item) => item.value);

    this.form.selectedOptionIds = this.sanitizeFormMultiSelection(
      this.form.selectedOptionIds,
      this.formOptionOptions
    );

    this.form.selectedStudentCategoryIds = this.sanitizeFormMultiSelection(
      this.form.selectedStudentCategoryIds,
      this.formStudentCategoryOptions
    );

    this.form = {
      ...this.form,
      selectedInstallmentIds: this.sanitizeSelectedInstallmentIds(),
      installmentAmounts: this.sanitizeInstallmentAmounts()
    };
  }

  private findCategoryName(categoryId: string): string {
    return this.categoryRows.find((row) => String(row.id ?? '') === categoryId)?.name?.trim() ?? '—';
  }

  private findStudentCategoryName(studentCategoryId: string): string {
    if (!studentCategoryId) {
      return '—';
    }
    return (
      this.studentCategoryRows.find((row) => String(row.id ?? '') === studentCategoryId)?.name?.trim() ?? '—'
    );
  }

  private findCategoryAllowsInstallments(categoryId: string): boolean {
    const row = this.categoryRows.find((item) => String(item.id ?? '') === categoryId);
    return this.resolveBoolean(row?.allowInstallments ?? row?.allow_installments);
  }

  private findInstallment(installmentId: string): PaymentInstallmentApiResponse | undefined {
    return this.installmentRows.find((row) => String(row.id ?? '') === installmentId);
  }

  private buildInstallmentLabel(row: PaymentInstallmentApiResponse | SchoolFeeApiResponse['paymentInstallment']): string {
    if (!row) {
      return '—';
    }
    const code = (row.code ?? '').trim();
    const displayOrder = Number(row.displayOrder ?? row.display_order ?? 0);
    if (displayOrder > 0) {
      return `${this.toOrdinalLabel(displayOrder)} tranche (${code || `T${displayOrder}`})`;
    }
    const name = (row.name ?? '').trim();
    if (name && code) {
      return `${name} (${code})`;
    }
    return name || code || '—';
  }

  private toOrdinalLabel(order: number): string {
    if (order === 1) return '1ère';
    return `${order}ème`;
  }

  private resolveCodeTone(code: string): string {
    const normalized = this.normalize(code);
    if (normalized.includes('inscr') || normalized.includes('fadm')) {
      return 'tone-blue';
    }
    if (normalized.includes('minerv') || normalized.includes('facad')) {
      return 'tone-green';
    }
    if (normalized.includes('biblio')) {
      return 'tone-purple';
    }
    if (normalized.includes('foul') || normalized.includes('unif')) {
      return 'tone-indigo';
    }
    if (normalized.includes('trans')) {
      return 'tone-orange';
    }
    if (normalized.includes('activ')) {
      return 'tone-orange';
    }
    return 'tone-blue';
  }

  private resolveCategoryTone(name: string): string {
    const normalized = this.normalize(name);
    if (normalized.includes('admin')) {
      return 'tone-blue';
    }
    if (normalized.includes('acad')) {
      return 'tone-green';
    }
    if (normalized.includes('divers')) {
      return 'tone-pink';
    }
    if (normalized.includes('transport')) {
      return 'tone-orange';
    }
    return 'tone-indigo';
  }

  private resolveCategoryIcon(name: string): string {
    const normalized = this.normalize(name);
    if (normalized.includes('admin')) {
      return 'bi-folder2';
    }
    if (normalized.includes('acad')) {
      return 'bi-mortarboard';
    }
    if (normalized.includes('transport')) {
      return 'bi-bus-front';
    }
    if (normalized.includes('divers')) {
      return 'bi-grid';
    }
    return 'bi-tag';
  }

  private resolveInstallmentTone(displayOrder: number): string {
    const tones = ['tone-purple', 'tone-blue', 'tone-orange', 'tone-teal'];
    if (displayOrder <= 0) {
      return tones[0];
    }
    return tones[(displayOrder - 1) % tones.length];
  }

  private buildEmptyForm(): SchoolFeeForm {
    const categoryId = this.categoryFormOptions[0]?.value ?? '';
    const allowsInstallments = this.categoryAllowsInstallments(categoryId);
    return {
      code: '',
      name: '',
      amount: '',
      feeCategoryId: categoryId,
      paymentByInstallment: allowsInstallments,
      description: '',
      active: true,
      displayOrder: '1',
      formYearId: this.selectedYearId || this.yearOptions[0]?.value || '',
      formCycleId: '',
      selectedLevelIds: [],
      selectedSectionIds: [],
      selectedOptionIds: [],
      selectedStudentCategoryIds: [],
      selectedInstallmentIds: [],
      installmentAmounts: {}
    };
  }

  private toFormFields(item: SchoolFeeItem): SchoolFeeForm {
    const installmentAmounts: Record<string, string> = {};
    const selectedInstallmentIds: string[] = [];
    if (item.allowInstallments && item.installmentId) {
      installmentAmounts[item.installmentId] = String(item.amount);
      selectedInstallmentIds.push(item.installmentId);
    }

    return {
      code: item.code,
      name: item.name,
      amount: String(item.amount),
      feeCategoryId: item.categoryId,
      paymentByInstallment: this.categoryAllowsInstallments(item.categoryId),
      description: item.description,
      active: item.status === 'Actif',
      displayOrder: '1',
      formYearId: item.academicYearId || this.selectedYearId,
      formCycleId: item.academicCycleId || '',
      selectedLevelIds: item.academicLevelId ? [item.academicLevelId] : [],
      selectedSectionIds: item.academicSectionId ? [item.academicSectionId] : [],
      selectedOptionIds: item.academicOptionId ? [item.academicOptionId] : [],
      selectedStudentCategoryIds: item.studentCategoryId ? [item.studentCategoryId] : [],
      selectedInstallmentIds,
      installmentAmounts
    };
  }

  private resetReferenceData(): void {
    this.yearOptions = [];
    this.selectedYearId = '';
    this.fees = [];
    this.cycleRows = [];
    this.levelRows = [];
    this.sectionRows = [];
    this.optionRows = [];
    this.categoryRows = [];
    this.studentCategoryRows = [];
    this.installmentRows = [];
    this.activeAcademicModelIds = [];
    this.schoolCycleIds = new Set<string>();
    this.cyclesHint = '';
    this.selectedLevelIds = [];
    this.selectedSectionIds = [];
    this.selectedOptionIds = [];
    this.studentCategoryFilter = 'all';
    this.selectedInstallmentIds = [];
    this.formStudentCategoryOptions = [];
    this.studentCategoryFilterOptions = [{ value: 'all', label: 'Toutes les categories' }];
    this.rebuildDependentFilterOptions();
  }

  private resolveActiveSchoolModelIds(
    associations: SchoolAcademicModelApiResponse[],
    models: AcademicModelApiResponse[]
  ): string[] {
    const activeModelIds = new Set(
      models
        .filter((row) => this.isRowActive(row))
        .map((row) => String(row.id ?? ''))
        .filter(Boolean)
    );

    return associations
      .filter((row) => {
        const modelId = String(row.academicModelId ?? row.academic_model_id ?? '');
        return this.isRowActive(row) && activeModelIds.has(modelId);
      })
      .map((row) => String(row.academicModelId ?? row.academic_model_id ?? ''))
      .filter(Boolean);
  }

  private filterCyclesForSchool(
    cycles: AcademicCycleApiResponse[],
    activeModelIds: string[]
  ): AcademicCycleApiResponse[] {
    if (!activeModelIds.length) {
      return cycles;
    }

    const modelIdSet = new Set(activeModelIds);
    return cycles.filter((row) => {
      const modelId = this.resolveCycleModelId(row);
      return modelId && modelIdSet.has(modelId);
    });
  }

  private resolveCycleModelId(row: AcademicCycleApiResponse): string {
    return String(
      row.academicModelId ??
        row.academic_model_id ??
        row.academicModel?.id ??
        ''
    );
  }

  private resolveCycleIdFromLevel(row: AcademicLevelApiResponse): string {
    return String(
      row.academicCycleId ??
        row.academic_cycle_id ??
        row.academicCycle?.id ??
        ''
    );
  }

  private resolveCycleIdFromSection(row: AcademicSectionApiResponse): string {
    return String(
      row.academicCycleId ??
        row.academic_cycle_id ??
        row.academicCycle?.id ??
        ''
    );
  }

  private buildCycleLabel(row: AcademicCycleApiResponse): string {
    const code = (row.code ?? '').trim();
    const name = (row.name ?? '').trim();
    if (code && name) {
      return `${code} — ${name}`;
    }
    return name || code || 'Cycle';
  }

  private buildLevelLabel(row: AcademicLevelApiResponse): string {
    const code = (row.code ?? '').trim();
    const name = (row.name ?? '').trim();
    if (code && name) {
      return `${code} — ${name}`;
    }
    return name || code || 'Niveau';
  }

  private readDisplayOrder(row: AcademicCycleApiResponse): number {
    const value = row.displayOrder ?? row.display_order;
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  private readLevelOrder(row: AcademicLevelApiResponse): number {
    const value = row.levelOrder ?? row.level_order ?? row.displayOrder ?? row.display_order;
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  private buildCyclesHint(totalCycles: number, schoolCycles: number, activeModels: number): string {
    if (schoolCycles === 0) {
      if (totalCycles === 0) {
        return 'Aucun cycle academique configure dans le systeme.';
      }
      if (activeModels === 0) {
        return 'Aucun modele academique actif pour cette ecole. Associez un modele dans Organisation.';
      }
      return 'Aucun cycle ne correspond aux modeles academiques de cette ecole.';
    }
    if (activeModels === 0 && totalCycles > schoolCycles) {
      return `${schoolCycles} cycle(s) disponible(s) (tous les cycles actifs).`;
    }
    return '';
  }

  private isRowActive(row: { active?: unknown; isActive?: unknown; is_active?: unknown }): boolean {
    if (row.active === false || row.active === 'false' || row.active === 0 || row.active === '0') {
      return false;
    }
    if (row.isActive === false || row.isActive === 'false' || row.isActive === 0 || row.isActive === '0') {
      return false;
    }
    if (row.is_active === false || row.is_active === 'false' || row.is_active === 0 || row.is_active === '0') {
      return false;
    }
    return true;
  }

  private resolveStatus(active: unknown): FeeStatus {
    if (active === false || active === 'false' || active === 0 || active === '0') {
      return 'Inactif';
    }
    return 'Actif';
  }

  private resolveBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private formatAmount(value: unknown): string {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) {
      return '0,00';
    }
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  private buildYearLabel(row: AcademicYearApiResponse): string {
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

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
