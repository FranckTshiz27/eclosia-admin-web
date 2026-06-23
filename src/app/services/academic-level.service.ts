import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateAcademicLevelDto {
  code: string;
  name: string;
  levelOrder: number;
  requiresSection?: boolean;
  requiresOption?: boolean;
  active?: boolean;
  academicCycleId: string;
}

export type UpdateAcademicLevelDto = CreateAcademicLevelDto;

export interface AcademicLevelCycleApiResponse {
  id?: string;
  code?: string;
  name?: string;
}

export interface AcademicLevelApiResponse {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  abbreviation?: string | null;
  levelOrder?: number;
  level_order?: number;
  displayOrder?: number;
  display_order?: number;
  requiresSection?: boolean;
  requires_section?: boolean;
  requiresOption?: boolean;
  requires_option?: boolean;
  sectionRequired?: boolean;
  section_required?: boolean;
  optionRequired?: boolean;
  option_required?: boolean;
  active?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  academicCycle?: AcademicLevelCycleApiResponse | null;
  academicCycleId?: string;
  academic_cycle_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type AcademicLevelListPayload =
  | AcademicLevelApiResponse[]
  | {
      value?: AcademicLevelApiResponse[];
      data?: AcademicLevelApiResponse[];
      content?: AcademicLevelApiResponse[];
      items?: AcademicLevelApiResponse[];
      results?: AcademicLevelApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class AcademicLevelService {
  private readonly endpoint = API_ENDPOINTS.academicLevel;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateAcademicLevelDto): Observable<AcademicLevelApiResponse> {
    return this.http.post<AcademicLevelApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateAcademicLevelDto): Observable<AcademicLevelApiResponse> {
    return this.http.put<AcademicLevelApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  getAll(): Observable<AcademicLevelApiResponse[]> {
    return this.http.get<AcademicLevelListPayload>(this.endpoint).pipe(
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
