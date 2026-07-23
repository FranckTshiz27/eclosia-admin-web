import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateTeacherCourseAssignmentDto {
  teacherId: string;
  schoolId: string;
  academicYearId: string;
  classroomId: string;
  subjectId: string;
  weeklyHours?: number | null;
  coefficient?: number | null;
  remarks?: string | null;
}

export interface UpdateTeacherCourseAssignmentDto {
  weeklyHours?: number | null;
  coefficient?: number | null;
  remarks?: string | null;
  active?: boolean;
}

export interface TeacherCourseAssignmentResponseDto {
  id?: string;
  teacherId?: string;
  teacher_id?: string;
  teacherFullName?: string;
  teacher_full_name?: string;
  schoolId?: string;
  school_id?: string;
  schoolName?: string;
  school_name?: string;
  academicYearId?: string;
  academic_year_id?: string;
  academicYearCode?: string;
  academic_year_code?: string;
  classroomId?: string;
  classroom_id?: string;
  classroomDisplayName?: string;
  classroom_display_name?: string;
  subjectId?: string;
  subject_id?: string;
  subjectCode?: string;
  subject_code?: string;
  subjectName?: string;
  subject_name?: string;
  weeklyHours?: number | null;
  weekly_hours?: number | null;
  coefficient?: number | null;
  active?: boolean;
  remarks?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type ListPayload =
  | TeacherCourseAssignmentResponseDto[]
  | {
      value?: TeacherCourseAssignmentResponseDto[];
      data?: TeacherCourseAssignmentResponseDto[];
      content?: TeacherCourseAssignmentResponseDto[];
      items?: TeacherCourseAssignmentResponseDto[];
      results?: TeacherCourseAssignmentResponseDto[];
    };

@Injectable({
  providedIn: 'root'
})
export class TeacherCourseAssignmentService {
  private readonly endpoint = API_ENDPOINTS.teacherCourseAssignments;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateTeacherCourseAssignmentDto): Observable<TeacherCourseAssignmentResponseDto[]> {
    return this.createAll([dto]);
  }

  /** POST body = liste d'objets (classe, enseignant, année, branche, école, …). */
  createAll(
    dtos: CreateTeacherCourseAssignmentDto[]
  ): Observable<TeacherCourseAssignmentResponseDto[]> {
    return this.http
      .post<ListPayload | TeacherCourseAssignmentResponseDto>(this.endpoint, dtos)
      .pipe(map((response) => this.unwrapListOrOne(response)));
  }

  update(
    id: string,
    dto: UpdateTeacherCourseAssignmentDto
  ): Observable<TeacherCourseAssignmentResponseDto> {
    return this.http.put<TeacherCourseAssignmentResponseDto>(`${this.endpoint}/${id}`, dto);
  }

  deactivate(id: string): Observable<TeacherCourseAssignmentResponseDto> {
    return this.http.patch<TeacherCourseAssignmentResponseDto>(
      `${this.endpoint}/${id}/deactivate`,
      {}
    );
  }

  getById(id: string): Observable<TeacherCourseAssignmentResponseDto> {
    return this.http.get<TeacherCourseAssignmentResponseDto>(`${this.endpoint}/${id}`);
  }

  listByYear(
    academicYearId: string,
    schoolId?: string
  ): Observable<TeacherCourseAssignmentResponseDto[]> {
    let params = new HttpParams().set('academicYearId', academicYearId);
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    }
    return this.http
      .get<ListPayload>(this.endpoint, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  listByTeacher(
    teacherId: string,
    academicYearId?: string
  ): Observable<TeacherCourseAssignmentResponseDto[]> {
    let params = new HttpParams();
    if (academicYearId) {
      params = params.set('academicYearId', academicYearId);
    }
    return this.http
      .get<ListPayload>(`${this.endpoint}/teacher/${teacherId}`, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  listByClassroom(
    classroomId: string,
    academicYearId: string
  ): Observable<TeacherCourseAssignmentResponseDto[]> {
    const params = new HttpParams().set('academicYearId', academicYearId);
    return this.http
      .get<ListPayload>(`${this.endpoint}/classroom/${classroomId}`, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  listBySubject(
    subjectId: string,
    schoolId?: string,
    academicYearId?: string
  ): Observable<TeacherCourseAssignmentResponseDto[]> {
    let params = new HttpParams();
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    }
    if (academicYearId) {
      params = params.set('academicYearId', academicYearId);
    }
    return this.http
      .get<ListPayload>(`${this.endpoint}/subject/${subjectId}`, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapListOrOne(
    response: ListPayload | TeacherCourseAssignmentResponseDto
  ): TeacherCourseAssignmentResponseDto[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const list = this.unwrapList(response as ListPayload);
      if (list.length) {
        return list;
      }
      if ((response as TeacherCourseAssignmentResponseDto).id) {
        return [response as TeacherCourseAssignmentResponseDto];
      }
    }
    return [];
  }

  private unwrapList(response: ListPayload): TeacherCourseAssignmentResponseDto[] {
    if (Array.isArray(response)) {
      return response;
    }
    return (
      response.value ??
      response.data ??
      response.content ??
      response.items ??
      response.results ??
      []
    );
  }
}
