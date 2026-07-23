import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { P } from '../../../core/permissions/permission.catalog';
import {
  CreateSecurityModuleDto,
  SecurityModuleApiResponse,
  SecurityModuleService
} from '../../../services/security-module.service';

type StatusLabel = 'Actif' | 'Inactif';
type SystemLabel = 'Système' | 'Personnalisé';

interface ModuleItem {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
  status: StatusLabel;
  systemLabel: SystemLabel;
  systemModule: boolean;
}

interface ModuleForm {
  code: string;
  name: string;
  description: string;
  icon: string;
  displayOrder: string;
  status: StatusLabel;
  systemModule: boolean;
}

@Component({
  selector: 'app-modules',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective],
  templateUrl: './modules.component.html',
  styleUrl: './modules.component.css'
})
export class ModulesComponent implements OnInit {
  readonly P = P;
  searchTerm = '';
  statusFilter = 'all';
  systemFilter = 'all';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  isLoadingRows = false;
  saveError = '';
  saveSuccess = '';
  loadError = '';

  rows: ModuleItem[] = [];
  form: ModuleForm = this.createEmptyForm();

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

  constructor(private readonly securityModuleService: SecurityModuleService) {}

  ngOnInit(): void {
    this.loadRows();
  }

  get filteredRows(): ModuleItem[] {
    const term = this.normalize(this.searchTerm);
    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.code).includes(term) ||
        this.normalize(row.name).includes(term) ||
        this.normalize(row.description).includes(term) ||
        this.normalize(row.icon).includes(term);

      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;
      const matchesSystem =
        this.systemFilter === 'all' || row.systemLabel === this.systemFilter;

      return matchesSearch && matchesStatus && matchesSystem;
    });
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.form = this.createEmptyForm();
  }

  openEditModal(item: ModuleItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.form = {
      code: item.code,
      name: item.name,
      description: item.description,
      icon: item.icon,
      displayOrder: String(item.displayOrder),
      status: item.status,
      systemModule: item.systemModule
    };
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
    this.statusFilter = 'all';
    this.systemFilter = 'all';
  }

  saveModule(form: NgForm): void {
    this.isSubmitted = true;
    this.saveError = '';
    this.saveSuccess = '';

    if (!form.valid || this.isSaving) {
      form.control.markAllAsTouched();
      return;
    }

    const displayOrder = Number(this.form.displayOrder);
    if (!Number.isFinite(displayOrder) || displayOrder < 0) {
      this.saveError = "L'ordre d'affichage doit être un nombre valide (≥ 0).";
      return;
    }

    const dto: CreateSecurityModuleDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      description: this.form.description.trim() || null,
      icon: this.form.icon.trim() || null,
      displayOrder,
      active: this.form.status === 'Actif',
      systemModule: this.form.systemModule
    };

    this.isSaving = true;

    if (this.isEditMode) {
      if (!this.editingId) {
        this.isSaving = false;
        this.saveError = 'Identifiant du module invalide.';
        return;
      }
      this.securityModuleService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.saveSuccess = 'Module mis à jour avec succès.';
          this.closeModal();
          this.loadRows();
        },
        error: (err) => {
          this.isSaving = false;
          this.saveError = extractApiErrorMessage(err, 'Échec de la mise à jour du module.');
        }
      });
      return;
    }

    this.securityModuleService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = 'Module créé avec succès.';
        this.closeModal();
        this.loadRows();
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = extractApiErrorMessage(err, 'Échec de la création du module.');
      }
    });
  }

  deleteRow(item: ModuleItem): void {
    if (!item.id) {
      return;
    }
    const confirmed = window.confirm(`Supprimer le module « ${item.name} » ?`);
    if (!confirmed) {
      return;
    }

    this.securityModuleService.delete(item.id).subscribe({
      next: () => {
        this.saveSuccess = 'Module supprimé.';
        this.loadRows();
      },
      error: (err) => {
        this.loadError = extractApiErrorMessage(err, 'Impossible de supprimer ce module.');
      }
    });
  }

  private loadRows(): void {
    this.isLoadingRows = true;
    this.loadError = '';

    this.securityModuleService.getAll().subscribe({
      next: (rows) => {
        this.rows = (rows as SecurityModuleApiResponse[])
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
        this.loadError = extractApiErrorMessage(err, 'Impossible de charger les modules.');
      }
    });
  }

  private mapRow(row: SecurityModuleApiResponse): ModuleItem {
    const active = row.active !== false;
    const systemModule = row.systemModule === true || row.system_module === true;
    const displayOrder = Number(row.displayOrder ?? row.display_order ?? 0);

    return {
      id: String(row.id ?? ''),
      code: String(row.code ?? '').trim(),
      name: String(row.name ?? '').trim(),
      description: String(row.description ?? '').trim(),
      icon: String(row.icon ?? '').trim(),
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      status: active ? 'Actif' : 'Inactif',
      systemLabel: systemModule ? 'Système' : 'Personnalisé',
      systemModule
    };
  }

  private createEmptyForm(): ModuleForm {
    return {
      code: '',
      name: '',
      description: '',
      icon: '',
      displayOrder: '0',
      status: 'Actif',
      systemModule: true
    };
  }

  private normalize(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
