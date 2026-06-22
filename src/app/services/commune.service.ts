import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

interface CommuneApiModel {
  id?: string;
  cityId?: string;
  city_id?: string;
  name?: string;
  code?: string;
  latitude?: number | string;
  longitude?: number | string;
  population?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  [key: string]: unknown;
}

type CommuneListPayload =
  | CommuneApiModel[]
  | {
      data?: CommuneApiModel[];
      content?: CommuneApiModel[];
      items?: CommuneApiModel[];
      results?: CommuneApiModel[];
    };

export interface CommuneOption {
  id: string;
  cityId?: string;
  name: string;
  code?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommuneService {
  private readonly endpoint = API_ENDPOINTS.commune;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<CommuneOption[]> {
    return this.http.get<CommuneListPayload>(this.endpoint).pipe(
      map((response) => {
        const list = Array.isArray(response)
          ? response
          : response.data ?? response.content ?? response.items ?? response.results ?? [];

        return list
          .map((commune, index) => {
            const name = (commune.name || '').trim();
            if (!name) {
              return null;
            }
            return {
              id: commune.id ?? `commune-${index}`,
              cityId: commune.cityId ?? commune.city_id,
              name,
              code: commune.code
            } as CommuneOption;
          })
          .filter((commune): commune is CommuneOption => Boolean(commune));
      }),
      catchError(() => of([]))
    );
  }
}
