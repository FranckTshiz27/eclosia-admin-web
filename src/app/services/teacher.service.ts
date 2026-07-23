import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface CreateTeacherDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: Gender;
  birthDate?: string;
  email: string;
  phone: string;
  address?: string;
  username?: string;
  /** Optionnel : si omis, le backend génère un mot de passe temporaire. */
  password?: string;
  roleIds: string[];
  schoolId: string;
  registrationNumber: string;
  hiringDate: string;
  leavingDate?: string;
  qualification?: string;
  specialty?: string;
  grade?: string;
  signature?: string | null;
  titular?: boolean;
  remarks?: string | null;
}

export interface UpdateTeacherDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: Gender;
  birthDate?: string;
  email: string;
  phone: string;
  address?: string;
  roleIds: string[];
  schoolId: string;
  registrationNumber: string;
  hiringDate: string;
  leavingDate?: string;
  qualification?: string;
  specialty?: string;
  grade?: string;
  signature?: string | null;
  titular?: boolean;
  active?: boolean;
  remarks?: string | null;
}

export interface TeacherRoleDto {
  id?: string;
  code?: string;
  name?: string;
}

export interface TeacherApiResponse {
  id?: string;
  securityUserId?: string;
  security_user_id?: string;
  username?: string;
  temporaryPassword?: string;
  temporary_password?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  middleName?: string;
  middle_name?: string;
  gender?: Gender;
  birthDate?: string;
  birth_date?: string;
  email?: string;
  phone?: string;
  address?: string;
  schoolId?: string;
  school_id?: string;
  schoolName?: string;
  school_name?: string;
  registrationNumber?: string;
  registration_number?: string;
  hiringDate?: string;
  hiring_date?: string;
  leavingDate?: string | null;
  leaving_date?: string | null;
  qualification?: string;
  specialty?: string;
  grade?: string;
  signature?: string | null;
  titular?: boolean;
  active?: boolean;
  remarks?: string | null;
  roles?: TeacherRoleDto[];
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface TeacherListFilters {
  schoolId?: string;
}

type TeacherListPayload =
  | TeacherApiResponse[]
  | {
      value?: TeacherApiResponse[];
      data?: TeacherApiResponse[];
      content?: TeacherApiResponse[];
      items?: TeacherApiResponse[];
      results?: TeacherApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private readonly endpoint = API_ENDPOINTS.teachers;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateTeacherDto): Observable<TeacherApiResponse> {
    return this.http
      .post<TeacherListPayload | TeacherApiResponse>(this.endpoint, dto)
      .pipe(map((response) => this.unwrapOne(response)));
  }

  update(id: string, dto: UpdateTeacherDto): Observable<TeacherApiResponse> {
    return this.http
      .put<TeacherListPayload | TeacherApiResponse>(`${this.endpoint}/${id}`, dto)
      .pipe(map((response) => this.unwrapOne(response)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<TeacherApiResponse> {
    return this.http
      .get<TeacherListPayload | TeacherApiResponse>(`${this.endpoint}/${id}`)
      .pipe(map((response) => this.unwrapOne(response)));
  }

  /** Enseignant lié à l'utilisateur connecté (404 si absent). */
  getMe(): Observable<TeacherApiResponse> {
    return this.http
      .get<TeacherListPayload | TeacherApiResponse>(`${this.endpoint}/me`)
      .pipe(map((response) => this.unwrapOne(response)));
  }

  getAll(filters?: TeacherListFilters): Observable<TeacherApiResponse[]> {
    let params = new HttpParams();
    if (filters?.schoolId) {
      params = params.set('schoolId', filters.schoolId);
    }
    return this.http
      .get<TeacherListPayload>(this.endpoint, { params })
      .pipe(map((response) => this.unwrapList(response)));
  }

  private unwrapOne(response: TeacherListPayload | TeacherApiResponse): TeacherApiResponse {
    if (!response || Array.isArray(response)) {
      return {};
    }
    const payload = response as {
      value?: TeacherApiResponse;
      data?: TeacherApiResponse;
      content?: TeacherApiResponse;
      result?: TeacherApiResponse;
      temporaryPassword?: string;
      temporary_password?: string;
      username?: string;
    };
    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
      return payload.data;
    }
    if (payload.value && typeof payload.value === 'object' && !Array.isArray(payload.value)) {
      return payload.value;
    }
    if (payload.result && typeof payload.result === 'object' && !Array.isArray(payload.result)) {
      return payload.result;
    }
    return response as TeacherApiResponse;
  }

  private unwrapList(response: TeacherListPayload): TeacherApiResponse[] {
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
