import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateUserDto {
  username: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  password: string;
  temporaryPassword?: boolean;
  roleIds: string[];
  groupId?: string | null;
  schoolIds?: string[];
  active?: boolean;
}

export interface UpdateUserDto {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roleIds: string[];
  groupId?: string | null;
  schoolIds?: string[];
  active?: boolean;
}

export interface UserApiResponse {
  id?: string;
  keycloakId?: string;
  keycloak_id?: string;
  username?: string;
  email?: string | null;
  firstName?: string | null;
  first_name?: string | null;
  lastName?: string | null;
  last_name?: string | null;
  groupId?: string;
  group_id?: string;
  roleIds?: string[];
  role_ids?: string[];
  schoolIds?: string[];
  school_ids?: string[];
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface UserListFilters {
  groupId?: string;
  schoolId?: string;
  roleId?: string;
}

type UserListPayload =
  | UserApiResponse[]
  | {
      value?: UserApiResponse[];
      data?: UserApiResponse[];
      content?: UserApiResponse[];
      items?: UserApiResponse[];
      results?: UserApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly endpoint = API_ENDPOINTS.user;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateUserDto): Observable<UserApiResponse> {
    return this.http.post<UserApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateUserDto): Observable<UserApiResponse> {
    return this.http.put<UserApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<UserApiResponse> {
    return this.http.get<UserApiResponse>(`${this.endpoint}/${id}`);
  }

  getByKeycloakId(keycloakId: string): Observable<UserApiResponse> {
    return this.http.get<UserApiResponse>(`${this.endpoint}/by-keycloak/${keycloakId}`);
  }

  getAll(filters?: UserListFilters): Observable<UserApiResponse[]> {
    let params = new HttpParams();
    if (filters?.schoolId) {
      params = params.set('schoolId', filters.schoolId);
    } else if (filters?.groupId) {
      params = params.set('groupId', filters.groupId);
    } else if (filters?.roleId) {
      params = params.set('roleId', filters.roleId);
    }

    return this.http
      .get<UserListPayload>(this.endpoint, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapList(response: UserListPayload): UserApiResponse[] {
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
