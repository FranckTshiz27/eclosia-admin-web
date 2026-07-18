import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateSubjectDomainDto {
  countryId: string;
  code: string;
  name: string;
  displayOrder?: number;
  active?: boolean;
}

export type UpdateSubjectDomainDto = CreateSubjectDomainDto;

export interface SubjectDomainApiResponse {
  id?: string;
  code?: string;
  name?: string;
  displayOrder?: number;
  display_order?: number;
  active?: boolean;
  countryId?: string;
  country_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SubjectDomainListPayload =
  | SubjectDomainApiResponse[]
  | {
      value?: SubjectDomainApiResponse[];
      data?: SubjectDomainApiResponse[];
      content?: SubjectDomainApiResponse[];
      items?: SubjectDomainApiResponse[];
      results?: SubjectDomainApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class SubjectDomainService {
  private readonly endpoint = API_ENDPOINTS.subjectDomain;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateSubjectDomainDto): Observable<SubjectDomainApiResponse> {
    return this.http.post<SubjectDomainApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateSubjectDomainDto): Observable<SubjectDomainApiResponse> {
    return this.http.put<SubjectDomainApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<SubjectDomainApiResponse> {
    return this.http.get<SubjectDomainApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(countryId?: string): Observable<SubjectDomainApiResponse[]> {
    let params = new HttpParams();
    if (countryId) {
      params = params.set('countryId', countryId);
    }

    return this.http.get<SubjectDomainListPayload | SubjectDomainApiResponse>(this.endpoint, { params }).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }
        if (response && typeof response === 'object') {
          const wrapped = response as {
            value?: SubjectDomainApiResponse[];
            data?: SubjectDomainApiResponse[];
            content?: SubjectDomainApiResponse[];
            items?: SubjectDomainApiResponse[];
            results?: SubjectDomainApiResponse[];
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
          // Certains backends renvoient un objet unique au lieu d'un tableau
          if (wrapped.id) {
            return [response as SubjectDomainApiResponse];
          }
        }
        return [];
      })
    );
  }
}
