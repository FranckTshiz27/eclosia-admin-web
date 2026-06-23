import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateAcademicSectionDto {
  code: string;
  name: string;
  description?: string;
  displayOrder?: number;
  active?: boolean;
  academicCycleId: string;
}

export type UpdateAcademicSectionDto = CreateAcademicSectionDto;

export interface AcademicSectionCycleApiResponse {
  id?: string;
  code?: string;
  name?: string;
}

export interface AcademicSectionApiResponse {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  displayOrder?: number;
  display_order?: number;
  active?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  academicCycle?: AcademicSectionCycleApiResponse | null;
  academicCycleId?: string;
  academic_cycle_id?: string;
  optionsCount?: number;
  options_count?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type AcademicSectionListPayload =
  | AcademicSectionApiResponse[]
  | {
      value?: AcademicSectionApiResponse[];
      data?: AcademicSectionApiResponse[];
      content?: AcademicSectionApiResponse[];
      items?: AcademicSectionApiResponse[];
      results?: AcademicSectionApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class AcademicSectionService {
  private readonly endpoint = API_ENDPOINTS.academicSection;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateAcademicSectionDto): Observable<AcademicSectionApiResponse> {
    return this.http.post<AcademicSectionApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateAcademicSectionDto): Observable<AcademicSectionApiResponse> {
    return this.http.put<AcademicSectionApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<AcademicSectionApiResponse> {
    return this.http.get<AcademicSectionApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(): Observable<AcademicSectionApiResponse[]> {
    return this.http.get<AcademicSectionListPayload>(this.endpoint).pipe(
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
