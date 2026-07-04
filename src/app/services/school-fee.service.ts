import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateSchoolFeeDto {
  code: string;
  name: string;
  amount: number;
  feeCategoryId: string;
  paymentInstallmentId?: string | null;
  schoolId: string;
  academicYearId: string;
  academicCycleId: string;
  academicLevelId: string;
  academicSectionId?: string | null;
  academicOptionId?: string | null;
  studentCategoryId?: string | null;
  description?: string;
  active?: boolean;
  comment?: string;
}

export type UpdateSchoolFeeDto = CreateSchoolFeeDto;

export interface SchoolFeeCategoryRef {
  id?: string;
  code?: string;
  name?: string;
  allowInstallments?: boolean;
  allow_installments?: boolean;
}

export interface SchoolFeeInstallmentRef {
  id?: string;
  code?: string;
  name?: string;
  displayOrder?: number;
  display_order?: number;
}

export interface SchoolFeeCycleRef {
  id?: string;
  code?: string;
  name?: string;
}

export interface SchoolFeeStudentCategoryRef {
  id?: string;
  code?: string;
  name?: string;
}

export interface SchoolFeeApiResponse {
  id?: string;
  code?: string;
  name?: string;
  amount?: number;
  active?: boolean;
  description?: string | null;
  comment?: string | null;
  schoolId?: string;
  school_id?: string;
  academicYearId?: string;
  academic_year_id?: string;
  academicCycleId?: string;
  academic_cycle_id?: string;
  academicCycle?: SchoolFeeCycleRef | null;
  academicLevelId?: string;
  academic_level_id?: string;
  academicSectionId?: string | null;
  academic_section_id?: string | null;
  academicOptionId?: string | null;
  academic_option_id?: string | null;
  studentCategoryId?: string | null;
  student_category_id?: string | null;
  studentCategory?: SchoolFeeStudentCategoryRef | null;
  feeCategoryId?: string;
  fee_category_id?: string;
  paymentInstallmentId?: string | null;
  payment_installment_id?: string | null;
  feeCategory?: SchoolFeeCategoryRef | null;
  paymentInstallment?: SchoolFeeInstallmentRef | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SchoolFeeListPayload =
  | SchoolFeeApiResponse[]
  | {
      value?: SchoolFeeApiResponse[];
      data?: SchoolFeeApiResponse[];
      content?: SchoolFeeApiResponse[];
      items?: SchoolFeeApiResponse[];
      results?: SchoolFeeApiResponse[];
    };

export interface SchoolFeeQuery {
  schoolId?: string;
  academicYearId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SchoolFeeService {
  private readonly endpoint = API_ENDPOINTS.schoolFee;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateSchoolFeeDto): Observable<SchoolFeeApiResponse> {
    return this.http.post<SchoolFeeApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateSchoolFeeDto): Observable<SchoolFeeApiResponse> {
    return this.http.put<SchoolFeeApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<SchoolFeeApiResponse> {
    return this.http.get<SchoolFeeApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: SchoolFeeQuery = {}): Observable<SchoolFeeApiResponse[]> {
    let params = new HttpParams();
    if (query.schoolId) {
      params = params.set('schoolId', query.schoolId);
    }
    if (query.academicYearId) {
      params = params.set('academicYearId', query.academicYearId);
    }

    return this.http.get<SchoolFeeListPayload>(this.endpoint, { params }).pipe(
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
