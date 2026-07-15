import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface RevenueStatementReportQuery {
  schoolId: string;
  academicYearId: string;
  cycleIds?: string[];
  classroomIds?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RevenueStatementReportService {
  private readonly endpoint = API_ENDPOINTS.revenueStatementReport;

  constructor(private readonly http: HttpClient) {}

  generateRevenueStatement(query: RevenueStatementReportQuery): Observable<Blob> {
    let params = new HttpParams()
      .set('schoolId', query.schoolId)
      .set('academicYearId', query.academicYearId);

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
