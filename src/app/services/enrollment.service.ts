import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../core/config/api.config';

export interface CreateEnrollmentDto {
  lastName: string;
  middleName: string;
  firstName: string;
  gender: string;
  birthDate: string;
  birthCountryId: string;
  birthCityId?: string;
  birthCommuneId?: string;
  nationality?: string;
  countryId?: string;
  cityId?: string;
  communeId?: string;
  quarter?: string;
  avenue?: string;
  number?: string;
  phoneNumber?: string;
  email?: string;
  studentComment?: string;
  studentCategoryId: string;
  guardianId: string;
  academicYearId: string;
  classroomId: string;
  enrollmentDate: string;
}

export interface EnrollmentApiResponse {
  id?: string;
  enrollmentNumber?: string;
  enrollment_number?: string;
  enrollmentDate?: string;
  enrollment_date?: string;
  status?: string;
  comment?: string | null;
  studentId?: string;
  student_id?: string;
  guardianId?: string;
  guardian_id?: string;
  classroomId?: string;
  classroom_id?: string;
  classroomName?: string;
  classroom_name?: string;
  classroomLabel?: string;
  academicYearId?: string;
  academic_year_id?: string;
  firstName?: string;
  first_name?: string;
  middleName?: string;
  middle_name?: string;
  lastName?: string;
  last_name?: string;
  studentFirstName?: string;
  student_first_name?: string;
  studentMiddleName?: string;
  student_middle_name?: string;
  studentLastName?: string;
  student_last_name?: string;
  fullName?: string;
  full_name?: string;
  studentFullName?: string;
  student_full_name?: string;
  guardianName?: string;
  guardian_name?: string;
  guardianFullName?: string;
  guardian_full_name?: string;
  guardianPhoneNumber?: string;
  guardian_phone_number?: string;
  guardianPhone?: string;
  studentCategoryName?: string;
  student_category_name?: string;
  studentCategoryCode?: string;
  student_category_code?: string;
  studentCategoryId?: string;
  student_category_id?: string;
  gender?: string;
  studentGender?: string;
  student_gender?: string;
  birthDate?: string;
  birth_date?: string;
  studentBirthDate?: string;
  student_birth_date?: string;
  photo?: unknown;
  photoId?: string;
  photo_id?: string;
  photoUrl?: string;
  photo_url?: string;
  fileResourceId?: string;
  file_resource_id?: string;
  fileResource?: {
    id?: string;
    fileName?: string;
    file_name?: string;
    path?: string;
    url?: string;
    fileUrl?: string;
    file_url?: string;
    contentType?: string;
    content_type?: string;
    content?: string;
  };
  student?: {
    id?: string;
    firstName?: string;
    first_name?: string;
    middleName?: string;
    middle_name?: string;
    lastName?: string;
    last_name?: string;
    fullName?: string;
    full_name?: string;
    name?: string;
    gender?: string;
    birthDate?: string;
    birth_date?: string;
    photo?: unknown;
    photoId?: string;
    photo_id?: string;
    photoUrl?: string;
    photo_url?: string;
  };
  academicFees?: EnrollmentAcademicFeeRef[];
  academic_fees?: EnrollmentAcademicFeeRef[];
  studentCategory?: {
    id?: string;
    code?: string;
    name?: string;
  };
  student_category?: {
    id?: string;
    code?: string;
    name?: string;
  };
  classroom?: {
    id?: string;
    displayName?: string;
    display_name?: string;
    academicLevelId?: string;
    academic_level_id?: string;
    academicSectionId?: string;
    academic_section_id?: string;
    academicOptionId?: string | null;
    academic_option_id?: string | null;
  };
}

export interface EnrollmentAcademicFeeRef {
  id?: string;
  code?: string;
  name?: string;
  amount?: number;
  active?: boolean;
  feeCategoryId?: string;
  fee_category_id?: string;
  paymentInstallmentId?: string | null;
  payment_installment_id?: string | null;
  studentCategoryId?: string | null;
  student_category_id?: string | null;
  academicLevelId?: string;
  academic_level_id?: string;
  academicSectionId?: string | null;
  academic_section_id?: string | null;
  academicOptionId?: string | null;
  academic_option_id?: string | null;
  feeCategory?: {
    id?: string;
    code?: string;
    name?: string;
  };
  paymentInstallment?: {
    id?: string;
    code?: string;
    name?: string;
    displayOrder?: number;
    display_order?: number;
  };
}

type EnrollmentListPayload =
  | EnrollmentApiResponse[]
  | {
      value?: EnrollmentApiResponse[];
      data?: EnrollmentApiResponse[];
      content?: EnrollmentApiResponse[];
      items?: EnrollmentApiResponse[];
      results?: EnrollmentApiResponse[];
      page?: number;
      size?: number;
      totalElements?: number;
      totalPages?: number;
      first?: boolean;
      last?: boolean;
      numberOfElements?: number;
      empty?: boolean;
    };

export interface EnrollmentQuery {
  academicYearId?: string;
  schoolId?: string;
  classroomId?: string;
  guardianId?: string;
  studentId?: string;
}

export interface EnrollmentByAcademicYearAndSchoolQuery {
  academicYearId: string;
  schoolId: string;
  page?: number;
  size?: number;
}

export interface EnrollmentSearchQuery {
  name: string;
  academicYearId: string;
  schoolId: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private readonly endpoint = API_ENDPOINTS.enrollment;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateEnrollmentDto, photo?: File | null): Observable<EnrollmentApiResponse> {
    const formData = new FormData();

    formData.append('lastName', dto.lastName);
    formData.append('middleName', dto.middleName);
    formData.append('firstName', dto.firstName);
    formData.append('gender', dto.gender);
    formData.append('birthDate', dto.birthDate);
    formData.append('birthCountryId', dto.birthCountryId);
    formData.append('guardianId', dto.guardianId);
    formData.append('studentCategoryId', dto.studentCategoryId);
    formData.append('academicYearId', dto.academicYearId);
    formData.append('classroomId', dto.classroomId);
    formData.append('enrollmentDate', dto.enrollmentDate);

    this.appendIfValue(formData, 'birthCityId', dto.birthCityId);
    this.appendIfValue(formData, 'birthCommuneId', dto.birthCommuneId);
    this.appendIfValue(formData, 'nationality', dto.nationality);
    this.appendIfValue(formData, 'countryId', dto.countryId);
    this.appendIfValue(formData, 'cityId', dto.cityId);
    this.appendIfValue(formData, 'communeId', dto.communeId);
    this.appendIfValue(formData, 'quarter', dto.quarter);
    this.appendIfValue(formData, 'avenue', dto.avenue);
    this.appendIfValue(formData, 'number', dto.number);
    this.appendIfValue(formData, 'phoneNumber', dto.phoneNumber);
    this.appendIfValue(formData, 'email', dto.email);
    this.appendIfValue(formData, 'studentComment', dto.studentComment);

    if (photo) {
      formData.append('photo', photo);
    }

    return this.http.post<EnrollmentApiResponse>(this.endpoint, formData);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getById(id: string): Observable<EnrollmentApiResponse> {
    return this.http.get<EnrollmentApiResponse>(`${this.endpoint}/${id}`);
  }

  getAll(query: EnrollmentQuery = {}): Observable<EnrollmentApiResponse[]> {
    let params = new HttpParams();
    if (query.academicYearId) params = params.set('academicYearId', query.academicYearId);
    if (query.schoolId) params = params.set('schoolId', query.schoolId);
    if (query.classroomId) params = params.set('classroomId', query.classroomId);
    if (query.guardianId) params = params.set('guardianId', query.guardianId);
    if (query.studentId) params = params.set('studentId', query.studentId);

    return this.http.get<EnrollmentListPayload>(this.endpoint, { params }).pipe(
      map((response) => this.extractEnrollmentRows(response))
    );
  }

  getByAcademicYearAndSchool(
    query: EnrollmentByAcademicYearAndSchoolQuery
  ): Observable<EnrollmentApiResponse[]> {
    let params = new HttpParams()
      .set('academicYearId', query.academicYearId)
      .set('schoolId', query.schoolId)
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 200));

    return this.http
      .get<EnrollmentListPayload>(`${this.endpoint}/by-academic-year-and-school`, { params })
      .pipe(map((response) => this.extractEnrollmentRows(response)));
  }

  searchByStudentName(query: EnrollmentSearchQuery): Observable<EnrollmentApiResponse[]> {
    const params = new HttpParams()
      .set('name', query.name.trim())
      .set('academicYearId', query.academicYearId)
      .set('schoolId', query.schoolId);

    return this.http
      .get<EnrollmentListPayload>(`${this.endpoint}/search`, { params })
      .pipe(map((response) => this.extractEnrollmentRows(response)));
  }

  private extractEnrollmentRows(response: EnrollmentListPayload): EnrollmentApiResponse[] {
    if (Array.isArray(response)) {
      return response;
    }
    return response.value ?? response.data ?? response.content ?? response.items ?? response.results ?? [];
  }

  private appendIfValue(formData: FormData, key: string, value?: string): void {
    if (value === undefined || value === null) {
      return;
    }
    const normalized = String(value).trim();
    if (!normalized) {
      return;
    }
    formData.append(key, normalized);
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export interface EnrollmentStudentIdentity {
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
}

export function resolveEnrollmentStudentIdentity(
  row: EnrollmentApiResponse | Record<string, unknown>
): EnrollmentStudentIdentity {
  const source = row as Record<string, unknown>;
  const student =
    source['student'] && typeof source['student'] === 'object'
      ? (source['student'] as Record<string, unknown>)
      : null;

  const firstName = readEnrollmentString(
    source['firstName'],
    source['first_name'],
    source['studentFirstName'],
    source['student_first_name'],
    student?.['firstName'],
    student?.['first_name'],
    source['prenom'],
    student?.['prenom']
  );

  const middleName = readEnrollmentString(
    source['middleName'],
    source['middle_name'],
    source['studentMiddleName'],
    source['student_middle_name'],
    student?.['middleName'],
    student?.['middle_name'],
    source['postnom'],
    student?.['postnom']
  );

  const lastName = readEnrollmentString(
    source['lastName'],
    source['last_name'],
    source['studentLastName'],
    source['student_last_name'],
    student?.['lastName'],
    student?.['last_name'],
    source['nom'],
    student?.['nom']
  );

  const fullName =
    readEnrollmentString(
      source['fullName'],
      source['full_name'],
      source['studentFullName'],
      source['student_full_name'],
      student?.['fullName'],
      student?.['full_name'],
      student?.['name']
    ) || [lastName, middleName, firstName].filter(Boolean).join(' ').trim();

  return {
    firstName,
    middleName,
    lastName,
    fullName: fullName || 'Eleve sans nom'
  };
}

export function resolveEnrollmentPhotoUrls(row: EnrollmentApiResponse | Record<string, unknown>): string[] {
  const source = row as Record<string, unknown>;
  const candidates: string[] = [];
  const fileResourceBase = `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/file-resource`;

  const pushUrl = (value: unknown): void => {
    const normalized = readEnrollmentString(value);
    if (!normalized) {
      return;
    }

    if (
      normalized.startsWith('http://') ||
      normalized.startsWith('https://') ||
      normalized.startsWith('/') ||
      normalized.startsWith('data:image')
    ) {
      candidates.push(normalized);
      return;
    }

    if (looksLikeUuid(normalized)) {
      candidates.push(`${fileResourceBase}/${normalized}/content`);
      return;
    }

    if (looksLikeBase64(normalized)) {
      candidates.push(`data:image/jpeg;base64,${normalized}`);
    }
  };

  const pushPhotoValue = (value: unknown): void => {
    if (!value) {
      return;
    }

    if (typeof value === 'string') {
      pushUrl(value);
      return;
    }

    if (Array.isArray(value)) {
      const dataUrl = bytesToDataUrl(value);
      if (dataUrl) {
        candidates.push(dataUrl);
      }
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    const photo = value as Record<string, unknown>;
    pushUrl(photo['url']);
    pushUrl(photo['fileUrl']);
    pushUrl(photo['file_url']);
    pushUrl(photo['publicUrl']);
    pushUrl(photo['public_url']);
    pushUrl(photo['content']);
    pushUrl(photo['data']);
    pushUrl(photo['base64']);
    pushUrl(photo['photoUrl']);
    pushUrl(photo['photo_url']);

    const contentType = readEnrollmentString(photo['contentType'], photo['content_type']) || 'image/jpeg';
    const binaryContent = photo['content'];
    if (Array.isArray(binaryContent)) {
      const dataUrl = bytesToDataUrl(binaryContent, contentType);
      if (dataUrl) {
        candidates.push(dataUrl);
      }
    }

    const photoId = readEnrollmentString(photo['id'], photo['photoId'], photo['photo_id']);
    if (photoId) {
      candidates.push(`${fileResourceBase}/${photoId}/content`);
    }

    const fileName = readEnrollmentString(photo['fileName'], photo['file_name']);
    const rawPath = readEnrollmentString(photo['path']) || '/uploads/enrollments';
    if (fileName) {
      const normalizedPath = rawPath.replace(/\\/g, '/');
      const uploadsSegmentIndex = normalizedPath.toLowerCase().indexOf('/uploads/');
      const uploadsRelativePath =
        uploadsSegmentIndex >= 0
          ? normalizedPath.slice(uploadsSegmentIndex).replace(/\/+$/, '')
          : '/uploads/enrollments';
      const cleanFileName = fileName.replace(/^\/+/, '');
      candidates.push(`${API_CONFIG.gatewayBaseUrl}${uploadsRelativePath}/${cleanFileName}`);
      candidates.push(
        `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}${uploadsRelativePath}/${cleanFileName}`
      );
    }
  };

  [
    'photoUrl',
    'photo_url',
    'studentPhotoUrl',
    'student_photo_url'
  ].forEach((key) => pushUrl(source[key]));

  pushPhotoValue(source['photo']);
  pushPhotoValue(source['student']);
  pushPhotoValue(source['studentPhoto']);
  pushPhotoValue(source['student_photo']);
  pushPhotoValue(readEnrollmentPathValue(source, 'student.photo'));
  pushPhotoValue(readEnrollmentPathValue(source, 'studentPhotoResource'));
  pushPhotoValue(readEnrollmentPathValue(source, 'fileResource'));
  pushPhotoValue(readEnrollmentPathValue(source, 'file_resource'));

  const photoId = readEnrollmentString(
    source['photoId'],
    source['photo_id'],
    source['fileResourceId'],
    source['file_resource_id'],
    readEnrollmentPathValue(source, 'photo.id'),
    readEnrollmentPathValue(source, 'student.photoId'),
    readEnrollmentPathValue(source, 'student.photo.id'),
    readEnrollmentPathValue(source, 'fileResource.id'),
    readEnrollmentPathValue(source, 'file_resource.id')
  );
  if (photoId) {
    candidates.push(`${fileResourceBase}/${photoId}/content`);
  }

  const enrollmentId = readEnrollmentString(source['id']);
  if (enrollmentId) {
    candidates.push(`${API_ENDPOINTS.enrollment}/${enrollmentId}/photo`);
    candidates.push(`${API_ENDPOINTS.enrollment}/${enrollmentId}/photo/content`);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function readEnrollmentString(...values: unknown[]): string {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }
  return '';
}

function readEnrollmentPathValue(source: unknown, path: string): unknown {
  if (!source || typeof source !== 'object' || !path.trim()) {
    return undefined;
  }

  const segments = path.split('.').map((segment) => segment.trim()).filter(Boolean);
  let cursor: unknown = source;

  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object' || !(segment in (cursor as Record<string, unknown>))) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

function looksLikeUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function looksLikeBase64(value: string): boolean {
  return value.length >= 32 && BASE64_PATTERN.test(value);
}

function bytesToDataUrl(bytes: unknown, mimeType = 'image/jpeg'): string {
  if (!Array.isArray(bytes) || !bytes.length) {
    return '';
  }

  const normalizedBytes = bytes
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 255);

  if (!normalizedBytes.length) {
    return '';
  }

  const binary = normalizedBytes.map((value) => String.fromCharCode(value)).join('');
  const base64 = btoa(binary);
  const safeMime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  return `data:${safeMime};base64,${base64}`;
}
