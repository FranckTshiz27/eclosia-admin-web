import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateFeeCategoryDto {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
  allowInstallments?: boolean;
  comment?: string;
  schoolId: string;
}

export type UpdateFeeCategoryDto = CreateFeeCategoryDto;

export interface FeeCategoryApiResponse {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  active?: boolean;
  allowInstallments?: boolean;
  allow_installments?: boolean;
  comment?: string | null;
  schoolId?: string;
  school_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type FeeCategoryListPayload =
  | FeeCategoryApiResponse[]
  | {
      value?: FeeCategoryApiResponse[];
      data?: FeeCategoryApiResponse[];
      content?: FeeCategoryApiResponse[];
      items?: FeeCategoryApiResponse[];
      results?: FeeCategoryApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class FeeCategoryService {
  private readonly endpoint = API_ENDPOINTS.feeCategory;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateFeeCategoryDto): Observable<FeeCategoryApiResponse> {
    return this.http.post<FeeCategoryApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateFeeCategoryDto): Observable<FeeCategoryApiResponse> {
    return this.http.put<FeeCategoryApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<FeeCategoryApiResponse> {
    return this.http.get<FeeCategoryApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(schoolId?: string): Observable<FeeCategoryApiResponse[]> {
    let params = new HttpParams();
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    }

    return this.http.get<FeeCategoryListPayload>(this.endpoint, { params }).pipe(
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
