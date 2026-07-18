import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateAcademicCurriculumDto {
  academicYearId: string;
  academicCycleId: string;
  academicLevelId: string;
  academicSectionId?: string | null;
  academicOptionId?: string | null;
  code: string;
  name: string;
  active?: boolean;
}

export type UpdateAcademicCurriculumDto = CreateAcademicCurriculumDto;

export interface AcademicCurriculumApiResponse {
  id?: string;
  academicYearId?: string;
  academic_year_id?: string;
  academicCycleId?: string;
  academic_cycle_id?: string;
  academicLevelId?: string;
  academic_level_id?: string;
  academicSectionId?: string | null;
  academic_section_id?: string | null;
  academicOptionId?: string | null;
  academic_option_id?: string | null;
  code?: string;
  name?: string;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface AcademicCurriculumQuery {
  academicYearId?: string;
  countryId?: string;
  academicCycleId?: string;
  academicLevelId?: string;
}

type AcademicCurriculumListPayload =
  | AcademicCurriculumApiResponse[]
  | {
      value?: AcademicCurriculumApiResponse[];
      data?: AcademicCurriculumApiResponse[];
      content?: AcademicCurriculumApiResponse[];
      items?: AcademicCurriculumApiResponse[];
      results?: AcademicCurriculumApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class AcademicCurriculumService {
  private readonly endpoint = API_ENDPOINTS.academicCurriculum;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateAcademicCurriculumDto): Observable<AcademicCurriculumApiResponse> {
    return this.http.post<AcademicCurriculumApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateAcademicCurriculumDto): Observable<AcademicCurriculumApiResponse> {
    return this.http.put<AcademicCurriculumApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<AcademicCurriculumApiResponse> {
    return this.http.get<AcademicCurriculumApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: AcademicCurriculumQuery = {}): Observable<AcademicCurriculumApiResponse[]> {
    let params = new HttpParams();
    if (query.academicYearId) {
      params = params.set('academicYearId', query.academicYearId);
    }
    if (query.countryId) {
      params = params.set('countryId', query.countryId);
    }
    if (query.academicCycleId) {
      params = params.set('academicCycleId', query.academicCycleId);
    }
    if (query.academicLevelId) {
      params = params.set('academicLevelId', query.academicLevelId);
    }

    return this.http
      .get<AcademicCurriculumListPayload | AcademicCurriculumApiResponse>(this.endpoint, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapList(
    response: AcademicCurriculumListPayload | AcademicCurriculumApiResponse
  ): AcademicCurriculumApiResponse[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const wrapped = response as {
        value?: AcademicCurriculumApiResponse[];
        data?: AcademicCurriculumApiResponse[];
        content?: AcademicCurriculumApiResponse[];
        items?: AcademicCurriculumApiResponse[];
        results?: AcademicCurriculumApiResponse[];
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
        return [response as AcademicCurriculumApiResponse];
      }
    }
    return [];
  }
}
