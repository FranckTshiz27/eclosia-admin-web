import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import {
  AcademicCurriculumApiResponse,
  AcademicCurriculumService
} from '../../../services/academic-curriculum.service';
import {
  AcademicCurriculumSubjectApiResponse,
  AcademicCurriculumSubjectService
} from '../../../services/academic-curriculum-subject.service';
import {
  AcademicLevelApiResponse,
  AcademicLevelService
} from '../../../services/academic-level.service';
import {
  AcademicPeriodApiResponse,
  AcademicPeriodService
} from '../../../services/academic-period.service';
import {
  AcademicTermApiResponse,
  AcademicTermService
} from '../../../services/academic-term.service';
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
import { SubjectApiResponse, SubjectService } from '../../../services/subject.service';
import { SecurityService } from '../../../services/security.service';
import {
  TeacherClassAssignmentService
} from '../../../services/teacher-class-assignment.service';
import {
  TeacherCourseAssignmentService
} from '../../../services/teacher-course-assignment.service';
import { TeacherService } from '../../../services/teacher.service';
import {
  CreateStudentGradeDto,
  StudentGradeApiResponse,
  StudentGradeService,
  UpdateStudentGradeDto
} from '../../../services/student-grade.service';
import {
  SearchableSelectComponent,
  SearchableSelectOption
} from '../../../shared/searchable-select/searchable-select.component';

interface SelectOption {
  id: string;
  label: string;
}

interface ClassroomOption extends SelectOption {
  academicLevelId: string;
  academicSectionId: string | null;
  academicOptionId: string | null;
}

interface SubjectOption extends SelectOption {
  subjectId: string;
  academicCurriculumSubjectId: string;
  coefficient: number;
  maximumPoints: number;
}

interface ScoreRow {
  enrollmentId: string;
  matricule: string;
  fullName: string;
  gender: string;
  score: string;
  scoreId: string | null;
  invalid: boolean;
}

@Component({
  selector: 'app-saisie-des-points',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  templateUrl: './saisie-des-points.component.html',
  styleUrl: './saisie-des-points.component.css'
})
export class SaisieDesPointsComponent implements OnInit {
  schoolId = '';
  academicYearId = '';
  classroomId = '';
  academicTermId = '';
  academicPeriodId = '';
  curriculumSubjectId = '';

  schools: SelectOption[] = [];
  years: SelectOption[] = [];
  classrooms: ClassroomOption[] = [];
  terms: SelectOption[] = [];
  periods: Array<SelectOption & { maximumScoreRatio: number }> = [];
  subjects: SubjectOption[] = [];

  rows: ScoreRow[] = [];
  bulkScore = '';

  isLoadingLookups = false;
  isLoadingRows = false;
  isSaving = false;
  loadError = '';
  saveError = '';
  saveSuccess = '';

  private levelsById = new Map<string, AcademicLevelApiResponse>();
  private subjectLabels = new Map<string, string>();
  /** Id fiche Teacher si l'utilisateur connecté est enseignant ; null = admin / hors enseignant. */
  private currentTeacherId: string | null = null;
  private isTeacherContext = false;

  constructor(
    private readonly schoolService: SchoolService,
    private readonly academicYearService: AcademicYearService,
    private readonly classroomService: ClassroomService,
    private readonly academicTermService: AcademicTermService,
    private readonly academicPeriodService: AcademicPeriodService,
    private readonly academicLevelService: AcademicLevelService,
    private readonly academicCurriculumService: AcademicCurriculumService,
    private readonly academicCurriculumSubjectService: AcademicCurriculumSubjectService,
    private readonly subjectService: SubjectService,
    private readonly enrollmentService: EnrollmentService,
    private readonly studentGradeService: StudentGradeService,
    private readonly teacherService: TeacherService,
    private readonly teacherClassAssignmentService: TeacherClassAssignmentService,
    private readonly teacherCourseAssignmentService: TeacherCourseAssignmentService,
    private readonly securityService: SecurityService
  ) {}

  ngOnInit(): void {
    this.resolveCurrentTeacher();
    this.bootstrapLookups();
  }

  get selectedPeriod(): (SelectOption & { maximumScoreRatio: number }) | null {
    return this.periods.find((item) => this.sameId(item.id, this.academicPeriodId)) ?? null;
  }

  get selectedSubject(): SubjectOption | null {
    return this.subjects.find((item) => this.sameId(item.id, this.curriculumSubjectId)) ?? null;
  }

  get selectedClassroom(): ClassroomOption | null {
    return this.classrooms.find((item) => this.sameId(item.id, this.classroomId)) ?? null;
  }

  get selectedTermLabel(): string {
    return this.terms.find((item) => this.sameId(item.id, this.academicTermId))?.label || '—';
  }

  get selectedPeriodLabel(): string {
    return this.selectedPeriod?.label || '—';
  }

  get selectedSubjectLabel(): string {
    return this.selectedSubject?.label || '—';
  }

  get selectedClassroomLabel(): string {
    return this.selectedClassroom?.label || '—';
  }

  get coefficient(): number {
    return this.selectedSubject?.coefficient ?? 0;
  }

  get maximumPoints(): number {
    return this.selectedSubject?.maximumPoints ?? 0;
  }

  get periodRatioRaw(): number {
    return this.selectedPeriod?.maximumScoreRatio ?? 0;
  }

  get periodRatioFactor(): number {
    return this.normalizeRatio(this.periodRatioRaw);
  }

  get periodRatioPercent(): number {
    return Math.round(this.periodRatioFactor * 10000) / 100;
  }

  get allowedMaximum(): number {
    if (!this.maximumPoints || !this.periodRatioFactor) {
      return 0;
    }
    return Math.round(this.maximumPoints * this.periodRatioFactor * 100) / 100;
  }

  get canShowStudents(): boolean {
    return Boolean(this.schoolId && this.academicYearId && this.classroomId);
  }

  get canLoadGrid(): boolean {
    return Boolean(
      this.canShowStudents && this.academicPeriodId && this.curriculumSubjectId
    );
  }

  get contextReady(): boolean {
    return this.canLoadGrid && this.allowedMaximum > 0;
  }

  get schoolSelectOptions(): SearchableSelectOption[] {
    return this.schools.map((item) => ({ id: item.id, label: item.label }));
  }

  get yearSelectOptions(): SearchableSelectOption[] {
    return this.years.map((item) => ({ id: item.id, label: item.label }));
  }

  get classroomSelectOptions(): SearchableSelectOption[] {
    return this.classrooms.map((item) => ({ id: item.id, label: item.label }));
  }

  get termSelectOptions(): SearchableSelectOption[] {
    return this.terms.map((item) => ({ id: item.id, label: item.label }));
  }

  get periodSelectOptions(): SearchableSelectOption[] {
    return this.periods.map((item) => ({ id: item.id, label: item.label }));
  }

  get subjectSelectOptions(): SearchableSelectOption[] {
    return this.subjects.map((item) => ({ id: item.id, label: item.label }));
  }

  onSchoolChange(): void {
    this.academicYearId = '';
    this.classroomId = '';
    this.academicTermId = '';
    this.academicPeriodId = '';
    this.curriculumSubjectId = '';
    this.years = [];
    this.classrooms = [];
    this.terms = [];
    this.periods = [];
    this.subjects = [];
    this.rows = [];
    this.clearMessages();
    if (!this.schoolId) {
      return;
    }
    this.loadYearsAndClassrooms();
  }

  onYearChange(): void {
    this.academicTermId = '';
    this.academicPeriodId = '';
    this.curriculumSubjectId = '';
    this.terms = [];
    this.periods = [];
    this.subjects = [];
    this.rows = [];
    this.clearMessages();
    if (!this.academicYearId) {
      return;
    }
    this.loadTerms();
    this.resolveSubjects();
    this.loadStudents();
  }

  onClassroomChange(): void {
    this.curriculumSubjectId = '';
    this.subjects = [];
    this.rows = [];
    this.clearMessages();
    this.resolveSubjects();
    this.loadStudents();
  }

  onTermChange(): void {
    this.academicPeriodId = '';
    this.periods = [];
    this.clearMessages();
    if (!this.academicTermId) {
      return;
    }
    this.loadPeriods();
  }

  onPeriodChange(): void {
    this.clearMessages();
    this.mergeExistingScores();
  }

  onSubjectChange(): void {
    this.clearMessages();
    this.mergeExistingScores();
  }

  applyBulkScore(): void {
    if (!this.bulkScore.trim() || !this.contextReady) {
      return;
    }
    const clamped = this.clampScore(this.bulkScore);
    this.bulkScore = clamped;
    for (const row of this.rows) {
      row.score = clamped;
      row.invalid = false;
    }
  }

  onScoreInput(row: ScoreRow, event: Event): void {
    this.applyScoreLimit(row, event.target as HTMLInputElement, false);
  }

  onScoreBlur(row: ScoreRow, event: Event): void {
    this.applyScoreLimit(row, event.target as HTMLInputElement, true);
  }

  onBulkScoreInput(event: Event): void {
    this.applyBulkScoreLimit(event.target as HTMLInputElement, false);
  }

  onBulkScoreBlur(event: Event): void {
    this.applyBulkScoreLimit(event.target as HTMLInputElement, true);
  }

  cancelEdits(): void {
    this.loadStudents();
  }

  save(andContinue: boolean): void {
    if (!this.contextReady || this.isSaving) {
      return;
    }

    for (const row of this.rows) {
      if (row.score.trim()) {
        row.score = this.clampScore(row.score);
      }
      this.validateRow(row);
    }
    if (this.rows.some((row) => row.invalid)) {
      this.saveError = `Chaque note doit être entre 0 et ${this.allowedMaximum}.`;
      return;
    }

    const rowsToSave = this.rows.filter((row) => row.score.trim() !== '');
    if (!rowsToSave.length) {
      this.saveError = 'Saisissez au moins une note avant d’enregistrer.';
      return;
    }

    const requests = rowsToSave.map((row) => {
      const score = Number(String(row.score).replace(',', '.'));
      const payload: CreateStudentGradeDto | UpdateStudentGradeDto = {
        studentEnrollmentId: row.enrollmentId,
        academicPeriodId: this.academicPeriodId,
        academicCurriculumSubjectId: this.curriculumSubjectId,
        score,
        published: false
      };
      if (row.scoreId) {
        return this.studentGradeService.update(row.scoreId, payload);
      }
      return this.studentGradeService.create(payload);
    });

    this.isSaving = true;
    this.saveError = '';
    this.saveSuccess = '';

    forkJoin(requests).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = 'Points enregistrés avec succès.';
        if (andContinue) {
          this.prepareNextSubject();
        } else {
          this.loadStudents();
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = extractApiErrorMessage(
          err,
          "Échec d'enregistrement. Vérifiez que l'API student-grade est disponible."
        );
      }
    });
  }

  private prepareNextSubject(): void {
    const currentIndex = this.subjects.findIndex((item) =>
      this.sameId(item.id, this.curriculumSubjectId)
    );
    if (currentIndex >= 0 && currentIndex < this.subjects.length - 1) {
      this.curriculumSubjectId = this.subjects[currentIndex + 1].id;
      this.mergeExistingScores();
      return;
    }
    this.loadStudents();
  }

  private bootstrapLookups(): void {
    this.isLoadingLookups = true;
    this.loadError = '';

    forkJoin({
      schools: this.schoolService.getAll().pipe(catchError(() => of([]))),
      levels: this.academicLevelService.getAll().pipe(catchError(() => of([]))),
      subjects: this.subjectService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ schools, levels, subjects }) => {
        this.schools = (schools as SchoolApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: String(row.name ?? row.code ?? '').trim() || 'École'
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        this.levelsById.clear();
        for (const level of levels as AcademicLevelApiResponse[]) {
          const id = String(level.id ?? '');
          if (id) {
            this.levelsById.set(id, level);
          }
        }

        this.subjectLabels.clear();
        for (const subject of subjects as SubjectApiResponse[]) {
          const id = String(subject.id ?? '');
          if (id) {
            this.subjectLabels.set(id, this.buildLookupLabel(subject.code, subject.name));
          }
        }

        this.isLoadingLookups = false;
      },
      error: () => {
        this.isLoadingLookups = false;
        this.loadError = 'Impossible de charger les référentiels.';
      }
    });
  }

  private loadYearsAndClassrooms(): void {
    forkJoin({
      years: this.academicYearService.getAll({ schoolId: this.schoolId }).pipe(catchError(() => of([]))),
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

        this.classrooms = (classrooms as ClassroomApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: String(row.displayName ?? row.display_name ?? '').trim() || 'Classe',
            academicLevelId: String(row.academicLevelId ?? row.academic_level_id ?? ''),
            academicSectionId: this.readOptionalId(row.academicSectionId ?? row.academic_section_id),
            academicOptionId: this.readOptionalId(row.academicOptionId ?? row.academic_option_id)
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
      }
    });
  }

  private loadTerms(): void {
    this.academicTermService.getAll({ academicYearId: this.academicYearId }).subscribe({
      next: (rows) => {
        this.terms = (rows as AcademicTermApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: this.buildLookupLabel(row.code, row.name)
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
      },
      error: (err) => {
        this.terms = [];
        this.loadError = extractApiErrorMessage(err, 'Impossible de charger les trimestres.');
      }
    });
  }

  private loadPeriods(): void {
    this.academicPeriodService.getAll({ academicTermId: this.academicTermId }).subscribe({
      next: (rows) => {
        this.periods = (rows as AcademicPeriodApiResponse[])
          .map((row) => ({
            id: String(row.id ?? ''),
            label: this.buildLookupLabel(row.code, row.name),
            maximumScoreRatio: Number(row.maximumScoreRatio ?? row.maximum_score_ratio ?? 0),
            order: Number(row.displayOrder ?? row.display_order ?? 0)
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'fr'))
          .map(({ id, label, maximumScoreRatio }) => ({ id, label, maximumScoreRatio }));
      },
      error: (err) => {
        this.periods = [];
        this.loadError = extractApiErrorMessage(err, 'Impossible de charger les périodes.');
      }
    });
  }

  private resolveSubjects(): void {
    if (!this.academicYearId || !this.classroomId) {
      this.subjects = [];
      return;
    }

    const classroom = this.selectedClassroom;
    if (!classroom?.academicLevelId) {
      this.subjects = [];
      return;
    }

    const level = this.levelsById.get(classroom.academicLevelId);
    const cycleId = String(
      level?.academicCycleId ?? level?.academic_cycle_id ?? level?.academicCycle?.id ?? ''
    );

    this.academicCurriculumService
      .getAll({
        academicYearId: this.academicYearId,
        academicLevelId: classroom.academicLevelId,
        academicCycleId: cycleId || undefined
      })
      .subscribe({
        next: (curricula) => {
          const matched = this.pickCurriculum(
            curricula as AcademicCurriculumApiResponse[],
            classroom
          );
          if (!matched?.id) {
            this.subjects = [];
            this.loadError =
              'Aucun programme pédagogique trouvé pour cette classe et cette année scolaire.';
            return;
          }

          this.academicCurriculumSubjectService
            .getAll({ academicCurriculumId: String(matched.id) })
            .subscribe({
              next: (rows) => {
                const allSubjects = (rows as AcademicCurriculumSubjectApiResponse[])
                  .map((row) => {
                    const subjectId = String(row.subjectId ?? row.subject_id ?? '');
                    return {
                      id: String(row.id ?? ''),
                      subjectId,
                      academicCurriculumSubjectId: String(row.id ?? ''),
                      label: this.subjectLabels.get(subjectId) || subjectId || 'Matière',
                      coefficient: Number(row.coefficient ?? 0),
                      maximumPoints: Number(row.maximumPoints ?? row.maximum_points ?? 0),
                      order: Number(row.displayOrder ?? row.display_order ?? 0)
                    };
                  })
                  .filter((item) => item.id && item.subjectId)
                  .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'fr'))
                  .map(
                    ({
                      id,
                      subjectId,
                      academicCurriculumSubjectId,
                      label,
                      coefficient,
                      maximumPoints
                    }) => ({
                      id,
                      subjectId,
                      academicCurriculumSubjectId,
                      label,
                      coefficient,
                      maximumPoints
                    })
                  );

                this.applyTeacherSubjectScope(allSubjects);
              },
              error: (err) => {
                this.subjects = [];
                this.loadError = extractApiErrorMessage(
                  err,
                  'Impossible de charger les matières du programme.'
                );
              }
            });
        },
        error: (err) => {
          this.subjects = [];
          this.loadError = extractApiErrorMessage(
            err,
            'Impossible de charger le programme pédagogique.'
          );
        }
      });
  }

  /**
   * Enseignant connecté :
   * - titulaire de la classe → toutes les branches du programme
   * - sinon → uniquement les branches qui lui sont affectées sur cette classe
   * Admin / hors enseignant → toutes les branches
   */
  private applyTeacherSubjectScope(allSubjects: SubjectOption[]): void {
    if (!this.isTeacherContext || !this.currentTeacherId) {
      this.subjects = allSubjects;
      this.loadError = '';
      this.ensureSelectedSubjectStillValid();
      return;
    }

    const teacherId = this.currentTeacherId;
    const classroomId = this.classroomId;
    const yearId = this.academicYearId;

    this.teacherClassAssignmentService
      .getActiveByClassroom(classroomId, yearId)
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (titular) => {
          const titularTeacherId = String(
            titular?.teacherId ?? titular?.teacher_id ?? ''
          ).trim();
          const isTitularOfClass =
            !!titularTeacherId && this.sameId(titularTeacherId, teacherId);

          if (isTitularOfClass) {
            this.subjects = allSubjects;
            this.loadError = '';
            this.ensureSelectedSubjectStillValid();
            return;
          }

          this.teacherCourseAssignmentService
            .listByTeacher(teacherId, yearId)
            .pipe(catchError(() => of([])))
            .subscribe({
              next: (assignments) => {
                const allowedSubjectIds = new Set(
                  assignments
                    .filter(
                      (row) =>
                        row.active !== false &&
                        this.sameId(
                          String(row.classroomId ?? row.classroom_id ?? ''),
                          classroomId
                        )
                    )
                    .map((row) =>
                      String(row.subjectId ?? row.subject_id ?? '')
                        .trim()
                        .toLowerCase()
                    )
                    .filter(Boolean)
                );

                this.subjects = allSubjects.filter((item) =>
                  allowedSubjectIds.has(item.subjectId.trim().toLowerCase())
                );
                this.loadError = this.subjects.length
                  ? ''
                  : 'Aucune matière affectée pour vous sur cette classe.';
                this.ensureSelectedSubjectStillValid();
              },
              error: () => {
                this.subjects = [];
                this.loadError =
                  'Impossible de charger vos affectations de cours pour cette classe.';
              }
            });
        }
      });
  }

  private ensureSelectedSubjectStillValid(): void {
    if (
      this.curriculumSubjectId &&
      !this.subjects.some((item) => this.sameId(item.id, this.curriculumSubjectId))
    ) {
      this.curriculumSubjectId = '';
    }
  }

  private resolveCurrentTeacher(): void {
    const user = this.securityService.getCurrentUser();
    if (!user?.id) {
      this.currentTeacherId = null;
      this.isTeacherContext = false;
      return;
    }

    this.teacherService.getMe().subscribe({
      next: (teacher) => {
        const id = String(teacher.id ?? '').trim();
        this.currentTeacherId = id || null;
        this.isTeacherContext = !!id;
        // Re-filtrer si une classe est déjà sélectionnée
        if (this.classroomId && this.academicYearId) {
          this.resolveSubjects();
        }
      },
      error: () => {
        this.currentTeacherId = null;
        this.isTeacherContext = false;
      }
    });
  }

  private pickCurriculum(
    curricula: AcademicCurriculumApiResponse[],
    classroom: ClassroomOption
  ): AcademicCurriculumApiResponse | null {
    const active = curricula.filter((row) => row.active !== false);
    const pool = active.length ? active : curricula;

    const exact = pool.find((row) => {
      const levelId = String(row.academicLevelId ?? row.academic_level_id ?? '');
      const sectionId = this.readOptionalId(row.academicSectionId ?? row.academic_section_id);
      const optionId = this.readOptionalId(row.academicOptionId ?? row.academic_option_id);
      return (
        this.sameId(levelId, classroom.academicLevelId) &&
        this.sameOptionalId(sectionId, classroom.academicSectionId) &&
        this.sameOptionalId(optionId, classroom.academicOptionId)
      );
    });
    if (exact) {
      return exact;
    }

    return (
      pool.find((row) =>
        this.sameId(
          String(row.academicLevelId ?? row.academic_level_id ?? ''),
          classroom.academicLevelId
        )
      ) ?? null
    );
  }

  private loadStudents(): void {
    if (!this.canShowStudents) {
      this.rows = [];
      return;
    }

    this.isLoadingRows = true;
    this.loadError = '';
    this.saveError = '';
    this.saveSuccess = '';

    this.enrollmentService
      .getByAcademicYearAndSchool({
        academicYearId: this.academicYearId,
        schoolId: this.schoolId,
        page: 0,
        size: 500
      })
      .subscribe({
        next: (enrollments) => {
          const filtered = (enrollments as EnrollmentApiResponse[]).filter((row) => {
            const rowClassroomId =
              String(row.classroomId ?? row.classroom_id ?? '') ||
              (row.classroom && typeof row.classroom === 'object'
                ? String((row.classroom as { id?: string }).id ?? '')
                : '');
            return this.sameId(rowClassroomId, this.classroomId);
          });

          this.rows = filtered
            .map((row) => this.mapEnrollmentToRow(row, new Map()))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));

          this.isLoadingRows = false;
          if (!this.rows.length) {
            this.loadError = 'Aucun élève inscrit trouvé pour cette classe.';
            return;
          }
          this.mergeExistingScores();
        },
        error: (err) => {
          this.rows = [];
          this.isLoadingRows = false;
          this.loadError = extractApiErrorMessage(
            err,
            'Impossible de charger les élèves de cette classe.'
          );
        }
      });
  }

  private mergeExistingScores(): void {
    if (!this.rows.length || !this.academicPeriodId || !this.curriculumSubjectId) {
      for (const row of this.rows) {
        row.score = '';
        row.scoreId = null;
        row.invalid = false;
      }
      return;
    }

    this.studentGradeService
      .getAll({ academicPeriodId: this.academicPeriodId })
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (grades) => {
          const scoreByEnrollment = new Map<string, StudentGradeApiResponse>();
          for (const grade of grades as StudentGradeApiResponse[]) {
            const subjectId = String(
              grade.academicCurriculumSubjectId ?? grade.academic_curriculum_subject_id ?? ''
            );
            if (!this.sameId(subjectId, this.curriculumSubjectId)) {
              continue;
            }
            const enrollmentId = String(
              grade.studentEnrollmentId ?? grade.student_enrollment_id ?? ''
            );
            if (enrollmentId) {
              scoreByEnrollment.set(enrollmentId.toLowerCase(), grade);
            }
          }

          for (const row of this.rows) {
            const existing = scoreByEnrollment.get(row.enrollmentId.toLowerCase());
            row.score =
              existing?.score === undefined || existing?.score === null
                ? ''
                : String(existing.score);
            row.scoreId = existing?.id ? String(existing.id) : null;
            row.invalid = false;
          }
        }
      });
  }

  private mapEnrollmentToRow(
    row: EnrollmentApiResponse,
    scoreByEnrollment: Map<string, StudentGradeApiResponse>
  ): ScoreRow {
    const enrollmentId = String(row.id ?? '');
    const identity = resolveEnrollmentStudentIdentity(row);
    const existing = scoreByEnrollment.get(enrollmentId.toLowerCase());
    const genderRaw = String(row.gender ?? row.studentGender ?? row.student_gender ?? '')
      .trim()
      .toUpperCase();
    const gender =
      genderRaw.startsWith('F') ? 'F' : genderRaw.startsWith('M') ? 'M' : genderRaw || '—';

    return {
      enrollmentId,
      matricule: String(row.enrollmentNumber ?? row.enrollment_number ?? enrollmentId).trim(),
      fullName: identity.fullName,
      gender,
      score:
        existing?.score === undefined || existing?.score === null ? '' : String(existing.score),
      scoreId: existing?.id ? String(existing.id) : null,
      invalid: false
    };
  }

  private applyScoreLimit(row: ScoreRow, input: HTMLInputElement, finalize: boolean): void {
    this.saveSuccess = '';
    const limited = this.limitScoreValue(input.value, finalize);
    row.score = limited.value;
    input.value = limited.value;
    row.invalid = false;
    this.saveError = limited.exceeded
      ? `La note ne peut pas dépasser le maximum autorisé (${this.allowedMaximum}).`
      : '';
  }

  private applyBulkScoreLimit(input: HTMLInputElement, finalize: boolean): void {
    const limited = this.limitScoreValue(input.value, finalize);
    this.bulkScore = limited.value;
    input.value = limited.value;
    if (limited.exceeded) {
      this.saveError = `La note ne peut pas dépasser le maximum autorisé (${this.allowedMaximum}).`;
    }
  }

  private limitScoreValue(
    rawInput: string,
    finalize: boolean
  ): { value: string; exceeded: boolean } {
    const raw = String(rawInput ?? '').trim();
    if (!raw) {
      return { value: '', exceeded: false };
    }

    const value = Number(raw.replace(',', '.'));
    if (!Number.isFinite(value)) {
      return { value: finalize ? '' : raw, exceeded: false };
    }

    const max = this.allowedMaximum;
    let next = value;
    let exceeded = false;

    if (next < 0) {
      next = 0;
    }
    if (max > 0 && next > max) {
      next = max;
      exceeded = true;
    }

    return { value: String(next), exceeded };
  }

  private validateRow(row: ScoreRow): void {
    if (!row.score.trim()) {
      row.invalid = false;
      return;
    }
    const value = Number(String(row.score).replace(',', '.'));
    row.invalid =
      !Number.isFinite(value) ||
      value < 0 ||
      (this.allowedMaximum > 0 && value > this.allowedMaximum);
  }

  private clampScore(raw: string): string {
    return this.limitScoreValue(raw, true).value;
  }

  private normalizeRatio(raw: number): number {
    if (!Number.isFinite(raw) || raw <= 0) {
      return 0;
    }
    return raw > 1 ? raw / 100 : raw;
  }

  private clearMessages(): void {
    this.loadError = '';
    this.saveError = '';
    this.saveSuccess = '';
  }

  private buildLookupLabel(code?: string | null, name?: string | null): string {
    const safeCode = (code ?? '').trim();
    const safeName = (name ?? '').trim();
    if (safeCode && safeName) {
      return `${safeCode} — ${safeName}`;
    }
    return safeName || safeCode || '—';
  }

  private readOptionalId(value: string | null | undefined): string | null {
    const id = String(value ?? '').trim();
    return id || null;
  }

  private sameOptionalId(left: string | null, right: string | null): boolean {
    if (!left && !right) {
      return true;
    }
    return this.sameId(left, right);
  }

  private sameId(
    left: string | number | undefined | null,
    right: string | number | undefined | null
  ): boolean {
    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }
}
