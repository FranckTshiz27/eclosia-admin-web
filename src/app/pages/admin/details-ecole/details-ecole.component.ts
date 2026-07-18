import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EcoleClassesComponent } from './ecole-classes/ecole-classes.component';
import { EcoleClassroomDesignationsComponent } from './ecole-classroom-designations/ecole-classroom-designations.component';
import { EcoleAcademicYearCurrenciesComponent } from './ecole-academic-year-currencies/ecole-academic-year-currencies.component';
import {
  AcademicModelApiResponse,
  AcademicModelService
} from '../../../services/academic-model.service';
import { SchoolApiResponse, SchoolService } from '../../../services/school.service';
import {
  CreateSchoolAcademicModelDto,
  SchoolAcademicModelApiResponse,
  SchoolAcademicModelService
} from '../../../services/school-academic-model.service';

type DetailsTab =
  | 'devises-annee-scolaire'
  | 'modeles-academiques'
  | 'designations-salles'
  | 'classes'
  | 'enseignants';
type AssociationStatus = 'Actif' | 'Archive';

interface SchoolOption {
  id: string;
  code: string;
  name: string;
  shortName: string;
  active: boolean;
  avatarClass: string;
}

interface AcademicModelOption {
  id: string;
  code: string;
  name: string;
  version: string;
  displayLabel: string;
  active: boolean;
}

interface SchoolModelAssociation {
  id: string;
  schoolId: string;
  modelId: string;
  modelCode: string;
  modelName: string;
  modelVersion: string;
  startDate: string;
  endDate: string;
  status: AssociationStatus;
}

interface AssociationForm {
  modelId: string;
  startDate: string;
  endDate: string;
  status: AssociationStatus;
}

@Component({
  selector: 'app-details-ecole',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EcoleClassesComponent,
    EcoleClassroomDesignationsComponent,
    EcoleAcademicYearCurrenciesComponent
  ],
  templateUrl: './details-ecole.component.html',
  styleUrl: './details-ecole.component.css'
})
export class DetailsEcoleComponent implements OnInit {
  activeTab: DetailsTab = 'modeles-academiques';
  selectedSchoolId = '';
  searchTerm = '';

  isLoadingSchools = false;
  isLoadingModels = false;
  isLoadingAssociations = false;
  schoolLoadError = '';
  modelLoadError = '';
  loadError = '';

  isDrawerOpen = false;
  isEditMode = false;
  editingAssociationId: string | null = null;
  isSubmitted = false;
  isSaving = false;
  saveError = '';

  schools: SchoolOption[] = [];
  academicModels: AcademicModelOption[] = [];
  associations: SchoolModelAssociation[] = [];
  form: AssociationForm = this.buildEmptyForm();

  private modelApiRows: AcademicModelApiResponse[] = [];
  private associationApiRows: SchoolAcademicModelApiResponse[] = [];

  readonly tabs: { id: DetailsTab; label: string; icon: string }[] = [
    { id: 'devises-annee-scolaire', label: 'Devises par annee scolaire', icon: 'bi-currency-exchange' },
    { id: 'modeles-academiques', label: 'Modeles academiques', icon: 'bi-journal-bookmark' },
    { id: 'designations-salles', label: 'Designations salles', icon: 'bi-door-open' },
    { id: 'classes', label: 'Classes', icon: 'bi-easel' },
    { id: 'enseignants', label: 'Enseignants', icon: 'bi-people' }
  ];

  readonly statusFormOptions: AssociationStatus[] = ['Actif', 'Archive'];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schoolService: SchoolService,
    private readonly academicModelService: AcademicModelService,
    private readonly schoolAcademicModelService: SchoolAcademicModelService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab && this.tabs.some((item) => item.id === tab)) {
        this.activeTab = tab as DetailsTab;
      }
    });
    this.bootstrapData();
  }

  get selectedSchool(): SchoolOption | undefined {
    return this.schools.find((school) => school.id === this.selectedSchoolId);
  }

  get activeTabLabel(): string {
    return this.tabs.find((tab) => tab.id === this.activeTab)?.label ?? '';
  }

  get academicModelFormOptions(): AcademicModelOption[] {
    const editingModelId = this.isEditMode
      ? this.associations.find((association) => association.id === this.editingAssociationId)?.modelId
      : undefined;

    return this.academicModels.filter(
      (model) =>
        model.active || (editingModelId ? this.sameId(model.id, editingModelId) : false)
    );
  }

  get filteredAssociations(): SchoolModelAssociation[] {
    const term = this.normalize(this.searchTerm);
    const rows = [...this.associations].sort(
      (a, b) => this.parseDate(b.startDate).getTime() - this.parseDate(a.startDate).getTime()
    );

    if (!term) {
      return rows;
    }

    return rows.filter(
      (association) =>
        this.normalize(association.modelCode).includes(term) ||
        this.normalize(association.modelName).includes(term) ||
        this.normalize(association.modelVersion).includes(term)
    );
  }

  setActiveTab(tab: DetailsTab): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onSchoolChange(): void {
    this.searchTerm = '';
    this.loadAssociations(true);
  }

  openCreateDrawer(): void {
    this.isDrawerOpen = true;
    this.isEditMode = false;
    this.editingAssociationId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  openEditDrawer(association: SchoolModelAssociation): void {
    this.isDrawerOpen = true;
    this.isEditMode = true;
    this.editingAssociationId = association.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.toFormFields(association);
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.isEditMode = false;
    this.editingAssociationId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.form = this.buildEmptyForm();
  }

  deleteAssociation(association: SchoolModelAssociation): void {
    if (!confirm(`Retirer le modele "${association.modelCode}" de cette ecole ?`)) {
      return;
    }

    this.schoolAcademicModelService.delete(association.id).subscribe({
      next: () => this.loadAssociations(false),
      error: () => {
        this.loadError = 'Echec de suppression de l association.';
      }
    });
  }

  saveAssociation(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving || !this.selectedSchoolId) {
      formRef.control.markAllAsTouched();
      return;
    }

    const model = this.findModelOption(this.form.modelId);
    if (!model) {
      this.saveError = 'Veuillez selectionner un modele academique valide.';
      return;
    }

    const startDate = this.form.startDate.trim();
    if (!startDate) {
      this.saveError = 'La date de debut est obligatoire.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const dto: CreateSchoolAcademicModelDto = {
      schoolId: this.selectedSchoolId,
      academicModelId: model.id,
      startDate,
      endDate: this.form.endDate.trim() || undefined,
      active: this.form.status === 'Actif'
    };

    if (this.isEditMode) {
      if (!this.editingAssociationId) {
        this.isSaving = false;
        this.saveError = 'Impossible de mettre a jour cette association: identifiant invalide.';
        return;
      }

      this.schoolAcademicModelService.update(this.editingAssociationId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeDrawer();
          this.loadAssociations(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour de l association. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.schoolAcademicModelService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeDrawer();
        this.loadAssociations(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation de l association. Verifiez l'API puis reessayez.";
      }
    });
  }

  formatDisplayDate(value: string): string {
    return value || '—';
  }

  private bootstrapData(): void {
    this.isLoadingModels = true;
    this.modelLoadError = '';

    this.academicModelService.getAll().subscribe({
      next: (rows) => {
        this.modelApiRows = rows;
        this.remapAcademicModels();
        this.isLoadingModels = false;

        if (this.academicModels.length === 0) {
          this.modelLoadError = 'Aucun modele academique recu depuis l API.';
        }

        this.loadSchools();
      },
      error: () => {
        this.isLoadingModels = false;
        this.modelLoadError = 'Impossible de charger les modeles academiques.';
        this.loadSchools();
      }
    });
  }

  private loadSchools(): void {
    this.isLoadingSchools = true;
    this.schoolLoadError = '';

    this.schoolService.getAll().subscribe({
      next: (rows) => {
        this.schools = rows
          .map((row, index) => this.mapSchoolOption(row, index))
          .filter((school) => school.id)
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

        if (!this.selectedSchoolId || !this.schools.some((school) => school.id === this.selectedSchoolId)) {
          this.selectedSchoolId = this.schools[0]?.id ?? '';
        }

        this.isLoadingSchools = false;
        this.loadAssociations(false);
      },
      error: () => {
        this.isLoadingSchools = false;
        this.schoolLoadError = 'Impossible de charger la liste des ecoles.';
      }
    });
  }

  private loadAcademicModels(showLoader = true): void {
    if (showLoader) {
      this.isLoadingModels = true;
    }
    this.modelLoadError = '';

    this.academicModelService.getAll().subscribe({
      next: (rows) => {
        this.modelApiRows = rows;
        this.remapAcademicModels();
        this.isLoadingModels = false;

        if (this.academicModels.length === 0) {
          this.modelLoadError = 'Aucun modele academique recu depuis l API.';
        }
      },
      error: () => {
        this.isLoadingModels = false;
        this.modelLoadError = 'Impossible de charger les modeles academiques.';
      }
    });
  }

  private remapAcademicModels(): void {
    this.academicModels = this.modelApiRows
      .map((row) => this.mapAcademicModelOption(row))
      .filter((model) => model.id)
      .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel, 'fr'));

    this.remapAssociations();
  }

  private remapAssociations(): void {
    this.associations = this.associationApiRows
      .map((row) => this.mapApiAssociationToItem(row))
      .filter((association) => association.id)
      .sort(
        (a, b) => this.parseDate(b.startDate).getTime() - this.parseDate(a.startDate).getTime()
      );
  }

  private loadAssociations(showLoader = true): void {
    if (!this.selectedSchoolId) {
      this.associationApiRows = [];
      this.associations = [];
      return;
    }

    if (showLoader) {
      this.isLoadingAssociations = true;
    }
    this.loadError = '';

    this.schoolAcademicModelService.getAll({ schoolId: this.selectedSchoolId }).subscribe({
      next: (rows) => {
        this.associationApiRows = rows;
        this.remapAssociations();
        this.isLoadingAssociations = false;
      },
      error: () => {
        this.isLoadingAssociations = false;
        this.loadError = 'Impossible de charger les modeles associes a cette ecole.';
      }
    });
  }

  private mapApiAssociationToItem(row: SchoolAcademicModelApiResponse): SchoolModelAssociation {
    const modelId = String(row.academicModelId ?? row.academic_model_id ?? '');
    const model = this.findModelOption(modelId);
    const startDateRaw = row.startDate ?? row.start_date ?? '';
    const endDateRaw = row.endDate ?? row.end_date ?? '';

    return {
      id: String(row.id ?? ''),
      schoolId: String(row.schoolId ?? row.school_id ?? this.selectedSchoolId),
      modelId,
      modelCode: model?.code ?? '--',
      modelName: model?.name ?? 'Modele inconnu',
      modelVersion: model?.version ?? '',
      startDate: this.formatDateForDisplay(String(startDateRaw)),
      endDate: endDateRaw ? this.formatDateForDisplay(String(endDateRaw)) : '',
      status: this.resolveStatus(row.active)
    };
  }

  private findModelOption(modelId: string): AcademicModelOption | undefined {
    return this.academicModels.find((item) => this.sameId(item.id, modelId));
  }

  private mapSchoolOption(row: SchoolApiResponse, index: number): SchoolOption {
    const name = (row.name ?? '').trim() || 'Ecole sans nom';

    return {
      id: String(row.id ?? ''),
      code: (row.code ?? '').trim(),
      name,
      shortName: (row.shortName ?? '').trim() || this.makeInitials(name),
      active: this.isActive(row.active),
      avatarClass: this.pickAvatarClass(index)
    };
  }

  private mapAcademicModelOption(row: AcademicModelApiResponse): AcademicModelOption {
    const code = (row.code ?? '').trim();
    const name = (row.name ?? '').trim();
    const version = this.readModelVersion(row);
    const versionLabel = version ? `(Version ${version})` : '';

    return {
      id: String(row.id ?? ''),
      code,
      name,
      version,
      displayLabel: [code, name, versionLabel].filter(Boolean).join(' - '),
      active: this.isActive(row.active)
    };
  }

  private readModelVersion(row: AcademicModelApiResponse): string {
    const versionValue = row.version;
    if (versionValue !== null && versionValue !== undefined && String(versionValue).trim()) {
      return String(versionValue).trim();
    }
    return '';
  }

  private buildEmptyForm(): AssociationForm {
    const defaultModel = this.academicModelFormOptions[0]?.id ?? this.academicModels[0]?.id ?? '';
    return {
      modelId: defaultModel,
      startDate: this.toInputDate(new Date()),
      endDate: '',
      status: 'Actif'
    };
  }

  private toFormFields(association: SchoolModelAssociation): AssociationForm {
    return {
      modelId: association.modelId,
      startDate: this.toInputDateFromDisplay(association.startDate),
      endDate: association.endDate ? this.toInputDateFromDisplay(association.endDate) : '',
      status: association.status
    };
  }

  private resolveStatus(active: unknown): AssociationStatus {
    if (active === false || active === 'false' || active === 0 || active === '0') {
      return 'Archive';
    }
    return 'Actif';
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toInputDateFromDisplay(value: string): string {
    const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (displayMatch) {
      return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
    }
    return value;
  }

  private formatDateForDisplay(value: string): string {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!isoMatch) {
      return value;
    }
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  private parseDate(value: string): Date {
    const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (displayMatch) {
      return new Date(Number(displayMatch[3]), Number(displayMatch[2]) - 1, Number(displayMatch[1]));
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }

  private makeInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'EC';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  private pickAvatarClass(index: number): string {
    const classes = ['avatar-blue', 'avatar-green', 'avatar-purple', 'avatar-orange'];
    return classes[index % classes.length];
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private isActive(active: unknown): boolean {
    return active !== false && active !== 'false' && active !== 0 && active !== '0';
  }

  private sameId(left: string, right: string): boolean {
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }
}
