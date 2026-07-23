import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateTeacherClassAssignmentDto {
  teacherId: string;
  schoolId: string;
  academicYearId: string;
  classroomId: string;
  remarks?: string | null;
}

export interface UpdateTeacherClassAssignmentDto {
  remarks?: string | null;
  active?: boolean;
}

export interface TeacherClassAssignmentResponseDto {
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
  academicYearName?: string;
  academic_year_name?: string;
  classroomId?: string;
  classroom_id?: string;
  classroomDisplayName?: string;
  classroom_display_name?: string;
  active?: boolean;
  remarks?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type ListPayload =
  | TeacherClassAssignmentResponseDto[]
  | {
      value?: TeacherClassAssignmentResponseDto[];
      data?: TeacherClassAssignmentResponseDto[];
      content?: TeacherClassAssignmentResponseDto[];
      items?: TeacherClassAssignmentResponseDto[];
      results?: TeacherClassAssignmentResponseDto[];
    };

@Injectable({
  providedIn: 'root'
})
export class TeacherClassAssignmentService {
  private readonly endpoint = API_ENDPOINTS.teacherClassAssignments;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateTeacherClassAssignmentDto): Observable<TeacherClassAssignmentResponseDto> {
    return this.http.post<TeacherClassAssignmentResponseDto>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateTeacherClassAssignmentDto): Observable<TeacherClassAssignmentResponseDto> {
    return this.http.put<TeacherClassAssignmentResponseDto>(`${this.endpoint}/${id}`, dto);
  }

  deactivate(id: string): Observable<TeacherClassAssignmentResponseDto> {
    return this.http.patch<TeacherClassAssignmentResponseDto>(`${this.endpoint}/${id}/deactivate`, {});
  }

  getById(id: string): Observable<TeacherClassAssignmentResponseDto> {
    return this.http.get<TeacherClassAssignmentResponseDto>(`${this.endpoint}/${id}`);
  }

  listBySchoolAndYear(
    schoolId: string,
    academicYearId: string
  ): Observable<TeacherClassAssignmentResponseDto[]> {
    const params = new HttpParams()
      .set('schoolId', schoolId)
      .set('academicYearId', academicYearId);
    return this.http
      .get<ListPayload>(this.endpoint, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  getActiveByClassroom(
    classroomId: string,
    academicYearId: string
  ): Observable<TeacherClassAssignmentResponseDto> {
    const params = new HttpParams().set('academicYearId', academicYearId);
    return this.http.get<TeacherClassAssignmentResponseDto>(
      `${this.endpoint}/classroom/${classroomId}`,
      { params }
    );
  }

  listByTeacher(
    teacherId: string,
    academicYearId?: string
  ): Observable<TeacherClassAssignmentResponseDto[]> {
    let params = new HttpParams();
    if (academicYearId) {
      params = params.set('academicYearId', academicYearId);
    }
    return this.http
      .get<ListPayload>(`${this.endpoint}/teacher/${teacherId}`, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapList(response: ListPayload): TeacherClassAssignmentResponseDto[] {
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
