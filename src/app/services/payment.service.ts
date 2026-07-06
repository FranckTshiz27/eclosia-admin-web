import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHEQUE' | 'OTHER';
export type PaymentStatus = 'COMPLETED' | 'CANCELLED';

export interface CreatePaymentDto {
  enrollmentId: string;
  academicFeeId: string;
  currencyRateId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status?: PaymentStatus;
  comment?: string;
  paymentDate: string;
}

export type CreatePaymentBatch = CreatePaymentDto[];

function buildPaymentPayload(dto: CreatePaymentDto): CreatePaymentDto {
  const payload: CreatePaymentDto = {
    enrollmentId: dto.enrollmentId,
    academicFeeId: dto.academicFeeId,
    currencyRateId: dto.currencyRateId,
    amount: dto.amount,
    paymentMethod: dto.paymentMethod,
    paymentDate: dto.paymentDate
  };

  if (dto.status) {
    payload.status = dto.status;
  }
  if (dto.comment?.trim()) {
    payload.comment = dto.comment.trim();
  }

  return payload;
}

export interface PaymentApiResponse {
  id?: string;
  receiptNumber?: string;
  receipt_number?: string;
  transactionReference?: string;
  transaction_reference?: string;
  enrollmentId?: string;
  enrollment_id?: string;
  academicFeeId?: string;
  academic_fee_id?: string;
  currencyRateId?: string | null;
  currency_rate_id?: string | null;
  amount?: number;
  paymentMethod?: PaymentMethod;
  payment_method?: PaymentMethod;
  referenceNumber?: string | null;
  reference_number?: string | null;
  status?: PaymentStatus;
  comment?: string | null;
  paymentDate?: string;
  payment_date?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface PaymentQuery {
  enrollmentId?: string;
  academicFeeId?: string;
  schoolId?: string;
  status?: PaymentStatus;
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

  createAll(dtos: CreatePaymentDto[]): Observable<PaymentApiResponse[]> {
    const payload: CreatePaymentBatch = dtos.map((dto) => buildPaymentPayload(dto));
    return this.http.post<PaymentApiResponse[]>(this.endpoint, payload);
  }

  create(dto: CreatePaymentDto): Observable<PaymentApiResponse[]> {
    return this.createAll([dto]);
  }

  getAll(query: PaymentQuery = {}): Observable<PaymentApiResponse[]> {
    let params = new HttpParams();
    if (query.schoolId) {
      params = params.set('schoolId', query.schoolId);
    }
    if (query.enrollmentId) {
      params = params.set('enrollmentId', query.enrollmentId);
    }
    if (query.academicFeeId) {
      params = params.set('academicFeeId', query.academicFeeId);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }

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
