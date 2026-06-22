import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

interface StateApiModel {
  id?: number | string;
  name?: string;
  countryId?: number | string;
  country_id?: number | string;
  countryCode?: string;
  country_code?: string;
  countryName?: string;
  country_name?: string;
  iso2?: string;
  iso3166_2?: string;
  [key: string]: unknown;
}

type StateListPayload =
  | StateApiModel[]
  | {
      data?: StateApiModel[];
      content?: StateApiModel[];
      items?: StateApiModel[];
      results?: StateApiModel[];
    };

export interface StateOption {
  id: number | string;
  name: string;
  countryId?: number | string;
  countryCode?: string;
  countryName?: string;
  iso2?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private readonly endpoint = API_ENDPOINTS.state;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<StateOption[]> {
    return this.http.get<StateListPayload>(this.endpoint).pipe(
      map((response) => {
        const list = Array.isArray(response)
          ? response
          : response.data ?? response.content ?? response.items ?? response.results ?? [];

        return list
          .map((state, index) => {
            const name = (state.name || '').trim();
            if (!name) {
              return null;
            }
            return {
              id: state.id ?? `state-${index}`,
              name,
              countryId: state.countryId ?? state.country_id,
              countryCode: state.countryCode ?? state.country_code,
              countryName: state.countryName ?? state.country_name,
              iso2: state.iso2
            } as StateOption;
          })
          .filter((state): state is StateOption => Boolean(state));
      }),
      catchError(() => of([]))
    );
  }
}
