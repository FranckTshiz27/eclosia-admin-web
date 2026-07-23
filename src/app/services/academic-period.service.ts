import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export type AcademicPeriodType = 'PERIOD' | 'EXAM';

export interface CreateAcademicPeriodDto {
  academicTermId: string;
  code: string;
  name: string;
  periodType: AcademicPeriodType;
  displayOrder: number;
  maximumScoreRatio: number;
  active?: boolean;
}

export type UpdateAcademicPeriodDto = CreateAcademicPeriodDto;

export interface AcademicPeriodApiResponse {
  id?: string;
  academicTermId?: string;
  academic_term_id?: string;
  code?: string;
  name?: string;
  periodType?: AcademicPeriodType | string;
  period_type?: AcademicPeriodType | string;
  displayOrder?: number;
  display_order?: number;
  maximumScoreRatio?: number | string;
  maximum_score_ratio?: number | string;
  /** @deprecated ancien contrat */
  orderNumber?: number;
  order_number?: number;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface AcademicPeriodQuery {
  academicTermId?: string;
}

type AcademicPeriodListPayload =
  | AcademicPeriodApiResponse[]
  | {
      value?: AcademicPeriodApiResponse[];
      data?: AcademicPeriodApiResponse[];
      content?: AcademicPeriodApiResponse[];
      items?: AcademicPeriodApiResponse[];
      results?: AcademicPeriodApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class AcademicPeriodService {
  private readonly endpoint = API_ENDPOINTS.academicPeriod;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateAcademicPeriodDto): Observable<AcademicPeriodApiResponse> {
    return this.http.post<AcademicPeriodApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateAcademicPeriodDto): Observable<AcademicPeriodApiResponse> {
    return this.http.put<AcademicPeriodApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<AcademicPeriodApiResponse> {
    return this.http.get<AcademicPeriodApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: AcademicPeriodQuery | string = {}): Observable<AcademicPeriodApiResponse[]> {
    const normalized: AcademicPeriodQuery =
      typeof query === 'string' ? { academicTermId: query } : query ?? {};

    let params = new HttpParams();
    if (normalized.academicTermId) {
      params = params.set('academicTermId', normalized.academicTermId);
    }

    return this.http
      .get<AcademicPeriodListPayload | AcademicPeriodApiResponse>(this.endpoint, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapList(
    response: AcademicPeriodListPayload | AcademicPeriodApiResponse
  ): AcademicPeriodApiResponse[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const wrapped = response as {
        value?: AcademicPeriodApiResponse[];
        data?: AcademicPeriodApiResponse[];
        content?: AcademicPeriodApiResponse[];
        items?: AcademicPeriodApiResponse[];
        results?: AcademicPeriodApiResponse[];
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
        return [response as AcademicPeriodApiResponse];
      }
    }
    return [];
  }
}
