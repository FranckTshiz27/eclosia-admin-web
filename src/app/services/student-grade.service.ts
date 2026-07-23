import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateStudentGradeDto {
  studentEnrollmentId: string;
  academicPeriodId: string;
  academicCurriculumSubjectId: string;
  score: number;
  observation?: string | null;
  published?: boolean;
}

export interface UpdateStudentGradeDto {
  studentEnrollmentId: string;
  academicPeriodId: string;
  academicCurriculumSubjectId: string;
  score: number;
  observation?: string | null;
  published?: boolean;
}

export interface StudentGradeApiResponse {
  id?: string;
  studentEnrollmentId?: string;
  student_enrollment_id?: string;
  academicPeriodId?: string;
  academic_period_id?: string;
  academicCurriculumSubjectId?: string;
  academic_curriculum_subject_id?: string;
  score?: number | string;
  observation?: string | null;
  published?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface StudentGradeQuery {
  studentEnrollmentId?: string;
  academicPeriodId?: string;
  academicCurriculumSubjectId?: string;
}

type StudentGradeListPayload =
  | StudentGradeApiResponse[]
  | {
      value?: StudentGradeApiResponse[];
      data?: StudentGradeApiResponse[];
      content?: StudentGradeApiResponse[];
      items?: StudentGradeApiResponse[];
      results?: StudentGradeApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class StudentGradeService {
  private readonly endpoint = API_ENDPOINTS.studentGrade;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateStudentGradeDto): Observable<StudentGradeApiResponse> {
    return this.http.post<StudentGradeApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateStudentGradeDto): Observable<StudentGradeApiResponse> {
    return this.http.put<StudentGradeApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  getAll(query: StudentGradeQuery = {}): Observable<StudentGradeApiResponse[]> {
    let params = new HttpParams();
    if (query.studentEnrollmentId) {
      params = params.set('studentEnrollmentId', query.studentEnrollmentId);
    }
    if (query.academicPeriodId) {
      params = params.set('academicPeriodId', query.academicPeriodId);
    }
    if (query.academicCurriculumSubjectId) {
      params = params.set('academicCurriculumSubjectId', query.academicCurriculumSubjectId);
    }

    return this.http
      .get<StudentGradeListPayload | StudentGradeApiResponse>(this.endpoint, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  getById(id: string): Observable<StudentGradeApiResponse> {
    return this.http.get<StudentGradeApiResponse>(`${this.endpoint}/${id}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  private unwrapList(
    response: StudentGradeListPayload | StudentGradeApiResponse
  ): StudentGradeApiResponse[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const wrapped = response as {
        value?: StudentGradeApiResponse[];
        data?: StudentGradeApiResponse[];
        content?: StudentGradeApiResponse[];
        items?: StudentGradeApiResponse[];
        results?: StudentGradeApiResponse[];
        id?: string;
      };
      const list =
        wrapped.value ??
        wrapped.data ??
        wrapped.content ??
        wrapped.items ??
        wrapped.results;
      if (Array.isArray(list)) {
        return list;
      }
      if (wrapped.id) {
        return [response as StudentGradeApiResponse];
      }
    }
    return [];
  }
}
