import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

interface SchoolTypeApiModel {
  code?: string;
  label?: string;
}

interface SchoolTypeApiResponse {
  schoolTypes?: SchoolTypeApiModel[];
}

export interface SchoolTypeOption {
  code: string;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReferenceDataService {
  private readonly schoolTypesEndpoint = API_ENDPOINTS.schoolTypes;

  constructor(private readonly http: HttpClient) {}

  getSchoolTypes(): Observable<SchoolTypeOption[]> {
    return this.http.get<SchoolTypeApiResponse>(this.schoolTypesEndpoint).pipe(
      map((response) => {
        const list = response.schoolTypes ?? [];
        return list
          .map((item, index) => {
            const label = (item.label || '').trim();
            const code = (item.code || `TYPE_${index + 1}`).trim();
            if (!label) {
              return null;
            }
            return { code, label } as SchoolTypeOption;
          })
          .filter((item): item is SchoolTypeOption => Boolean(item));
      }),
      catchError(() => of([]))
    );
  }
}
