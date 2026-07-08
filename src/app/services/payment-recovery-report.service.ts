import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface PaymentRecoveryReportQuery {
  schoolId: string;
  academicYearId: string;
  feeCategoryId: string;
  trancheIds: string[];
  cycleIds?: string[];
  classroomIds?: string[];
  startDate?: string;
  endDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentRecoveryReportService {
  private readonly endpoint = API_ENDPOINTS.paymentRecoveryReport;

  constructor(private readonly http: HttpClient) {}

  generateDashboard(query: PaymentRecoveryReportQuery): Observable<Blob> {
    let params = new HttpParams()
      .set('schoolId', query.schoolId)
      .set('academicYearId', query.academicYearId)
      .set('feeCategoryId', query.feeCategoryId);

    query.trancheIds.forEach((trancheId) => {
      params = params.append('trancheIds', trancheId);
    });

    query.cycleIds?.forEach((cycleId) => {
      params = params.append('cycleIds', cycleId);
    });

    query.classroomIds?.forEach((classroomId) => {
      params = params.append('classroomIds', classroomId);
    });

    if (query.startDate) {
      params = params.set('startDate', query.startDate);
    }
    if (query.endDate) {
      params = params.set('endDate', query.endDate);
    }

    return this.http.get(this.endpoint, {
      params,
      responseType: 'blob'
    });
  }
}

