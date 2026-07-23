import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export type FeatureAction =
  | 'VIEW'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'IMPORT'
  | 'EXPORT'
  | 'VALIDATE'
  | 'PUBLISH'
  | 'PRINT'
  | 'DOWNLOAD'
  | 'ASSIGN'
  | 'UNASSIGN'
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | 'APPROVE'
  | 'REJECT'
  | 'RESET_PASSWORD';

export interface CreateFeatureDto {
  moduleId: string;
  action: FeatureAction;
  name: string;
  description?: string | null;
  displayOrder?: number;
  active?: boolean;
  systemFeature?: boolean;
}

export type UpdateFeatureDto = CreateFeatureDto;

export interface FeatureApiResponse {
  id?: string;
  moduleId?: string;
  module_id?: string;
  action?: FeatureAction | string;
  name?: string;
  description?: string | null;
  code?: string;
  displayOrder?: number;
  display_order?: number;
  active?: boolean;
  systemFeature?: boolean;
  system_feature?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface FeatureQuery {
  moduleId?: string;
}

type FeatureListPayload =
  | FeatureApiResponse[]
  | {
      value?: FeatureApiResponse[];
      data?: FeatureApiResponse[];
      content?: FeatureApiResponse[];
      items?: FeatureApiResponse[];
      results?: FeatureApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class FeatureService {
  private readonly endpoint = API_ENDPOINTS.feature;

  constructor(private readonly http: HttpClient) {}

  create(dtos: CreateFeatureDto[]): Observable<FeatureApiResponse[]> {
    return this.http
      .post<FeatureListPayload | FeatureApiResponse[]>(this.endpoint, dtos)
      .pipe(map((response) => this.unwrapList(response)));
  }

  update(id: string, dto: UpdateFeatureDto): Observable<FeatureApiResponse> {
    return this.http.put<FeatureApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<FeatureApiResponse> {
    return this.http.get<FeatureApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: FeatureQuery = {}): Observable<FeatureApiResponse[]> {
    let params = new HttpParams();
    if (query.moduleId) {
      params = params.set('moduleId', query.moduleId);
    }

    return this.http
      .get<FeatureListPayload>(this.endpoint, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapList(response: FeatureListPayload): FeatureApiResponse[] {
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
  }
}
