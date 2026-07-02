import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentReportService {
  private readonly endpoint = API_ENDPOINTS.enrollmentReport;

  constructor(private readonly http: HttpClient) {}

  generateStudentsByClass(schoolId: string, academicYearId: string): Observable<Blob> {
    const params = new HttpParams()
      .set('schoolId', schoolId)
      .set('academicYearId', academicYearId);

    return this.http.get(`${this.endpoint}/students-by-class`, {
      params,
      responseType: 'blob'
    });
  }
}
