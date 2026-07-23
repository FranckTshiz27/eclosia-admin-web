import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export type BulletinPrintMode = 'SCHOOL' | 'CLASSES' | 'CYCLE' | 'STUDENT';
export type BulletinFormat = 'OFFICIEL' | 'COMPACT' | 'DETAILED';
export type BulletinSortBy = 'ALPHABETICAL' | 'MATRICULE' | 'CLASS_THEN_ALPHABETICAL';

export interface BulletinPrintRequestDto {
  mode: BulletinPrintMode;
  schoolId: string;
  academicYearId: string;
  format?: BulletinFormat;
  sortBy?: BulletinSortBy;
  includeCoverPage?: boolean;
  includeSignatures?: boolean;
  includeStudentRank?: boolean;
  includeClassAverages?: boolean;
  classroomIds?: string[];
  academicCycleId?: string;
  studentEnrollmentId?: string;
}

export interface BulletinClassroomPreviewDto {
  classroomId?: string;
  classroomName?: string;
  studentCount?: number;
}

export interface BulletinPreviewResponseDto {
  mode?: BulletinPrintMode;
  schoolId?: string;
  academicYearId?: string;
  totalStudents?: number;
  totalClassrooms?: number;
  classrooms?: BulletinClassroomPreviewDto[];
}

export interface BulletinPdfResponseDto {
  fileName?: string;
  contentType?: string;
  contentBase64?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BulletinReportService {
  private readonly endpoint = API_ENDPOINTS.bulletinReport;

  constructor(private readonly http: HttpClient) {}

  preview(request: BulletinPrintRequestDto): Observable<BulletinPreviewResponseDto> {
    return this.http.post<BulletinPreviewResponseDto>(`${this.endpoint}/preview`, request);
  }

  generate(request: BulletinPrintRequestDto): Observable<BulletinPdfResponseDto> {
    return this.http.post<BulletinPdfResponseDto>(`${this.endpoint}/generate`, request);
  }
}
