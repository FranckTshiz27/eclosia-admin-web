import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateAcademicOptionDto {
  code: string;
  name: string;
  description?: string;
  displayOrder?: number;
  active?: boolean;
  academicSectionId: string;
}

export type UpdateAcademicOptionDto = CreateAcademicOptionDto;

export interface AcademicOptionApiResponse {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  displayOrder?: number;
  display_order?: number;
  active?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  academicSectionId?: string;
  academic_section_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type AcademicOptionListPayload =
  | AcademicOptionApiResponse[]
  | {
      value?: AcademicOptionApiResponse[];
      data?: AcademicOptionApiResponse[];
      content?: AcademicOptionApiResponse[];
      items?: AcademicOptionApiResponse[];
      results?: AcademicOptionApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class AcademicOptionService {
  private readonly endpoint = API_ENDPOINTS.academicOption;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateAcademicOptionDto): Observable<AcademicOptionApiResponse> {
    return this.http.post<AcademicOptionApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateAcademicOptionDto): Observable<AcademicOptionApiResponse> {
    return this.http.put<AcademicOptionApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<AcademicOptionApiResponse> {
    return this.http.get<AcademicOptionApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(academicSectionId?: string): Observable<AcademicOptionApiResponse[]> {
    let params = new HttpParams();
    if (academicSectionId) {
      params = params.set('academicSectionId', academicSectionId);
    }

    return this.http.get<AcademicOptionListPayload>(this.endpoint, { params }).pipe(
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
