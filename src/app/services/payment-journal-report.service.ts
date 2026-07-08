import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface PaymentJournalReportQuery {
  schoolId: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
  cycleIds?: string[];
  classroomIds?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PaymentJournalReportService {
  private readonly endpoint = API_ENDPOINTS.paymentJournalReport;

  constructor(private readonly http: HttpClient) {}

  generatePaymentJournal(query: PaymentJournalReportQuery): Observable<Blob> {
    let params = new HttpParams()
      .set('schoolId', query.schoolId)
      .set('academicYearId', query.academicYearId)
      .set('startDate', query.startDate)
      .set('endDate', query.endDate);

    query.cycleIds?.forEach((cycleId) => {
      params = params.append('cycleIds', cycleId);
    });
    query.classroomIds?.forEach((classroomId) => {
      params = params.append('classroomIds', classroomId);
    });

    return this.http.get(this.endpoint, {
      params,
      responseType: 'blob'
    });
  }
}
