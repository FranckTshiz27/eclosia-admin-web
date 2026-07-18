import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../services/academic-year.service';
import { SchoolApiResponse, SchoolService } from '../../../services/school.service';
import { FinancialDashboardService } from '../../../services/financial-dashboard.service';
import {
  ClassPerformance,
  FinancialDashboard,
  RecentPayment,
  RevenueByCategory,
  RevenueByPaymentMethod
} from '../../../services/financial-dashboard.models';
import { ToastService } from '../../../services/toast.service';

interface SelectOption {
  value: string;
  label: string;
}

type PageState = 'loading' | 'ready' | 'empty' | 'error';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  CASH_PAYMENT: 'Espèces',
  ESPECES: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  MOBILEMONEY: 'Mobile Money',
  BANK: 'Banque',
  BANK_TRANSFER: 'Banque',
  BANQUE: 'Banque',
  CARD: 'Carte',
  CHEQUE: 'Chèque',
  OTHER: 'Autre'
};

const MONTH_LABELS_FR = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sept',
  'Oct',
  'Nov',
  'Déc'
];

@Component({
  selector: 'app-ecole-financial-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-financial-dashboard.component.html',
  styleUrl: './ecole-financial-dashboard.component.css'
})
export class EcoleFinancialDashboardComponent implements OnInit {
  selectedSchoolId = '';
  selectedYearId = '';

  schools: SelectOption[] = [];
  yearOptions: SelectOption[] = [];

  dashboard: FinancialDashboard | null = null;
  pageState: PageState = 'loading';

  isLoadingSchools = false;
  isLoadingYears = false;
  isLoadingDashboard = false;

  private academicYearsCache: AcademicYearApiResponse[] = [];

  readonly categoryColors = ['#0a53de', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#dc2626'];
  readonly methodColors = ['#0a53de', '#16a34a', '#ca8a04', '#7c3aed'];

  constructor(
    private readonly schoolService: SchoolService,
    private readonly academicYearService: AcademicYearService,
    private readonly financialDashboardService: FinancialDashboardService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadSchools();
  }

  get currencySymbol(): string {
    const code = this.dashboard?.recentPayments?.[0]?.currencyCode;
    return this.currencyDisplay(code);
  }

  get evolutionBars(): { label: string; height: number; amount: number }[] {
    const items = this.dashboard?.revenueEvolution ?? [];
    const max = Math.max(...items.map((item) => this.toNumber(item.collectedAmount)), 1);
    return items.map((item) => {
      const amount = this.toNumber(item.collectedAmount);
      return {
        label: this.formatPeriodLabel(item.period),
        amount,
        height: Math.max(8, Math.round((amount / max) * 100))
      };
    });
  }

  get categoryDonutStyle(): string {
    return this.buildDonutStyle(
      (this.dashboard?.revenueByCategory ?? []).map((item) => this.toNumber(item.percentage)),
      this.categoryColors
    );
  }

  get methodDonutStyle(): string {
    return this.buildDonutStyle(
      (this.dashboard?.revenueByPaymentMethod ?? []).map((item) => this.toNumber(item.percentage)),
      this.methodColors
    );
  }

  get topClasses(): ClassPerformance[] {
    return [...(this.dashboard?.classPerformance ?? [])]
      .sort((a, b) => this.toNumber(b.recoveryRate) - this.toNumber(a.recoveryRate))
      .slice(0, 5);
  }

  onSchoolChange(): void {
    this.selectedYearId = '';
    this.dashboard = null;
    this.loadYearsAndDashboard();
  }

  onYearChange(): void {
    this.loadDashboard();
  }

  retry(): void {
    if (!this.schools.length) {
      this.loadSchools();
      return;
    }
    this.loadDashboard();
  }

  goToArrears(): void {
    this.router.navigate(['/finances'], { queryParams: { tab: 'etats-financiers' } });
  }

  goToRecoveryDetail(): void {
    this.router.navigate(['/finances'], { queryParams: { tab: 'etats-financiers' } });
  }

  formatMoney(value: number | string | null | undefined, currencyCode?: string): string {
    const amount = this.toNumber(value);
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    return `${formatted} ${this.currencyDisplay(currencyCode)}`;
  }

  formatPercent(value: number | string | null | undefined): string {
    const amount = this.toNumber(value);
    return `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)} %`;
  }

  formatPaymentDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) {
      return `Aujourd'hui à ${time}`;
    }

    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  paymentMethodLabel(code: string | null | undefined): string {
    const key = (code ?? '').trim().toUpperCase();
    if (!key) {
      return '—';
    }
    return PAYMENT_METHOD_LABELS[key] ?? code!.replace(/_/g, ' ');
  }

  trackCategory(_index: number, item: RevenueByCategory): string {
    return String(item.categoryId);
  }

  trackMethod(_index: number, item: RevenueByPaymentMethod): string {
    return item.paymentMethod;
  }

  trackClass(_index: number, item: ClassPerformance): string {
    return String(item.classroomId);
  }

  trackPayment(_index: number, item: RecentPayment): string {
    return String(item.paymentId);
  }

  toNumber(value: number | string | null | undefined): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private currencyDisplay(code?: string | null): string {
    const normalized = (code ?? '').trim().toUpperCase();
    if (!normalized || normalized === 'CDF' || normalized === 'FC') {
      return 'FC';
    }
    return normalized;
  }

  private formatPeriodLabel(period: string): string {
    const value = (period ?? '').trim();
    // Formats attendus : YYYY-MM, YYYY-MM-DD, ou mois déjà lisible
    const match = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
    if (match) {
      const monthIndex = Number(match[2]) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return MONTH_LABELS_FR[monthIndex];
      }
    }
    return value || '—';
  }

  private loadSchools(): void {
    this.isLoadingSchools = true;
    this.pageState = 'loading';

    this.schoolService.getAll().subscribe({
      next: (rows: SchoolApiResponse[]) => {
        this.schools = rows
          .map((row) => ({
            value: String(row.id ?? ''),
            label: (row.name ?? '').trim() || 'École sans nom'
          }))
          .filter((item) => item.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
        this.selectedSchoolId = this.schools[0]?.value ?? '';
        this.isLoadingSchools = false;

        if (!this.selectedSchoolId) {
          this.pageState = 'empty';
          return;
        }
        this.loadYearsAndDashboard();
      },
      error: () => {
        this.isLoadingSchools = false;
        this.pageState = 'error';
        this.toastService.error('Impossible de charger les écoles.');
      }
    });
  }

  private loadYearsAndDashboard(): void {
    if (!this.selectedSchoolId) {
      return;
    }

    this.isLoadingYears = true;
    this.pageState = 'loading';

    forkJoin({
      years: this.academicYearService
        .getAll({ schoolId: this.selectedSchoolId })
        .pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ years }) => {
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
        this.isLoadingYears = false;

        if (!this.selectedYearId) {
          this.dashboard = null;
          this.pageState = 'empty';
          return;
        }
        this.loadDashboard();
      },
      error: () => {
        this.isLoadingYears = false;
        this.pageState = 'error';
      }
    });
  }

  private loadDashboard(): void {
    if (!this.selectedSchoolId || !this.selectedYearId) {
      this.pageState = 'empty';
      return;
    }

    this.isLoadingDashboard = true;
    this.pageState = 'loading';

    this.financialDashboardService
      .getDashboard(this.selectedSchoolId, this.selectedYearId)
      .subscribe({
        next: (data) => {
          this.dashboard = this.normalizeDashboard(data);
          this.isLoadingDashboard = false;
          this.pageState = this.hasFinancialSignal(this.dashboard) ? 'ready' : 'empty';
        },
        error: () => {
          this.isLoadingDashboard = false;
          this.dashboard = null;
          this.pageState = 'error';
          this.toastService.error('Impossible de charger le tableau de bord financier.');
        }
      });
  }

  private normalizeDashboard(data: FinancialDashboard): FinancialDashboard {
    return {
      summary: {
        expectedAmount: this.toNumber(data?.summary?.expectedAmount),
        collectedAmount: this.toNumber(data?.summary?.collectedAmount),
        remainingAmount: this.toNumber(data?.summary?.remainingAmount),
        recoveryRate: this.toNumber(data?.summary?.recoveryRate),
        totalStudents: this.toNumber(data?.summary?.totalStudents),
        totalClasses: this.toNumber(data?.summary?.totalClasses),
        todayCollectedAmount: this.toNumber(data?.summary?.todayCollectedAmount),
        todayPaymentCount: this.toNumber(data?.summary?.todayPaymentCount)
      },
      revenueEvolution: data?.revenueEvolution ?? [],
      revenueByCategory: data?.revenueByCategory ?? [],
      classPerformance: data?.classPerformance ?? [],
      revenueByPaymentMethod: data?.revenueByPaymentMethod ?? [],
      arrearsSummary: {
        unpaidStudentCount: this.toNumber(data?.arrearsSummary?.unpaidStudentCount),
        remainingAmount: this.toNumber(data?.arrearsSummary?.remainingAmount),
        remainingPercentage: this.toNumber(data?.arrearsSummary?.remainingPercentage),
        recoveryRate: this.toNumber(data?.arrearsSummary?.recoveryRate)
      },
      recentPayments: data?.recentPayments ?? [],
      quickSummary: {
        configuredFeesCount: this.toNumber(data?.quickSummary?.configuredFeesCount),
        configuredInstallmentsCount: this.toNumber(data?.quickSummary?.configuredInstallmentsCount),
        averageExpectedPerStudent: this.toNumber(data?.quickSummary?.averageExpectedPerStudent),
        averageCollectedPerStudent: this.toNumber(data?.quickSummary?.averageCollectedPerStudent)
      }
    };
  }

  private hasFinancialSignal(data: FinancialDashboard): boolean {
    return (
      data.summary.expectedAmount > 0 ||
      data.summary.collectedAmount > 0 ||
      (data.recentPayments?.length ?? 0) > 0 ||
      (data.classPerformance?.length ?? 0) > 0 ||
      (data.revenueEvolution?.length ?? 0) > 0
    );
  }

  private buildDonutStyle(percentages: number[], colors: string[]): string {
    if (!percentages.length) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    let cursor = 0;
    const parts: string[] = [];
    percentages.forEach((pct, index) => {
      const start = cursor;
      cursor += Math.max(0, Math.min(100, pct)) * 3.6;
      parts.push(`${colors[index % colors.length]} ${start}deg ${cursor}deg`);
    });
    if (cursor < 360) {
      parts.push(`#e2e8f0 ${cursor}deg 360deg`);
    }
    return `conic-gradient(${parts.join(', ')})`;
  }
}
