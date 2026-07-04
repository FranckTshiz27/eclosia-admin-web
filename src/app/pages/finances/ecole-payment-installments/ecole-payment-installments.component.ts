import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  CreatePaymentInstallmentDto,
  PaymentInstallmentApiResponse,
  PaymentInstallmentService
} from '../../../services/payment-installment.service';
import { SchoolApiResponse, SchoolService } from '../../../services/school.service';

type InstallmentStatus = 'Actif' | 'Inactif';

interface SchoolOption {
  id: string;
  name: string;
}

interface PaymentInstallmentItem {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
  description: string;
  comment: string;
  status: InstallmentStatus;
  createdAt: string;
  schoolId: string;
  codeTone: string;
}

interface PaymentInstallmentForm {
  code: string;
  name: string;
  displayOrder: number | null;
  description: string;
  active: boolean;
  comment: string;
}

interface StatCard {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone: 'blue' | 'green' | 'orange' | 'purple';
}

@Component({
  selector: 'app-ecole-payment-installments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-payment-installments.component.html',
  styleUrl: './ecole-payment-installments.component.css'
})
export class EcolePaymentInstallmentsComponent implements OnInit, OnDestroy {
  selectedSchoolId = '';
  searchTerm = '';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoadingSchools = false;
  isLoading = false;
  loadError = '';

  isModalOpen = false;
  isEditMode = false;
  editingInstallmentId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  openActionMenuId: string | null = null;

  schools: SchoolOption[] = [];
  installments: PaymentInstallmentItem[] = [];
  form: PaymentInstallmentForm = this.buildEmptyForm();

  readonly descriptionMaxLength = 500;
  readonly commentMaxLength = 500;
  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];
  readonly pageSizeOptions = [10, 25, 50];

  constructor(
    private readonly schoolService: SchoolService,
    private readonly paymentInstallmentService: PaymentInstallmentService
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

  get maxDisplayOrder(): number {
    if (this.installments.length === 0) {
      return 0;
    }
    return Math.max(...this.installments.map((item) => item.displayOrder));
  }

  get statsCards(): StatCard[] {
    const total = this.installments.length;
    const activeCount = this.installments.filter((item) => item.status === 'Actif').length;
    const inactiveCount = total - activeCount;
    const activePercent = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    const inactivePercent = total > 0 ? Math.round((inactiveCount / total) * 100) : 0;

    return [
      {
        label: 'Total des tranches',
        value: String(total),
        hint: 'Toutes les tranches',
        icon: 'bi-layers',
        tone: 'blue'
      },
      {
        label: 'Tranches actives',
        value: String(activeCount),
        hint: `${activePercent}% du total`,
        icon: 'bi-check-circle',
        tone: 'green'
      },
      {
        label: 'Tranches inactives',
        value: String(inactiveCount),
        hint: `${inactivePercent}% du total`,
        icon: 'bi-pause-circle',
        tone: 'orange'
      },
      {
        label: 'Ordre max',
        value: String(this.maxDisplayOrder),
        hint: 'Dernier ordre utilise',
        icon: 'bi-list-ol',
        tone: 'purple'
      }
    ];
  }

  get filteredInstallments(): PaymentInstallmentItem[] {
    const term = this.normalize(this.searchTerm);

    return this.installments
      .filter((item) => {
        const matchesSearch =
          !term ||
          this.normalize(item.name).includes(term) ||
          this.normalize(item.code).includes(term) ||
          this.normalize(item.description).includes(term);

        const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  get paginatedInstallments(): PaymentInstallmentItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredInstallments.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredInstallments.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredInstallments.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredInstallments.length);
  }

  onSchoolChange(): void {
    this.currentPage = 1;
    this.loadInstallments(true);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
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
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingInstallmentId = null;
    this.isSubmitted = false;
    this.isSaving = false;
    this.saveError = '';
    this.form = {
      ...this.buildEmptyForm(),
      displayOrder: this.maxDisplayOrder + 1
    };
  }

  openEditModal(item: PaymentInstallmentItem): void {
    this.openActionMenuId = null;
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingInstallmentId = item.id;
    this.isSubmitted = false;
    this.isSaving = false;
    this.saveError = '';
    this.form = this.toFormFields(item);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingInstallmentId = null;
    this.isSubmitted = false;
    this.isSaving = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  toggleActiveStatus(): void {
    this.form = { ...this.form, active: !this.form.active };
  }

  toggleActionMenu(itemId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openActionMenuId = this.openActionMenuId === itemId ? null : itemId;
  }

  deleteInstallment(item: PaymentInstallmentItem): void {
    this.openActionMenuId = null;
    if (!confirm(`Supprimer la tranche "${item.name}" ?`)) {
      return;
    }

    this.paymentInstallmentService.delete(item.id).subscribe({
      next: () => this.loadInstallments(false),
      error: () => {
        this.loadError = 'Echec de suppression de la tranche.';
      }
    });
  }

  get saveButtonLabel(): string {
    if (this.isSaving) {
      return this.isEditMode ? 'Mise a jour...' : 'Enregistrement...';
    }
    return this.isEditMode ? 'Mettre a jour' : 'Enregistrer';
  }

  saveInstallment(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving || !this.selectedSchoolId || this.form.displayOrder == null) {
      formRef.control.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreatePaymentInstallmentDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      displayOrder: Number(this.form.displayOrder),
      description: this.form.description.trim() || undefined,
      active: this.form.active,
      comment: this.form.comment.trim() || undefined,
      schoolId: this.selectedSchoolId
    };

    if (this.isEditMode) {
      if (!this.editingInstallmentId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour cette tranche: identifiant invalide.';
        return;
      }

      this.paymentInstallmentService.update(this.editingInstallmentId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadInstallments(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.paymentInstallmentService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadInstallments(false);
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
            id: String(row.id ?? ''),
            name: (row.name ?? '').trim() || 'Ecole sans nom'
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

        this.selectedSchoolId = this.schools[0]?.id ?? '';
        this.isLoadingSchools = false;
        this.loadInstallments(true);
      },
      error: () => {
        this.isLoadingSchools = false;
        this.loadError = 'Impossible de charger les ecoles.';
      }
    });
  }

  private loadInstallments(showLoader = true): void {
    if (!this.selectedSchoolId) {
      this.installments = [];
      return;
    }

    if (showLoader) {
      this.isLoading = true;
    }
    this.loadError = '';

    this.paymentInstallmentService.getAll(this.selectedSchoolId).subscribe({
      next: (rows: PaymentInstallmentApiResponse[]) => {
        this.installments = rows
          .map((row: PaymentInstallmentApiResponse) => this.mapApiToItem(row))
          .filter((item: PaymentInstallmentItem) => item.id);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les tranches de paiement.';
        this.installments = [];
      }
    });
  }

  private mapApiToItem(row: PaymentInstallmentApiResponse): PaymentInstallmentItem {
    const code = (row.code ?? '').trim();
    const displayOrder = Number(row.displayOrder ?? row.display_order ?? 0);

    return {
      id: String(row.id ?? ''),
      code,
      name: (row.name ?? '').trim(),
      displayOrder,
      description: (row.description ?? '').trim() || '—',
      comment: (row.comment ?? '').trim(),
      status: this.resolveStatus(row.active),
      createdAt: this.formatDate(row.createdAt ?? row.created_at),
      schoolId: String(row.schoolId ?? row.school_id ?? this.selectedSchoolId),
      codeTone: this.resolveCodeTone(displayOrder)
    };
  }

  private resolveCodeTone(displayOrder: number): string {
    const tones = ['tone-blue', 'tone-green', 'tone-purple', 'tone-orange'];
    if (displayOrder <= 0) {
      return tones[0];
    }
    return tones[(displayOrder - 1) % tones.length];
  }

  private buildEmptyForm(): PaymentInstallmentForm {
    return {
      code: '',
      name: '',
      displayOrder: null,
      description: '',
      active: true,
      comment: ''
    };
  }

  private toFormFields(item: PaymentInstallmentItem): PaymentInstallmentForm {
    return {
      code: item.code,
      name: item.name,
      displayOrder: item.displayOrder,
      description: item.description === '—' ? '' : item.description,
      active: item.status === 'Actif',
      comment: item.comment
    };
  }

  private resolveStatus(active: unknown): InstallmentStatus {
    if (active === false || active === 'false' || active === 0 || active === '0') {
      return 'Inactif';
    }
    return 'Actif';
  }

  private formatDate(value: string | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
