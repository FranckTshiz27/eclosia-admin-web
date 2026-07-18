import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateSubjectDto {
  countryId: string;
  subjectDomainId?: string | null;
  subjectSubDomainId?: string | null;
  code: string;
  name: string;
  abbreviation?: string | null;
  displayOrder?: number;
  active?: boolean;
}

export type UpdateSubjectDto = CreateSubjectDto;

export interface SubjectApiResponse {
  id?: string;
  code?: string;
  name?: string;
  abbreviation?: string | null;
  displayOrder?: number;
  display_order?: number;
  active?: boolean;
  countryId?: string;
  country_id?: string;
  subjectDomainId?: string | null;
  subject_domain_id?: string | null;
  subjectSubDomainId?: string | null;
  subject_sub_domain_id?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SubjectListPayload =
  | SubjectApiResponse[]
  | {
      value?: SubjectApiResponse[];
      data?: SubjectApiResponse[];
      content?: SubjectApiResponse[];
      items?: SubjectApiResponse[];
      results?: SubjectApiResponse[];
    };

export interface SubjectListFilters {
  countryId?: string;
  subjectDomainId?: string;
  subjectSubDomainId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private readonly endpoint = API_ENDPOINTS.subject;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateSubjectDto): Observable<SubjectApiResponse> {
    return this.http.post<SubjectApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateSubjectDto): Observable<SubjectApiResponse> {
    return this.http.put<SubjectApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<SubjectApiResponse> {
    return this.http.get<SubjectApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(filters?: SubjectListFilters): Observable<SubjectApiResponse[]> {
    let params = new HttpParams();
    if (filters?.countryId) {
      params = params.set('countryId', filters.countryId);
    }
    if (filters?.subjectDomainId) {
      params = params.set('subjectDomainId', filters.subjectDomainId);
    }
    if (filters?.subjectSubDomainId) {
      params = params.set('subjectSubDomainId', filters.subjectSubDomainId);
    }

    return this.http.get<SubjectListPayload>(this.endpoint, { params }).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }
        if (response && typeof response === 'object') {
          const wrapped = response as SubjectListPayload & { id?: string };
          if (Array.isArray(wrapped)) {
            return wrapped;
          }
          const list =
            ('value' in wrapped && wrapped.value) ||
            ('data' in wrapped && wrapped.data) ||
            ('content' in wrapped && wrapped.content) ||
            ('items' in wrapped && wrapped.items) ||
            ('results' in wrapped && wrapped.results) ||
            null;
          if (Array.isArray(list)) {
            return list;
          }
          if (wrapped.id) {
            return [response as SubjectApiResponse];
          }
        }
        return [];
      })
    );
  }
}
