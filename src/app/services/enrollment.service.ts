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
  studentCategoryId: string;
  guardianId: string;
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
  guardianName?: string;
  guardian_name?: string;
  guardianFullName?: string;
  guardian_full_name?: string;
  guardianPhoneNumber?: string;
  guardian_phone_number?: string;
  guardianPhone?: string;
  studentCategoryName?: string;
  student_category_name?: string;
  studentCategoryCode?: string;
  student_category_code?: string;
  gender?: string;
  studentGender?: string;
  student_gender?: string;
  birthDate?: string;
  birth_date?: string;
  studentBirthDate?: string;
  student_birth_date?: string;
}

type EnrollmentListPayload =
  | EnrollmentApiResponse[]
  | {
      value?: EnrollmentApiResponse[];
      data?: EnrollmentApiResponse[];
      content?: EnrollmentApiResponse[];
      items?: EnrollmentApiResponse[];
      results?: EnrollmentApiResponse[];
      page?: number;
      size?: number;
      totalElements?: number;
      totalPages?: number;
      first?: boolean;
      last?: boolean;
      numberOfElements?: number;
      empty?: boolean;
    };

export interface EnrollmentQuery {
  academicYearId?: string;
  schoolId?: string;
  classroomId?: string;
  guardianId?: string;
  studentId?: string;
}

export interface EnrollmentByAcademicYearAndSchoolQuery {
  academicYearId: string;
  schoolId: string;
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private readonly endpoint = API_ENDPOINTS.enrollment;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateEnrollmentDto, photo?: File | null): Observable<EnrollmentApiResponse> {
    const formData = new FormData();

    formData.append('lastName', dto.lastName);
    formData.append('middleName', dto.middleName);
    formData.append('firstName', dto.firstName);
    formData.append('gender', dto.gender);
    formData.append('birthDate', dto.birthDate);
    formData.append('birthCountryId', dto.birthCountryId);
    formData.append('guardianId', dto.guardianId);
    formData.append('studentCategoryId', dto.studentCategoryId);
    formData.append('academicYearId', dto.academicYearId);
    formData.append('classroomId', dto.classroomId);
    formData.append('enrollmentDate', dto.enrollmentDate);

    this.appendIfValue(formData, 'birthCityId', dto.birthCityId);
    this.appendIfValue(formData, 'birthCommuneId', dto.birthCommuneId);
    this.appendIfValue(formData, 'nationality', dto.nationality);
    this.appendIfValue(formData, 'countryId', dto.countryId);
    this.appendIfValue(formData, 'cityId', dto.cityId);
    this.appendIfValue(formData, 'communeId', dto.communeId);
    this.appendIfValue(formData, 'quarter', dto.quarter);
    this.appendIfValue(formData, 'avenue', dto.avenue);
    this.appendIfValue(formData, 'number', dto.number);
    this.appendIfValue(formData, 'phoneNumber', dto.phoneNumber);
    this.appendIfValue(formData, 'email', dto.email);
    this.appendIfValue(formData, 'studentComment', dto.studentComment);

    if (photo) {
      formData.append('photo', photo);
    }

    return this.http.post<EnrollmentApiResponse>(this.endpoint, formData);
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
    if (query.schoolId) params = params.set('schoolId', query.schoolId);
    if (query.classroomId) params = params.set('classroomId', query.classroomId);
    if (query.guardianId) params = params.set('guardianId', query.guardianId);
    if (query.studentId) params = params.set('studentId', query.studentId);

    return this.http.get<EnrollmentListPayload>(this.endpoint, { params }).pipe(
      map((response) => this.extractEnrollmentRows(response))
    );
  }

  getByAcademicYearAndSchool(
    query: EnrollmentByAcademicYearAndSchoolQuery
  ): Observable<EnrollmentApiResponse[]> {
    let params = new HttpParams()
      .set('academicYearId', query.academicYearId)
      .set('schoolId', query.schoolId)
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 200));

    return this.http
      .get<EnrollmentListPayload>(`${this.endpoint}/by-academic-year-and-school`, { params })
      .pipe(map((response) => this.extractEnrollmentRows(response)));
  }

  private extractEnrollmentRows(response: EnrollmentListPayload): EnrollmentApiResponse[] {
    if (Array.isArray(response)) {
      return response;
    }
    return response.value ?? response.data ?? response.content ?? response.items ?? response.results ?? [];
  }

  private appendIfValue(formData: FormData, key: string, value?: string): void {
    if (value === undefined || value === null) {
      return;
    }
    const normalized = String(value).trim();
    if (!normalized) {
      return;
    }
    formData.append(key, normalized);
  }
}
