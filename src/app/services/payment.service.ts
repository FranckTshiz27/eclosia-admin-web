import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHECK' | 'OTHER';

export interface CreatePaymentDto {
  schoolId: string;
  academicYearId: string;
  enrollmentId: string;
  feeCategoryId: string;
  paymentInstallmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentCurrencyId?: string | null;
  exchangeRate?: number | null;
  comment?: string;
  paymentDate?: string;
}

export interface PaymentApiResponse {
  id?: string;
  schoolId?: string;
  school_id?: string;
  academicYearId?: string;
  academic_year_id?: string;
  enrollmentId?: string;
  enrollment_id?: string;
  feeCategoryId?: string;
  fee_category_id?: string;
  paymentInstallmentId?: string;
  payment_installment_id?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  payment_method?: PaymentMethod;
  paymentCurrencyId?: string | null;
  payment_currency_id?: string | null;
  exchangeRate?: number | null;
  exchange_rate?: number | null;
  comment?: string | null;
  createdAt?: string;
  created_at?: string;
}

export interface PaymentQuery {
  schoolId?: string;
  academicYearId?: string;
  enrollmentId?: string;
}

type PaymentListPayload =
  | PaymentApiResponse[]
  | {
      value?: PaymentApiResponse[];
      data?: PaymentApiResponse[];
      content?: PaymentApiResponse[];
      items?: PaymentApiResponse[];
      results?: PaymentApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly endpoint = API_ENDPOINTS.payment;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreatePaymentDto): Observable<PaymentApiResponse> {
    return this.http.post<PaymentApiResponse>(this.endpoint, dto);
  }

  getAll(query: PaymentQuery = {}): Observable<PaymentApiResponse[]> {
    let params = new HttpParams();
    if (query.schoolId) params = params.set('schoolId', query.schoolId);
    if (query.academicYearId) params = params.set('academicYearId', query.academicYearId);
    if (query.enrollmentId) params = params.set('enrollmentId', query.enrollmentId);

    return this.http.get<PaymentListPayload>(this.endpoint, { params }).pipe(
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
