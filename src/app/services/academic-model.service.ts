import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateAcademicModelDto {
  code: string;
  name: string;
  version: string;
  startYear: number;
  endYear?: number;
  active?: boolean;
  countryId: string;
}

export type UpdateAcademicModelDto = CreateAcademicModelDto;

export interface AcademicModelCountryApiResponse {
  id?: string;
  nameFr?: string;
  nameEn?: string;
  name_fr?: string;
  name_en?: string;
  iso2?: string;
  iso3?: string;
}

export interface AcademicModelApiResponse {
  id?: string;
  code?: string;
  name?: string;
  version?: string | number;
  startYear?: number;
  start_year?: number;
  endYear?: number | null;
  end_year?: number | null;
  active?: boolean;
  country?: AcademicModelCountryApiResponse | null;
  countryId?: string;
  country_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type AcademicModelListPayload =
  | AcademicModelApiResponse[]
  | {
      data?: AcademicModelApiResponse[];
      content?: AcademicModelApiResponse[];
      items?: AcademicModelApiResponse[];
      results?: AcademicModelApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class AcademicModelService {
  private readonly endpoint = API_ENDPOINTS.academicModel;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateAcademicModelDto): Observable<AcademicModelApiResponse> {
    return this.http.post<AcademicModelApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateAcademicModelDto): Observable<AcademicModelApiResponse> {
    return this.http.put<AcademicModelApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  getAll(): Observable<AcademicModelApiResponse[]> {
    return this.http.get<AcademicModelListPayload>(this.endpoint).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.data ?? response.content ?? response.items ?? response.results ?? [];
      })
    );
  }
}
