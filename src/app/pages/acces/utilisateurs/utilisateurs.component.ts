import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { GroupApiResponse, GroupService } from '../../../services/group.service';
import { RoleApiResponse, RoleService } from '../../../services/role.service';
import { SchoolApiResponse, SchoolService } from '../../../services/school.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserApiResponse,
  UserService
} from '../../../services/user.service';

type StatusLabel = 'Actif' | 'Inactif';

interface SelectOption {
  id: string;
  label: string;
  groupId?: string;
}

interface UserItem {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  groupId: string;
  groupLabel: string;
  roleIds: string[];
  roleLabels: string;
  schoolIds: string[];
  schoolLabels: string;
  status: StatusLabel;
  active: boolean;
}

interface UserForm {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  temporaryPassword: boolean;
  groupId: string;
  roleIds: string[];
  schoolIds: string[];
  status: StatusLabel;
}

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateurs.component.html',
  styleUrl: './utilisateurs.component.css'
})
export class UtilisateursComponent implements OnInit {
  searchTerm = '';
  statusFilter = 'all';
  groupFilter = 'all';
  roleFilter = 'all';
  schoolFilter = 'all';
  roleSearchTerm = '';
  schoolSearchTerm = '';

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

  groups: SelectOption[] = [];
  roles: SelectOption[] = [];
  schools: SelectOption[] = [];
  rows: UserItem[] = [];
  form: UserForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  private groupsById = new Map<string, string>();
  private rolesById = new Map<string, string>();
  private schoolsById = new Map<string, SelectOption>();

  constructor(
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    private readonly roleService: RoleService,
    private readonly schoolService: SchoolService
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

  get filteredSchoolOptions(): SelectOption[] {
    const groupId = this.form.groupId;
    const term = this.normalize(this.schoolSearchTerm);
    return this.schools.filter((item) => {
      const matchesGroup = !groupId || this.sameId(item.groupId, groupId);
      const matchesSearch = !term || this.normalize(item.label).includes(term);
      return matchesGroup && matchesSearch;
    });
  }

  get filteredRows(): UserItem[] {
    const term = this.normalize(this.searchTerm);
    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.username).includes(term) ||
        this.normalize(row.email).includes(term) ||
        this.normalize(row.fullName).includes(term) ||
        this.normalize(row.groupLabel).includes(term) ||
        this.normalize(row.roleLabels).includes(term) ||
        this.normalize(row.schoolLabels).includes(term);

      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;
      const matchesGroup =
        this.groupFilter === 'all' || this.sameId(row.groupId, this.groupFilter);
      const matchesRole =
        this.roleFilter === 'all' ||
        row.roleIds.some((id) => this.sameId(id, this.roleFilter));
      const matchesSchool =
        this.schoolFilter === 'all' ||
        row.schoolIds.some((id) => this.sameId(id, this.schoolFilter));

      return matchesSearch && matchesStatus && matchesGroup && matchesRole && matchesSchool;
    });
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.roleSearchTerm = '';
    this.schoolSearchTerm = '';
    this.form = this.createEmptyForm();
    if (this.groupFilter !== 'all') {
      this.form.groupId = this.groupFilter;
    }
    if (this.roleFilter !== 'all') {
      this.form.roleIds = [this.roleFilter];
    }
    if (this.schoolFilter !== 'all') {
      this.form.schoolIds = [this.schoolFilter];
    }
    this.loadLookups();
  }

  openEditModal(item: UserItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = item.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.roleSearchTerm = '';
    this.schoolSearchTerm = '';
    this.form = {
      username: item.username,
      email: item.email,
      firstName: item.firstName,
      lastName: item.lastName,
      password: '',
      temporaryPassword: true,
      groupId: item.groupId,
      roleIds: [...item.roleIds],
      schoolIds: [...item.schoolIds],
      status: item.status
    };
    if (!this.groups.length || !this.roles.length) {
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
    this.schoolSearchTerm = '';
    this.form = this.createEmptyForm();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.groupFilter = 'all';
    this.roleFilter = 'all';
    this.schoolFilter = 'all';
  }

  onGroupChange(): void {
    const allowed = new Set(
      this.schools
        .filter((item) => this.sameId(item.groupId, this.form.groupId))
        .map((item) => item.id.toLowerCase())
    );
    this.form.schoolIds = this.form.schoolIds.filter((id) => allowed.has(id.toLowerCase()));
    this.schoolSearchTerm = '';
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

  isSchoolSelected(id: string): boolean {
    return this.form.schoolIds.some((item) => this.sameId(item, id));
  }

  toggleSchool(id: string): void {
    if (this.isSchoolSelected(id)) {
      this.form.schoolIds = this.form.schoolIds.filter((item) => !this.sameId(item, id));
      return;
    }
    this.form.schoolIds = [...this.form.schoolIds, id];
  }

  selectAllSchools(): void {
    const visibleIds = this.filteredSchoolOptions.map((item) => item.id);
    const selected = new Set(this.form.schoolIds.map((id) => id.toLowerCase()));
    for (const id of visibleIds) {
      selected.add(id.toLowerCase());
    }
    this.form.schoolIds = this.schools
      .filter((item) => selected.has(item.id.toLowerCase()))
      .map((item) => item.id);
  }

  clearSchools(): void {
    if (!this.schoolSearchTerm.trim() && this.form.groupId) {
      const visible = new Set(this.filteredSchoolOptions.map((item) => item.id.toLowerCase()));
      this.form.schoolIds = this.form.schoolIds.filter((id) => !visible.has(id.toLowerCase()));
      return;
    }
    if (!this.schoolSearchTerm.trim()) {
      this.form.schoolIds = [];
      return;
    }
    const visible = new Set(this.filteredSchoolOptions.map((item) => item.id.toLowerCase()));
    this.form.schoolIds = this.form.schoolIds.filter((id) => !visible.has(id.toLowerCase()));
  }

  saveUser(form: NgForm): void {
    this.isSubmitted = true;
    this.saveError = '';
    this.saveSuccess = '';

    if (this.isSaving) {
      return;
    }

    if (!form.valid) {
      form.control.markAllAsTouched();
      this.saveError = 'Veuillez corriger les champs obligatoires.';
      return;
    }

    if (!this.form.roleIds.length) {
      this.saveError = 'Au moins un rôle est obligatoire.';
      return;
    }

    if (!this.form.groupId && !this.form.schoolIds.length) {
      this.saveError = 'Sélectionnez un groupe ou au moins une école.';
      return;
    }

    if (this.isEditMode) {
      this.updateUser();
      return;
    }

    this.createUser();
  }

  deleteRow(item: UserItem): void {
    if (!item.id) {
      return;
    }
    const confirmed = window.confirm(`Supprimer l’utilisateur « ${item.username} » ?`);
    if (!confirmed) {
      return;
    }

    this.userService.delete(item.id).subscribe({
      next: () => {
        this.saveSuccess = 'Utilisateur supprimé.';
        this.loadRows();
      },
      error: (err) => {
        this.loadError = extractApiErrorMessage(err, 'Impossible de supprimer cet utilisateur.');
      }
    });
  }

  private createUser(): void {
    if (!this.form.password || this.form.password.length < 8) {
      this.saveError = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }

    const dto: CreateUserDto = {
      username: this.form.username.trim(),
      email: this.form.email.trim() || null,
      firstName: this.form.firstName.trim() || null,
      lastName: this.form.lastName.trim() || null,
      password: this.form.password,
      temporaryPassword: this.form.temporaryPassword,
      roleIds: [...this.form.roleIds],
      groupId: this.form.groupId || null,
      schoolIds: this.form.schoolIds.length ? [...this.form.schoolIds] : undefined,
      active: this.form.status === 'Actif'
    };

    this.isSaving = true;
    this.userService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = 'Utilisateur créé avec succès.';
        this.closeModal();
        this.loadRows();
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = extractApiErrorMessage(err, 'Échec de la création de l’utilisateur.');
      }
    });
  }

  private updateUser(): void {
    if (!this.editingId) {
      this.saveError = 'Identifiant utilisateur invalide.';
      return;
    }

    const dto: UpdateUserDto = {
      email: this.form.email.trim() || null,
      firstName: this.form.firstName.trim() || null,
      lastName: this.form.lastName.trim() || null,
      roleIds: [...this.form.roleIds],
      groupId: this.form.groupId || null,
      schoolIds: this.form.schoolIds.length ? [...this.form.schoolIds] : [],
      active: this.form.status === 'Actif'
    };

    this.isSaving = true;
    this.userService.update(this.editingId, dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = 'Utilisateur mis à jour avec succès.';
        this.closeModal();
        this.loadRows();
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = extractApiErrorMessage(err, 'Échec de la mise à jour de l’utilisateur.');
      }
    });
  }

  private bootstrapData(): void {
    this.loadLookups(true);
  }

  private loadLookups(thenLoadRows = false): void {
    this.isLoadingLookups = true;
    this.lookupsError = '';

    forkJoin({
      groups: this.groupService.getAll().pipe(catchError(() => of([]))),
      roles: this.roleService.getAll().pipe(catchError(() => of([]))),
      schools: this.schoolService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ groups, roles, schools }) => {
        this.groupsById.clear();
        this.groups = (groups as GroupApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '').trim();
            const label = String(row.name ?? '').trim() || id;
            if (id) {
              this.groupsById.set(id.toLowerCase(), label);
            }
            return { id, label };
          })
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.rolesById.clear();
        this.roles = (roles as RoleApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '').trim();
            const label =
              [row.code, row.name].filter(Boolean).join(' — ') || String(row.name ?? 'Rôle');
            if (id) {
              this.rolesById.set(id.toLowerCase(), label);
            }
            return { id, label };
          })
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.schoolsById.clear();
        this.schools = (schools as SchoolApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '').trim();
            const groupId = String(row.groupId ?? row.group_id ?? '').trim();
            const label =
              [row.code, row.name].filter(Boolean).join(' — ') || String(row.name ?? 'École');
            const option = { id, label, groupId };
            if (id) {
              this.schoolsById.set(id.toLowerCase(), option);
            }
            return option;
          })
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.isLoadingLookups = false;
        if (thenLoadRows) {
          this.loadRows();
        } else if (this.rows.length) {
          this.rows = this.rows.map((row) => this.enrichLabels(row));
        }
      },
      error: (err) => {
        this.isLoadingLookups = false;
        this.lookupsError = extractApiErrorMessage(
          err,
          'Impossible de charger les groupes, rôles ou écoles.'
        );
        if (thenLoadRows) {
          this.loadRows();
        }
      }
    });
  }

  private loadRows(): void {
    this.isLoadingRows = true;
    this.loadError = '';

    this.userService.getAll().subscribe({
      next: (rows) => {
        this.rows = (rows as UserApiResponse[])
          .map((row) => this.mapRow(row))
          .filter((item) => item.id)
          .sort((a, b) => a.username.localeCompare(b.username, 'fr'));
        this.isLoadingRows = false;
      },
      error: (err) => {
        this.rows = [];
        this.isLoadingRows = false;
        this.loadError = extractApiErrorMessage(err, 'Impossible de charger les utilisateurs.');
      }
    });
  }

  private mapRow(row: UserApiResponse): UserItem {
    const active = row.active !== false;
    const firstName = String(row.firstName ?? row.first_name ?? '').trim();
    const lastName = String(row.lastName ?? row.last_name ?? '').trim();
    const roleIds = this.toIdList(row.roleIds ?? row.role_ids);
    const schoolIds = this.toIdList(row.schoolIds ?? row.school_ids);
    const groupId = String(row.groupId ?? row.group_id ?? '').trim();

    return this.enrichLabels({
      id: String(row.id ?? ''),
      username: String(row.username ?? '').trim(),
      email: String(row.email ?? '').trim(),
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(' '),
      groupId,
      groupLabel: '',
      roleIds,
      roleLabels: '',
      schoolIds,
      schoolLabels: '',
      status: active ? 'Actif' : 'Inactif',
      active
    });
  }

  private enrichLabels(item: UserItem): UserItem {
    return {
      ...item,
      groupLabel: this.groupsById.get(item.groupId.toLowerCase()) || item.groupId || '—',
      roleLabels:
        item.roleIds
          .map((id) => this.rolesById.get(id.toLowerCase()) || id)
          .filter(Boolean)
          .join(', ') || '—',
      schoolLabels:
        item.schoolIds
          .map((id) => this.schoolsById.get(id.toLowerCase())?.label || id)
          .filter(Boolean)
          .join(', ') || '—'
    };
  }

  private toIdList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  private createEmptyForm(): UserForm {
    return {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      temporaryPassword: true,
      groupId: '',
      roleIds: [],
      schoolIds: [],
      status: 'Actif'
    };
  }

  private sameId(a?: string | null, b?: string | null): boolean {
    return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
  }

  private normalize(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
