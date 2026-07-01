import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export type AcademicYearStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface CreateAcademicYearDto {
  code: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  status: AcademicYearStatus | string;
  description?: string;
  schoolId: string;
  schoolAcademicModelId: string;
}

export type UpdateAcademicYearDto = CreateAcademicYearDto;

export interface AcademicYearApiResponse {
  id?: string;
  code?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  current?: boolean;
  status?: AcademicYearStatus | string;
  description?: string | null;
  schoolId?: string;
  school_id?: string;
  schoolAcademicModelId?: string;
  school_academic_model_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type AcademicYearListPayload =
  | AcademicYearApiResponse[]
  | {
      value?: AcademicYearApiResponse[];
      data?: AcademicYearApiResponse[];
      content?: AcademicYearApiResponse[];
      items?: AcademicYearApiResponse[];
      results?: AcademicYearApiResponse[];
    };

export interface AcademicYearQuery {
  schoolId?: string;
  schoolAcademicModelId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AcademicYearService {
  private readonly endpoint = API_ENDPOINTS.academicYear;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateAcademicYearDto): Observable<AcademicYearApiResponse> {
    return this.http.post<AcademicYearApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateAcademicYearDto): Observable<AcademicYearApiResponse> {
    return this.http.put<AcademicYearApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<AcademicYearApiResponse> {
    return this.http.get<AcademicYearApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: AcademicYearQuery = {}): Observable<AcademicYearApiResponse[]> {
    let params = new HttpParams();
    if (query.schoolId) {
      params = params.set('schoolId', query.schoolId);
    }
    if (query.schoolAcademicModelId) {
      params = params.set('schoolAcademicModelId', query.schoolAcademicModelId);
    }

    return this.http.get<AcademicYearListPayload>(this.endpoint, { params }).pipe(
      map((response) => {
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
      })
    );
  }
}
