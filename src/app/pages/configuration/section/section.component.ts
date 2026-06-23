import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AcademicCycleService } from '../../../services/academic-cycle.service';
import {
  AcademicSectionApiResponse,
  AcademicSectionService,
  CreateAcademicSectionDto
} from '../../../services/academic-section.service';

type SectionStatus = 'Actif' | 'Inactif';

interface AcademicSectionItem {
  id: string;
  displayOrder: number | null;
  code: string;
  name: string;
  description: string;
  cycle: string;
  cycleId: string;
  optionsCount: number;
  status: SectionStatus;
}

interface CycleOption {
  value: string;
  label: string;
}

interface SectionExampleTag {
  label: string;
  tagClass: string;
}

interface SectionForm {
  cycleId: string;
  code: string;
  name: string;
  description: string;
  displayOrder: string;
  active: boolean;
}

@Component({
  selector: 'app-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './section.component.html',
  styleUrl: './section.component.css'
})
export class SectionComponent implements OnInit {
  searchTerm = '';
  cycleFilter = 'all';
  statusFilter = 'all';
  pageSize = 10;
  currentPage = 1;

  isModalOpen = false;
  isEditMode = false;
  editingSectionId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  isLoadingCycles = false;
  isLoadingSections = false;
  cycleLoadError = '';
  loadError = '';

  academicCycles: CycleOption[] = [];
  sections: AcademicSectionItem[] = [];
  private sectionApiRows: AcademicSectionApiResponse[] = [];

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  readonly pageSizeOptions = [10, 25, 50];
  readonly descriptionMaxLength = 500;

  readonly sectionExamples: SectionExampleTag[] = [
    { label: 'Generale', tagClass: 'tag-general' },
    { label: 'Technique', tagClass: 'tag-technical' },
    { label: 'Pedagogique', tagClass: 'tag-pedagogical' },
    { label: 'Artistique', tagClass: 'tag-artistic' }
  ];

  form: SectionForm = this.buildEmptyForm();

  constructor(
    private readonly academicCycleService: AcademicCycleService,
    private readonly academicSectionService: AcademicSectionService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get cycleFilterOptions(): CycleOption[] {
    return [{ value: 'all', label: 'Tous les cycles' }, ...this.academicCycles];
  }

  get cycleFormOptions(): CycleOption[] {
    return this.academicCycles;
  }

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get modalCycleLabel(): string {
    const cycle = this.cycleFormOptions.find((option) => option.value === this.form.cycleId);
    return cycle?.label ?? '—';
  }

  get subtitleCycleLabel(): string {
    if (this.cycleFilter === 'all') {
      return 'tous les cycles';
    }
    const cycle = this.cycleFilterOptions.find((option) => option.value === this.cycleFilter);
    return cycle?.label.toLowerCase() ?? 'tous les cycles';
  }

  get filteredSections(): AcademicSectionItem[] {
    const term = this.normalize(this.searchTerm);

    return this.sections.filter((section) => {
      const matchesSearch =
        !term ||
        this.normalize(section.name).includes(term) ||
        this.normalize(section.code).includes(term) ||
        this.normalize(section.description).includes(term);

      const matchesCycle = this.cycleFilter === 'all' || section.cycleId === this.cycleFilter;
      const matchesStatus = this.statusFilter === 'all' || section.status === this.statusFilter;

      return matchesSearch && matchesCycle && matchesStatus;
    });
  }

  get paginatedSections(): AcademicSectionItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSections.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSections.length / this.pageSize));
  }

  get rangeStart(): number {
    if (this.filteredSections.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredSections.length);
  }

  getOptionsLabel(count: number): string {
    return count === 1 ? '1 option' : `${count} options`;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.cycleFilter = 'all';
    this.statusFilter = 'all';
    this.currentPage = 1;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
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
    this.editingSectionId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  openEditModal(section: AcademicSectionItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingSectionId = section.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toFormFields(section);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingSectionId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  onFormCycleChange(): void {
    this.form.displayOrder = String(this.getNextDisplayOrder(this.form.cycleId));
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

  deleteSection(section: AcademicSectionItem): void {
    if (!confirm(`Supprimer la section "${section.name}" ?`)) {
      return;
    }

    this.academicSectionService.delete(section.id).subscribe({
      next: () => this.loadSections(false),
      error: () => {
        this.loadError = 'Echec de suppression de la section.';
      }
    });
  }

  saveSection(sectionForm: NgForm): void {
    this.isSubmitted = true;
    if (!sectionForm.valid || this.isSaving) {
      sectionForm.control.markAllAsTouched();
      return;
    }

    const displayOrder = Number(this.form.displayOrder);
    if (!Number.isFinite(displayOrder) || displayOrder < 1) {
      this.saveError = "L ordre d affichage doit etre un nombre valide superieur a 0.";
      return;
    }

    const cycle = this.cycleFormOptions.find((option) => option.value === this.form.cycleId);
    if (!cycle) {
      this.saveError = 'Veuillez selectionner un cycle academique valide.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateAcademicSectionDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      description: this.form.description.trim() || undefined,
      displayOrder,
      active: this.form.active,
      academicCycleId: cycle.value
    };

    if (this.isEditMode) {
      if (!this.editingSectionId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour cette section: identifiant invalide.';
        return;
      }

      this.academicSectionService.update(this.editingSectionId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadSections(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour de la section. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.academicSectionService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadSections(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation de la section. Verifiez l'API puis reessayez.";
      }
    });
  }

  private bootstrapData(): void {
    this.loadCycles(true);
  }

  private loadCycles(showLoader = true): void {
    if (showLoader) {
      this.isLoadingCycles = true;
    }
    this.cycleLoadError = '';
    this.academicCycleService.getAll().subscribe({
      next: (rows) => {
        this.academicCycles = rows
          .filter((row) => this.isActive(row.active ?? row.isActive ?? row.is_active))
          .map((row) => ({
            value: String(row.id ?? ''),
            label: (row.name ?? row.code ?? 'Cycle').trim()
          }))
          .filter((cycle) => cycle.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.cycleFilter = 'all';
        this.form = this.buildEmptyForm();
        this.isLoadingCycles = false;

        if (this.academicCycles.length === 0) {
          this.cycleLoadError = 'Aucun cycle academique recu depuis l API.';
        }

        this.loadSections(showLoader);
      },
      error: () => {
        this.isLoadingCycles = false;
        this.cycleLoadError = 'Impossible de charger les cycles academiques.';
        this.loadSections(showLoader);
      }
    });
  }

  private loadSections(showLoader = true): void {
    if (showLoader) {
      this.isLoadingSections = true;
    }
    this.loadError = '';
    this.academicSectionService.getAll().subscribe({
      next: (rows) => {
        this.sectionApiRows = rows;
        this.sections = rows
          .map((row) => this.mapApiSectionToItem(row))
          .filter((section) => section.id)
          .sort(
            (a, b) =>
              (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
              a.name.localeCompare(b.name, 'fr')
          );
        this.isLoadingSections = false;
      },
      error: () => {
        this.isLoadingSections = false;
        this.loadError = 'Impossible de charger la liste des sections.';
      }
    });
  }

  private mapApiSectionToItem(row: AcademicSectionApiResponse): AcademicSectionItem {
    const cycleId = String(
      row.academicCycleId ?? row.academic_cycle_id ?? row.academicCycle?.id ?? ''
    );
    const matchedCycle = this.academicCycles.find((cycle) => cycle.value === cycleId);
    const cycleLabel =
      matchedCycle?.label ||
      (row.academicCycle?.name ?? row.academicCycle?.code ?? '').trim() ||
      '--';

    return {
      id: String(row.id ?? ''),
      code: (row.code ?? '').trim(),
      name: (row.name ?? '').trim(),
      description: (row.description ?? '').trim(),
      cycle: cycleLabel,
      cycleId,
      displayOrder: this.readDisplayOrder(row),
      optionsCount: row.optionsCount ?? row.options_count ?? 0,
      status: this.resolveStatus(row.active ?? row.isActive ?? row.is_active)
    };
  }

  private buildEmptyForm(): SectionForm {
    const defaultCycle =
      this.cycleFilter !== 'all'
        ? this.cycleFilter
        : this.cycleFormOptions[0]?.value ?? '';

    return {
      cycleId: defaultCycle,
      code: '',
      name: '',
      description: '',
      displayOrder: String(this.getNextDisplayOrder(defaultCycle)),
      active: true
    };
  }

  private toFormFields(section: AcademicSectionItem): SectionForm {
    return {
      cycleId: section.cycleId,
      code: section.code,
      name: section.name,
      description: section.description,
      displayOrder: String(section.displayOrder ?? 1),
      active: section.status === 'Actif'
    };
  }

  private getNextDisplayOrder(cycleId: string): number {
    if (!cycleId) {
      return 1;
    }

    const maxDisplayOrder = (this.sections ?? [])
      .filter((section) => section.cycleId === cycleId)
      .reduce((max, section) => Math.max(max, section.displayOrder ?? 0), 0);

    return maxDisplayOrder + 1;
  }

  private readDisplayOrder(row: AcademicSectionApiResponse): number | null {
    const value: unknown = row.displayOrder ?? row.display_order;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resolveStatus(active: unknown): SectionStatus {
    if (active === false || active === 'false' || active === 0 || active === '0') {
      return 'Inactif';
    }
    return 'Actif';
  }

  private isActive(active: unknown): boolean {
    return active !== false && active !== 'false' && active !== 0 && active !== '0';
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
