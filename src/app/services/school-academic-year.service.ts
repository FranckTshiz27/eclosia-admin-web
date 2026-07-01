import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateSchoolAcademicYearDto {
  schoolId: string;
  label: string;
  startDate: string;
  endDate?: string;
  active?: boolean;
}

export type UpdateSchoolAcademicYearDto = CreateSchoolAcademicYearDto;

export interface SchoolAcademicYearApiResponse {
  id?: string;
  schoolId?: string;
  school_id?: string;
  label?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string | null;
  end_date?: string | null;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SchoolAcademicYearListPayload =
  | SchoolAcademicYearApiResponse[]
  | {
      value?: SchoolAcademicYearApiResponse[];
      data?: SchoolAcademicYearApiResponse[];
      content?: SchoolAcademicYearApiResponse[];
      items?: SchoolAcademicYearApiResponse[];
      results?: SchoolAcademicYearApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class SchoolAcademicYearService {
  private readonly endpoint = API_ENDPOINTS.schoolAcademicYear;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateSchoolAcademicYearDto): Observable<SchoolAcademicYearApiResponse> {
    return this.http.post<SchoolAcademicYearApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateSchoolAcademicYearDto): Observable<SchoolAcademicYearApiResponse> {
    return this.http.put<SchoolAcademicYearApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<SchoolAcademicYearApiResponse> {
    return this.http.get<SchoolAcademicYearApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(schoolId?: string): Observable<SchoolAcademicYearApiResponse[]> {
    let params = new HttpParams();
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    }

    return this.http.get<SchoolAcademicYearListPayload>(this.endpoint, { params }).pipe(
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
