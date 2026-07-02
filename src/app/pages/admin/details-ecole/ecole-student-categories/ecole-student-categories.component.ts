import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  CreateStudentCategoryDto,
  StudentCategoryApiResponse,
  StudentCategoryService
} from '../../../../services/student-category.service';

type CategoryStatus = 'Actif' | 'Inactif';

interface StudentCategoryItem {
  id: string;
  code: string;
  name: string;
  description: string;
  status: CategoryStatus;
  schoolId: string;
}

interface StudentCategoryForm {
  code: string;
  name: string;
  description: string;
  active: boolean;
}

@Component({
  selector: 'app-ecole-student-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-student-categories.component.html',
  styleUrl: './ecole-student-categories.component.css'
})
export class EcoleStudentCategoriesComponent implements OnChanges {
  @Input() schoolId = '';

  searchTerm = '';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoading = false;
  loadError = '';

  isModalOpen = false;
  isEditMode = false;
  editingCategoryId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  categories: StudentCategoryItem[] = [];
  form: StudentCategoryForm = this.buildEmptyForm();

  readonly descriptionMaxLength = 500;
  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];
  readonly pageSizeOptions = [10, 25, 50];

  constructor(private readonly studentCategoryService: StudentCategoryService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schoolId']) {
      this.currentPage = 1;
      this.loadCategories(true);
    }
  }

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get filteredCategories(): StudentCategoryItem[] {
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

  get paginatedCategories(): StudentCategoryItem[] {
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

  openEditModal(item: StudentCategoryItem): void {
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

  deleteCategory(item: StudentCategoryItem): void {
    if (!confirm(`Supprimer la categorie "${item.name}" ?`)) {
      return;
    }

    this.studentCategoryService.delete(item.id).subscribe({
      next: () => this.loadCategories(false),
      error: () => {
        this.loadError = 'Echec de suppression de la categorie.';
      }
    });
  }

  saveCategory(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving || !this.schoolId) {
      formRef.control.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateStudentCategoryDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      description: this.form.description.trim() || undefined,
      active: this.form.active,
      schoolId: this.schoolId
    };

    if (this.isEditMode) {
      if (!this.editingCategoryId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour cette categorie: identifiant invalide.';
        return;
      }

      this.studentCategoryService.update(this.editingCategoryId, dto).subscribe({
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

    this.studentCategoryService.create(dto).subscribe({
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

  private loadCategories(showLoader = true): void {
    if (!this.schoolId) {
      this.categories = [];
      return;
    }

    if (showLoader) {
      this.isLoading = true;
    }
    this.loadError = '';

    this.studentCategoryService.getAll(this.schoolId).subscribe({
      next: (rows) => {
        this.categories = rows
          .map((row) => this.mapApiToItem(row))
          .filter((item) => item.id);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les categories d eleves.';
        this.categories = [];
      }
    });
  }

  private mapApiToItem(row: StudentCategoryApiResponse): StudentCategoryItem {
    return {
      id: String(row.id ?? ''),
      code: (row.code ?? '').trim(),
      name: (row.name ?? '').trim(),
      description: (row.description ?? '').trim() || '—',
      status: this.resolveStatus(row.active),
      schoolId: String(row.schoolId ?? row.school_id ?? this.schoolId)
    };
  }

  private buildEmptyForm(): StudentCategoryForm {
    return {
      code: '',
      name: '',
      description: '',
      active: true
    };
  }

  private toFormFields(item: StudentCategoryItem): StudentCategoryForm {
    return {
      code: item.code,
      name: item.name,
      description: item.description === '—' ? '' : item.description,
      active: item.status === 'Actif'
    };
  }

  private resolveStatus(active: unknown): CategoryStatus {
    if (active === false || active === 'false' || active === 0 || active === '0') {
      return 'Inactif';
    }
    return 'Actif';
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
