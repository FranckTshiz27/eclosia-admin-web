import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateAcademicTermDto {
  academicYearId: string;
  code: string;
  name: string;
  displayOrder: number;
  active?: boolean;
}

export type UpdateAcademicTermDto = CreateAcademicTermDto;

export interface AcademicTermApiResponse {
  id?: string;
  academicYearId?: string;
  academic_year_id?: string;
  code?: string;
  name?: string;
  displayOrder?: number;
  display_order?: number;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface AcademicTermQuery {
  academicYearId?: string;
}

type AcademicTermListPayload =
  | AcademicTermApiResponse[]
  | {
      value?: AcademicTermApiResponse[];
      data?: AcademicTermApiResponse[];
      content?: AcademicTermApiResponse[];
      items?: AcademicTermApiResponse[];
      results?: AcademicTermApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class AcademicTermService {
  private readonly endpoint = API_ENDPOINTS.academicTerm;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateAcademicTermDto): Observable<AcademicTermApiResponse> {
    return this.http.post<AcademicTermApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateAcademicTermDto): Observable<AcademicTermApiResponse> {
    return this.http.put<AcademicTermApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<AcademicTermApiResponse> {
    return this.http.get<AcademicTermApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: AcademicTermQuery = {}): Observable<AcademicTermApiResponse[]> {
    let params = new HttpParams();
    if (query.academicYearId) {
      params = params.set('academicYearId', query.academicYearId);
    }

    return this.http
      .get<AcademicTermListPayload | AcademicTermApiResponse>(this.endpoint, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapList(
    response: AcademicTermListPayload | AcademicTermApiResponse
  ): AcademicTermApiResponse[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const wrapped = response as {
        value?: AcademicTermApiResponse[];
        data?: AcademicTermApiResponse[];
        content?: AcademicTermApiResponse[];
        items?: AcademicTermApiResponse[];
        results?: AcademicTermApiResponse[];
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
        return [response as AcademicTermApiResponse];
      }
    }
    return [];
  }
}
