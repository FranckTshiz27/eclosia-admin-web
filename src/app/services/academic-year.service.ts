import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

/** Année scolaire nationale (référentiel pays). */
export interface AcademicYear {
  id: string;
  countryId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAcademicYearDto {
  countryId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  active?: boolean;
}

export type UpdateAcademicYearDto = CreateAcademicYearDto;

export interface AcademicYearApiResponse {
  id?: string;
  countryId?: string;
  country_id?: string;
  code?: string;
  name?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  active?: boolean;
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
  /** Préféré : années du pays. */
  countryId?: string;
  /** Convenience backend : résout le pays de l'école. */
  schoolId?: string;
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
    if (query.countryId) {
      params = params.set('countryId', query.countryId);
    }
    if (query.schoolId) {
      params = params.set('schoolId', query.schoolId);
    }

    return this.http.get<AcademicYearListPayload | AcademicYearApiResponse>(this.endpoint, { params }).pipe(
      map((response) => this.unwrapList(response))
    );
  }

  /** Libellé d'affichage standard. */
  static buildLabel(row: AcademicYearApiResponse): string {
    const name = (row.name ?? '').trim();
    if (name) {
      return name;
    }
    const code = (row.code ?? '').trim();
    if (code) {
      return code;
    }
    const start = row.startDate ?? row.start_date;
    const end = row.endDate ?? row.end_date;
    if (start && end) {
      const startYear = new Date(start).getFullYear();
      const endYear = new Date(end).getFullYear();
      if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
        return `${startYear}-${endYear}`;
      }
    }
    return 'Année scolaire';
  }

  private unwrapList(
    response: AcademicYearListPayload | AcademicYearApiResponse
  ): AcademicYearApiResponse[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const wrapped = response as {
        value?: AcademicYearApiResponse[];
        data?: AcademicYearApiResponse[];
        content?: AcademicYearApiResponse[];
        items?: AcademicYearApiResponse[];
        results?: AcademicYearApiResponse[];
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
        return [response as AcademicYearApiResponse];
      }
    }
    return [];
  }
}
