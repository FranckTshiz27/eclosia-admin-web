import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  SubjectDomainApiResponse,
  SubjectDomainService
} from '../../../services/subject-domain.service';
import {
  CreateSubjectSubDomainDto,
  SubjectSubDomainApiResponse,
  SubjectSubDomainService
} from '../../../services/subject-sub-domain.service';

type StatusLabel = 'Actif' | 'Inactif';

interface DomainOption {
  id: string;
  code: string;
  name: string;
  label: string;
}

interface SubDomainItem {
  id: string;
  code: string;
  name: string;
  subjectDomainId: string;
  domainLabel: string;
  displayOrder: number;
  status: StatusLabel;
}

interface SubDomainForm {
  subjectDomainId: string;
  code: string;
  name: string;
  displayOrder: string;
  status: StatusLabel;
}

@Component({
  selector: 'app-sous-domaines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sous-domaines.component.html',
  styleUrl: './sous-domaines.component.css'
})
export class SousDomainesComponent implements OnInit {
  searchTerm = '';
  domainFilter = 'all';
  statusFilter = 'all';

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  isLoadingDomains = false;
  isLoadingRows = false;
  loadError = '';
  domainsLoadError = '';

  domains: DomainOption[] = [];
  rows: SubDomainItem[] = [];

  form: SubDomainForm = this.createEmptyForm();

  readonly statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' }
  ];

  constructor(
    private readonly subjectDomainService: SubjectDomainService,
    private readonly subjectSubDomainService: SubjectSubDomainService
  ) {}

  ngOnInit(): void {
    this.bootstrapData();
  }

  get filteredRows(): SubDomainItem[] {
    const term = this.normalize(this.searchTerm);

    return this.rows.filter((row) => {
      const matchesSearch =
        !term ||
        this.normalize(row.name).includes(term) ||
        this.normalize(row.code).includes(term) ||
        this.normalize(row.domainLabel).includes(term);

      const matchesDomain =
        this.domainFilter === 'all' || this.sameId(row.subjectDomainId, this.domainFilter);
      const matchesStatus = this.statusFilter === 'all' || row.status === this.statusFilter;

      return matchesSearch && matchesDomain && matchesStatus;
    });
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.createEmptyForm();
    if (this.domainFilter !== 'all') {
      this.form.subjectDomainId = this.domainFilter;
    } else if (this.domains.length === 1) {
      this.form.subjectDomainId = this.domains[0].id;
    }
  }

  openEditModal(item: SubDomainItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingId = this.toPersistedId(item.id);
    this.isSubmitted = false;
    this.saveError = '';
    this.form = {
      subjectDomainId: item.subjectDomainId,
      code: item.code,
      name: item.name,
      displayOrder: String(item.displayOrder ?? 1),
      status: item.status
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

  saveRow(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving) {
      formRef.control.markAllAsTouched();
      return;
    }

    const subjectDomainId = String(this.form.subjectDomainId ?? '').trim();
    if (!subjectDomainId || subjectDomainId.startsWith('domain-')) {
      this.saveError = 'Veuillez sélectionner un domaine valide.';
      return;
    }

    const knownDomain = this.domains.find((domain) => this.sameId(domain.id, subjectDomainId));
    if (!knownDomain) {
      this.saveError = 'Le domaine sélectionné est introuvable. Rechargez la page puis réessayez.';
      return;
    }

    const displayOrder = Number(this.form.displayOrder);
    if (!Number.isFinite(displayOrder) || displayOrder < 1) {
      this.saveError = "L'ordre d'affichage doit être un entier positif.";
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateSubjectSubDomainDto = {
      subjectDomainId,
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      displayOrder,
      active: this.form.status === 'Actif'
    };

    if (this.isEditMode) {
      if (!this.editingId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre à jour ce sous-domaine: identifiant invalide.';
        return;
      }

      this.subjectSubDomainService.update(this.editingId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadRows(false);
        },
        error: (err) => {
          this.isSaving = false;
          this.saveError = this.extractApiError(
            err,
            "Échec de mise à jour du sous-domaine. Vérifiez l'API puis réessayez."
          );
        }
      });
      return;
    }

    this.subjectSubDomainService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadRows(false);
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = this.extractApiError(
          err,
          "Échec de création du sous-domaine. Vérifiez l'API puis réessayez."
        );
      }
    });
  }

  deleteRow(item: SubDomainItem): void {
    if (!confirm(`Supprimer le sous-domaine "${item.name}" ?`)) {
      return;
    }

    const id = this.toPersistedId(item.id);
    if (!id) {
      return;
    }

    this.subjectSubDomainService.delete(id).subscribe({
      next: () => this.loadRows(false),
      error: () => {
        this.loadError = 'Impossible de supprimer ce sous-domaine.';
      }
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.domainFilter = 'all';
    this.statusFilter = 'all';
  }

  private bootstrapData(): void {
    this.isLoadingDomains = true;
    this.isLoadingRows = true;
    this.domainsLoadError = '';

    this.subjectDomainService.getAll().subscribe({
      next: (domains) => {
        this.domains = domains
          .map((row, index) => this.mapDomainOption(row, index))
          .filter((item) => !!item.id && !item.id.startsWith('domain-'))
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
        this.isLoadingDomains = false;
        if (this.domains.length === 0) {
          this.domainsLoadError = 'Aucun domaine disponible. Créez d’abord un domaine.';
        }
        this.loadRows(true);
      },
      error: () => {
        this.isLoadingDomains = false;
        this.domainsLoadError = 'Impossible de charger la liste des domaines.';
        this.loadRows(true);
      }
    });
  }

  private loadRows(showLoader = true): void {
    if (showLoader) {
      this.isLoadingRows = true;
    }
    this.loadError = '';

    this.subjectSubDomainService.getAll().subscribe({
      next: (rows) => {
        this.rows = rows
          .map((row, index) => this.mapApiToItem(row, index))
          .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'fr'));
        this.isLoadingRows = false;
      },
      error: () => {
        this.isLoadingRows = false;
        this.loadError = 'Impossible de charger la liste des sous-domaines.';
      }
    });
  }

  private mapDomainOption(row: SubjectDomainApiResponse, index: number): DomainOption {
    const id = row.id ? String(row.id) : `domain-${index}`;
    const code = row.code ?? '';
    const name = row.name ?? '';
    return {
      id,
      code,
      name,
      label: code ? `${code} — ${name}` : name || id
    };
  }

  private mapApiToItem(response: SubjectSubDomainApiResponse, index: number): SubDomainItem {
    const subjectDomainId = String(response.subjectDomainId ?? response.subject_domain_id ?? '');
    const domain = this.domains.find((item) => this.sameId(item.id, subjectDomainId));

    return {
      id: response.id ?? `sub-domain-${index}`,
      code: response.code ?? '',
      name: response.name ?? '',
      subjectDomainId,
      domainLabel: domain?.label || '—',
      displayOrder: response.displayOrder ?? response.display_order ?? 1,
      status: response.active === false ? 'Inactif' : 'Actif'
    };
  }

  private extractApiError(err: unknown, fallback: string): string {
    const message = (err as { error?: { message?: string } })?.error?.message;
    return message?.trim() || fallback;
  }

  private createEmptyForm(): SubDomainForm {
    return {
      subjectDomainId: '',
      code: '',
      name: '',
      displayOrder: '1',
      status: 'Actif'
    };
  }

  private toPersistedId(value: string | number): string | null {
    const id = String(value).trim();
    if (!id || id.startsWith('sub-domain-')) {
      return null;
    }
    return id;
  }

  private sameId(left: string | number | undefined | null, right: string | number | undefined | null): boolean {
    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
