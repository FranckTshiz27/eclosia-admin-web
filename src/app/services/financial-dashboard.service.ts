import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';
import { FinancialDashboard } from './financial-dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class FinancialDashboardService {
  private readonly endpoint = API_ENDPOINTS.financeDashboard;

  constructor(private readonly http: HttpClient) {}

  /**
   * GET /finance/dashboard?schoolId={schoolId}&academicYearId={academicYearId}
   */
  getDashboard(schoolId: string, academicYearId: string): Observable<FinancialDashboard> {
    const params = new HttpParams()
      .set('schoolId', schoolId)
      .set('academicYearId', academicYearId);

    return this.http.get<FinancialDashboard>(this.endpoint, { params });
  }
}
