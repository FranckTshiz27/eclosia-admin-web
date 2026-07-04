import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateSchoolCurrencyDto {
  schoolId: string;
  currencyId: string;
  isDefault?: boolean;
  active?: boolean;
  comment?: string;
}

export type UpdateSchoolCurrencyDto = CreateSchoolCurrencyDto;

export interface SchoolCurrencyApiResponse {
  id?: string;
  schoolId?: string;
  school_id?: string;
  currencyId?: string;
  currency_id?: string;
  isDefault?: boolean;
  is_default?: boolean;
  active?: boolean;
  comment?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SchoolCurrencyListPayload =
  | SchoolCurrencyApiResponse[]
  | {
      value?: SchoolCurrencyApiResponse[];
      data?: SchoolCurrencyApiResponse[];
      content?: SchoolCurrencyApiResponse[];
      items?: SchoolCurrencyApiResponse[];
      results?: SchoolCurrencyApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class SchoolCurrencyService {
  private readonly endpoint = API_ENDPOINTS.schoolCurrency;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateSchoolCurrencyDto): Observable<SchoolCurrencyApiResponse> {
    return this.http.post<SchoolCurrencyApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateSchoolCurrencyDto): Observable<SchoolCurrencyApiResponse> {
    return this.http.put<SchoolCurrencyApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<SchoolCurrencyApiResponse> {
    return this.http.get<SchoolCurrencyApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(schoolId?: string): Observable<SchoolCurrencyApiResponse[]> {
    let params = new HttpParams();
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    }

    return this.http.get<SchoolCurrencyListPayload>(this.endpoint, { params }).pipe(
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
