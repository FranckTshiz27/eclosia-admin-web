import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

interface CityApiModel {
  id?: string;
  provinceId?: number | string;
  province_id?: number | string;
  name?: string;
  [key: string]: unknown;
}

type CityListPayload =
  | CityApiModel[]
  | {
      data?: CityApiModel[];
      content?: CityApiModel[];
      items?: CityApiModel[];
      results?: CityApiModel[];
    };

export interface CityOption {
  id: string;
  provinceId?: number | string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CityService {
  private readonly endpoint = API_ENDPOINTS.city;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<CityOption[]> {
    return this.http.get<CityListPayload>(this.endpoint).pipe(
      map((response) => {
        const list = Array.isArray(response)
          ? response
          : response.data ?? response.content ?? response.items ?? response.results ?? [];

        return list
          .map((city, index) => {
            const name = (city.name || '').trim();
            if (!name) {
              return null;
            }
            return {
              id: city.id ?? `city-${index}`,
              provinceId: city.provinceId ?? city.province_id,
              name
            } as CityOption;
          })
          .filter((city): city is CityOption => Boolean(city));
      }),
      catchError(() => of([]))
    );
  }
}
