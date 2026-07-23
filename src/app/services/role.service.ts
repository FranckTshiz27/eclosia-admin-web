import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateRoleDto {
  code: string;
  name: string;
  description?: string | null;
  systemRole?: boolean;
  active?: boolean;
  displayOrder?: number;
}

export type UpdateRoleDto = CreateRoleDto;

export interface RoleApiResponse {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  systemRole?: boolean;
  system_role?: boolean;
  active?: boolean;
  displayOrder?: number;
  display_order?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type RoleListPayload =
  | RoleApiResponse[]
  | {
      value?: RoleApiResponse[];
      data?: RoleApiResponse[];
      content?: RoleApiResponse[];
      items?: RoleApiResponse[];
      results?: RoleApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly endpoint = API_ENDPOINTS.role;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateRoleDto): Observable<RoleApiResponse> {
    return this.http.post<RoleApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateRoleDto): Observable<RoleApiResponse> {
    return this.http.put<RoleApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<RoleApiResponse> {
    return this.http.get<RoleApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(): Observable<RoleApiResponse[]> {
    return this.http
      .get<RoleListPayload>(this.endpoint)
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapList(response: RoleListPayload): RoleApiResponse[] {
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
