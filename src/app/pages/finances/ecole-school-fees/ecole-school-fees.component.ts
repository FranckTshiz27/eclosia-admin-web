import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
  SchoolAcademicModelApiResponse,
  SchoolAcademicModelService
} from '../../../services/school-academic-model.service';

type FeeStatus = 'Actif' | 'Inactif';

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
  description: string;
  comment: string;
}

interface SchoolFeeForm {
  code: string;
  name: string;
  amount: string;
  feeCategoryId: string;
  paymentInstallmentId: string;
  academicCycleId: string;
  academicLevelId: string;
  academicSectionId: string;
  academicOptionId: string;
  description: string;
  active: boolean;
  comment: string;
}

@Component({
  selector: 'app-ecole-school-fees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-school-fees.component.html',
  styleUrl: './ecole-school-fees.component.css'
})
export class EcoleSchoolFeesComponent implements OnInit, OnDestroy {
  selectedSchoolId = '';
  selectedYearId = '';
  cycleFilter = 'all';
  levelFilter = 'all';
  sectionFilter = 'all';
  optionFilter = 'all';
  categoryFilter = 'all';
  installmentFilter = 'all';
  searchTerm = '';
  installmentPaymentFilter = 'all';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoadingSchools = false;
  isLoadingReferences = false;
  isLoading = false;
  loadError = '';

  isModalOpen = false;
  isEditMode = false;
  editingFeeId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  openActionMenuId: string | null = null;

  schools: SelectOption[] = [];
  yearOptions: SelectOption[] = [];
  cycleFilterOptions: SelectOption[] = [{ value: 'all', label: 'Tous les cycles' }];
  levelFilterOptions: SelectOption[] = [{ value: 'all', label: 'Tous les niveaux' }];
  sectionFilterOptions: SelectOption[] = [{ value: 'all', label: 'Toutes les sections' }];
  optionFilterOptions: SelectOption[] = [{ value: 'all', label: 'Toutes les options' }];
  categoryFilterOptions: SelectOption[] = [{ value: 'all', label: 'Toutes les categories' }];
  installmentFilterOptions: SelectOption[] = [{ value: 'all', label: 'Toutes les tranches' }];

  categoryFormOptions: SelectOption[] = [];
  installmentFormOptions: SelectOption[] = [{ value: '', label: 'Aucune tranche' }];
  cycleFormOptions: SelectOption[] = [];
  levelFormOptions: SelectOption[] = [];
  sectionFormOptions: SelectOption[] = [];
  optionFormOptions: SelectOption[] = [];

  fees: SchoolFeeItem[] = [];
  form: SchoolFeeForm = this.buildEmptyForm();

  private cycleRows: AcademicCycleApiResponse[] = [];
  private levelRows: AcademicLevelApiResponse[] = [];
  private sectionRows: AcademicSectionApiResponse[] = [];
  private optionRows: AcademicOptionApiResponse[] = [];
  private categoryRows: FeeCategoryApiResponse[] = [];
  private installmentRows: PaymentInstallmentApiResponse[] = [];
  private activeAcademicModelIds: string[] = [];

  readonly descriptionMaxLength = 500;
  readonly commentMaxLength = 500;
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
    private readonly academicCycleService: AcademicCycleService,
    private readonly academicLevelService: AcademicLevelService,
    private readonly academicSectionService: AcademicSectionService,
    private readonly academicOptionService: AcademicOptionService,
    private readonly feeCategoryService: FeeCategoryService,
    private readonly paymentInstallmentService: PaymentInstallmentService,
    private readonly schoolFeeService: SchoolFeeService
  ) {}

  ngOnInit(): void {
    this.loadSchools();
    document.addEventListener('click', this.closeActionMenu);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.closeActionMenu);
  }

  private closeActionMenu = (): void => {
    this.openActionMenuId = null;
  };

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get commentLength(): number {
    return this.form.comment.length;
  }

  get selectedCategoryAllowsInstallments(): boolean {
    const category = this.categoryRows.find(
      (row) => String(row.id ?? '') === this.form.feeCategoryId
    );
    return this.resolveBoolean(category?.allowInstallments ?? category?.allow_installments);
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
        const matchesLevel = this.levelFilter === 'all' || item.academicLevelId === this.levelFilter;
        const matchesSection =
          this.sectionFilter === 'all' || item.academicSectionId === this.sectionFilter;
        const matchesOption = this.optionFilter === 'all' || item.academicOptionId === this.optionFilter;
        const matchesCategory =
          this.categoryFilter === 'all' || item.categoryId === this.categoryFilter;
        const matchesInstallment =
          this.installmentFilter === 'all' || item.installmentId === this.installmentFilter;
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
    this.levelFilter = 'all';
    this.sectionFilter = 'all';
    this.optionFilter = 'all';
    this.rebuildDependentFilterOptions();
  }

  onLevelFilterChange(): void {
    this.currentPage = 1;
  }

  onSectionFilterChange(): void {
    this.currentPage = 1;
    this.optionFilter = 'all';
    this.rebuildOptionFilterOptions();
  }

  onFiltersChange(): void {
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.cycleFilter = 'all';
    this.levelFilter = 'all';
    this.sectionFilter = 'all';
    this.optionFilter = 'all';
    this.categoryFilter = 'all';
    this.installmentFilter = 'all';
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
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
    this.syncFormAcademicOptions();
  }

  openEditModal(item: SchoolFeeItem): void {
    this.openActionMenuId = null;
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingFeeId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toFormFields(item);
    this.syncFormAcademicOptions();
    this.onFormCategoryChange();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingFeeId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  toggleActiveStatus(): void {
    this.form = { ...this.form, active: !this.form.active };
  }

  onFormCycleChange(): void {
    this.form = {
      ...this.form,
      academicLevelId: '',
      academicSectionId: '',
      academicOptionId: ''
    };
    this.rebuildFormAcademicOptions();
  }

  onFormLevelChange(): void {
    this.form = { ...this.form, academicSectionId: '', academicOptionId: '' };
    this.rebuildFormAcademicOptions();
  }

  onFormSectionChange(): void {
    this.form = { ...this.form, academicOptionId: '' };
    this.rebuildFormAcademicOptions();
  }

  onFormCategoryChange(): void {
    if (!this.selectedCategoryAllowsInstallments) {
      this.form = { ...this.form, paymentInstallmentId: '' };
    }
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
    if (!formRef.valid || this.isSaving || !this.selectedSchoolId || !this.selectedYearId) {
      formRef.control.markAllAsTouched();
      return;
    }

    const amount = Number(this.form.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      this.saveError = 'Le montant doit etre un nombre positif.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateSchoolFeeDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      amount,
      feeCategoryId: this.form.feeCategoryId,
      paymentInstallmentId: this.selectedCategoryAllowsInstallments
        ? this.form.paymentInstallmentId || null
        : null,
      schoolId: this.selectedSchoolId,
      academicYearId: this.selectedYearId,
      academicCycleId: this.form.academicCycleId,
      academicLevelId: this.form.academicLevelId,
      academicSectionId: this.form.academicSectionId || null,
      academicOptionId: this.form.academicOptionId || null,
      description: this.form.description.trim() || undefined,
      active: this.form.active,
      comment: this.form.comment.trim() || undefined
    };

    if (this.isEditMode) {
      if (!this.editingFeeId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour ce frais: identifiant invalide.';
        return;
      }

      this.schoolFeeService.update(this.editingFeeId, dto).subscribe({
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

    this.schoolFeeService.create(dto).subscribe({
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
      cycles: this.academicCycleService.getAll().pipe(catchError(() => of([]))),
      levels: this.academicLevelService.getAll().pipe(catchError(() => of([]))),
      sections: this.academicSectionService.getAll().pipe(catchError(() => of([]))),
      options: this.academicOptionService.getAll().pipe(catchError(() => of([]))),
      categories: this.feeCategoryService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      installments: this.paymentInstallmentService.getAll(this.selectedSchoolId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ years, associations, cycles, levels, sections, options, categories, installments }) => {
        this.yearOptions = (years as AcademicYearApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '');
            const code = (row.code ?? '').trim();
            return { value: id, label: code || this.buildYearLabel(row) };
          })
          .filter((item) => item.value)
          .sort((a, b) => b.label.localeCompare(a.label, 'fr'));

        this.selectedYearId = this.yearOptions[0]?.value ?? '';

        this.activeAcademicModelIds = (associations as SchoolAcademicModelApiResponse[])
          .filter((row) => this.resolveBoolean(row.active))
          .map((row) => String(row.academicModelId ?? row.academic_model_id ?? ''))
          .filter(Boolean);

        this.cycleRows = (cycles as AcademicCycleApiResponse[]).filter((row) => {
          const modelId = String(row.academicModelId ?? row.academic_model_id ?? '');
          return !this.activeAcademicModelIds.length || this.activeAcademicModelIds.includes(modelId);
        });
        this.levelRows = levels as AcademicLevelApiResponse[];
        this.sectionRows = sections as AcademicSectionApiResponse[];
        this.optionRows = options as AcademicOptionApiResponse[];
        this.categoryRows = categories as FeeCategoryApiResponse[];
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

        this.installmentFormOptions = [
          { value: '', label: 'Aucune tranche' },
          ...this.installmentRows
            .map((row) => ({
              value: String(row.id ?? ''),
              label: this.buildInstallmentLabel(row)
            }))
            .filter((item) => item.value)
        ];

        this.installmentFilterOptions = [
          { value: 'all', label: 'Toutes les tranches' },
          ...this.installmentFormOptions.filter((item) => item.value)
        ];

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
    const categoryId = String(row.feeCategoryId ?? row.fee_category_id ?? category?.id ?? '');
    const categoryName = (category?.name ?? '').trim() || this.findCategoryName(categoryId);
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
      academicCycleId: String(row.academicCycleId ?? row.academic_cycle_id ?? ''),
      academicLevelId: String(row.academicLevelId ?? row.academic_level_id ?? ''),
      academicSectionId: String(row.academicSectionId ?? row.academic_section_id ?? ''),
      academicOptionId: String(row.academicOptionId ?? row.academic_option_id ?? ''),
      description: (row.description ?? '').trim(),
      comment: (row.comment ?? '').trim()
    };
  }

  private rebuildDependentFilterOptions(): void {
    const cycles = this.cycleRows.map((row) => ({
      value: String(row.id ?? ''),
      label: (row.name ?? '').trim() || (row.code ?? '').trim()
    }));

    this.cycleFilterOptions = [{ value: 'all', label: 'Tous les cycles' }, ...cycles.filter((item) => item.value)];

    const levels = this.levelRows
      .filter((row) => {
        const cycleId = String(row.academicCycleId ?? row.academic_cycle_id ?? '');
        return this.cycleFilter === 'all' || cycleId === this.cycleFilter;
      })
      .map((row) => ({
        value: String(row.id ?? ''),
        label: (row.name ?? '').trim() || (row.code ?? '').trim()
      }));

    this.levelFilterOptions = [{ value: 'all', label: 'Tous les niveaux' }, ...levels.filter((item) => item.value)];

    const sections = this.sectionRows
      .filter((row) => {
        const cycleId = String(row.academicCycleId ?? row.academic_cycle_id ?? '');
        return this.cycleFilter === 'all' || cycleId === this.cycleFilter;
      })
      .map((row) => ({
        value: String(row.id ?? ''),
        label: (row.name ?? '').trim() || (row.code ?? '').trim()
      }));

    this.sectionFilterOptions = [
      { value: 'all', label: 'Toutes les sections' },
      ...sections.filter((item) => item.value)
    ];

    this.rebuildOptionFilterOptions();
    this.cycleFormOptions = cycles.filter((item) => item.value);
  }

  private rebuildOptionFilterOptions(): void {
    const options = this.optionRows
      .filter((row) => {
        const sectionId = String(row.academicSectionId ?? row.academic_section_id ?? '');
        return this.sectionFilter === 'all' || sectionId === this.sectionFilter;
      })
      .map((row) => ({
        value: String(row.id ?? ''),
        label: (row.name ?? '').trim() || (row.code ?? '').trim()
      }));

    this.optionFilterOptions = [
      { value: 'all', label: 'Toutes les options' },
      ...options.filter((item) => item.value)
    ];
  }

  private syncFormAcademicOptions(): void {
    if (!this.form.academicCycleId && this.cycleFormOptions[0]) {
      this.form = { ...this.form, academicCycleId: this.cycleFormOptions[0].value };
    }
    this.rebuildFormAcademicOptions();
  }

  private rebuildFormAcademicOptions(): void {
    this.levelFormOptions = this.levelRows
      .filter((row) => {
        const cycleId = String(row.academicCycleId ?? row.academic_cycle_id ?? '');
        return cycleId === this.form.academicCycleId;
      })
      .map((row) => ({
        value: String(row.id ?? ''),
        label: (row.name ?? '').trim() || (row.code ?? '').trim()
      }))
      .filter((item) => item.value);

    this.sectionFormOptions = this.sectionRows
      .filter((row) => {
        const cycleId = String(row.academicCycleId ?? row.academic_cycle_id ?? '');
        return cycleId === this.form.academicCycleId;
      })
      .map((row) => ({
        value: String(row.id ?? ''),
        label: (row.name ?? '').trim() || (row.code ?? '').trim()
      }))
      .filter((item) => item.value);

    this.optionFormOptions = this.optionRows
      .filter((row) => {
        const sectionId = String(row.academicSectionId ?? row.academic_section_id ?? '');
        return !this.form.academicSectionId || sectionId === this.form.academicSectionId;
      })
      .map((row) => ({
        value: String(row.id ?? ''),
        label: (row.name ?? '').trim() || (row.code ?? '').trim()
      }))
      .filter((item) => item.value);
  }

  private findCategoryName(categoryId: string): string {
    return this.categoryRows.find((row) => String(row.id ?? '') === categoryId)?.name?.trim() ?? '—';
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
    return {
      code: '',
      name: '',
      amount: '',
      feeCategoryId: this.categoryFormOptions[0]?.value ?? '',
      paymentInstallmentId: '',
      academicCycleId: this.cycleFormOptions[0]?.value ?? '',
      academicLevelId: '',
      academicSectionId: '',
      academicOptionId: '',
      description: '',
      active: true,
      comment: ''
    };
  }

  private toFormFields(item: SchoolFeeItem): SchoolFeeForm {
    return {
      code: item.code,
      name: item.name,
      amount: String(item.amount),
      feeCategoryId: item.categoryId,
      paymentInstallmentId: item.installmentId,
      academicCycleId: item.academicCycleId,
      academicLevelId: item.academicLevelId,
      academicSectionId: item.academicSectionId,
      academicOptionId: item.academicOptionId,
      description: item.description,
      active: item.status === 'Actif',
      comment: item.comment
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
    this.installmentRows = [];
    this.rebuildDependentFilterOptions();
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
