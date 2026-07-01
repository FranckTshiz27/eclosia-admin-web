import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  ClassroomDesignationApiResponse,
  ClassroomDesignationService,
  CreateClassroomDesignationDto
} from '../../../../services/classroom-designation.service';

type DesignationStatus = 'Actif' | 'Inactif';

interface ClassroomDesignationItem {
  id: string;
  code: string;
  name: string;
  description: string;
  displayOrder: number | null;
  status: DesignationStatus;
  schoolId: string;
}

interface DesignationForm {
  code: string;
  name: string;
  description: string;
  displayOrder: string;
  active: boolean;
}

@Component({
  selector: 'app-ecole-classroom-designations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole-classroom-designations.component.html',
  styleUrl: './ecole-classroom-designations.component.css'
})
export class EcoleClassroomDesignationsComponent implements OnChanges {
  @Input() schoolId = '';

  searchTerm = '';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isLoading = false;
  loadError = '';

  isModalOpen = false;
  isEditMode = false;
  editingDesignationId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  designations: ClassroomDesignationItem[] = [];
  form: DesignationForm = this.buildEmptyForm();

  readonly descriptionMaxLength = 500;
  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];
  readonly pageSizeOptions = [10, 25, 50];

  constructor(private readonly classroomDesignationService: ClassroomDesignationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schoolId']) {
      this.currentPage = 1;
      this.loadDesignations(true);
    }
  }

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get filteredDesignations(): ClassroomDesignationItem[] {
    const term = this.normalize(this.searchTerm);

    return this.designations
      .filter((item) => {
        const matchesSearch =
          !term ||
          this.normalize(item.name).includes(term) ||
          this.normalize(item.code).includes(term) ||
          this.normalize(item.description).includes(term);

        const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name, 'fr');
      });
  }

  get paginatedDesignations(): ClassroomDesignationItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDesignations.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDesignations.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredDesignations.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredDesignations.length);
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
    this.editingDesignationId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  openEditModal(item: ClassroomDesignationItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingDesignationId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toFormFields(item);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingDesignationId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  toggleActiveStatus(): void {
    this.form = { ...this.form, active: !this.form.active };
  }

  decrementDisplayOrder(): void {
    const current = Number(this.form.displayOrder) || 1;
    this.form.displayOrder = String(Math.max(1, current - 1));
  }

  incrementDisplayOrder(): void {
    const current = Number(this.form.displayOrder) || 0;
    this.form.displayOrder = String(Math.min(99, current + 1));
  }

  deleteDesignation(item: ClassroomDesignationItem): void {
    if (!confirm(`Supprimer la designation "${item.name}" ?`)) {
      return;
    }

    this.classroomDesignationService.delete(item.id).subscribe({
      next: () => this.loadDesignations(false),
      error: () => {
        this.loadError = 'Echec de suppression de la designation.';
      }
    });
  }

  saveDesignation(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving || !this.schoolId) {
      formRef.control.markAllAsTouched();
      return;
    }

    const displayOrder = Number(this.form.displayOrder);
    if (!Number.isFinite(displayOrder) || displayOrder < 1) {
      this.saveError = "L ordre d affichage doit etre un nombre valide superieur a 0.";
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateClassroomDesignationDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      description: this.form.description.trim() || undefined,
      displayOrder,
      active: this.form.active,
      schoolId: this.schoolId
    };

    if (this.isEditMode) {
      if (!this.editingDesignationId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour cette designation: identifiant invalide.';
        return;
      }

      this.classroomDesignationService.update(this.editingDesignationId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadDesignations(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.classroomDesignationService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadDesignations(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation. Verifiez l'API puis reessayez.";
      }
    });
  }

  private loadDesignations(showLoader = true): void {
    if (!this.schoolId) {
      this.designations = [];
      return;
    }

    if (showLoader) {
      this.isLoading = true;
    }
    this.loadError = '';

    this.classroomDesignationService.getAll(this.schoolId).subscribe({
      next: (rows) => {
        this.designations = rows
          .map((row) => this.mapApiToItem(row))
          .filter((item) => item.id);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les designations de salles.';
        this.designations = [];
      }
    });
  }

  private mapApiToItem(row: ClassroomDesignationApiResponse): ClassroomDesignationItem {
    return {
      id: String(row.id ?? ''),
      code: (row.code ?? '').trim(),
      name: (row.name ?? '').trim(),
      description: (row.description ?? '').trim() || '—',
      displayOrder: this.readDisplayOrder(row.displayOrder ?? row.display_order),
      status: this.resolveStatus(row.active),
      schoolId: String(row.schoolId ?? row.school_id ?? this.schoolId)
    };
  }

  private buildEmptyForm(): DesignationForm {
    return {
      code: '',
      name: '',
      description: '',
      displayOrder: String(this.getNextDisplayOrder()),
      active: true
    };
  }

  private toFormFields(item: ClassroomDesignationItem): DesignationForm {
    return {
      code: item.code,
      name: item.name,
      description: item.description === '—' ? '' : item.description,
      displayOrder: String(item.displayOrder ?? this.getNextDisplayOrder()),
      active: item.status === 'Actif'
    };
  }

  private getNextDisplayOrder(): number {
    const orders = this.designations
      .map((item) => item.displayOrder)
      .filter((value): value is number => value !== null && Number.isFinite(value));

    if (orders.length === 0) {
      return 1;
    }
    return Math.max(...orders) + 1;
  }

  private readDisplayOrder(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resolveStatus(active: unknown): DesignationStatus {
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
