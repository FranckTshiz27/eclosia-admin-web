import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import {
  CreateRoleDto,
  RoleApiResponse,
  RoleService
} from '../../../services/role.service';

type StatusLabel = 'Actif' | 'Inactif';
type SystemLabel = 'Système' | 'École';

interface RoleItem {
  id: string;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  status: StatusLabel;
  systemLabel: SystemLabel;
  systemRole: boolean;
}

interface RoleForm {
  code: string;
  name: string;
  description: string;
  displayOrder: string;
  status: StatusLabel;
  systemRole: boolean;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css'
})
export class RolesComponent implements OnInit {
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

  rows: RoleItem[] = [];
  form: RoleForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  readonly systemOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Système', label: 'Système (Éclosia)' },
    { value: 'École', label: 'École' }
  ];

  constructor(private readonly roleService: RoleService) {}

  ngOnInit(): void {
    this.loadRows();
  }

  get filteredRows(): RoleItem[] {
    const term = this.normalize(this.searchTerm);
    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.code).includes(term) ||
        this.normalize(row.name).includes(term) ||
        this.normalize(row.description).includes(term);

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

  openEditModal(item: RoleItem): void {
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
      displayOrder: String(item.displayOrder),
      status: item.status,
      systemRole: item.systemRole
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

  saveRole(form: NgForm): void {
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

    const dto: CreateRoleDto = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim(),
      description: this.form.description.trim() || null,
      displayOrder,
      active: this.form.status === 'Actif',
      systemRole: this.form.systemRole
    };

    this.isSaving = true;

    if (this.isEditMode) {
      if (!this.editingId) {
        this.isSaving = false;
        this.saveError = 'Identifiant du rôle invalide.';
        return;
      }
      this.roleService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.saveSuccess = 'Rôle mis à jour avec succès.';
          this.closeModal();
          this.loadRows();
        },
        error: (err) => {
          this.isSaving = false;
          this.saveError = extractApiErrorMessage(err, 'Échec de la mise à jour du rôle.');
        }
      });
      return;
    }

    this.roleService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = 'Rôle créé avec succès.';
        this.closeModal();
        this.loadRows();
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = extractApiErrorMessage(err, 'Échec de la création du rôle.');
      }
    });
  }

  deleteRow(item: RoleItem): void {
    if (!item.id) {
      return;
    }
    const confirmed = window.confirm(`Supprimer le rôle « ${item.name} » ?`);
    if (!confirmed) {
      return;
    }

    this.roleService.delete(item.id).subscribe({
      next: () => {
        this.saveSuccess = 'Rôle supprimé.';
        this.loadRows();
      },
      error: (err) => {
        this.loadError = extractApiErrorMessage(err, 'Impossible de supprimer ce rôle.');
      }
    });
  }

  private loadRows(): void {
    this.isLoadingRows = true;
    this.loadError = '';

    this.roleService.getAll().subscribe({
      next: (rows) => {
        this.rows = (rows as RoleApiResponse[])
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
        this.loadError = extractApiErrorMessage(err, 'Impossible de charger les rôles.');
      }
    });
  }

  private mapRow(row: RoleApiResponse): RoleItem {
    const active = row.active !== false;
    const systemRole = row.systemRole === true || row.system_role === true;
    const displayOrder = Number(row.displayOrder ?? row.display_order ?? 0);

    return {
      id: String(row.id ?? ''),
      code: String(row.code ?? '').trim(),
      name: String(row.name ?? '').trim(),
      description: String(row.description ?? '').trim(),
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      status: active ? 'Actif' : 'Inactif',
      systemLabel: systemRole ? 'Système' : 'École',
      systemRole
    };
  }

  private createEmptyForm(): RoleForm {
    return {
      code: '',
      name: '',
      description: '',
      displayOrder: '0',
      status: 'Actif',
      systemRole: true
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
