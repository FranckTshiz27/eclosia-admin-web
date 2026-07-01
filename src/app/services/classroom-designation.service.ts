import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateClassroomDesignationDto {
  code: string;
  name: string;
  displayOrder?: number;
  active?: boolean;
  description?: string;
  schoolId: string;
}

export type UpdateClassroomDesignationDto = CreateClassroomDesignationDto;

export interface ClassroomDesignationApiResponse {
  id?: string;
  code?: string;
  name?: string;
  displayOrder?: number;
  display_order?: number;
  active?: boolean;
  description?: string | null;
  schoolId?: string;
  school_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type ClassroomDesignationListPayload =
  | ClassroomDesignationApiResponse[]
  | {
      value?: ClassroomDesignationApiResponse[];
      data?: ClassroomDesignationApiResponse[];
      content?: ClassroomDesignationApiResponse[];
      items?: ClassroomDesignationApiResponse[];
      results?: ClassroomDesignationApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class ClassroomDesignationService {
  private readonly endpoint = API_ENDPOINTS.classroomDesignation;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateClassroomDesignationDto): Observable<ClassroomDesignationApiResponse> {
    return this.http.post<ClassroomDesignationApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateClassroomDesignationDto): Observable<ClassroomDesignationApiResponse> {
    return this.http.put<ClassroomDesignationApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<ClassroomDesignationApiResponse> {
    return this.http.get<ClassroomDesignationApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(schoolId?: string): Observable<ClassroomDesignationApiResponse[]> {
    let params = new HttpParams();
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    }

    return this.http.get<ClassroomDesignationListPayload>(this.endpoint, { params }).pipe(
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
