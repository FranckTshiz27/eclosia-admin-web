import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CreateGroupDto, GroupApiResponse, GroupService } from '../../../services/group.service';

interface GroupItem {
  id?: string | number;
  logo?: string;
  initials: string;
  avatarClass: string;
  name: string;
  description?: string;
  schools: number;
  email: string;
  phone: string;
  status: 'Actif' | 'Inactif';
  createdAt: string;
}

@Component({
  selector: 'app-groupe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './groupe.component.html',
  styleUrl: './groupe.component.css'
})
export class GroupeComponent implements OnInit {
  isCreateModalOpen = false;
  isSaving = false;
  isSubmitted = false;
  isEditMode = false;
  editingGroupId: string | number | null = null;
  searchTerm = '';
  saveError = '';
  loadError = '';
  isLoadingGroups = false;

  groups: GroupItem[] = [];

  form = this.createEmptyForm();

  constructor(private readonly groupService: GroupService) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  get totalGroups(): number {
    return this.groups.length;
  }

  get activeGroups(): number {
    return this.groups.filter((group) => group.status === 'Actif').length;
  }

  get inactiveGroups(): number {
    return this.groups.filter((group) => group.status === 'Inactif').length;
  }

  get filteredGroups(): GroupItem[] {
    const term = this.normalize(this.searchTerm);
    if (!term) {
      return this.groups;
    }
    return this.groups.filter((group) => this.normalize(group.name).includes(term));
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.editingGroupId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.createEmptyForm();
    this.isCreateModalOpen = true;
  }

  openEditModal(group: GroupItem): void {
    this.isEditMode = true;
    this.editingGroupId = group.id ?? null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = {
      name: group.name,
      logo: group.logo || '',
      email: group.email !== '--' ? group.email : '',
      phone: group.phone !== '--' ? group.phone : '',
      description: group.description || '',
      status: group.status
    };
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isEditMode = false;
    this.editingGroupId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.isCreateModalOpen = false;
    this.form = this.createEmptyForm();
  }

  saveGroup(groupForm: NgForm): void {
    this.isSubmitted = true;
    const name = this.form.name.trim();
    const email = this.form.email.trim();
    if (!groupForm.valid || !name || !email || this.isSaving) {
      groupForm.control.markAllAsTouched();
      return;
    }

    const dto: CreateGroupDto = {
      name,
      logo: this.form.logo.trim() || undefined,
      email,
      phone: this.form.phone.trim() || undefined,
      description: this.form.description.trim() || undefined,
      status: this.form.status
    };

    this.isSaving = true;
    this.saveError = '';

    if (this.isEditMode) {
      if (this.editingGroupId === null || this.editingGroupId === undefined) {
        this.isSaving = false;
        this.saveError = "Impossible de modifier ce groupe: identifiant introuvable.";
        return;
      }

      this.groupService.update(this.editingGroupId, dto).subscribe({
        next: () => {
          this.closeCreateModal();
          this.isSaving = false;
          this.loadGroups(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour du groupe. Verifiez l'API gateway et reessayez.";
        }
      });
      return;
    }

    this.groupService.create(dto).subscribe({
      next: (createdGroup) => {
        this.closeCreateModal();
        this.isSaving = false;
        this.groups = [this.toViewModel(createdGroup), ...this.groups];
        this.loadGroups(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation du groupe. Verifiez l'API gateway et reessayez.";
      }
    });
  }

  private createEmptyForm() {
    return {
      name: '',
      logo: '',
      email: '',
      phone: '',
      description: '',
      status: 'Actif' as 'Actif' | 'Inactif'
    };
  }

  private toViewModel(group: GroupApiResponse): GroupItem {
    const name = (group.name || '').trim();
    const createdAt = group.createdAt || group.created_at || group.dateCreation || this.formatToday();
    const status = this.getUiStatus(group);

    return {
      id: group.id,
      logo: group.logo || undefined,
      initials: this.makeInitials(name),
      avatarClass: this.pickAvatarClass(this.groups.length),
      name: name || 'Nouveau groupe',
      description: group.description || '',
      schools: Number.isFinite(group.schools) ? Number(group.schools) : 1,
      email: (group.email || '').trim() || '--',
      phone: (group.phone || '').trim() || '--',
      status,
      createdAt
    };
  }

  private getUiStatus(group: GroupApiResponse): 'Actif' | 'Inactif' {
    if (typeof group.status === 'boolean') {
      return group.status ? 'Actif' : 'Inactif';
    }
    if (typeof group.active === 'boolean') {
      return group.active ? 'Actif' : 'Inactif';
    }
    if (typeof group.isActive === 'boolean') {
      return group.isActive ? 'Actif' : 'Inactif';
    }
    return group.status === 'Inactif' ? 'Inactif' : 'Actif';
  }

  private loadGroups(showLoader = true): void {
    if (showLoader) {
      this.isLoadingGroups = true;
    }
    this.loadError = '';

    this.groupService.getAll().subscribe({
      next: (groups) => {
        this.groups = groups.map((group, index) => this.toViewModelWithIndex(group, index));
        this.isLoadingGroups = false;
      },
      error: () => {
        this.isLoadingGroups = false;
        this.loadError = "Impossible de charger la liste des groupes depuis l'API.";
      }
    });
  }

  private toViewModelWithIndex(group: GroupApiResponse, index: number): GroupItem {
    const viewModel = this.toViewModel(group);
    return {
      ...viewModel,
      avatarClass: this.pickAvatarClass(index)
    };
  }

  private makeInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NG';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  private pickAvatarClass(index: number): string {
    const classes = ['avatar-blue', 'avatar-green', 'avatar-purple', 'avatar-orange', 'avatar-cyan', 'avatar-pink'];
    return classes[index % classes.length];
  }

  private formatToday(): string {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return formatter.format(new Date()).replace('.', '');
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
