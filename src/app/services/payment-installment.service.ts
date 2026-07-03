import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreatePaymentInstallmentDto {
  code: string;
  name: string;
  displayOrder: number;
  description?: string;
  active?: boolean;
  comment?: string;
  schoolId: string;
}

export type UpdatePaymentInstallmentDto = CreatePaymentInstallmentDto;

export interface PaymentInstallmentApiResponse {
  id?: string;
  code?: string;
  name?: string;
  displayOrder?: number;
  display_order?: number;
  description?: string | null;
  active?: boolean;
  comment?: string | null;
  schoolId?: string;
  school_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type PaymentInstallmentListPayload =
  | PaymentInstallmentApiResponse[]
  | {
      value?: PaymentInstallmentApiResponse[];
      data?: PaymentInstallmentApiResponse[];
      content?: PaymentInstallmentApiResponse[];
      items?: PaymentInstallmentApiResponse[];
      results?: PaymentInstallmentApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class PaymentInstallmentService {
  private readonly endpoint = API_ENDPOINTS.paymentInstallment;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreatePaymentInstallmentDto): Observable<PaymentInstallmentApiResponse> {
    return this.http.post<PaymentInstallmentApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdatePaymentInstallmentDto): Observable<PaymentInstallmentApiResponse> {
    return this.http.put<PaymentInstallmentApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<PaymentInstallmentApiResponse> {
    return this.http.get<PaymentInstallmentApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(schoolId?: string): Observable<PaymentInstallmentApiResponse[]> {
    let params = new HttpParams();
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    }

    return this.http.get<PaymentInstallmentListPayload>(this.endpoint, { params }).pipe(
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
