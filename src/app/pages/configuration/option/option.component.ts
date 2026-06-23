import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  AcademicOptionApiResponse,
  AcademicOptionService,
  CreateAcademicOptionDto
} from '../../../services/academic-option.service';
import { AcademicCycleService } from '../../../services/academic-cycle.service';
import { AcademicSectionService } from '../../../services/academic-section.service';

type OptionStatus = 'Actif' | 'Inactif';

interface CycleOption {
  value: string;
  label: string;
}

interface SectionOption {
  value: string;
  label: string;
  cycleId: string;
  tagClass: string;
}

interface AcademicOptionItem {
  id: string;
  displayOrder: number | null;
  code: string;
  name: string;
  description: string;
  sectionId: string;
  sectionName: string;
  sectionTagClass: string;
  cycleId: string;
  status: OptionStatus;
}

interface SectionFormOption extends SectionOption {
  cycleLabel: string;
  displayLabel: string;
}

interface OptionForm {
  sectionId: string;
  code: string;
  name: string;
  description: string;
  displayOrder: string;
  active: boolean;
}

@Component({
  selector: 'app-option',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './option.component.html',
  styleUrl: './option.component.css'
})
export class OptionComponent implements OnInit {
  searchTerm = '';
  cycleFilter = 'all';
  sectionFilter = 'all';
  statusFilter = 'Actif';
  pageSize = 10;
  currentPage = 1;

  isLoadingCycles = false;
  isLoadingSections = false;
  isLoadingOptions = false;
  loadError = '';
  sectionLoadError = '';

  isModalOpen = false;
  isEditMode = false;
  editingOptionId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  academicCycles: CycleOption[] = [];
  academicSections: SectionOption[] = [];
  options: AcademicOptionItem[] = [];
  form: OptionForm = this.buildEmptyForm();

  readonly descriptionMaxLength = 500;

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  readonly pageSizeOptions = [10, 25, 50];

  constructor(
    private readonly academicCycleService: AcademicCycleService,
    private readonly academicSectionService: AcademicSectionService,
    private readonly academicOptionService: AcademicOptionService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get cycleFilterOptions(): CycleOption[] {
    return [{ value: 'all', label: 'Tous les cycles' }, ...this.academicCycles];
  }

  get sectionFilterOptions(): SectionOption[] {
    const sections =
      this.cycleFilter === 'all'
        ? this.academicSections
        : this.academicSections.filter((section) => section.cycleId === this.cycleFilter);

    return [{ value: 'all', label: 'Toutes les sections', cycleId: '', tagClass: '' }, ...sections];
  }

  get sectionFormOptions(): SectionFormOption[] {
    return this.academicSections.map((section) => {
      const cycleLabel =
        this.academicCycles.find((cycle) => cycle.value === section.cycleId)?.label ?? 'Cycle';
      return {
        ...section,
        cycleLabel,
        displayLabel: `${section.label} (${cycleLabel})`
      };
    });
  }

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get filteredOptions(): AcademicOptionItem[] {
    const term = this.normalize(this.searchTerm);

    return this.options.filter((option) => {
      const matchesSearch =
        !term ||
        this.normalize(option.name).includes(term) ||
        this.normalize(option.code).includes(term) ||
        this.normalize(option.description).includes(term) ||
        this.normalize(option.sectionName).includes(term);

      const matchesCycle = this.cycleFilter === 'all' || option.cycleId === this.cycleFilter;
      const matchesSection = this.sectionFilter === 'all' || option.sectionId === this.sectionFilter;
      const matchesStatus = this.statusFilter === 'all' || option.status === this.statusFilter;

      return matchesSearch && matchesCycle && matchesSection && matchesStatus;
    });
  }

  get paginatedOptions(): AcademicOptionItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOptions.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredOptions.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredOptions.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredOptions.length);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.cycleFilter = this.getDefaultCycleFilter();
    this.sectionFilter = 'all';
    this.statusFilter = 'Actif';
    this.currentPage = 1;
  }

  onCycleFilterChange(): void {
    this.sectionFilter = 'all';
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
    this.editingOptionId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  openEditModal(option: AcademicOptionItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingOptionId = option.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toFormFields(option);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingOptionId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  onFormSectionChange(): void {
    this.form.displayOrder = String(this.getNextDisplayOrder(this.form.sectionId));
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

  deleteOption(option: AcademicOptionItem): void {
    if (!confirm(`Supprimer l option "${option.name}" ?`)) {
      return;
    }

    this.academicOptionService.delete(option.id).subscribe({
      next: () => this.loadOptions(false),
      error: () => {
        this.loadError = 'Echec de suppression de l option.';
      }
    });
  }

  saveOption(optionForm: NgForm): void {
    this.isSubmitted = true;
    if (!optionForm.valid || this.isSaving) {
      optionForm.control.markAllAsTouched();
      return;
    }

    const displayOrder = Number(this.form.displayOrder);
    if (!Number.isFinite(displayOrder) || displayOrder < 1) {
      this.saveError = "L ordre d affichage doit etre un nombre valide superieur a 0.";
      return;
    }

    const section = this.academicSections.find((item) => item.value === this.form.sectionId);
    if (!section) {
      this.saveError = 'Veuillez selectionner une section valide.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateAcademicOptionDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      description: this.form.description.trim() || undefined,
      displayOrder,
      active: this.form.active,
      academicSectionId: section.value
    };

    if (this.isEditMode) {
      if (!this.editingOptionId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour cette option: identifiant invalide.';
        return;
      }

      this.academicOptionService.update(this.editingOptionId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadOptions(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour de l option. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.academicOptionService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadOptions(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation de l option. Verifiez l'API puis reessayez.";
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

        this.cycleFilter = this.getDefaultCycleFilter();
        this.isLoadingCycles = false;
        this.loadSections(showLoader);
      },
      error: () => {
        this.isLoadingCycles = false;
        this.loadSections(showLoader);
      }
    });
  }

  private loadSections(showLoader = true): void {
    if (showLoader) {
      this.isLoadingSections = true;
    }

    this.academicSectionService.getAll().subscribe({
      next: (rows) => {
        this.academicSections = rows
          .map((row) => {
            const cycleId = String(
              row.academicCycleId ?? row.academic_cycle_id ?? row.academicCycle?.id ?? ''
            );
            const label = (row.name ?? row.code ?? 'Section').trim();
            return {
              value: String(row.id ?? ''),
              label,
              cycleId,
              tagClass: this.resolveSectionTagClass(label)
            };
          })
          .filter((section) => section.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.sectionLoadError = '';
        this.isLoadingSections = false;
        this.loadOptions(showLoader);
      },
      error: () => {
        this.isLoadingSections = false;
        this.sectionLoadError = 'Impossible de charger les sections.';
        this.loadOptions(showLoader);
      }
    });
  }

  private loadOptions(showLoader = true): void {
    if (showLoader) {
      this.isLoadingOptions = true;
    }
    this.loadError = '';

    this.academicOptionService.getAll().subscribe({
      next: (rows) => {
        this.options = rows
          .map((row) => this.mapApiOptionToItem(row))
          .filter((option) => option.id)
          .sort(
            (a, b) =>
              (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
              a.name.localeCompare(b.name, 'fr')
          );
        this.isLoadingOptions = false;
      },
      error: () => {
        this.isLoadingOptions = false;
        this.loadError = 'Impossible de charger la liste des options.';
      }
    });
  }

  private mapApiOptionToItem(row: AcademicOptionApiResponse): AcademicOptionItem {
    const sectionId = String(row.academicSectionId ?? row.academic_section_id ?? '');
    const section = this.academicSections.find((item) => item.value === sectionId);

    return {
      id: String(row.id ?? ''),
      code: (row.code ?? '').trim(),
      name: (row.name ?? '').trim(),
      description: (row.description ?? '').trim(),
      sectionId,
      sectionName: section?.label ?? '--',
      sectionTagClass: section?.tagClass ?? 'tag-general',
      cycleId: section?.cycleId ?? '',
      displayOrder: this.readDisplayOrder(row),
      status: this.resolveStatus(row.active ?? row.isActive ?? row.is_active)
    };
  }

  private buildEmptyForm(): OptionForm {
    const defaultSection =
      this.sectionFilter !== 'all'
        ? this.sectionFilter
        : this.sectionFormOptions[0]?.value ?? '';

    return {
      sectionId: defaultSection,
      code: '',
      name: '',
      description: '',
      displayOrder: String(this.getNextDisplayOrder(defaultSection)),
      active: true
    };
  }

  private toFormFields(option: AcademicOptionItem): OptionForm {
    return {
      sectionId: option.sectionId,
      code: option.code,
      name: option.name,
      description: option.description,
      displayOrder: String(option.displayOrder ?? 1),
      active: option.status === 'Actif'
    };
  }

  private getNextDisplayOrder(sectionId: string): number {
    if (!sectionId) {
      return 1;
    }

    const maxDisplayOrder = this.options
      .filter((option) => option.sectionId === sectionId)
      .reduce((max, option) => Math.max(max, option.displayOrder ?? 0), 0);

    return maxDisplayOrder + 1;
  }

  private readDisplayOrder(row: AcademicOptionApiResponse): number | null {
    const value: unknown = row.displayOrder ?? row.display_order;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getDefaultCycleFilter(): string {
    const secondaireCycle = this.academicCycles.find(
      (cycle) =>
        this.normalize(cycle.label).includes('secondaire') ||
        this.normalize(cycle.label).includes('humanit')
    );
    return secondaireCycle?.value ?? this.academicCycles[0]?.value ?? 'all';
  }

  private resolveSectionTagClass(name: string): string {
    const normalized = this.normalize(name);
    if (normalized.includes('tech')) {
      return 'tag-technical';
    }
    if (normalized.includes('hotel') || normalized.includes('hotellerie')) {
      return 'tag-hotellerie';
    }
    return 'tag-general';
  }

  private resolveStatus(active: unknown): OptionStatus {
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
