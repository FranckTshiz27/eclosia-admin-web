import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export type CurrencySymbolPosition = 'BEFORE' | 'AFTER';

export interface CreateCurrencyDto {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  numericCode?: string;
  symbolPosition: CurrencySymbolPosition;
  active?: boolean;
  comment?: string;
}

export type UpdateCurrencyDto = CreateCurrencyDto;

export interface CurrencyApiResponse {
  id?: string;
  code?: string;
  name?: string;
  symbol?: string;
  decimalPlaces?: number;
  decimal_places?: number;
  numericCode?: string | null;
  numeric_code?: string | null;
  symbolPosition?: CurrencySymbolPosition;
  symbol_position?: CurrencySymbolPosition;
  active?: boolean;
  comment?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type CurrencyListPayload =
  | CurrencyApiResponse[]
  | {
      value?: CurrencyApiResponse[];
      data?: CurrencyApiResponse[];
      content?: CurrencyApiResponse[];
      items?: CurrencyApiResponse[];
      results?: CurrencyApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private readonly endpoint = API_ENDPOINTS.currency;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateCurrencyDto): Observable<CurrencyApiResponse> {
    return this.http.post<CurrencyApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateCurrencyDto): Observable<CurrencyApiResponse> {
    return this.http.put<CurrencyApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<CurrencyApiResponse> {
    return this.http.get<CurrencyApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(): Observable<CurrencyApiResponse[]> {
    return this.http.get<CurrencyListPayload>(this.endpoint).pipe(
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
