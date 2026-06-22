import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

interface CountryApiModel {
  id?: string;
  iso2?: string;
  iso3?: string;
  nameFr?: string;
  nameEn?: string;
  phoneCode?: string;
  currencyCode?: string;
  name?: string;
  countryName?: string;
  label?: string;
  value?: string;
  nom?: string;
  libelle?: string;
  designation?: string;
  code?: string;
  name_fr?: string;
  name_en?: string;
  phone_code?: string;
  currency_code?: string;
  [key: string]: unknown;
}

type CountryListPayload =
  | CountryApiModel[]
  | {
      data?: CountryApiModel[];
      content?: CountryApiModel[];
      items?: CountryApiModel[];
      results?: CountryApiModel[];
    };

export interface CountryOption {
  id: string;
  name: string;
  iso2?: string;
  iso3?: string;
  phoneCode?: string;
  currencyCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private readonly endpoint = API_ENDPOINTS.country;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<CountryOption[]> {
    return this.http.get<CountryListPayload>(this.endpoint).pipe(
      map((response) => {
        const list = Array.isArray(response)
          ? response
          : response.data ?? response.content ?? response.items ?? response.results ?? [];

        return list
          .map((country, index) => {
            const name = this.resolveCountryName(country);
            if (!name) {
              return null;
            }

            return {
              id: country.id ?? `country-${index}`,
              name,
              iso2: country.iso2,
              iso3: country.iso3,
              phoneCode: country.phoneCode || (country.phone_code as string | undefined),
              currencyCode: country.currencyCode || (country.currency_code as string | undefined)
            } as CountryOption;
          })
          .filter((country): country is CountryOption => Boolean(country));
      }),
      catchError(() => of([]))
    );
  }

  private resolveCountryName(country: CountryApiModel): string {
    const candidate =
      country.nameFr ||
      country.name_fr ||
      country.nameEn ||
      country.name_en ||
      country.name ||
      country.countryName ||
      country.label ||
      country.value ||
      country.nom ||
      country.libelle ||
      country.designation ||
      country.code ||
      this.getFirstStringField(country);

    return typeof candidate === 'string' ? candidate.trim() : '';
  }

  private getFirstStringField(country: CountryApiModel): string {
    for (const value of Object.values(country)) {
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
    return '';
  }
}
