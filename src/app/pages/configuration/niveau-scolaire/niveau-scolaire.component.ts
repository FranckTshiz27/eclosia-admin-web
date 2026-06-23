import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  AcademicCycleApiResponse,
  AcademicCycleService
} from '../../../services/academic-cycle.service';
import {
  AcademicLevelApiResponse,
  AcademicLevelService,
  CreateAcademicLevelDto
} from '../../../services/academic-level.service';

type LevelStatus = 'Actif' | 'Inactif';
type LevelType = 'simple' | 'section' | 'option' | 'section-option';

interface AcademicLevelItem {
  id: string;
  order: number;
  code: string;
  name: string;
  abbreviation: string;
  description?: string;
  cycle: string;
  cycleId: string;
  levelType: LevelType;
  sectionRequired: boolean;
  optionRequired: boolean;
  status: LevelStatus;
}

interface AcademicLevelForm {
  cycleId: string;
  name: string;
  description: string;
  code: string;
  abbreviation: string;
  order: string;
  sectionRequired: boolean;
  optionRequired: boolean;
}

interface LevelTypeMeta {
  value: LevelType;
  label: string;
  badgeClass: string;
  legendClass: string;
  description: string;
}

interface CycleOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-niveau-scolaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './niveau-scolaire.component.html',
  styleUrl: './niveau-scolaire.component.css'
})
export class NiveauScolaireComponent implements OnInit {
  searchTerm = '';
  cycleFilter = 'all';
  typeFilter = 'all';
  statusFilter = 'Actif';
  pageSize = 7;
  currentPage = 1;
  isModalOpen = false;
  isEditMode = false;
  editingLevelId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  isLoadingCycles = false;
  isLoadingLevels = false;
  cycleLoadError = '';
  loadError = '';

  academicCycles: CycleOption[] = [];
  levels: AcademicLevelItem[] = [];
  form: AcademicLevelForm = this.createEmptyForm();

  private cycleApiRows: AcademicCycleApiResponse[] = [];
  private levelApiRows: AcademicLevelApiResponse[] = [];

  readonly descriptionMaxLength = 500;
  readonly previewSectionExample = 'Generale';
  readonly previewOptionExample = 'Scientifique';
  readonly previewClassLabels = ['A', 'B', 'C', 'D', 'E'];

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  readonly pageSizeOptions = [7, 10, 25, 50];

  readonly levelTypes: LevelTypeMeta[] = [
    {
      value: 'simple',
      label: 'Niveau simple',
      badgeClass: 'badge-type-simple',
      legendClass: 'legend-simple',
      description: 'Aucune section ni option requise'
    },
    {
      value: 'section',
      label: 'Section requise',
      badgeClass: 'badge-type-section',
      legendClass: 'legend-section',
      description: 'Une section est requise. Aucune option requise'
    },
    {
      value: 'option',
      label: 'Option requise',
      badgeClass: 'badge-type-option',
      legendClass: 'legend-option',
      description: 'Aucune section requise. Une option est requise'
    },
    {
      value: 'section-option',
      label: 'Section et option requises',
      badgeClass: 'badge-type-both',
      legendClass: 'legend-both',
      description: 'Une section et une option sont requises'
    }
  ];

  constructor(
    private readonly academicCycleService: AcademicCycleService,
    private readonly academicLevelService: AcademicLevelService
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

  get namingExample(): string {
    const parts = [this.form.name.trim() || 'Niveau'];
    if (this.form.sectionRequired) {
      parts.push(this.previewSectionExample);
    }
    if (this.form.optionRequired) {
      parts.push(this.previewOptionExample);
    }
    parts.push('A');
    return parts.join(' + ');
  }

  get namingResult(): string {
    const parts = [this.form.name.trim() || 'Niveau'];
    if (this.form.sectionRequired) {
      parts.push(this.previewSectionExample);
    }
    if (this.form.optionRequired) {
      parts.push(this.previewOptionExample);
    }
    parts.push('A');
    return parts.join(' ');
  }

  get previewClassExamples(): string[] {
    const base = this.form.name.trim() || 'Niveau';
    return this.previewClassLabels.map((label) => {
      const parts = [base];
      if (this.form.sectionRequired) {
        parts.push(this.previewSectionExample);
      }
      if (this.form.optionRequired) {
        parts.push(this.previewOptionExample);
      }
      parts.push(label);
      return parts.join(' ');
    });
  }

  get subtitleCycleLabel(): string {
    if (this.cycleFilter === 'all') {
      return 'tous les cycles';
    }
    const cycle = this.academicCycles.find((option) => option.value === this.cycleFilter);
    return cycle?.label.toLowerCase() ?? 'tous les cycles';
  }

  get filteredLevels(): AcademicLevelItem[] {
    const term = this.normalize(this.searchTerm);

    return this.levels.filter((level) => {
      const matchesSearch =
        !term ||
        this.normalize(level.name).includes(term) ||
        this.normalize(level.code).includes(term) ||
        this.normalize(level.abbreviation).includes(term) ||
        this.normalize(level.cycle).includes(term);

      const matchesCycle = this.cycleFilter === 'all' || level.cycleId === this.cycleFilter;
      const matchesType = this.typeFilter === 'all' || level.levelType === this.typeFilter;
      const matchesStatus = this.statusFilter === 'all' || level.status === this.statusFilter;

      return matchesSearch && matchesCycle && matchesType && matchesStatus;
    });
  }

  get paginatedLevels(): AcademicLevelItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLevels.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLevels.length / this.pageSize));
  }

  get rangeStart(): number {
    if (this.filteredLevels.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredLevels.length);
  }

  getLevelTypeMeta(type: LevelType): LevelTypeMeta {
    return this.levelTypes.find((item) => item.value === type) ?? this.levelTypes[0];
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.cycleFilter = 'all';
    this.typeFilter = 'all';
    this.statusFilter = 'Actif';
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
    this.editingLevelId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.createEmptyForm();
  }

  openEditModal(level: AcademicLevelItem): void {
    const apiRow = this.findLevelApiRow(level.id);
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingLevelId = level.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toForm(level, apiRow);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingLevelId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.createEmptyForm();
  }

  toggleSectionRequired(): void {
    this.form = { ...this.form, sectionRequired: !this.form.sectionRequired };
  }

  toggleOptionRequired(): void {
    this.form = { ...this.form, optionRequired: !this.form.optionRequired };
  }

  decrementOrder(): void {
    const current = Number(this.form.order) || 1;
    this.form.order = String(Math.max(1, current - 1));
  }

  incrementOrder(): void {
    const current = Number(this.form.order) || 0;
    this.form.order = String(Math.min(99, current + 1));
  }

  saveLevel(levelForm: NgForm): void {
    this.isSubmitted = true;
    if (!levelForm.valid || this.isSaving) {
      levelForm.control.markAllAsTouched();
      return;
    }

    const order = Number(this.form.order);
    if (!Number.isFinite(order) || order < 1) {
      this.saveError = "L ordre du niveau doit etre un nombre valide superieur a 0.";
      return;
    }

    const cycle = this.academicCycles.find((option) => option.value === this.form.cycleId);
    if (!cycle) {
      this.saveError = 'Veuillez selectionner un cycle academique valide.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateAcademicLevelDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      levelOrder: order,
      requiresSection: this.form.sectionRequired,
      requiresOption: this.form.optionRequired,
      active: true,
      academicCycleId: cycle.value
    };

    if (this.isEditMode) {
      if (!this.editingLevelId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour ce niveau: identifiant invalide.';
        return;
      }

      this.academicLevelService.update(this.editingLevelId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadLevels(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour du niveau academique. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.academicLevelService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadLevels(false);
        this.currentPage = 1;
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation du niveau academique. Verifiez l'API puis reessayez.";
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
        this.cycleApiRows = rows;
        this.academicCycles = rows
          .filter((row) => this.isActive(row.active ?? row.isActive ?? row.is_active))
          .map((row) => ({
            value: String(row.id ?? ''),
            label: (row.name ?? row.code ?? 'Cycle').trim()
          }))
          .filter((cycle) => cycle.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
        this.isLoadingCycles = false;
        if (this.academicCycles.length === 0) {
          this.cycleLoadError = 'Aucun cycle academique recu depuis l API.';
        }
        this.loadLevels(showLoader);
      },
      error: () => {
        this.isLoadingCycles = false;
        this.cycleLoadError = 'Impossible de charger les cycles academiques.';
        this.loadLevels(showLoader);
      }
    });
  }

  private loadLevels(showLoader = true): void {
    if (showLoader) {
      this.isLoadingLevels = true;
    }
    this.loadError = '';
    this.academicLevelService.getAll().subscribe({
      next: (rows) => {
        this.levelApiRows = rows;
        this.levels = rows
          .map((row) => this.mapApiLevelToItem(row))
          .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));
        this.isLoadingLevels = false;
      },
      error: () => {
        this.isLoadingLevels = false;
        this.loadError = 'Impossible de charger la liste des niveaux academiques.';
      }
    });
  }

  private createEmptyForm(): AcademicLevelForm {
    return {
      cycleId: this.academicCycles[0]?.value ?? '',
      name: '',
      description: '',
      code: '',
      abbreviation: '',
      order: String(this.getNextOrder()),
      sectionRequired: false,
      optionRequired: false
    };
  }

  private toForm(level: AcademicLevelItem, apiRow?: AcademicLevelApiResponse): AcademicLevelForm {
    const sectionRequired = apiRow
      ? this.readRequiresSection(apiRow)
      : level.sectionRequired;
    const optionRequired = apiRow ? this.readRequiresOption(apiRow) : level.optionRequired;

    return {
      cycleId: level.cycleId,
      name: level.name,
      description: level.description ?? apiRow?.description ?? '',
      code: level.code,
      abbreviation: level.abbreviation,
      order: String(level.order),
      sectionRequired,
      optionRequired
    };
  }

  private mapApiLevelToItem(row: AcademicLevelApiResponse): AcademicLevelItem {
    const cycleId = String(
      row.academicCycleId ?? row.academic_cycle_id ?? row.academicCycle?.id ?? ''
    );
    const cycleLabel =
      row.academicCycle?.name?.trim() ||
      this.academicCycles.find((cycle) => cycle.value === cycleId)?.label ||
      '--';
    const sectionRequired = this.readRequiresSection(row);
    const optionRequired = this.readRequiresOption(row);

    return {
      id: String(row.id ?? crypto.randomUUID()),
      order: row.levelOrder ?? row.level_order ?? row.displayOrder ?? row.display_order ?? 0,
      code: (row.code ?? '').trim(),
      name: (row.name ?? '').trim(),
      abbreviation: (row.abbreviation ?? row.name ?? '').trim(),
      description: row.description?.trim() || undefined,
      cycle: cycleLabel,
      cycleId,
      levelType: this.resolveLevelType(sectionRequired, optionRequired),
      sectionRequired,
      optionRequired,
      status: this.isActive(row.active ?? row.isActive ?? row.is_active) ? 'Actif' : 'Inactif'
    };
  }

  private findLevelApiRow(id: string): AcademicLevelApiResponse | undefined {
    return this.levelApiRows.find((row) => String(row.id ?? '') === id);
  }

  private getNextOrder(): number {
    return (this.levels ?? []).reduce((max, level) => Math.max(max, level.order), 0) + 1;
  }

  private resolveLevelType(sectionRequired: boolean, optionRequired: boolean): LevelType {
    if (sectionRequired && optionRequired) {
      return 'section-option';
    }
    if (sectionRequired) {
      return 'section';
    }
    if (optionRequired) {
      return 'option';
    }
    return 'simple';
  }

  private isActive(value: unknown): boolean {
    return value !== false && value !== 'false' && value !== 0 && value !== '0';
  }

  private readRequiresSection(row: AcademicLevelApiResponse): boolean {
    return this.readBoolean(
      row.requiresSection ??
        row.requires_section ??
        row.sectionRequired ??
        row.section_required
    );
  }

  private readRequiresOption(row: AcademicLevelApiResponse): boolean {
    return this.readBoolean(
      row.requiresOption ?? row.requires_option ?? row.optionRequired ?? row.option_required
    );
  }

  private readBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
