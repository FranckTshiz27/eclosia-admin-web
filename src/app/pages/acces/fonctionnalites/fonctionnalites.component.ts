import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import {
  CreateFeatureDto,
  FeatureAction,
  FeatureApiResponse,
  FeatureService
} from '../../../services/feature.service';
import {
  SecurityModuleApiResponse,
  SecurityModuleService
} from '../../../services/security-module.service';

type StatusLabel = 'Actif' | 'Inactif';
type SystemLabel = 'Système' | 'Personnalisé';

interface SelectOption {
  id: string;
  label: string;
  code: string;
}

interface FeatureItem {
  id: string;
  moduleId: string;
  moduleLabel: string;
  action: FeatureAction;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  status: StatusLabel;
  systemLabel: SystemLabel;
  systemFeature: boolean;
}

interface FeatureForm {
  moduleId: string;
  moduleIds: string[];
  action: FeatureAction | '';
  actions: FeatureAction[];
  name: string;
  description: string;
  displayOrder: string;
  status: StatusLabel;
  systemFeature: boolean;
}

interface PlannedCouple {
  moduleId: string;
  moduleLabel: string;
  action: FeatureAction;
  actionLabel: string;
  name: string;
}

@Component({
  selector: 'app-fonctionnalites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fonctionnalites.component.html',
  styleUrl: './fonctionnalites.component.css'
})
export class FonctionnalitesComponent implements OnInit {
  searchTerm = '';
  moduleFilter = 'all';
  actionFilter = 'all';
  statusFilter = 'all';
  systemFilter = 'all';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  isLoadingLookups = false;
  isLoadingRows = false;
  saveError = '';
  saveSuccess = '';
  loadError = '';
  modulesLoadError = '';

  modules: SelectOption[] = [];
  rows: FeatureItem[] = [];
  form: FeatureForm = this.createEmptyForm();

  readonly actionOptions: Array<{ value: FeatureAction; label: string; shortLabel: string }> = [
    { value: 'VIEW', label: 'VIEW — Consulter', shortLabel: 'Consulter' },
    { value: 'CREATE', label: 'CREATE — Créer', shortLabel: 'Créer' },
    { value: 'UPDATE', label: 'UPDATE — Modifier', shortLabel: 'Modifier' },
    { value: 'DELETE', label: 'DELETE — Supprimer', shortLabel: 'Supprimer' },
    { value: 'IMPORT', label: 'IMPORT — Importer', shortLabel: 'Importer' },
    { value: 'EXPORT', label: 'EXPORT — Exporter', shortLabel: 'Exporter' },
    { value: 'VALIDATE', label: 'VALIDATE — Valider', shortLabel: 'Valider' },
    { value: 'PUBLISH', label: 'PUBLISH — Publier', shortLabel: 'Publier' },
    { value: 'PRINT', label: 'PRINT — Imprimer', shortLabel: 'Imprimer' },
    { value: 'DOWNLOAD', label: 'DOWNLOAD — Télécharger', shortLabel: 'Télécharger' },
    { value: 'ASSIGN', label: 'ASSIGN — Assigner', shortLabel: 'Assigner' },
    { value: 'UNASSIGN', label: 'UNASSIGN — Désassigner', shortLabel: 'Désassigner' },
    { value: 'ACTIVATE', label: 'ACTIVATE — Activer', shortLabel: 'Activer' },
    { value: 'DEACTIVATE', label: 'DEACTIVATE — Désactiver', shortLabel: 'Désactiver' },
    { value: 'APPROVE', label: 'APPROVE — Approuver', shortLabel: 'Approuver' },
    { value: 'REJECT', label: 'REJECT — Rejeter', shortLabel: 'Rejeter' },
    {
      value: 'RESET_PASSWORD',
      label: 'RESET_PASSWORD — Réinitialiser mot de passe',
      shortLabel: 'Réinitialiser mot de passe'
    }
  ];

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  readonly systemOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Système', label: 'Système' },
    { value: 'Personnalisé', label: 'Personnalisé' }
  ];

  private modulesById = new Map<string, string>();
  private moduleCodesById = new Map<string, string>();

  constructor(
    private readonly featureService: FeatureService,
    private readonly securityModuleService: SecurityModuleService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get filteredRows(): FeatureItem[] {
    const term = this.normalize(this.searchTerm);
    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.name).includes(term) ||
        this.normalize(row.code).includes(term) ||
        this.normalize(row.action).includes(term) ||
        this.normalize(row.moduleLabel).includes(term) ||
        this.normalize(row.description).includes(term);

      const matchesModule =
        this.moduleFilter === 'all' || this.sameId(row.moduleId, this.moduleFilter);
      const matchesAction = this.actionFilter === 'all' || row.action === this.actionFilter;
      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;
      const matchesSystem =
        this.systemFilter === 'all' || row.systemLabel === this.systemFilter;

      return matchesSearch && matchesModule && matchesAction && matchesStatus && matchesSystem;
    });
  }

  get plannedCouples(): PlannedCouple[] {
    if (this.isEditMode) {
      return [];
    }
    const existing = this.existingCoupleKeys();
    const couples: PlannedCouple[] = [];
    for (const moduleId of this.form.moduleIds) {
      const module = this.modules.find((item) => this.sameId(item.id, moduleId));
      if (!module) {
        continue;
      }
      for (const action of this.form.actions) {
        if (existing.has(this.coupleKey(moduleId, action))) {
          continue;
        }
        couples.push({
          moduleId,
          moduleLabel: module.label,
          action,
          actionLabel: this.actionShortLabel(action),
          name: this.buildFeatureName(module.label, action)
        });
      }
    }
    return couples;
  }

  get skippedExistingCount(): number {
    if (this.isEditMode) {
      return 0;
    }
    const existing = this.existingCoupleKeys();
    let skipped = 0;
    for (const moduleId of this.form.moduleIds) {
      for (const action of this.form.actions) {
        if (existing.has(this.coupleKey(moduleId, action))) {
          skipped += 1;
        }
      }
    }
    return skipped;
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.form = this.createEmptyForm();
    if (this.moduleFilter !== 'all') {
      this.form.moduleIds = [this.moduleFilter];
    }
    this.loadModules();
  }

  openEditModal(item: FeatureItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.form = {
      moduleId: item.moduleId,
      moduleIds: [item.moduleId],
      action: item.action,
      actions: [item.action],
      name: item.name,
      description: item.description,
      displayOrder: String(item.displayOrder),
      status: item.status,
      systemFeature: item.systemFeature
    };
    if (!this.modules.length) {
      this.loadModules();
    }
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.createEmptyForm();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.moduleFilter = 'all';
    this.actionFilter = 'all';
    this.statusFilter = 'all';
    this.systemFilter = 'all';
    this.loadRows();
  }

  onModuleFilterChange(): void {
    // Filtrage côté client via filteredRows.
  }

  isModuleSelected(id: string): boolean {
    return this.form.moduleIds.some((item) => this.sameId(item, id));
  }

  toggleModule(id: string): void {
    if (this.isModuleSelected(id)) {
      this.form.moduleIds = this.form.moduleIds.filter((item) => !this.sameId(item, id));
      return;
    }
    this.form.moduleIds = [...this.form.moduleIds, id];
  }

  isActionSelected(action: FeatureAction): boolean {
    return this.form.actions.includes(action);
  }

  toggleAction(action: FeatureAction): void {
    if (this.isActionSelected(action)) {
      this.form.actions = this.form.actions.filter((item) => item !== action);
      return;
    }
    this.form.actions = [...this.form.actions, action];
  }

  selectAllModules(): void {
    this.form.moduleIds = this.modules.map((item) => item.id);
  }

  clearModules(): void {
    this.form.moduleIds = [];
  }

  selectAllActions(): void {
    this.form.actions = this.actionOptions.map((item) => item.value);
  }

  clearActions(): void {
    this.form.actions = [];
  }

  saveFeature(form: NgForm): void {
    this.isSubmitted = true;
    this.saveError = '';
    this.saveSuccess = '';

    if (this.isSaving) {
      return;
    }

    const displayOrder = Number(this.form.displayOrder);
    if (!Number.isFinite(displayOrder) || displayOrder < 0) {
      this.saveError = "L'ordre d'affichage doit être un nombre valide (≥ 0).";
      return;
    }

    if (this.isEditMode) {
      if (!form.valid) {
        form.control.markAllAsTouched();
        return;
      }
      if (!this.form.moduleId || !this.form.action || !this.form.name.trim()) {
        this.saveError = 'Module, action et nom sont obligatoires.';
        return;
      }
      if (!this.editingId) {
        this.saveError = 'Identifiant de la fonctionnalité invalide.';
        return;
      }

      const dto: CreateFeatureDto = {
        moduleId: this.form.moduleId,
        action: this.form.action,
        name: this.form.name.trim(),
        description: this.form.description.trim() || null,
        displayOrder,
        active: this.form.status === 'Actif',
        systemFeature: this.form.systemFeature
      };

      this.isSaving = true;
      this.featureService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.saveSuccess = 'Fonctionnalité mise à jour avec succès.';
          this.closeModal();
          this.loadRows();
        },
        error: (err) => {
          this.isSaving = false;
          this.saveError = extractApiErrorMessage(
            err,
            'Échec de la mise à jour de la fonctionnalité.'
          );
        }
      });
      return;
    }

    if (!this.form.moduleIds.length) {
      this.saveError = 'Sélectionnez au moins un module.';
      return;
    }
    if (!this.form.actions.length) {
      this.saveError = 'Sélectionnez au moins une action.';
      return;
    }

    const couples = this.plannedCouples;
    const skipped = this.skippedExistingCount;
    if (!couples.length) {
      this.saveError =
        skipped > 0
          ? 'Tous les couples module/action sélectionnés existent déjà.'
          : 'Aucun couple module/action à créer.';
      return;
    }

    const dtos: CreateFeatureDto[] = couples.map((couple) => ({
      moduleId: couple.moduleId,
      action: couple.action,
      name: couple.name,
      description: this.form.description.trim() || null,
      displayOrder,
      active: this.form.status === 'Actif',
      systemFeature: this.form.systemFeature
    }));

    this.isSaving = true;
    this.featureService.create(dtos).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess =
          skipped > 0
            ? `${couples.length} fonctionnalité(s) créée(s), ${skipped} couple(s) déjà existant(s) ignoré(s).`
            : `${couples.length} fonctionnalité(s) créée(s) avec succès.`;
        this.closeModal();
        this.loadRows();
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = extractApiErrorMessage(
          err,
          'Échec de la création des fonctionnalités.'
        );
        this.loadRows();
      }
    });
  }

  deleteRow(item: FeatureItem): void {
    if (!item.id) {
      return;
    }
    const confirmed = window.confirm(`Supprimer la fonctionnalité « ${item.name} » ?`);
    if (!confirmed) {
      return;
    }

    this.featureService.delete(item.id).subscribe({
      next: () => {
        this.saveSuccess = 'Fonctionnalité supprimée.';
        this.loadRows();
      },
      error: (err) => {
        this.loadError = extractApiErrorMessage(
          err,
          'Impossible de supprimer cette fonctionnalité.'
        );
      }
    });
  }

  private bootstrapData(): void {
    this.loadModules(() => this.loadRows());
  }

  private loadModules(after?: () => void): void {
    this.isLoadingLookups = true;
    this.modulesLoadError = '';

    this.securityModuleService.getAll().subscribe({
      next: (modules) => {
        this.modulesById.clear();
        this.moduleCodesById.clear();
        this.modules = (modules as SecurityModuleApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '');
            const code = String(row.code ?? '').trim();
            const name = String(row.name ?? '').trim();
            const label = code && name ? `${code} — ${name}` : name || code || 'Module';
            if (id) {
              this.modulesById.set(id.toLowerCase(), label);
              if (code) {
                this.moduleCodesById.set(id.toLowerCase(), code.toLowerCase());
              }
            }
            return { id, label, code };
          })
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.isLoadingLookups = false;
        if (!this.modules.length) {
          this.modulesLoadError =
            'Aucun module disponible. Créez d’abord un module dans ACCÈS → Module.';
        }
        after?.();
      },
      error: (err) => {
        this.modules = [];
        this.isLoadingLookups = false;
        this.modulesLoadError = extractApiErrorMessage(
          err,
          'Impossible de charger les modules.'
        );
        after?.();
      }
    });
  }

  private loadRows(): void {
    this.isLoadingRows = true;
    this.loadError = '';

    this.featureService.getAll().subscribe({
      next: (rows) => {
        this.rows = (rows as FeatureApiResponse[])
          .map((row) => this.mapRow(row))
          .filter((item) => item.id)
          .sort((a, b) => {
            if (a.displayOrder !== b.displayOrder) {
              return a.displayOrder - b.displayOrder;
            }
            return a.name.localeCompare(b.name, 'fr');
          });
        this.isLoadingRows = false;
      },
      error: (err) => {
        this.rows = [];
        this.isLoadingRows = false;
        this.loadError = extractApiErrorMessage(
          err,
          'Impossible de charger les fonctionnalités.'
        );
      }
    });
  }

  private mapRow(row: FeatureApiResponse): FeatureItem {
    const moduleId = String(row.moduleId ?? row.module_id ?? '');
    const action = String(row.action ?? 'VIEW').toUpperCase() as FeatureAction;
    const active = row.active !== false;
    const systemFeature = row.systemFeature === true || row.system_feature === true;
    const displayOrder = Number(row.displayOrder ?? row.display_order ?? 0);
    const moduleLabel = this.modulesById.get(moduleId.toLowerCase()) || '—';
    const moduleCode = this.moduleCodesById.get(moduleId.toLowerCase()) || 'module';
    const code =
      String(row.code ?? '').trim() || `${moduleCode}.${action.toLowerCase()}`;

    return {
      id: String(row.id ?? ''),
      moduleId,
      moduleLabel,
      action,
      code,
      name: String(row.name ?? '').trim(),
      description: String(row.description ?? '').trim(),
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      status: active ? 'Actif' : 'Inactif',
      systemLabel: systemFeature ? 'Système' : 'Personnalisé',
      systemFeature
    };
  }

  private buildFeatureName(moduleLabel: string, action: FeatureAction): string {
    const custom = this.form.name.trim();
    const actionLabel = this.actionShortLabel(action);
    if (custom) {
      return `${custom} (${actionLabel})`.slice(0, 150);
    }
    return `${moduleLabel} — ${actionLabel}`.slice(0, 150);
  }

  private actionShortLabel(action: FeatureAction): string {
    return this.actionOptions.find((item) => item.value === action)?.shortLabel || action;
  }

  private existingCoupleKeys(): Set<string> {
    const keys = new Set<string>();
    for (const row of this.rows) {
      keys.add(this.coupleKey(row.moduleId, row.action));
    }
    return keys;
  }

  private coupleKey(moduleId: string, action: string): string {
    return `${String(moduleId).toLowerCase()}::${String(action).toUpperCase()}`;
  }

  private createEmptyForm(): FeatureForm {
    return {
      moduleId: '',
      moduleIds: [],
      action: '',
      actions: [],
      name: '',
      description: '',
      displayOrder: '0',
      status: 'Actif',
      systemFeature: true
    };
  }

  private sameId(left: string | null | undefined, right: string | null | undefined): boolean {
    return String(left ?? '').toLowerCase() === String(right ?? '').toLowerCase();
  }

  private normalize(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
