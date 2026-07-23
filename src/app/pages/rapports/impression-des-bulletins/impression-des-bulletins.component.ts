import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import {
  AcademicCycleApiResponse,
  AcademicCycleService
} from '../../../services/academic-cycle.service';
import {
  AcademicLevelApiResponse,
  AcademicLevelService
} from '../../../services/academic-level.service';
import {
  AcademicCurriculumSubjectApiResponse,
  AcademicCurriculumSubjectService
} from '../../../services/academic-curriculum-subject.service';
import {
  AcademicYearApiResponse,
  AcademicYearService
} from '../../../services/academic-year.service';
import {
  ClassroomApiResponse,
  ClassroomService
} from '../../../services/classroom.service';
import {
  EnrollmentApiResponse,
  EnrollmentService,
  resolveEnrollmentStudentIdentity
} from '../../../services/enrollment.service';
import { SchoolApiResponse, SchoolService } from '../../../services/school.service';
import {
  BulletinFormat,
  BulletinPrintRequestDto,
  BulletinPrintMode,
  BulletinReportService,
  BulletinSortBy
} from '../../../services/bulletin-report.service';

type PrintScope = 'school' | 'classes' | 'cycle' | 'student';

interface SelectOption {
  id: string;
  label: string;
}

interface StudentOption {
  id: string;
  label: string;
  matricule: string;
  classroomId: string;
  classroomLabel: string;
  gender: 'M' | 'F' | '—';
  searchText: string;
}

interface ClassroomRow {
  id: string;
  label: string;
  cycleId: string;
  cycleLabel: string;
  selected: boolean;
  effectif: number;
  boys: number;
  girls: number;
}

@Component({
  selector: 'app-impression-des-bulletins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './impression-des-bulletins.component.html',
  styleUrl: './impression-des-bulletins.component.css'
})
export class ImpressionDesBulletinsComponent implements OnInit {
  scope: PrintScope = 'school';
  academicYearId = '';
  schoolId = '';
  cycleId = '';
  studentEnrollmentId = '';
  studentSearch = '';
  bulletinFormat: BulletinFormat = 'OFFICIEL';
  sortBy: BulletinSortBy = 'CLASS_THEN_ALPHABETICAL';

  years: SelectOption[] = [];
  schools: SelectOption[] = [];
  cycles: SelectOption[] = [];
  classroomOptions: SelectOption[] = [];
  selectedClassroomIds: string[] = [];
  studentOptions: StudentOption[] = [];

  classroomRows: ClassroomRow[] = [];
  subjectsEvaluated = 0;

  options = {
    coverPage: false,
    signatures: true,
    studentRank: true,
    classAverages: false
  };

  isLoadingLookups = false;
  isLoadingPreview = false;
  isGenerating = false;
  loadError = '';
  actionMessage = '';
  actionError = '';

  private allClassrooms: Array<{
    id: string;
    label: string;
    cycleId: string;
    cycleLabel: string;
  }> = [];
  private levelsById = new Map<string, AcademicLevelApiResponse>();
  private cyclesById = new Map<string, string>();
  private enrollments: EnrollmentApiResponse[] = [];

  readonly formats: Array<{ id: BulletinFormat; label: string }> = [
    { id: 'OFFICIEL', label: 'Format officiel ÉCLOSIA (A4)' },
    { id: 'COMPACT', label: 'Format compact (A4)' },
    { id: 'DETAILED', label: 'Format détaillé (A4)' }
  ];

  readonly sortOptions: Array<{ id: BulletinSortBy; label: string }> = [
    { id: 'ALPHABETICAL', label: 'Ordre alphabétique des élèves' },
    { id: 'MATRICULE', label: 'Matricule' },
    { id: 'CLASS_THEN_ALPHABETICAL', label: 'Classe puis alphabétique' }
  ];

  constructor(
    private readonly schoolService: SchoolService,
    private readonly academicYearService: AcademicYearService,
    private readonly academicCycleService: AcademicCycleService,
    private readonly academicLevelService: AcademicLevelService,
    private readonly classroomService: ClassroomService,
    private readonly enrollmentService: EnrollmentService,
    private readonly academicCurriculumSubjectService: AcademicCurriculumSubjectService,
    private readonly bulletinReportService: BulletinReportService
  ) {}

  ngOnInit(): void {
    this.bootstrapLookups();
  }

  get selectedClassroomOptions(): SelectOption[] {
    const selected = new Set(this.selectedClassroomIds.map((id) => id.toLowerCase()));
    return this.classroomOptions.filter((option) => selected.has(option.id.toLowerCase()));
  }

  get filteredStudentOptions(): StudentOption[] {
    const term = this.studentSearch.trim().toLowerCase();
    if (!term) {
      return this.studentOptions;
    }
    return this.studentOptions.filter((item) => item.searchText.includes(term));
  }

  get selectedStudent(): StudentOption | null {
    return (
      this.studentOptions.find(
        (item) => item.id.toLowerCase() === this.studentEnrollmentId.toLowerCase()
      ) ?? null
    );
  }

  get canShowPreview(): boolean {
    if (!this.schoolId || !this.academicYearId) {
      return false;
    }
    if (this.scope === 'student') {
      return Boolean(this.studentEnrollmentId);
    }
    if (this.scope === 'classes') {
      return this.selectedClassroomIds.length > 0;
    }
    if (this.scope === 'cycle') {
      return Boolean(this.cycleId);
    }
    return true;
  }

  get selectedRows(): ClassroomRow[] {
    return this.classroomRows.filter((row) => row.selected);
  }

  get totalStudents(): number {
    if (this.scope === 'student') {
      return this.selectedStudent ? 1 : 0;
    }
    return this.selectedRows.reduce((sum, row) => sum + row.effectif, 0);
  }

  get totalClasses(): number {
    if (this.scope === 'student') {
      return this.selectedStudent ? 1 : 0;
    }
    return this.selectedRows.length;
  }

  get totalBoys(): number {
    if (this.scope === 'student') {
      return this.selectedStudent?.gender === 'M' ? 1 : 0;
    }
    return this.selectedRows.reduce((sum, row) => sum + row.boys, 0);
  }

  get totalGirls(): number {
    if (this.scope === 'student') {
      return this.selectedStudent?.gender === 'F' ? 1 : 0;
    }
    return this.selectedRows.reduce((sum, row) => sum + row.girls, 0);
  }

  get totalBulletins(): number {
    return this.totalStudents;
  }

  get allSelected(): boolean {
    return this.classroomRows.length > 0 && this.classroomRows.every((row) => row.selected);
  }

  onScopeChange(): void {
    this.clearMessages();
    this.selectedClassroomIds = [];
    this.cycleId = '';
    this.studentEnrollmentId = '';
    this.studentSearch = '';
    this.refreshClassroomSelection();
  }

  onSchoolChange(): void {
    this.clearMessages();
    this.academicYearId = '';
    this.cycleId = '';
    this.studentEnrollmentId = '';
    this.studentSearch = '';
    this.years = [];
    this.classroomOptions = [];
    this.selectedClassroomIds = [];
    this.studentOptions = [];
    this.classroomRows = [];
    this.enrollments = [];
    if (!this.schoolId) {
      return;
    }
    this.loadSchoolDependencies();
  }

  onYearChange(): void {
    this.clearMessages();
    this.studentEnrollmentId = '';
    this.studentSearch = '';
    this.classroomRows = [];
    this.studentOptions = [];
    this.enrollments = [];
    if (!this.academicYearId) {
      return;
    }
    this.loadPreviewData();
  }

  onCycleChange(): void {
    this.clearMessages();
    this.refreshClassroomSelection();
  }

  onStudentChange(): void {
    this.clearMessages();
    this.refreshClassroomSelection();
  }

  toggleClassroomChip(id: string): void {
    if (!id) {
      return;
    }
    if (this.selectedClassroomIds.includes(id)) {
      this.selectedClassroomIds = this.selectedClassroomIds.filter((item) => item !== id);
    } else {
      this.selectedClassroomIds = [...this.selectedClassroomIds, id];
    }
    this.refreshClassroomSelection();
  }

  removeClassroomChip(id: string): void {
    this.selectedClassroomIds = this.selectedClassroomIds.filter((item) => item !== id);
    this.refreshClassroomSelection();
  }

  isClassroomSelected(id: string): boolean {
    return this.selectedClassroomIds.includes(id);
  }

  toggleRow(row: ClassroomRow): void {
    row.selected = !row.selected;
  }

  toggleSelectAll(checked: boolean): void {
    for (const row of this.classroomRows) {
      row.selected = checked;
    }
  }

  previewPrint(): void {
    this.actionError = '';
    this.actionMessage = '';
    const request = this.buildRequest();
    if (!request) {
      this.actionError = this.scope === 'student'
        ? 'Sélectionnez un élève pour générer l’aperçu.'
        : 'Sélectionnez le périmètre et au moins une classe avec des élèves.';
      return;
    }

    this.isGenerating = true;
    this.bulletinReportService.preview(request).subscribe({
      next: (preview) => {
        this.isGenerating = false;
        const students = Number(preview.totalStudents ?? 0);
        const classrooms = Number(preview.totalClassrooms ?? 0);
        if (this.scope === 'student' && this.selectedStudent) {
          this.actionMessage = `Aperçu API : bulletin de ${this.selectedStudent.label} (${students} élève).`;
          return;
        }
        this.actionMessage = `Aperçu API : ${this.formatNumber(students)} élève(s), ${this.formatNumber(classrooms)} classe(s).`;
      },
      error: (err) => {
        this.isGenerating = false;
        this.actionError = extractApiErrorMessage(
          err,
          'Impossible de préparer l’aperçu des bulletins.'
        );
      }
    });
  }

  launchPrint(): void {
    this.actionError = '';
    this.actionMessage = '';
    const request = this.buildRequest();
    if (!request) {
      this.actionError = this.scope === 'student'
        ? 'Sélectionnez un élève avant d’imprimer.'
        : 'Sélectionnez le périmètre et au moins une classe avec des élèves.';
      return;
    }

    this.isGenerating = true;
    this.bulletinReportService.generate(request).subscribe({
      next: (pdf) => {
        this.isGenerating = false;
        const base64 = String(pdf.contentBase64 ?? '').trim();
        if (!base64) {
          this.actionError = 'Le serveur n’a renvoyé aucun PDF.';
          return;
        }
        const fileName = String(pdf.fileName ?? 'bulletins.pdf').trim() || 'bulletins.pdf';
        const contentType = String(pdf.contentType ?? 'application/pdf').trim() || 'application/pdf';
        this.openPdfFromBase64(base64, fileName, contentType);
        this.actionMessage = `PDF généré : ${fileName}`;
      },
      error: (err) => {
        this.isGenerating = false;
        this.actionError = extractApiErrorMessage(
          err,
          'Échec de génération des bulletins.'
        );
      }
    });
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  private buildRequest(): BulletinPrintRequestDto | null {
    if (!this.schoolId || !this.academicYearId) {
      return null;
    }

    const selectedClassroomIds = this.selectedRows.map((row) => row.id).filter(Boolean);
    if (this.scope !== 'student' && selectedClassroomIds.length === 0) {
      return null;
    }
    if (this.scope === 'student' && !this.studentEnrollmentId) {
      return null;
    }
    if (this.scope === 'cycle' && !this.cycleId && selectedClassroomIds.length === 0) {
      return null;
    }

    const base: BulletinPrintRequestDto = {
      mode: this.resolveMode(selectedClassroomIds),
      schoolId: this.schoolId,
      academicYearId: this.academicYearId,
      format: this.bulletinFormat,
      sortBy: this.sortBy,
      includeCoverPage: this.options.coverPage,
      includeSignatures: this.options.signatures,
      includeStudentRank: this.options.studentRank,
      includeClassAverages: this.options.classAverages
    };

    if (base.mode === 'STUDENT') {
      base.studentEnrollmentId = this.studentEnrollmentId;
      return base;
    }
    if (base.mode === 'CYCLE') {
      base.academicCycleId = this.cycleId;
      return base;
    }
    if (base.mode === 'CLASSES') {
      base.classroomIds = selectedClassroomIds;
      return base;
    }
    return base;
  }

  private resolveMode(selectedClassroomIds: string[]): BulletinPrintMode {
    if (this.scope === 'student') {
      return 'STUDENT';
    }
    if (this.scope === 'classes') {
      return 'CLASSES';
    }
    if (this.scope === 'cycle') {
      if (
        this.classroomRows.length > 0 &&
        selectedClassroomIds.length > 0 &&
        selectedClassroomIds.length < this.classroomRows.length
      ) {
        return 'CLASSES';
      }
      return 'CYCLE';
    }
    if (
      this.classroomRows.length > 0 &&
      selectedClassroomIds.length > 0 &&
      selectedClassroomIds.length < this.classroomRows.length
    ) {
      return 'CLASSES';
    }
    return 'SCHOOL';
  }

  private openPdfFromBase64(base64: string, fileName: string, contentType: string): void {
    const cleaned = base64.includes(',') ? base64.split(',').pop() || base64 : base64;
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: contentType || 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || 'bulletins.pdf';
      anchor.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  private bootstrapLookups(): void {
    this.isLoadingLookups = true;
    this.loadError = '';

    forkJoin({
      schools: this.schoolService.getAll().pipe(catchError(() => of([]))),
      cycles: this.academicCycleService.getAll().pipe(catchError(() => of([]))),
      levels: this.academicLevelService.getAll().pipe(catchError(() => of([]))),
      subjects: this.academicCurriculumSubjectService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ schools, cycles, levels, subjects }) => {
        this.schools = (schools as SchoolApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: String(row.name ?? row.code ?? '').trim() || 'École'
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.cyclesById.clear();
        this.cycles = (cycles as AcademicCycleApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '');
            const label = String(row.name ?? row.code ?? '').trim() || 'Cycle';
            if (id) {
              this.cyclesById.set(id, label);
            }
            return { id, label };
          })
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.levelsById.clear();
        for (const level of levels as AcademicLevelApiResponse[]) {
          const id = String(level.id ?? '');
          if (id) {
            this.levelsById.set(id, level);
          }
        }

        this.subjectsEvaluated = (subjects as AcademicCurriculumSubjectApiResponse[]).filter(
          (row) => row.active !== false
        ).length;

        this.isLoadingLookups = false;
      },
      error: () => {
        this.isLoadingLookups = false;
        this.loadError = 'Impossible de charger les référentiels.';
      }
    });
  }

  private loadSchoolDependencies(): void {
    forkJoin({
      years: this.academicYearService
        .getAll({ schoolId: this.schoolId })
        .pipe(catchError(() => of([]))),
      classrooms: this.classroomService.getAll(this.schoolId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ years, classrooms }) => {
        this.years = (years as AcademicYearApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: AcademicYearService.buildLabel(row)
          }))
          .filter((item) => item.id)
          .sort((a, b) => b.label.localeCompare(a.label, 'fr'));

        this.allClassrooms = (classrooms as ClassroomApiResponse[])
          .map((row) => {
            const id = String(row.id ?? '');
            const levelId = String(row.academicLevelId ?? row.academic_level_id ?? '');
            const level = this.levelsById.get(levelId);
            const cycleId = String(
              level?.academicCycleId ??
                level?.academic_cycle_id ??
                level?.academicCycle?.id ??
                ''
            );
            return {
              id,
              label: String(row.displayName ?? row.display_name ?? '').trim() || 'Classe',
              cycleId,
              cycleLabel: this.cyclesById.get(cycleId) || '—'
            };
          })
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.classroomOptions = this.allClassrooms.map(({ id, label }) => ({ id, label }));
      }
    });
  }

  private loadPreviewData(): void {
    if (!this.schoolId || !this.academicYearId) {
      return;
    }

    this.isLoadingPreview = true;
    this.enrollmentService
      .getByAcademicYearAndSchool({
        academicYearId: this.academicYearId,
        schoolId: this.schoolId,
        page: 0,
        size: 2000
      })
      .subscribe({
        next: (rows) => {
          this.enrollments = rows as EnrollmentApiResponse[];
          this.rebuildStudentOptions();
          this.isLoadingPreview = false;
          this.refreshClassroomSelection();
        },
        error: (err) => {
          this.enrollments = [];
          this.studentOptions = [];
          this.isLoadingPreview = false;
          this.loadError = extractApiErrorMessage(
            err,
            'Impossible de charger les effectifs élèves.'
          );
          this.refreshClassroomSelection();
        }
      });
  }

  private rebuildStudentOptions(): void {
    const classroomLabelById = new Map(
      this.allClassrooms.map((item) => [item.id.toLowerCase(), item.label])
    );

    this.studentOptions = this.enrollments
      .map((row) => {
        const id = String(row.id ?? '');
        if (!id) {
          return null;
        }
        const identity = resolveEnrollmentStudentIdentity(row);
        const classroomId = this.readClassroomId(row);
        const matricule = String(row.enrollmentNumber ?? row.enrollment_number ?? id).trim();
        const genderRaw = String(
          row.gender ?? row.studentGender ?? row.student_gender ?? ''
        )
          .trim()
          .toUpperCase();
        const gender: 'M' | 'F' | '—' = genderRaw.startsWith('F')
          ? 'F'
          : genderRaw.startsWith('M')
            ? 'M'
            : '—';
        const classroomLabel =
          classroomLabelById.get(classroomId.toLowerCase()) || 'Classe inconnue';
        const label = `${identity.fullName} (${matricule}) — ${classroomLabel}`;
        return {
          id,
          label,
          matricule,
          classroomId,
          classroomLabel,
          gender,
          searchText: `${identity.fullName} ${matricule} ${classroomLabel}`.toLowerCase()
        } as StudentOption;
      })
      .filter((item): item is StudentOption => item !== null)
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }

  private refreshClassroomSelection(): void {
    if (this.scope === 'student') {
      this.classroomRows = this.buildStudentClassroomRows();
      return;
    }

    const eligible = this.resolveEligibleClassrooms();
    const statsByClassroom = this.buildEnrollmentStats();

    this.classroomRows = eligible.map((classroom) => {
      const stats = statsByClassroom.get(classroom.id.toLowerCase()) ?? {
        effectif: 0,
        boys: 0,
        girls: 0
      };
      return {
        ...classroom,
        selected: true,
        effectif: stats.effectif,
        boys: stats.boys,
        girls: stats.girls
      };
    });
  }

  private buildStudentClassroomRows(): ClassroomRow[] {
    const student = this.selectedStudent;
    if (!student) {
      return [];
    }
    const classroom =
      this.allClassrooms.find(
        (item) => item.id.toLowerCase() === student.classroomId.toLowerCase()
      ) ?? {
        id: student.classroomId || 'unknown',
        label: student.classroomLabel,
        cycleId: '',
        cycleLabel: '—'
      };

    return [
      {
        ...classroom,
        selected: true,
        effectif: 1,
        boys: student.gender === 'M' ? 1 : 0,
        girls: student.gender === 'F' ? 1 : 0
      }
    ];
  }

  private resolveEligibleClassrooms(): Array<{
    id: string;
    label: string;
    cycleId: string;
    cycleLabel: string;
  }> {
    if (this.scope === 'classes') {
      const selected = new Set(this.selectedClassroomIds.map((id) => id.toLowerCase()));
      return this.allClassrooms.filter((item) => selected.has(item.id.toLowerCase()));
    }
    if (this.scope === 'cycle') {
      if (!this.cycleId) {
        return [];
      }
      return this.allClassrooms.filter(
        (item) => item.cycleId.toLowerCase() === this.cycleId.toLowerCase()
      );
    }
    return [...this.allClassrooms];
  }

  private buildEnrollmentStats(): Map<string, { effectif: number; boys: number; girls: number }> {
    const map = new Map<string, { effectif: number; boys: number; girls: number }>();
    for (const enrollment of this.enrollments) {
      const classroomId = this.readClassroomId(enrollment);
      if (!classroomId) {
        continue;
      }
      const key = classroomId.toLowerCase();
      const current = map.get(key) ?? { effectif: 0, boys: 0, girls: 0 };
      current.effectif += 1;
      const gender = String(
        enrollment.gender ?? enrollment.studentGender ?? enrollment.student_gender ?? ''
      )
        .trim()
        .toUpperCase();
      if (gender.startsWith('F')) {
        current.girls += 1;
      } else if (gender.startsWith('M')) {
        current.boys += 1;
      }
      map.set(key, current);
    }
    return map;
  }

  private readClassroomId(row: EnrollmentApiResponse): string {
    const direct = String(row.classroomId ?? row.classroom_id ?? '');
    if (direct) {
      return direct;
    }
    if (row.classroom && typeof row.classroom === 'object') {
      return String((row.classroom as { id?: string }).id ?? '');
    }
    return '';
  }

  private clearMessages(): void {
    this.loadError = '';
    this.actionMessage = '';
    this.actionError = '';
  }
}
