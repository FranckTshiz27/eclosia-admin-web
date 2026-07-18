import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import {
  AcademicCycleApiResponse,
  AcademicCycleService
} from '../../../services/academic-cycle.service';
import {
  AcademicLevelApiResponse,
  AcademicLevelService
} from '../../../services/academic-level.service';
import {
  AcademicModelApiResponse,
  AcademicModelService
} from '../../../services/academic-model.service';
import {
  SchoolAcademicModelApiResponse,
  SchoolAcademicModelService
} from '../../../services/school-academic-model.service';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../services/academic-year.service';
import { SchoolApiResponse, SchoolService } from '../../../services/school.service';
import { ClassroomApiResponse, ClassroomService } from '../../../services/classroom.service';
import { FeeCategoryApiResponse, FeeCategoryService } from '../../../services/fee-category.service';
import {
  PaymentInstallmentApiResponse,
  PaymentInstallmentService
} from '../../../services/payment-installment.service';
import {
  PaymentJournalReportQuery,
  PaymentJournalReportService
} from '../../../services/payment-journal-report.service';
import {
  PaymentRecoveryReportQuery,
  PaymentRecoveryReportService
} from '../../../services/payment-recovery-report.service';
import {
  ConfiguredFeesReportQuery,
  ConfiguredFeesReportService
} from '../../../services/configured-fees-report.service';
import {
  RevenueStatementReportQuery,
  RevenueStatementReportService
} from '../../../services/revenue-statement-report.service';
import { ToastService } from '../../../services/toast.service';

type ReportTone = 'green' | 'orange' | 'blue' | 'purple' | 'teal' | 'yellow' | 'red';
type ViewMode = 'grid' | 'list';
type MultiFilterField = 'cycle' | 'classroom' | 'tranche';

interface SelectOption {
  value: string;
  label: string;
}

interface ClassroomFilterOption extends SelectOption {
  cycleId: string;
}

interface FinancialReportType {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone: ReportTone;
}

interface SavedReport {
  id: string;
  name: string;
  typeLabel: string;
  periodLabel: string;
  generatedAtLabel: string;
}

@Component({
  selector: 'app-ecole-financial-statements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-financial-statements.component.html',
  styleUrl: './ecole-financial-statements.component.css'
})
export class EcoleFinancialStatementsComponent implements OnInit {
  selectedSchoolId = '';
  selectedYearId = '';
  startDate = '2026-09-01';
  endDate = '2027-06-30';
  selectedCycleIds: string[] = [];
  selectedClassroomIds: string[] = [];
  searchTerm = '';
  viewMode: ViewMode = 'grid';
  openFilterPanel: MultiFilterField | null = null;
  generatingReportId = '';

  schools: SelectOption[] = [];
  yearOptions: SelectOption[] = [];
  cycleOptions: SelectOption[] = [];
  feeCategoryOptions: SelectOption[] = [];
  selectedFeeCategoryId = '';
  trancheOptions: SelectOption[] = [];
  selectedTrancheIds: string[] = [];

  isLoadingSchools = false;
  isLoadingFilters = false;

  private allClassroomOptions: ClassroomFilterOption[] = [];
  private levelCycleById = new Map<string, string>();

  readonly reportTypes: FinancialReportType[] = [
    {
      id: 'payment-journal',
      title: 'Journal des paiements',
      description: 'Toutes les operations de paiement enregistrees.',
      icon: 'bi-journal-text',
      tone: 'green'
    },
    {
      id: 'unpaid-status',
      title: 'Situation des impayes',
      description: 'Liste des eleves avec les montants impayes.',
      icon: 'bi-exclamation-triangle',
      tone: 'orange'
    },
    {
      id: 'revenue-status',
      title: 'Etat des recettes',
      description: 'Resume des recettes : attendu, encaisse, solde.',
      icon: 'bi-bar-chart-line',
      tone: 'blue'
    },
    {
      id: 'revenue-by-class',
      title: 'Recettes par classe',
      description: 'Situation financiere par classe.',
      icon: 'bi-mortarboard',
      tone: 'purple'
    },
    {
      id: 'fees-collection-by-class',
      title: 'Recouvrement des frais par classe',
      description: 'Montants recouvres par classe pour les frais.',
      icon: 'bi-piggy-bank',
      tone: 'blue'
    },
    {
      id: 'student-payments',
      title: 'Paiements d\'un eleve',
      description: 'Historique complet des paiements d\'un eleve.',
      icon: 'bi-person-lines-fill',
      tone: 'teal'
    },
    {
      id: 'configured-fees',
      title: 'Etat des frais configures',
      description: 'Liste des frais configures par classe.',
      icon: 'bi-tags',
      tone: 'blue'
    },
    {
      id: 'financial-dashboard',
      title: 'Tableau de bord financier',
      description: 'Indicateurs cles et graphiques de performance.',
      icon: 'bi-speedometer2',
      tone: 'green'
    }
  ];

  readonly savedReports: SavedReport[] = [
    {
      id: 'saved-1',
      name: 'Recettes mensuelles T1',
      typeLabel: 'Etat des recettes',
      periodLabel: '01/09/2026 - 30/11/2026',
      generatedAtLabel: '25/06/2026 14:30'
    },
    {
      id: 'saved-2',
      name: 'Impayes 6eme A',
      typeLabel: 'Situation des impayes',
      periodLabel: '01/09/2026 - 30/06/2027',
      generatedAtLabel: '20/06/2026 09:15'
    }
  ];

  constructor(
    private readonly schoolService: SchoolService,
    private readonly academicYearService: AcademicYearService,
    private readonly academicCycleService: AcademicCycleService,
    private readonly schoolAcademicModelService: SchoolAcademicModelService,
    private readonly academicModelService: AcademicModelService,
    private readonly academicLevelService: AcademicLevelService,
    private readonly classroomService: ClassroomService,
    private readonly feeCategoryService: FeeCategoryService,
    private readonly paymentJournalReportService: PaymentJournalReportService,
    private readonly paymentRecoveryReportService: PaymentRecoveryReportService,
    private readonly configuredFeesReportService: ConfiguredFeesReportService,
    private readonly revenueStatementReportService: RevenueStatementReportService,
    private readonly paymentInstallmentService: PaymentInstallmentService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSchools();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openFilterPanel = null;
  }

  get filteredReportTypes(): FinancialReportType[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.reportTypes;
    }
    return this.reportTypes.filter(
      (report) =>
        report.title.toLowerCase().includes(term) || report.description.toLowerCase().includes(term)
    );
  }

  onSchoolChange(): void {
    this.selectedYearId = '';
    this.selectedCycleIds = [];
    this.selectedClassroomIds = [];
    this.selectedTrancheIds = [];
    this.selectedFeeCategoryId = '';
    this.openFilterPanel = null;
    this.loadFilterOptions();
  }

  onYearChange(): void {
    this.applyAcademicYearDates();
  }

  get classroomOptions(): SelectOption[] {
    return this.getAvailableClassroomOptions();
  }

  toggleFilterPanel(field: MultiFilterField, event: Event): void {
    event.stopPropagation();
    if (this.isLoadingFilters || !this.selectedSchoolId) {
      return;
    }
    this.openFilterPanel = this.openFilterPanel === field ? null : field;
  }

  hasFilterSelection(field: MultiFilterField): boolean {
    return this.getSelectedIds(field).length > 0;
  }

  getSelectedFilterOptions(field: MultiFilterField): SelectOption[] {
    const selectedIds = new Set(this.getSelectedIds(field));
    return this.getFilterOptions(field).filter((option) => selectedIds.has(option.value));
  }

  isFilterOptionSelected(field: MultiFilterField, value: string): boolean {
    return this.getSelectedIds(field).includes(value);
  }

  toggleFilterOption(field: MultiFilterField, value: string): void {
    const selectedIds = this.getSelectedIds(field);
    if (selectedIds.includes(value)) {
      this.setSelectedIds(
        field,
        selectedIds.filter((id) => id !== value)
      );
      return;
    }
    this.setSelectedIds(field, [...selectedIds, value]);
  }

  selectAllFilterOptions(field: MultiFilterField): void {
    this.setSelectedIds(
      field,
      this.getFilterOptions(field).map((option) => option.value)
    );
  }

  clearFilterOptions(field: MultiFilterField, event?: Event): void {
    event?.stopPropagation();
    this.setSelectedIds(field, []);
  }

  removeFilterOption(field: MultiFilterField, value: string, event: Event): void {
    event.stopPropagation();
    this.setSelectedIds(
      field,
      this.getSelectedIds(field).filter((id) => id !== value)
    );
  }

  getFilterPlaceholder(field: MultiFilterField): string {
    if (field === 'cycle') return 'Tous les cycles';
    if (field === 'tranche') return 'Toutes les tranches';
    return 'Toutes les classes';
  }

  getFilterIcon(field: MultiFilterField): string {
    if (field === 'cycle') return 'bi-arrow-repeat';
    if (field === 'tranche') return 'bi-receipt-cutoff';
    return 'bi-mortarboard';
  }

  applyFilters(): void {
    this.toastService.info('Filtres appliques.');
  }

  resetFilters(): void {
    this.selectedYearId = this.yearOptions[0]?.value ?? '';
    this.selectedCycleIds = [];
    this.selectedClassroomIds = [];
    this.selectedFeeCategoryId = this.feeCategoryOptions[0]?.value ?? '';
    this.selectedTrancheIds = this.trancheOptions.map((o) => o.value);
    this.applyAcademicYearDates();
    this.searchTerm = '';
    this.openFilterPanel = null;
    this.toastService.info('Filtres reinitialises.');
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  viewReport(report: FinancialReportType): void {
    this.generateReport(report, 'view');
  }

  exportReport(report: FinancialReportType): void {
    this.generateReport(report, 'export');
  }

  isReportGenerating(reportId: string): boolean {
    return this.generatingReportId === reportId;
  }

  private generateReport(report: FinancialReportType, mode: 'view' | 'export'): void {
    if (this.generatingReportId) {
      return;
    }

    if (report.id === 'payment-journal') {
      const query = this.buildPaymentJournalQuery();
      if (!query) {
        return;
      }

      this.generatingReportId = report.id;
      this.paymentJournalReportService.generatePaymentJournal(query).subscribe({
        next: (pdfBlob) => {
          this.generatingReportId = '';
          if (mode === 'export') {
            this.downloadPdfBlob(pdfBlob, 'journal-paiements.pdf');
            return;
          }
          this.openPdfBlob(pdfBlob, 'journal-paiements.pdf');
        },
        error: (error) => {
          this.generatingReportId = '';
          this.toastService.apiError(error, 'Impossible de generer le journal des paiements.');
        }
      });
      return;
    }

    if (report.id === 'fees-collection-by-class') {
      const query = this.buildPaymentRecoveryQuery();
      if (!query) {
        return;
      }

      this.generatingReportId = report.id;
      this.paymentRecoveryReportService.generateDashboard(query).subscribe({
        next: (pdfBlob) => {
          this.generatingReportId = '';
          const filename = 'recu-recouvrement-frais-par-classe.pdf';
          if (mode === 'export') {
            this.downloadPdfBlob(pdfBlob, filename);
            return;
          }
          this.openPdfBlob(pdfBlob, filename);
        },
        error: (error) => {
          this.generatingReportId = '';
          this.toastService.apiError(error, 'Impossible de generer le recouvrement des frais.');
        }
      });
      return;
    }

    if (report.id === 'configured-fees') {
      const query = this.buildConfiguredFeesQuery();
      if (!query) {
        return;
      }

      this.generatingReportId = report.id;
      this.configuredFeesReportService.generateConfiguredFeesReport(query).subscribe({
        next: (pdfBlob) => {
          this.generatingReportId = '';
          const filename = 'etat-frais-configures.pdf';
          if (mode === 'export') {
            this.downloadPdfBlob(pdfBlob, filename);
            return;
          }
          this.openPdfBlob(pdfBlob, filename);
        },
        error: (error) => {
          this.generatingReportId = '';
          this.toastService.apiError(error, 'Impossible de generer l\'etat des frais configures.');
        }
      });
      return;
    }

    if (report.id === 'revenue-status') {
      const query = this.buildRevenueStatementQuery();
      if (!query) {
        return;
      }

      this.generatingReportId = report.id;
      this.revenueStatementReportService.generateRevenueStatement(query).subscribe({
        next: (pdfBlob) => {
          this.generatingReportId = '';
          const filename = 'etat-recettes.pdf';
          if (mode === 'export') {
            this.downloadPdfBlob(pdfBlob, filename);
            return;
          }
          this.openPdfBlob(pdfBlob, filename);
        },
        error: (error) => {
          this.generatingReportId = '';
          this.toastService.apiError(error, 'Impossible de generer l\'etat des recettes.');
        }
      });
      return;
    }

    this.toastService.info(`Ouverture de « ${report.title} » (bientot disponible).`);
  }

  private buildPaymentJournalQuery(): PaymentJournalReportQuery | null {
    const schoolId = String(this.selectedSchoolId ?? '').trim();
    const academicYearId = String(this.selectedYearId ?? '').trim();
    const startDate = String(this.startDate ?? '').trim();
    const endDate = String(this.endDate ?? '').trim();

    if (!schoolId) {
      this.toastService.warning('Selectionnez une ecole.');
      return null;
    }
    if (!academicYearId) {
      this.toastService.warning('Selectionnez une annee scolaire.');
      return null;
    }
    if (!startDate || !endDate) {
      this.toastService.warning('Renseignez les dates de debut et de fin.');
      return null;
    }
    if (startDate > endDate) {
      this.toastService.warning('La date de debut doit etre anterieure a la date de fin.');
      return null;
    }

    const query: PaymentJournalReportQuery = {
      schoolId,
      academicYearId,
      startDate,
      endDate,
      cycleIds: this.resolveCycleIdsForQuery()
    };

    if (this.selectedClassroomIds.length) {
      query.classroomIds = [...this.selectedClassroomIds];
    }

    return query;
  }

  private buildPaymentRecoveryQuery(): PaymentRecoveryReportQuery | null {
    const schoolId = String(this.selectedSchoolId ?? '').trim();
    const academicYearId = String(this.selectedYearId ?? '').trim();
    const feeCategoryId = String(this.selectedFeeCategoryId ?? '').trim();
    const startDate = String(this.startDate ?? '').trim();
    const endDate = String(this.endDate ?? '').trim();

    if (!schoolId) {
      this.toastService.warning('Selectionnez une ecole.');
      return null;
    }
    if (!academicYearId) {
      this.toastService.warning('Selectionnez une annee scolaire.');
      return null;
    }
    if (!startDate || !endDate) {
      this.toastService.warning('Renseignez les dates de debut et de fin.');
      return null;
    }
    if (startDate > endDate) {
      this.toastService.warning('La date de debut doit etre anterieure a la date de fin.');
      return null;
    }

    if (!feeCategoryId) {
      this.toastService.warning('Selectionnez une categorie de frais.');
      return null;
    }

    const trancheIds = this.selectedTrancheIds;
    if (!trancheIds.length) {
      this.toastService.warning('Aucun tranche de paiement disponible pour cette ecole.');
      return null;
    }

    const query: PaymentRecoveryReportQuery = {
      schoolId,
      academicYearId,
      feeCategoryId,
      trancheIds,
      cycleIds: this.resolveCycleIdsForQuery()
    };

    if (this.selectedClassroomIds.length) {
      query.classroomIds = [...this.selectedClassroomIds];
    }

    query.startDate = startDate;
    query.endDate = endDate;

    return query;
  }

  private buildConfiguredFeesQuery(): ConfiguredFeesReportQuery | null {
    return this.buildSchoolYearScopedReportQuery();
  }

  private buildRevenueStatementQuery(): RevenueStatementReportQuery | null {
    return this.buildSchoolYearScopedReportQuery();
  }

  private buildSchoolYearScopedReportQuery(): {
    schoolId: string;
    academicYearId: string;
    cycleIds?: string[];
    classroomIds?: string[];
  } | null {
    const schoolId = String(this.selectedSchoolId ?? '').trim();
    const academicYearId = String(this.selectedYearId ?? '').trim();

    if (!schoolId) {
      this.toastService.warning('Selectionnez une ecole.');
      return null;
    }
    if (!academicYearId) {
      this.toastService.warning('Selectionnez une annee scolaire.');
      return null;
    }

    const query: {
      schoolId: string;
      academicYearId: string;
      cycleIds?: string[];
      classroomIds?: string[];
    } = {
      schoolId,
      academicYearId,
      cycleIds: this.resolveCycleIdsForQuery()
    };

    if (this.selectedClassroomIds.length) {
      query.classroomIds = [...this.selectedClassroomIds];
    }

    return query;
  }

  private resolveCycleIdsForQuery(): string[] {
    if (this.selectedCycleIds.length) {
      return [...this.selectedCycleIds];
    }
    return this.cycleOptions.map((option) => option.value).filter(Boolean);
  }

  private openPdfBlob(pdfBlob: Blob, filename: string): void {
    const blob = new Blob([pdfBlob], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      this.downloadPdfBlob(blob, filename);
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  private downloadPdfBlob(pdfBlob: Blob, filename: string): void {
    const blob = new Blob([pdfBlob], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  viewSavedReport(report: SavedReport): void {
    this.toastService.info(`Ouverture du rapport « ${report.name} ».`);
  }

  exportSavedReport(report: SavedReport): void {
    this.toastService.info(`Export du rapport « ${report.name} ».`);
  }

  deleteSavedReport(report: SavedReport): void {
    this.toastService.warning(`Suppression de « ${report.name} » (bientot disponible).`);
  }

  viewAllSavedReports(): void {
    this.toastService.info('Liste complete des rapports sauvegardes (bientot disponible).');
  }

  private getFilterOptions(field: MultiFilterField): SelectOption[] {
    if (field === 'cycle') return this.cycleOptions;
    if (field === 'tranche') return this.trancheOptions;
    return this.getAvailableClassroomOptions();
  }

  private getAvailableClassroomOptions(): SelectOption[] {
    const options = !this.selectedCycleIds.length
      ? this.allClassroomOptions
      : this.allClassroomOptions.filter((option) => this.selectedCycleIds.includes(option.cycleId));

    return options
      .map(({ value, label }) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }

  private syncClassroomSelectionWithCycles(): void {
    const availableIds = new Set(this.getAvailableClassroomOptions().map((option) => option.value));
    this.selectedClassroomIds = this.selectedClassroomIds.filter((id) => availableIds.has(id));
  }

  private getSelectedIds(field: MultiFilterField): string[] {
    if (field === 'cycle') return this.selectedCycleIds;
    if (field === 'tranche') return this.selectedTrancheIds;
    return this.selectedClassroomIds;
  }

  private setSelectedIds(field: MultiFilterField, ids: string[]): void {
    if (field === 'cycle') {
      this.selectedCycleIds = ids;
      this.syncClassroomSelectionWithCycles();
      return;
    }
    if (field === 'tranche') {
      this.selectedTrancheIds = ids;
      return;
    }
    this.selectedClassroomIds = ids;
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
        this.loadFilterOptions();
      },
      error: () => {
        this.isLoadingSchools = false;
        this.toastService.error('Impossible de charger les ecoles.');
      }
    });
  }

  private loadFilterOptions(): void {
    if (!this.selectedSchoolId) {
      this.yearOptions = [];
      this.cycleOptions = [];
      this.allClassroomOptions = [];
      this.levelCycleById.clear();
      this.selectedYearId = '';
      this.selectedCycleIds = [];
      this.selectedClassroomIds = [];
      this.trancheOptions = [];
      this.selectedTrancheIds = [];
      this.feeCategoryOptions = [];
      this.selectedFeeCategoryId = '';
      return;
    }

    this.isLoadingFilters = true;
    forkJoin({
      years: this.academicYearService.getAll({ schoolId: this.selectedSchoolId }).pipe(catchError(() => of([]))),
      associations: this.schoolAcademicModelService
        .getAll({ schoolId: this.selectedSchoolId })
        .pipe(catchError(() => of([]))),
      models: this.academicModelService.getAll().pipe(catchError(() => of([]))),
      cycles: this.academicCycleService.getAll().pipe(catchError(() => of([]))),
      levels: this.academicLevelService.getAll().pipe(catchError(() => of([]))),
      classrooms: this.classroomService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      installments: this.paymentInstallmentService.getAll(this.selectedSchoolId).pipe(catchError(() => of([]))),
      feeCategories: this.feeCategoryService.getAll(this.selectedSchoolId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ years, associations, models, cycles, levels, classrooms, installments, feeCategories }) => {
        this.academicYearsCache = years as AcademicYearApiResponse[];
        this.yearOptions = this.academicYearsCache
          .filter((row) => row.active !== false)
          .map((row) => ({
            value: String(row.id ?? ''),
            label: AcademicYearService.buildLabel(row)
          }))
          .filter((item) => item.value)
          .sort((a, b) => b.label.localeCompare(a.label, 'fr'));

        this.selectedYearId = this.yearOptions[0]?.value ?? '';
        this.applyAcademicYearDates();

        const activeModelIds = this.resolveActiveSchoolModelIds(
          associations as SchoolAcademicModelApiResponse[],
          models as AcademicModelApiResponse[]
        );
        const allCycles = (cycles as AcademicCycleApiResponse[]).filter((row) => this.isRowActive(row));
        const schoolCycles = this.filterCyclesForSchool(allCycles, activeModelIds);
        const cycleRows = schoolCycles.length > 0 ? schoolCycles : allCycles;

        this.cycleOptions = cycleRows
          .map((row) => ({
            value: String(row.id ?? ''),
            label: this.buildCycleLabel(row)
          }))
          .filter((item) => item.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.levelCycleById = new Map(
          (levels as AcademicLevelApiResponse[])
            .map((row) => {
              const levelId = String(row.id ?? '');
              const cycleId = String(
                row.academicCycleId ?? row.academic_cycle_id ?? row.academicCycle?.id ?? ''
              );
              return [levelId, cycleId] as const;
            })
            .filter(([levelId, cycleId]) => levelId && cycleId)
        );

        this.allClassroomOptions = (classrooms as ClassroomApiResponse[])
          .map((row) => {
            const levelId = String(row.academicLevelId ?? row.academic_level_id ?? '');
            return {
              value: String(row.id ?? ''),
              label: (row.displayName ?? row.display_name ?? '').trim() || 'Classe sans nom',
              cycleId: this.levelCycleById.get(levelId) ?? ''
            };
          })
          .filter((item) => item.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.trancheOptions = (installments as PaymentInstallmentApiResponse[])
          .filter((row) => this.isRowActive(row))
          .map((row) => ({
            value: String(row.id ?? ''),
            label: this.buildTrancheLabel(row)
          }))
          .filter((item) => item.value && item.label);

        // Par défaut: toutes les tranches actives sélectionnées.
        this.selectedTrancheIds = this.trancheOptions.map((o) => o.value);

        const previousFeeCategoryId = this.selectedFeeCategoryId;
        this.feeCategoryOptions = (feeCategories as FeeCategoryApiResponse[])
          .map((row) => ({
            value: String(row.id ?? ''),
            label: (row.name ?? '').trim() || (row.code ?? '').trim()
          }))
          .filter((item) => item.value && item.label);
        this.selectedFeeCategoryId = this.feeCategoryOptions.some((item) => item.value === previousFeeCategoryId)
          ? previousFeeCategoryId
          : this.feeCategoryOptions[0]?.value ?? '';

        this.selectedCycleIds = this.selectedCycleIds.filter((id) =>
          this.cycleOptions.some((option) => option.value === id)
        );
        this.syncClassroomSelectionWithCycles();
        this.isLoadingFilters = false;
      },
      error: () => {
        this.isLoadingFilters = false;
        this.toastService.error('Impossible de charger les filtres.');
      }
    });
  }

  private applyAcademicYearDates(): void {
    const academicYear = this.getAcademicYearById(this.selectedYearId);
    const start = academicYear?.startDate ?? academicYear?.start_date;
    const end = academicYear?.endDate ?? academicYear?.end_date;
    if (start) {
      this.startDate = start.slice(0, 10);
    }
    if (end) {
      this.endDate = end.slice(0, 10);
    }
  }

  private academicYearsCache: AcademicYearApiResponse[] = [];

  private getAcademicYearById(yearId: string): AcademicYearApiResponse | undefined {
    return this.academicYearsCache.find((row) => String(row.id ?? '') === yearId);
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
      const modelId = String(
        row.academicModelId ?? row.academic_model_id ?? row.academicModel?.id ?? ''
      );
      return modelId && modelIdSet.has(modelId);
    });
  }

  private buildCycleLabel(row: AcademicCycleApiResponse): string {
    const code = (row.code ?? '').trim();
    const name = (row.name ?? '').trim();
    if (code && name) {
      return `${code} — ${name}`;
    }
    return name || code || 'Cycle';
  }

  private buildTrancheLabel(row: PaymentInstallmentApiResponse): string {
    const code = String(row.code ?? '').trim();
    const name = String(row.name ?? '').trim();
    const displayOrder = Number(row.displayOrder ?? row.display_order ?? 0);

    const prefix = displayOrder > 0 ? `T${displayOrder} ` : '';
    const core = [code, name].filter(Boolean).join(' - ');
    return prefix ? `${prefix}${core || 'Tranche'}` : core || 'Tranche';
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
}
