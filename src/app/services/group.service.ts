import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateGroupDto {
  name: string;
  email: string;
  phone?: string;
  description?: string;
  status: 'Actif' | 'Inactif';
  logo?: string;
}

export interface GroupApiResponse {
  id?: number | string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  status: 'Actif' | 'Inactif' | boolean;
  isActive?: boolean;
  active?: boolean;
  logo?: string;
  schools?: number;
  createdAt?: string;
  created_at?: string;
  dateCreation?: string;
}

interface GroupUpsertPayload {
  name: string;
  email: string;
  phone?: string;
  description?: string;
  status: boolean;
  logo?: string;
}

type GroupListPayload =
  | GroupApiResponse[]
  | {
      data?: GroupApiResponse[];
      content?: GroupApiResponse[];
      items?: GroupApiResponse[];
      results?: GroupApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private readonly endpoint = API_ENDPOINTS.group;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateGroupDto): Observable<GroupApiResponse> {
    return this.http.post<GroupApiResponse>(this.endpoint, this.toApiPayload(dto));
  }

  update(id: string | number, dto: CreateGroupDto): Observable<GroupApiResponse> {
    return this.http.put<GroupApiResponse>(`${this.endpoint}/${id}`, this.toApiPayload(dto));
  }

  getAll(): Observable<GroupApiResponse[]> {
    return this.http.get<GroupListPayload>(this.endpoint).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.data ?? response.content ?? response.items ?? response.results ?? [];
      })
    );
  }

  private toApiPayload(dto: CreateGroupDto): GroupUpsertPayload {
    return {
      ...dto,
      status: dto.status === 'Actif'
    };
  }
}
