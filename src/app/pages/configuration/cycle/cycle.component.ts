import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  AcademicCycleApiResponse,
  AcademicCycleService,
  CreateAcademicCycleDto
} from '../../../services/academic-cycle.service';
import { AcademicModelService } from '../../../services/academic-model.service';

type CycleStatus = 'Actif' | 'Inactif';

interface AcademicModelOption {
  id: string;
  label: string;
}

interface AcademicCycleItem {
  id: string;
  code: string;
  name: string;
  academicModelId: string;
  academicModelLabel: string;
  durationYears: number;
  description?: string;
  displayOrder: number | null;
  status: CycleStatus;
}

interface AcademicCycleForm {
  academicModelId: string;
  code: string;
  name: string;
  durationYears: string;
  description: string;
  order: string;
  status: CycleStatus;
}

@Component({
  selector: 'app-cycle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cycle.component.html',
  styleUrl: './cycle.component.css'
})
export class CycleComponent implements OnInit {
  searchTerm = '';
  modelFilter = 'all';
  statusFilter = 'all';
  isModalOpen = false;
  isEditMode = false;
  editingCycleId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';
  isLoadingModels = false;
  isLoadingCycles = false;
  modelLoadError = '';
  loadError = '';

  academicModels: AcademicModelOption[] = [];
  cycles: AcademicCycleItem[] = [];
  form: AcademicCycleForm = this.createEmptyForm();
  private cycleApiRows: AcademicCycleApiResponse[] = [];

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  readonly descriptionMaxLength = 500;

  constructor(
    private readonly academicModelService: AcademicModelService,
    private readonly academicCycleService: AcademicCycleService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get modelFilterOptions(): AcademicModelOption[] {
    const labels = new Map<string, AcademicModelOption>();

    for (const model of this.academicModels) {
      labels.set(model.id, model);
    }

    for (const cycle of this.cycles) {
      if (!labels.has(cycle.academicModelId)) {
        labels.set(cycle.academicModelId, {
          id: cycle.academicModelId,
          label: cycle.academicModelLabel
        });
      }
    }

    return Array.from(labels.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }

  get filteredCycles(): AcademicCycleItem[] {
    const term = this.normalize(this.searchTerm);

    return this.cycles.filter((cycle) => {
      const matchesSearch =
        !term ||
        this.normalize(cycle.name).includes(term) ||
        this.normalize(cycle.code).includes(term) ||
        this.normalize(cycle.academicModelLabel).includes(term);

      const matchesModel =
        this.modelFilter === 'all' || cycle.academicModelId === this.modelFilter;

      const matchesStatus = this.statusFilter === 'all' || cycle.status === this.statusFilter;

      return matchesSearch && matchesModel && matchesStatus;
    });
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingCycleId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.createEmptyForm();
  }

  openEditModal(cycle: AcademicCycleItem): void {
    const apiRow = this.findApiRow(cycle.id);
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingCycleId = cycle.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toForm(cycle, apiRow);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingCycleId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.createEmptyForm();
  }

  saveCycle(cycleForm: NgForm): void {
    this.isSubmitted = true;
    if (!cycleForm.valid || this.isSaving) {
      cycleForm.control.markAllAsTouched();
      return;
    }

    const durationYears = Number(this.form.durationYears);
    const order = Number(this.form.order);

    if (!Number.isFinite(durationYears) || durationYears < 1) {
      this.saveError = 'La duree doit etre un nombre valide superieur a 0.';
      return;
    }

    if (!Number.isFinite(order) || order < 1) {
      this.saveError = "L ordre d affichage doit etre un nombre valide superieur a 0.";
      return;
    }

    const selectedModel = this.academicModels.find(
      (model) => model.id === this.form.academicModelId
    );
    if (!selectedModel) {
      this.saveError = 'Veuillez selectionner un modele academique valide.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateAcademicCycleDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      description: this.form.description.trim() || undefined,
      displayOrder: order,
      durationYears,
      active: this.form.status === 'Actif',
      academicModelId: selectedModel.id
    };

    if (this.isEditMode) {
      if (!this.editingCycleId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour ce cycle: identifiant invalide.';
        return;
      }

      this.academicCycleService.update(this.editingCycleId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadCycles(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour du cycle academique. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.academicCycleService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadCycles(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation du cycle academique. Verifiez l'API puis reessayez.";
      }
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.modelFilter = 'all';
    this.statusFilter = 'all';
  }

  selectStatus(status: CycleStatus): void {
    this.form = { ...this.form, status };
  }

  private bootstrapData(): void {
    this.isLoadingModels = true;
    this.modelLoadError = '';
    this.academicModelService.getAll().subscribe({
      next: (models) => {
        this.academicModels = models.map((model) => ({
          id: String(model.id ?? model.code ?? ''),
          label: this.buildModelLabel(model.code, model.name, model.version)
        }));
        this.isLoadingModels = false;
        if (this.academicModels.length === 0) {
          this.modelLoadError = 'Aucun modele academique recu depuis l API.';
        }
        this.loadCycles(true);
      },
      error: () => {
        this.isLoadingModels = false;
        this.modelLoadError = 'Impossible de charger les modeles academiques.';
        this.loadCycles(true);
      }
    });
  }

  private loadCycles(showLoader = true): void {
    if (showLoader) {
      this.isLoadingCycles = true;
    }
    this.loadError = '';
    this.academicCycleService.getAll().subscribe({
      next: (rows) => {
        this.cycleApiRows = rows;
        this.cycles = rows
          .map((row) => this.mapApiCycleToItem(row))
          .sort(
            (a, b) =>
              (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
              a.name.localeCompare(b.name, 'fr')
          );
        this.isLoadingCycles = false;
      },
      error: () => {
        this.isLoadingCycles = false;
        this.loadError = 'Impossible de charger la liste des cycles academiques.';
      }
    });
  }

  private toForm(cycle: AcademicCycleItem, apiRow?: AcademicCycleApiResponse): AcademicCycleForm {
    const status = apiRow ? this.resolveStatusFromRow(apiRow) : cycle.status;

    return {
      academicModelId: cycle.academicModelId,
      code: cycle.code,
      name: cycle.name,
      durationYears: String(cycle.durationYears),
      description: cycle.description ?? '',
      order: String(cycle.displayOrder ?? 1),
      status
    };
  }

  private findApiRow(id: string): AcademicCycleApiResponse | undefined {
    return this.cycleApiRows.find((row) => String(row.id ?? '') === id);
  }

  private createEmptyForm(): AcademicCycleForm {
    return {
      academicModelId: '',
      code: '',
      name: '',
      durationYears: '',
      description: '',
      order: '',
      status: 'Actif'
    };
  }

  private mapApiCycleToItem(
    row: AcademicCycleApiResponse,
    fallbackModel?: AcademicModelOption
  ): AcademicCycleItem {
    const modelId = String(
      row.academicModelId ??
        row.academic_model_id ??
        row.academicModel?.id ??
        fallbackModel?.id ??
        ''
    );
    const matchedModel = this.academicModels.find((model) => model.id === modelId) ?? fallbackModel;
    const modelLabel =
      matchedModel?.label ||
      (row.academicModel
        ? this.buildModelLabel(row.academicModel.code, row.academicModel.name, row.academicModel.version)
        : '') ||
      '--';

    return {
      id: String(row.id ?? crypto.randomUUID()),
      code: (row.code ?? '').trim(),
      name: (row.name ?? '').trim(),
      academicModelId: modelId,
      academicModelLabel: modelLabel,
      durationYears: row.durationYears ?? row.duration_years ?? 0,
      description: row.description?.trim() || undefined,
      displayOrder: this.readDisplayOrder(row),
      status: this.resolveStatusFromRow(row)
    };
  }

  private readDisplayOrder(row: AcademicCycleApiResponse): number | null {
    const record = row as Record<string, unknown>;
    const value = record['displayOrder'] ?? record['display_order'];

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resolveStatusFromRow(row: Partial<AcademicCycleApiResponse>): CycleStatus {
    const active = row.active ?? row.isActive ?? row.is_active;
    return this.resolveStatus(active);
  }

  private resolveStatus(active: unknown): CycleStatus {
    if (active === false || active === 'false' || active === 0 || active === '0') {
      return 'Inactif';
    }
    if (active === true || active === 'true' || active === 1 || active === '1') {
      return 'Actif';
    }
    return 'Actif';
  }

  private buildModelLabel(code?: string, name?: string, version?: string | number): string {
    const normalizedCode = (code || '').replace(/_/g, ' ').trim();
    if (normalizedCode && version) {
      return `${normalizedCode} ${version}`.trim();
    }
    return normalizedCode || (name || '').trim() || 'Modele';
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
