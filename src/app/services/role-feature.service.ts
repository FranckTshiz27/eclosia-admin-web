import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateRoleFeatureDto {
  roleId: string;
  featureId: string;
  active?: boolean;
}

export type UpdateRoleFeatureDto = CreateRoleFeatureDto;

export interface RoleFeatureApiResponse {
  id?: string;
  roleId?: string;
  role_id?: string;
  featureId?: string;
  feature_id?: string;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface RoleFeatureQuery {
  roleId?: string;
  featureId?: string;
}

type RoleFeatureListPayload =
  | RoleFeatureApiResponse[]
  | {
      value?: RoleFeatureApiResponse[];
      data?: RoleFeatureApiResponse[];
      content?: RoleFeatureApiResponse[];
      items?: RoleFeatureApiResponse[];
      results?: RoleFeatureApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class RoleFeatureService {
  private readonly endpoint = API_ENDPOINTS.roleFeature;

  constructor(private readonly http: HttpClient) {}

  create(dtos: CreateRoleFeatureDto[]): Observable<RoleFeatureApiResponse[]> {
    return this.http
      .post<RoleFeatureListPayload | RoleFeatureApiResponse[]>(this.endpoint, dtos)
      .pipe(map((response) => this.unwrapList(response)));
  }

  update(id: string, dto: UpdateRoleFeatureDto): Observable<RoleFeatureApiResponse> {
    return this.http.put<RoleFeatureApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<RoleFeatureApiResponse> {
    return this.http.get<RoleFeatureApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: RoleFeatureQuery = {}): Observable<RoleFeatureApiResponse[]> {
    let params = new HttpParams();
    if (query.roleId) {
      params = params.set('roleId', query.roleId);
    }
    if (query.featureId) {
      params = params.set('featureId', query.featureId);
    }

    return this.http
      .get<RoleFeatureListPayload>(this.endpoint, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapList(response: RoleFeatureListPayload | RoleFeatureApiResponse[]): RoleFeatureApiResponse[] {
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
