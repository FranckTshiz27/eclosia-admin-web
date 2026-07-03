import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  CreateFeeCategoryDto,
  FeeCategoryApiResponse,
  FeeCategoryService
} from '../../../services/fee-category.service';
import { SchoolApiResponse, SchoolService } from '../../../services/school.service';

type CategoryStatus = 'Actif' | 'Inactif';

interface SchoolOption {
  id: string;
  name: string;
}

interface FeeCategoryItem {
  id: string;
  code: string;
  name: string;
  description: string;
  comment: string;
  status: CategoryStatus;
  allowInstallments: boolean;
  createdAt: string;
  schoolId: string;
  icon: string;
  iconTone: string;
}

interface FeeCategoryForm {
  code: string;
  name: string;
  description: string;
  active: boolean;
  allowInstallments: boolean;
  comment: string;
}

interface StatCard {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone: 'blue' | 'green' | 'orange';
}

@Component({
  selector: 'app-ecole-fee-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-fee-categories.component.html',
  styleUrl: './ecole-fee-categories.component.css'
})
export class EcoleFeeCategoriesComponent implements OnInit, OnDestroy {
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
  editingCategoryId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  openActionMenuId: string | null = null;

  schools: SchoolOption[] = [];
  categories: FeeCategoryItem[] = [];
  form: FeeCategoryForm = this.buildEmptyForm();

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
    private readonly feeCategoryService: FeeCategoryService
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

  get statsCards(): StatCard[] {
    const total = this.categories.length;
    const activeCount = this.categories.filter((item) => item.status === 'Actif').length;
    const inactiveCount = total - activeCount;
    const activePercent = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    const inactivePercent = total > 0 ? Math.round((inactiveCount / total) * 100) : 0;

    return [
      {
        label: 'Total categories',
        value: String(total),
        icon: 'bi-collection',
        tone: 'blue'
      },
      {
        label: 'Categories actives',
        value: String(activeCount),
        hint: `${activePercent}% du total`,
        icon: 'bi-check-circle',
        tone: 'green'
      },
      {
        label: 'Categories inactives',
        value: String(inactiveCount),
        hint: `${inactivePercent}% du total`,
        icon: 'bi-pause-circle',
        tone: 'orange'
      }
    ];
  }

  get filteredCategories(): FeeCategoryItem[] {
    const term = this.normalize(this.searchTerm);

    return this.categories
      .filter((item) => {
        const matchesSearch =
          !term ||
          this.normalize(item.name).includes(term) ||
          this.normalize(item.code).includes(term) ||
          this.normalize(item.description).includes(term);

        const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  get paginatedCategories(): FeeCategoryItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCategories.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCategories.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredCategories.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredCategories.length);
  }

  onSchoolChange(): void {
    this.currentPage = 1;
    this.loadCategories(true);
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
    this.editingCategoryId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  openEditModal(item: FeeCategoryItem): void {
    this.openActionMenuId = null;
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingCategoryId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toFormFields(item);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingCategoryId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  toggleActiveStatus(): void {
    this.form = { ...this.form, active: !this.form.active };
  }

  toggleAllowInstallments(): void {
    this.form = { ...this.form, allowInstallments: !this.form.allowInstallments };
  }

  toggleActionMenu(itemId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openActionMenuId = this.openActionMenuId === itemId ? null : itemId;
  }

  deleteCategory(item: FeeCategoryItem): void {
    this.openActionMenuId = null;
    if (!confirm(`Supprimer la categorie "${item.name}" ?`)) {
      return;
    }

    this.feeCategoryService.delete(item.id).subscribe({
      next: () => this.loadCategories(false),
      error: () => {
        this.loadError = 'Echec de suppression de la categorie.';
      }
    });
  }

  saveCategory(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving || !this.selectedSchoolId) {
      formRef.control.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateFeeCategoryDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      description: this.form.description.trim() || undefined,
      active: this.form.active,
      allowInstallments: this.form.allowInstallments,
      comment: this.form.comment.trim() || undefined,
      schoolId: this.selectedSchoolId
    };

    if (this.isEditMode) {
      if (!this.editingCategoryId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour cette categorie: identifiant invalide.';
        return;
      }

      this.feeCategoryService.update(this.editingCategoryId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadCategories(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.feeCategoryService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadCategories(false);
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
        this.loadCategories(true);
      },
      error: () => {
        this.isLoadingSchools = false;
        this.loadError = 'Impossible de charger les ecoles.';
      }
    });
  }

  private loadCategories(showLoader = true): void {
    if (!this.selectedSchoolId) {
      this.categories = [];
      return;
    }

    if (showLoader) {
      this.isLoading = true;
    }
    this.loadError = '';

    this.feeCategoryService.getAll(this.selectedSchoolId).subscribe({
      next: (rows: FeeCategoryApiResponse[]) => {
        this.categories = rows
          .map((row: FeeCategoryApiResponse) => this.mapApiToItem(row))
          .filter((item: FeeCategoryItem) => item.id);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les categories de frais.';
        this.categories = [];
      }
    });
  }

  private mapApiToItem(row: FeeCategoryApiResponse): FeeCategoryItem {
    const code = (row.code ?? '').trim();
    const iconMeta = this.resolveIcon(code);

    return {
      id: String(row.id ?? ''),
      code,
      name: (row.name ?? '').trim(),
      description: (row.description ?? '').trim() || '—',
      comment: (row.comment ?? '').trim(),
      status: this.resolveStatus(row.active),
      allowInstallments: this.resolveBoolean(row.allowInstallments ?? row.allow_installments),
      createdAt: this.formatDate(row.createdAt ?? row.created_at),
      schoolId: String(row.schoolId ?? row.school_id ?? this.selectedSchoolId),
      icon: iconMeta.icon,
      iconTone: iconMeta.tone
    };
  }

  private resolveIcon(code: string): { icon: string; tone: string } {
    const normalized = this.normalize(code);

    if (normalized.includes('facad') || normalized.includes('acad')) {
      return { icon: 'bi-journal-bookmark', tone: 'tone-blue' };
    }
    if (normalized.includes('fadm') || normalized.includes('admin')) {
      return { icon: 'bi-building', tone: 'tone-purple' };
    }
    if (normalized.includes('trans')) {
      return { icon: 'bi-bus-front', tone: 'tone-teal' };
    }
    if (normalized.includes('unif')) {
      return { icon: 'bi-person-badge', tone: 'tone-indigo' };
    }
    if (normalized.includes('insur') || normalized.includes('assur')) {
      return { icon: 'bi-shield-check', tone: 'tone-green' };
    }
    if (normalized.includes('activ') || normalized.includes('sport')) {
      return { icon: 'bi-trophy', tone: 'tone-orange' };
    }

    return { icon: 'bi-wallet2', tone: 'tone-blue' };
  }

  private buildEmptyForm(): FeeCategoryForm {
    return {
      code: '',
      name: '',
      description: '',
      active: true,
      allowInstallments: false,
      comment: ''
    };
  }

  private toFormFields(item: FeeCategoryItem): FeeCategoryForm {
    return {
      code: item.code,
      name: item.name,
      description: item.description === '—' ? '' : item.description,
      active: item.status === 'Actif',
      allowInstallments: item.allowInstallments,
      comment: item.comment
    };
  }

  private resolveBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private resolveStatus(active: unknown): CategoryStatus {
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
