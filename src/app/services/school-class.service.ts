import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateSchoolClassDto {
  name: string;
  internalCode: string;
  maxCapacity?: number;
  room?: string;
  active?: boolean;
  schoolId: string;
  academicModelId: string;
  academicLevelId?: string;
  academicSectionId?: string;
  academicOptionId?: string;
}

export type UpdateSchoolClassDto = CreateSchoolClassDto;

export interface SchoolClassApiResponse {
  id?: string;
  name?: string;
  internalCode?: string;
  internal_code?: string;
  maxCapacity?: number;
  max_capacity?: number;
  room?: string;
  active?: boolean;
  schoolId?: string;
  school_id?: string;
  academicModelId?: string;
  academic_model_id?: string;
  academicLevelId?: string;
  academic_level_id?: string;
  academicSectionId?: string;
  academic_section_id?: string;
  academicOptionId?: string;
  academic_option_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SchoolClassListPayload =
  | SchoolClassApiResponse[]
  | {
      value?: SchoolClassApiResponse[];
      data?: SchoolClassApiResponse[];
      content?: SchoolClassApiResponse[];
      items?: SchoolClassApiResponse[];
      results?: SchoolClassApiResponse[];
    };

export interface SchoolClassQuery {
  schoolId?: string;
  academicModelId?: string;
  academicLevelId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SchoolClassService {
  private readonly endpoint = API_ENDPOINTS.schoolClass;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateSchoolClassDto): Observable<SchoolClassApiResponse> {
    return this.http.post<SchoolClassApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateSchoolClassDto): Observable<SchoolClassApiResponse> {
    return this.http.put<SchoolClassApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<SchoolClassApiResponse> {
    return this.http.get<SchoolClassApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: SchoolClassQuery = {}): Observable<SchoolClassApiResponse[]> {
    let params = new HttpParams();
    if (query.schoolId) {
      params = params.set('schoolId', query.schoolId);
    }
    if (query.academicModelId) {
      params = params.set('academicModelId', query.academicModelId);
    }
    if (query.academicLevelId) {
      params = params.set('academicLevelId', query.academicLevelId);
    }

    return this.http.get<SchoolClassListPayload>(this.endpoint, { params }).pipe(
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
