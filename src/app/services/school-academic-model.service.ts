import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateSchoolAcademicModelDto {
  schoolId: string;
  academicModelId: string;
  startDate: string;
  endDate?: string;
  active?: boolean;
  comment?: string;
}

export type UpdateSchoolAcademicModelDto = CreateSchoolAcademicModelDto;

export interface SchoolAcademicModelApiResponse {
  id?: string;
  schoolId?: string;
  school_id?: string;
  academicModelId?: string;
  academic_model_id?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string | null;
  end_date?: string | null;
  active?: boolean;
  comment?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SchoolAcademicModelListPayload =
  | SchoolAcademicModelApiResponse[]
  | {
      value?: SchoolAcademicModelApiResponse[];
      data?: SchoolAcademicModelApiResponse[];
      content?: SchoolAcademicModelApiResponse[];
      items?: SchoolAcademicModelApiResponse[];
      results?: SchoolAcademicModelApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class SchoolAcademicModelService {
  private readonly endpoint = API_ENDPOINTS.schoolAcademicModel;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateSchoolAcademicModelDto): Observable<SchoolAcademicModelApiResponse> {
    return this.http.post<SchoolAcademicModelApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateSchoolAcademicModelDto): Observable<SchoolAcademicModelApiResponse> {
    return this.http.put<SchoolAcademicModelApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<SchoolAcademicModelApiResponse> {
    return this.http.get<SchoolAcademicModelApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(filters?: { schoolId?: string; academicModelId?: string }): Observable<SchoolAcademicModelApiResponse[]> {
    let params = new HttpParams();
    if (filters?.schoolId) {
      params = params.set('schoolId', filters.schoolId);
    }
    if (filters?.academicModelId) {
      params = params.set('academicModelId', filters.academicModelId);
    }

    return this.http.get<SchoolAcademicModelListPayload>(this.endpoint, { params }).pipe(
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
