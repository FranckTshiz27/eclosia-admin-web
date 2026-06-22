import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateAcademicCycleDto {
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  durationYears: number;
  active: boolean;
  academicModelId: string;
}

export type UpdateAcademicCycleDto = CreateAcademicCycleDto;

export interface AcademicCycleModelApiResponse {
  id?: string;
  code?: string;
  name?: string;
  version?: string | number;
}

export interface AcademicCycleApiResponse {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  displayOrder?: number;
  display_order?: number;
  durationYears?: number;
  duration_years?: number;
  active?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  academicModel?: AcademicCycleModelApiResponse | null;
  academicModelId?: string;
  academic_model_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type AcademicCycleListPayload =
  | AcademicCycleApiResponse[]
  | {
      data?: AcademicCycleApiResponse[];
      content?: AcademicCycleApiResponse[];
      items?: AcademicCycleApiResponse[];
      results?: AcademicCycleApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class AcademicCycleService {
  private readonly endpoint = API_ENDPOINTS.academicCycle;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateAcademicCycleDto): Observable<AcademicCycleApiResponse> {
    return this.http.post<AcademicCycleApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateAcademicCycleDto): Observable<AcademicCycleApiResponse> {
    return this.http.put<AcademicCycleApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  getAll(): Observable<AcademicCycleApiResponse[]> {
    return this.http.get<AcademicCycleListPayload>(this.endpoint).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.data ?? response.content ?? response.items ?? response.results ?? [];
      })
    );
  }
}
