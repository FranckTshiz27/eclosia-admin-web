import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateStudentCategoryDto {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
  schoolId: string;
}

export type UpdateStudentCategoryDto = CreateStudentCategoryDto;

export interface StudentCategoryApiResponse {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  active?: boolean;
  schoolId?: string;
  school_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type StudentCategoryListPayload =
  | StudentCategoryApiResponse[]
  | {
      value?: StudentCategoryApiResponse[];
      data?: StudentCategoryApiResponse[];
      content?: StudentCategoryApiResponse[];
      items?: StudentCategoryApiResponse[];
      results?: StudentCategoryApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class StudentCategoryService {
  private readonly endpoint = API_ENDPOINTS.studentCategory;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateStudentCategoryDto): Observable<StudentCategoryApiResponse> {
    return this.http.post<StudentCategoryApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateStudentCategoryDto): Observable<StudentCategoryApiResponse> {
    return this.http.put<StudentCategoryApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<StudentCategoryApiResponse> {
    return this.http.get<StudentCategoryApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(schoolId?: string): Observable<StudentCategoryApiResponse[]> {
    let params = new HttpParams();
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    }

    return this.http.get<StudentCategoryListPayload>(this.endpoint, { params }).pipe(
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
