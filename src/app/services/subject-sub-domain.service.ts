import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateSubjectSubDomainDto {
  subjectDomainId: string;
  code: string;
  name: string;
  displayOrder?: number;
  active?: boolean;
}

export type UpdateSubjectSubDomainDto = CreateSubjectSubDomainDto;

export interface SubjectSubDomainApiResponse {
  id?: string;
  code?: string;
  name?: string;
  displayOrder?: number;
  display_order?: number;
  active?: boolean;
  subjectDomainId?: string;
  subject_domain_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SubjectSubDomainListPayload =
  | SubjectSubDomainApiResponse[]
  | {
      value?: SubjectSubDomainApiResponse[];
      data?: SubjectSubDomainApiResponse[];
      content?: SubjectSubDomainApiResponse[];
      items?: SubjectSubDomainApiResponse[];
      results?: SubjectSubDomainApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class SubjectSubDomainService {
  private readonly endpoint = API_ENDPOINTS.subjectSubDomain;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateSubjectSubDomainDto): Observable<SubjectSubDomainApiResponse> {
    return this.http.post<SubjectSubDomainApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateSubjectSubDomainDto): Observable<SubjectSubDomainApiResponse> {
    return this.http.put<SubjectSubDomainApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<SubjectSubDomainApiResponse> {
    return this.http.get<SubjectSubDomainApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(subjectDomainId?: string): Observable<SubjectSubDomainApiResponse[]> {
    let params = new HttpParams();
    if (subjectDomainId) {
      params = params.set('subjectDomainId', subjectDomainId);
    }

    return this.http.get<SubjectSubDomainListPayload>(this.endpoint, { params }).pipe(
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
