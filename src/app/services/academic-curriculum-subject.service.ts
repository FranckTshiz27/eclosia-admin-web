import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateAcademicCurriculumSubjectDto {
  academicCurriculumId: string;
  subjectId: string;
  coefficient: number;
  maximumPoints: number;
  displayOrder: number;
  mandatory?: boolean;
  active?: boolean;
}

export type UpdateAcademicCurriculumSubjectDto = CreateAcademicCurriculumSubjectDto;

export interface AcademicCurriculumSubjectApiResponse {
  id?: string;
  academicCurriculumId?: string;
  academic_curriculum_id?: string;
  subjectId?: string;
  subject_id?: string;
  coefficient?: number | string;
  maximumPoints?: number | string;
  maximum_points?: number | string;
  displayOrder?: number;
  display_order?: number;
  mandatory?: boolean;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface AcademicCurriculumSubjectQuery {
  academicCurriculumId?: string;
  subjectId?: string;
}

type AcademicCurriculumSubjectListPayload =
  | AcademicCurriculumSubjectApiResponse[]
  | {
      value?: AcademicCurriculumSubjectApiResponse[];
      data?: AcademicCurriculumSubjectApiResponse[];
      content?: AcademicCurriculumSubjectApiResponse[];
      items?: AcademicCurriculumSubjectApiResponse[];
      results?: AcademicCurriculumSubjectApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class AcademicCurriculumSubjectService {
  private readonly endpoint = API_ENDPOINTS.academicCurriculumSubject;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateAcademicCurriculumSubjectDto): Observable<AcademicCurriculumSubjectApiResponse> {
    return this.http.post<AcademicCurriculumSubjectApiResponse>(this.endpoint, dto);
  }

  update(
    id: string,
    dto: UpdateAcademicCurriculumSubjectDto
  ): Observable<AcademicCurriculumSubjectApiResponse> {
    return this.http.put<AcademicCurriculumSubjectApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<AcademicCurriculumSubjectApiResponse> {
    return this.http.get<AcademicCurriculumSubjectApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(
    query: AcademicCurriculumSubjectQuery = {}
  ): Observable<AcademicCurriculumSubjectApiResponse[]> {
    let params = new HttpParams();
    if (query.academicCurriculumId) {
      params = params.set('academicCurriculumId', query.academicCurriculumId);
    }
    if (query.subjectId) {
      params = params.set('subjectId', query.subjectId);
    }

    return this.http
      .get<AcademicCurriculumSubjectListPayload | AcademicCurriculumSubjectApiResponse>(
        this.endpoint,
        { params }
      )
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapList(
    response: AcademicCurriculumSubjectListPayload | AcademicCurriculumSubjectApiResponse
  ): AcademicCurriculumSubjectApiResponse[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const wrapped = response as {
        value?: AcademicCurriculumSubjectApiResponse[];
        data?: AcademicCurriculumSubjectApiResponse[];
        content?: AcademicCurriculumSubjectApiResponse[];
        items?: AcademicCurriculumSubjectApiResponse[];
        results?: AcademicCurriculumSubjectApiResponse[];
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
        return [response as AcademicCurriculumSubjectApiResponse];
      }
    }
    return [];
  }
}
