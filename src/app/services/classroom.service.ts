import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateClassroomDto {
  capacity: number;
  active?: boolean;
  description?: string;
  schoolId: string;
  academicLevelId: string;
  academicSectionId?: string;
  academicOptionId?: string;
  classroomDesignationId: string;
}

export type UpdateClassroomDto = CreateClassroomDto;

export interface ClassroomApiResponse {
  id?: string;
  displayName?: string;
  display_name?: string;
  capacity?: number;
  active?: boolean;
  description?: string | null;
  schoolId?: string;
  school_id?: string;
  academicLevelId?: string;
  academic_level_id?: string;
  academicSectionId?: string;
  academic_section_id?: string;
  academicOptionId?: string;
  academic_option_id?: string;
  classroomDesignationId?: string;
  classroom_designation_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type ClassroomListPayload =
  | ClassroomApiResponse[]
  | {
      value?: ClassroomApiResponse[];
      data?: ClassroomApiResponse[];
      content?: ClassroomApiResponse[];
      items?: ClassroomApiResponse[];
      results?: ClassroomApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class ClassroomService {
  private readonly endpoint = API_ENDPOINTS.classroom;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateClassroomDto): Observable<ClassroomApiResponse> {
    return this.http.post<ClassroomApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateClassroomDto): Observable<ClassroomApiResponse> {
    return this.http.put<ClassroomApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<ClassroomApiResponse> {
    return this.http.get<ClassroomApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(schoolId?: string): Observable<ClassroomApiResponse[]> {
    let params = new HttpParams();
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    }

    return this.http.get<ClassroomListPayload>(this.endpoint, { params }).pipe(
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
