import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import {
  FeatureApiResponse,
  FeatureService
} from '../../../services/feature.service';
import {
  CreateRoleFeatureDto,
  RoleFeatureApiResponse,
  RoleFeatureService
} from '../../../services/role-feature.service';
import { RoleApiResponse, RoleService } from '../../../services/role.service';
import {
  SecurityModuleApiResponse,
  SecurityModuleService
} from '../../../services/security-module.service';

type StatusLabel = 'Actif' | 'Inactif';

interface SelectOption {
  id: string;
  label: string;
}

interface FeatureOption {
  id: string;
  label: string;
  moduleId: string;
  moduleLabel: string;
  code: string;
  action: string;
}

interface PermissionItem {
  id: string;
  roleId: string;
  roleLabel: string;
  featureId: string;
  featureLabel: string;
  featureCode: string;
  moduleLabel: string;
  status: StatusLabel;
  active: boolean;
}

interface PermissionForm {
  roleIds: string[];
  featureIds: string[];
  roleId: string;
  featureId: string;
  status: StatusLabel;
}

interface PlannedCouple {
  roleId: string;
  roleLabel: string;
  featureId: string;
  featureLabel: string;
}

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.css'
})
export class PermissionsComponent implements OnInit {
  searchTerm = '';
  roleFilter = 'all';
  statusFilter = 'all';
  moduleFilter = 'all';
  featureFilter = 'all';

  roleSearchTerm = '';
  featureSearchTerm = '';
  modalModuleFilter = 'all';

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
  lookupsError = '';

  roles: SelectOption[] = [];
  features: FeatureOption[] = [];
  modules: SelectOption[] = [];
  rows: PermissionItem[] = [];
  form: PermissionForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  private rolesById = new Map<string, string>();
  private featuresById = new Map<string, FeatureOption>();
  private modulesById = new Map<string, string>();

  constructor(
    private readonly roleFeatureService: RoleFeatureService,
    private readonly roleService: RoleService,
    private readonly featureService: FeatureService,
    private readonly securityModuleService: SecurityModuleService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get filteredRoleOptions(): SelectOption[] {
    const term = this.normalize(this.roleSearchTerm);
    if (!term) {
      return this.roles;
    }
    return this.roles.filter((item) => this.normalize(item.label).includes(term));
  }

  get modalFeatureOptions(): FeatureOption[] {
    const term = this.normalize(this.featureSearchTerm);
    return this.features.filter((item) => {
      const matchesModule =
        this.modalModuleFilter === 'all' || this.sameId(item.moduleId, this.modalModuleFilter);
      const matchesSearch =
        !term ||
        this.normalize(item.label).includes(term) ||
        this.normalize(item.code).includes(term) ||
        this.normalize(item.action).includes(term) ||
        this.normalize(item.moduleLabel).includes(term);
      return matchesModule && matchesSearch;
    });
  }

  get filteredRows(): PermissionItem[] {
    const term = this.normalize(this.searchTerm);
    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.roleLabel).includes(term) ||
        this.normalize(row.featureLabel).includes(term) ||
        this.normalize(row.featureCode).includes(term) ||
        this.normalize(row.moduleLabel).includes(term);

      const matchesRole =
        this.roleFilter === 'all' || this.sameId(row.roleId, this.roleFilter);
      const matchesFeature =
        this.featureFilter === 'all' || this.sameId(row.featureId, this.featureFilter);
      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;
      const feature = this.featuresById.get(row.featureId.toLowerCase());
      const matchesModule =
        this.moduleFilter === 'all' ||
        (feature ? this.sameId(feature.moduleId, this.moduleFilter) : false);

      return matchesSearch && matchesRole && matchesFeature && matchesStatus && matchesModule;
    });
  }

  get plannedCouples(): PlannedCouple[] {
    if (this.isEditMode) {
      return [];
    }
    const existing = this.existingCoupleKeys();
    const couples: PlannedCouple[] = [];
    for (const roleId of this.form.roleIds) {
      const roleLabel = this.rolesById.get(roleId.toLowerCase()) || 'Rôle';
      for (const featureId of this.form.featureIds) {
        if (existing.has(this.coupleKey(roleId, featureId))) {
          continue;
        }
        const feature = this.featuresById.get(featureId.toLowerCase());
        couples.push({
          roleId,
          roleLabel,
          featureId,
          featureLabel: feature?.label || featureId
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
    for (const roleId of this.form.roleIds) {
      for (const featureId of this.form.featureIds) {
        if (existing.has(this.coupleKey(roleId, featureId))) {
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
    this.roleSearchTerm = '';
    this.featureSearchTerm = '';
    this.modalModuleFilter = this.moduleFilter !== 'all' ? this.moduleFilter : 'all';
    this.form = this.createEmptyForm();
    if (this.roleFilter !== 'all') {
      this.form.roleIds = [this.roleFilter];
    }
    if (this.featureFilter !== 'all') {
      this.form.featureIds = [this.featureFilter];
    }
    this.loadLookups();
  }

  openEditModal(item: PermissionItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.roleSearchTerm = '';
    this.featureSearchTerm = '';
    this.modalModuleFilter = 'all';
    this.form = {
      roleIds: [item.roleId],
      featureIds: [item.featureId],
      roleId: item.roleId,
      featureId: item.featureId,
      status: item.status
    };
    if (!this.roles.length || !this.features.length) {
      this.loadLookups();
    }
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.roleSearchTerm = '';
    this.featureSearchTerm = '';
    this.modalModuleFilter = 'all';
    this.form = this.createEmptyForm();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.roleFilter = 'all';
    this.featureFilter = 'all';
    this.statusFilter = 'all';
    this.moduleFilter = 'all';
  }

  isRoleSelected(id: string): boolean {
    return this.form.roleIds.some((item) => this.sameId(item, id));
  }

  toggleRole(id: string): void {
    if (this.isRoleSelected(id)) {
      this.form.roleIds = this.form.roleIds.filter((item) => !this.sameId(item, id));
      return;
    }
    this.form.roleIds = [...this.form.roleIds, id];
  }

  isFeatureSelected(id: string): boolean {
    return this.form.featureIds.some((item) => this.sameId(item, id));
  }

  toggleFeature(id: string): void {
    if (this.isFeatureSelected(id)) {
      this.form.featureIds = this.form.featureIds.filter((item) => !this.sameId(item, id));
      return;
    }
    this.form.featureIds = [...this.form.featureIds, id];
  }

  selectAllRoles(): void {
    const visibleIds = this.filteredRoleOptions.map((item) => item.id);
    const selected = new Set(this.form.roleIds.map((id) => id.toLowerCase()));
    for (const id of visibleIds) {
      selected.add(id.toLowerCase());
    }
    this.form.roleIds = this.roles
      .filter((item) => selected.has(item.id.toLowerCase()))
      .map((item) => item.id);
  }

  clearRoles(): void {
    if (!this.roleSearchTerm.trim()) {
      this.form.roleIds = [];
      return;
    }
    const visible = new Set(this.filteredRoleOptions.map((item) => item.id.toLowerCase()));
    this.form.roleIds = this.form.roleIds.filter((id) => !visible.has(id.toLowerCase()));
  }

  selectAllFeatures(): void {
    const visibleIds = this.modalFeatureOptions.map((item) => item.id);
    const selected = new Set(this.form.featureIds.map((id) => id.toLowerCase()));
    for (const id of visibleIds) {
      selected.add(id.toLowerCase());
    }
    this.form.featureIds = this.features
      .filter((item) => selected.has(item.id.toLowerCase()))
      .map((item) => item.id);
  }

  clearFeatures(): void {
    if (!this.featureSearchTerm.trim() && this.modalModuleFilter === 'all') {
      this.form.featureIds = [];
      return;
    }
    const visible = new Set(this.modalFeatureOptions.map((item) => item.id.toLowerCase()));
    this.form.featureIds = this.form.featureIds.filter((id) => !visible.has(id.toLowerCase()));
  }

  savePermission(form: NgForm): void {
    this.isSubmitted = true;
    this.saveError = '';
    this.saveSuccess = '';

    if (this.isSaving) {
      return;
    }

    if (this.isEditMode) {
      if (!form.valid || !this.form.roleId || !this.form.featureId) {
        form.control.markAllAsTouched();
        this.saveError = 'Rôle et fonctionnalité sont obligatoires.';
        return;
      }
      if (!this.editingId) {
        this.saveError = 'Identifiant de permission invalide.';
        return;
      }

      const dto: CreateRoleFeatureDto = {
        roleId: this.form.roleId,
        featureId: this.form.featureId,
        active: this.form.status === 'Actif'
      };

      this.isSaving = true;
      this.roleFeatureService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.saveSuccess = 'Permission mise à jour avec succès.';
          this.closeModal();
          this.loadRows();
        },
        error: (err) => {
          this.isSaving = false;
          this.saveError = extractApiErrorMessage(err, 'Échec de la mise à jour.');
        }
      });
      return;
    }

    if (!this.form.roleIds.length) {
      this.saveError = 'Sélectionnez au moins un rôle.';
      return;
    }
    if (!this.form.featureIds.length) {
      this.saveError = 'Sélectionnez au moins une fonctionnalité.';
      return;
    }

    const couples = this.plannedCouples;
    const skipped = this.skippedExistingCount;
    if (!couples.length) {
      this.saveError =
        skipped > 0
          ? 'Tous les couples rôle/fonctionnalité sélectionnés existent déjà.'
          : 'Aucun couple à créer.';
      return;
    }

    const dtos: CreateRoleFeatureDto[] = couples.map((couple) => ({
      roleId: couple.roleId,
      featureId: couple.featureId,
      active: this.form.status === 'Actif'
    }));

    this.isSaving = true;
    this.roleFeatureService.create(dtos).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess =
          skipped > 0
            ? `${couples.length} permission(s) créée(s), ${skipped} couple(s) déjà existant(s) ignoré(s).`
            : `${couples.length} permission(s) créée(s) avec succès.`;
        this.closeModal();
        this.loadRows();
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = extractApiErrorMessage(err, 'Échec de la création des permissions.');
        this.loadRows();
      }
    });
  }

  deleteRow(item: PermissionItem): void {
    if (!item.id) {
      return;
    }
    const confirmed = window.confirm(
      `Retirer la permission « ${item.featureLabel} » du rôle « ${item.roleLabel} » ?`
    );
    if (!confirmed) {
      return;
    }

    this.roleFeatureService.delete(item.id).subscribe({
      next: () => {
        this.saveSuccess = 'Permission supprimée.';
        this.loadRows();
      },
      error: (err) => {
        this.loadError = extractApiErrorMessage(err, 'Impossible de supprimer cette permission.');
      }
    });
  }

  private bootstrapData(): void {
    this.loadLookups(() => this.loadRows());
  }

  private loadLookups(after?: () => void): void {
    this.isLoadingLookups = true;
    this.lookupsError = '';

    forkJoin({
      roles: this.roleService.getAll().pipe(catchError(() => of([]))),
      features: this.featureService.getAll().pipe(catchError(() => of([]))),
      modules: this.securityModuleService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ roles, features, modules }) => {
        this.modulesById.clear();
        this.modules = (modules as SecurityModuleApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '');
            const label =
              [row.code, row.name].filter(Boolean).join(' — ') || String(row.name ?? 'Module');
            if (id) {
              this.modulesById.set(id.toLowerCase(), label);
            }
            return { id, label };
          })
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.rolesById.clear();
        this.roles = (roles as RoleApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '');
            const label =
              [row.code, row.name].filter(Boolean).join(' — ') || String(row.name ?? 'Rôle');
            if (id) {
              this.rolesById.set(id.toLowerCase(), label);
            }
            return { id, label };
          })
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.featuresById.clear();
        this.features = (features as FeatureApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '');
            const moduleId = String(row.moduleId ?? row.module_id ?? '');
            const action = String(row.action ?? '').toUpperCase();
            const code = String(row.code ?? '').trim() || action.toLowerCase();
            const name = String(row.name ?? '').trim();
            const moduleLabel = this.modulesById.get(moduleId.toLowerCase()) || 'Module';
            const label = `${moduleLabel} · ${name || code}`;
            const option: FeatureOption = {
              id,
              label,
              moduleId,
              moduleLabel,
              code,
              action
            };
            if (id) {
              this.featuresById.set(id.toLowerCase(), option);
            }
            return option;
          })
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.isLoadingLookups = false;
        if (!this.roles.length || !this.features.length) {
          this.lookupsError =
            'Créez d’abord des rôles et des fonctionnalités avant d’attribuer des permissions.';
        }
        after?.();
      },
      error: () => {
        this.isLoadingLookups = false;
        this.lookupsError = 'Impossible de charger les rôles / fonctionnalités.';
        after?.();
      }
    });
  }

  private loadRows(): void {
    this.isLoadingRows = true;
    this.loadError = '';

    this.roleFeatureService.getAll().subscribe({
      next: (rows) => {
        this.rows = (rows as RoleFeatureApiResponse[])
          .map((row) => this.mapRow(row))
          .filter((item) => item.id)
          .sort((a, b) => {
            const byRole = a.roleLabel.localeCompare(b.roleLabel, 'fr');
            if (byRole !== 0) {
              return byRole;
            }
            return a.featureLabel.localeCompare(b.featureLabel, 'fr');
          });
        this.isLoadingRows = false;
      },
      error: (err) => {
        this.rows = [];
        this.isLoadingRows = false;
        this.loadError = extractApiErrorMessage(err, 'Impossible de charger les permissions.');
      }
    });
  }

  private mapRow(row: RoleFeatureApiResponse): PermissionItem {
    const roleId = String(row.roleId ?? row.role_id ?? '');
    const featureId = String(row.featureId ?? row.feature_id ?? '');
    const feature = this.featuresById.get(featureId.toLowerCase());
    const active = row.active !== false;

    return {
      id: String(row.id ?? ''),
      roleId,
      roleLabel: this.rolesById.get(roleId.toLowerCase()) || '—',
      featureId,
      featureLabel: feature?.label || '—',
      featureCode: feature?.code || '—',
      moduleLabel: feature?.moduleLabel || '—',
      status: active ? 'Actif' : 'Inactif',
      active
    };
  }

  private existingCoupleKeys(): Set<string> {
    const keys = new Set<string>();
    for (const row of this.rows) {
      keys.add(this.coupleKey(row.roleId, row.featureId));
    }
    return keys;
  }

  private coupleKey(roleId: string, featureId: string): string {
    return `${String(roleId).toLowerCase()}::${String(featureId).toLowerCase()}`;
  }

  private createEmptyForm(): PermissionForm {
    return {
      roleIds: [],
      featureIds: [],
      roleId: '',
      featureId: '',
      status: 'Actif'
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
