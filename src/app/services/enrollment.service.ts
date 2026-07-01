import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateEnrollmentDto {
  lastName: string;
  middleName: string;
  firstName: string;
  gender: string;
  birthDate: string;
  birthCountryId: string;
  birthCityId?: string;
  birthCommuneId?: string;
  nationality?: string;
  countryId?: string;
  cityId?: string;
  communeId?: string;
  quarter?: string;
  avenue?: string;
  number?: string;
  phoneNumber?: string;
  email?: string;
  studentComment?: string;
  guardianId: string;
  photoId?: string;
  academicYearId: string;
  classroomId: string;
  enrollmentDate: string;
}

export interface EnrollmentApiResponse {
  id?: string;
  enrollmentNumber?: string;
  enrollment_number?: string;
  enrollmentDate?: string;
  enrollment_date?: string;
  status?: string;
  comment?: string | null;
  studentId?: string;
  student_id?: string;
  guardianId?: string;
  guardian_id?: string;
  classroomId?: string;
  classroom_id?: string;
  classroomName?: string;
  classroom_name?: string;
  classroomLabel?: string;
  academicYearId?: string;
  academic_year_id?: string;
  firstName?: string;
  first_name?: string;
  middleName?: string;
  middle_name?: string;
  lastName?: string;
  last_name?: string;
  studentFirstName?: string;
  student_first_name?: string;
  studentMiddleName?: string;
  student_middle_name?: string;
  studentLastName?: string;
  student_last_name?: string;
  fullName?: string;
  full_name?: string;
  studentFullName?: string;
  student_full_name?: string;
}

type EnrollmentListPayload =
  | EnrollmentApiResponse[]
  | {
      value?: EnrollmentApiResponse[];
      data?: EnrollmentApiResponse[];
      content?: EnrollmentApiResponse[];
      items?: EnrollmentApiResponse[];
      results?: EnrollmentApiResponse[];
    };

export interface EnrollmentQuery {
  academicYearId?: string;
  classroomId?: string;
  guardianId?: string;
  studentId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private readonly endpoint = API_ENDPOINTS.enrollment;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateEnrollmentDto): Observable<EnrollmentApiResponse> {
    return this.http.post<EnrollmentApiResponse>(this.endpoint, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<EnrollmentApiResponse> {
    return this.http.get<EnrollmentApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: EnrollmentQuery = {}): Observable<EnrollmentApiResponse[]> {
    let params = new HttpParams();
    if (query.academicYearId) params = params.set('academicYearId', query.academicYearId);
    if (query.classroomId) params = params.set('classroomId', query.classroomId);
    if (query.guardianId) params = params.set('guardianId', query.guardianId);
    if (query.studentId) params = params.set('studentId', query.studentId);

    return this.http.get<EnrollmentListPayload>(this.endpoint, { params }).pipe(
      map((response) => {
        if (Array.isArray(response)) return response;
        return response.value ?? response.data ?? response.content ?? response.items ?? response.results ?? [];
      })
    );
  }
}
