import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export type RateSource = 'MANUAL';

export interface CreateCurrencyRateDto {
  schoolId: string;
  sourceCurrencyId: string;
  targetCurrencyId: string;
  rate: number;
  effectiveDate: string;
  source?: RateSource;
  comment?: string;
  active?: boolean;
}

export type UpdateCurrencyRateDto = CreateCurrencyRateDto;

export interface CurrencyRateApiResponse {
  id?: string;
  schoolId?: string;
  school_id?: string;
  sourceCurrencyId?: string;
  source_currency_id?: string;
  targetCurrencyId?: string;
  target_currency_id?: string;
  rate?: number;
  effectiveDate?: string;
  effective_date?: string;
  source?: RateSource | string;
  rate_source?: RateSource | string;
  comment?: string | null;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface CurrencyRateQuery {
  schoolId?: string;
  sourceCurrencyId?: string;
  targetCurrencyId?: string;
}

type CurrencyRateListPayload =
  | CurrencyRateApiResponse[]
  | {
      value?: CurrencyRateApiResponse[];
      data?: CurrencyRateApiResponse[];
      content?: CurrencyRateApiResponse[];
      items?: CurrencyRateApiResponse[];
      results?: CurrencyRateApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class CurrencyRateService {
  private readonly endpoint = API_ENDPOINTS.currencyRate;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateCurrencyRateDto): Observable<CurrencyRateApiResponse> {
    return this.http.post<CurrencyRateApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateCurrencyRateDto): Observable<CurrencyRateApiResponse> {
    return this.http.put<CurrencyRateApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<CurrencyRateApiResponse> {
    return this.http.get<CurrencyRateApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: CurrencyRateQuery = {}): Observable<CurrencyRateApiResponse[]> {
    let params = new HttpParams();
    if (query.schoolId) {
      params = params.set('schoolId', query.schoolId);
    }
    if (query.sourceCurrencyId) {
      params = params.set('sourceCurrencyId', query.sourceCurrencyId);
    }
    if (query.targetCurrencyId) {
      params = params.set('targetCurrencyId', query.targetCurrencyId);
    }

    return this.http.get<CurrencyRateListPayload>(this.endpoint, { params }).pipe(
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
