import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class PaymentReportService {
  private readonly endpoint = API_ENDPOINTS.paymentReceiptReport;

  constructor(private readonly http: HttpClient) {}

  generateByReceiptNumber(receiptNumber: string): Observable<Blob> {
    const params = new HttpParams().set('receiptNumber', receiptNumber);
    return this.http.get(this.endpoint, {
      params,
      responseType: 'blob'
    });
  }

  generateByPaymentId(paymentId: string): Observable<Blob> {
    return this.http.get(`${this.endpoint}/by-payment/${paymentId}`, {
      responseType: 'blob'
    });
  }
}
