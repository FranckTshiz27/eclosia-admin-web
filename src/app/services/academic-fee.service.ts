import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateAcademicFeeDto {
  code: string;
  name: string;
  amount: number;
  payableByInstallment?: boolean;
  active?: boolean;
  schoolId: string;
  academicYearId: string;
  feeCategoryId: string;
  academicCycleId: string;
  academicLevelId: string;
  academicSectionId?: string | null;
  academicOptionId?: string | null;
  paymentInstallmentId?: string | null;
  studentCategoryId: string;
}

export type UpdateAcademicFeeDto = CreateAcademicFeeDto;

export interface AcademicFeeCategoryRef {
  id?: string;
  code?: string;
  name?: string;
  allowInstallments?: boolean;
  allow_installments?: boolean;
}

export interface AcademicFeeInstallmentRef {
  id?: string;
  code?: string;
  name?: string;
  displayOrder?: number;
  display_order?: number;
}

export interface AcademicFeeCycleRef {
  id?: string;
  code?: string;
  name?: string;
}

export interface AcademicFeeStudentCategoryRef {
  id?: string;
  code?: string;
  name?: string;
}

export interface AcademicFeeApiResponse {
  id?: string;
  code?: string;
  name?: string;
  amount?: number;
  payableByInstallment?: boolean;
  payable_by_installment?: boolean;
  active?: boolean;
  schoolId?: string;
  school_id?: string;
  academicYearId?: string;
  academic_year_id?: string;
  academicCycleId?: string;
  academic_cycle_id?: string;
  academicCycle?: AcademicFeeCycleRef | null;
  academicLevelId?: string;
  academic_level_id?: string;
  academicSectionId?: string | null;
  academic_section_id?: string | null;
  academicOptionId?: string | null;
  academic_option_id?: string | null;
  feeCategoryId?: string;
  fee_category_id?: string;
  paymentInstallmentId?: string | null;
  payment_installment_id?: string | null;
  feeCategory?: AcademicFeeCategoryRef | null;
  paymentInstallment?: AcademicFeeInstallmentRef | null;
  studentCategoryId?: string | null;
  student_category_id?: string | null;
  studentCategory?: AcademicFeeStudentCategoryRef | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type AcademicFeeListPayload =
  | AcademicFeeApiResponse[]
  | {
      value?: AcademicFeeApiResponse[];
      data?: AcademicFeeApiResponse[];
      content?: AcademicFeeApiResponse[];
      items?: AcademicFeeApiResponse[];
      results?: AcademicFeeApiResponse[];
    };

export interface AcademicFeeQuery {
  schoolId?: string;
  academicYearId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AcademicFeeService {
  private readonly endpoint = API_ENDPOINTS.academicFee;

  constructor(private readonly http: HttpClient) {}

  createAll(dtos: CreateAcademicFeeDto[]): Observable<AcademicFeeApiResponse[]> {
    return this.http.post<AcademicFeeApiResponse[]>(this.endpoint, dtos);
  }

  update(id: string, dto: UpdateAcademicFeeDto): Observable<AcademicFeeApiResponse> {
    return this.http.put<AcademicFeeApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<AcademicFeeApiResponse> {
    return this.http.get<AcademicFeeApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: AcademicFeeQuery = {}): Observable<AcademicFeeApiResponse[]> {
    let params = new HttpParams();
    if (query.schoolId) {
      params = params.set('schoolId', query.schoolId);
    }
    if (query.academicYearId) {
      params = params.set('academicYearId', query.academicYearId);
    }

    return this.http.get<AcademicFeeListPayload>(this.endpoint, { params }).pipe(
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
