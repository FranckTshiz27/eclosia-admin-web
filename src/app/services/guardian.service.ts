import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export type GuardianGender = 'MALE' | 'FEMALE' | 'OTHER' | string;

export interface CreateGuardianDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: GuardianGender;
  phoneNumber?: string;
  email?: string;
  address?: string;
  occupation?: string;
  employer?: string;
  active?: boolean;
  comment?: string;
  schoolId: string;
}

export interface UpdateGuardianDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: GuardianGender;
  phoneNumber?: string;
  email?: string;
  address?: string;
  occupation?: string;
  employer?: string;
  active?: boolean;
  comment?: string;
  schoolId?: string;
}

export interface GuardianApiResponse {
  id?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  middleName?: string | null;
  middle_name?: string | null;
  gender?: GuardianGender;
  phoneNumber?: string | null;
  phone_number?: string | null;
  email?: string | null;
  address?: string | null;
  occupation?: string | null;
  employer?: string | null;
  familyCode?: string | null;
  family_code?: string | null;
  schoolId?: string | null;
  school_id?: string | null;
  active?: boolean | string | number | null;
  comment?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type GuardianListPayload =
  | GuardianApiResponse[]
  | {
      value?: GuardianApiResponse[];
      data?: GuardianApiResponse[];
      content?: GuardianApiResponse[];
      items?: GuardianApiResponse[];
      results?: GuardianApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class GuardianService {
  private readonly endpoint = API_ENDPOINTS.guardian;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateGuardianDto): Observable<GuardianApiResponse> {
    return this.http.post<GuardianApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateGuardianDto): Observable<GuardianApiResponse> {
    return this.http.put<GuardianApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<GuardianApiResponse> {
    return this.http.get<GuardianApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(): Observable<GuardianApiResponse[]> {
    return this.http.get<GuardianListPayload>(this.endpoint).pipe(
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
