import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateSecurityModuleDto {
  code: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  displayOrder?: number;
  active?: boolean;
  systemModule?: boolean;
}

export type UpdateSecurityModuleDto = CreateSecurityModuleDto;

export interface SecurityModuleApiResponse {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  icon?: string | null;
  displayOrder?: number;
  display_order?: number;
  active?: boolean;
  systemModule?: boolean;
  system_module?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SecurityModuleListPayload =
  | SecurityModuleApiResponse[]
  | {
      value?: SecurityModuleApiResponse[];
      data?: SecurityModuleApiResponse[];
      content?: SecurityModuleApiResponse[];
      items?: SecurityModuleApiResponse[];
      results?: SecurityModuleApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class SecurityModuleService {
  private readonly endpoint = API_ENDPOINTS.securityModule;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateSecurityModuleDto): Observable<SecurityModuleApiResponse> {
    return this.http.post<SecurityModuleApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateSecurityModuleDto): Observable<SecurityModuleApiResponse> {
    return this.http.put<SecurityModuleApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<SecurityModuleApiResponse> {
    return this.http.get<SecurityModuleApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(): Observable<SecurityModuleApiResponse[]> {
    return this.http
      .get<SecurityModuleListPayload>(this.endpoint)
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapList(response: SecurityModuleListPayload): SecurityModuleApiResponse[] {
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
