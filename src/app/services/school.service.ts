import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface CreateSchoolDto {
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  motto?: string;
  groupId?: string;
  countryId?: string;
  stateId?: number;
  cityId?: string;
  communeId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  schoolType: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  website?: string;
  principalName?: string;
  principalPhone?: string;
  principalEmail?: string;
  logo?: string;
  coverImage?: string;
  capacity?: number;
  numberOfClassrooms?: number;
  establishmentDate?: string;
  active?: boolean;
}

export type UpdateSchoolDto = CreateSchoolDto;

export interface SchoolApiResponse {
  id?: string | number;
  code?: string;
  name?: string;
  shortName?: string;
  description?: string;
  motto?: string;
  groupId?: string | number;
  group_id?: string | number;
  countryId?: string | number;
  country_id?: string | number;
  stateId?: number;
  state_id?: number;
  cityId?: string | number;
  city_id?: string | number;
  communeId?: string | number;
  commune_id?: string | number;
  countryName?: string;
  country_name?: string;
  stateName?: string;
  state_name?: string;
  cityName?: string;
  city_name?: string;
  communeName?: string;
  commune_name?: string;
  groupName?: string;
  group_name?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  website?: string;
  principalName?: string;
  principalPhone?: string;
  principalEmail?: string;
  logo?: string;
  capacity?: number;
  numberOfClassrooms?: number;
  active?: boolean;
  schoolType?: string;
  school_type?: string;
  address?: string;
  latitude?: number | string;
  longitude?: number | string;
  establishmentDate?: string;
  establishment_date?: string;
}

type SchoolListPayload =
  | SchoolApiResponse[]
  | {
      data?: SchoolApiResponse[];
      content?: SchoolApiResponse[];
      items?: SchoolApiResponse[];
      results?: SchoolApiResponse[];
    };

@Injectable({
  providedIn: 'root'
})
export class SchoolService {
  private readonly endpoint = API_ENDPOINTS.school;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateSchoolDto): Observable<SchoolApiResponse> {
    return this.http.post<SchoolApiResponse>(this.endpoint, dto);
  }

  update(id: string, dto: UpdateSchoolDto): Observable<SchoolApiResponse> {
    return this.http.put<SchoolApiResponse>(`${this.endpoint}/${id}`, dto);
  }

  getAll(): Observable<SchoolApiResponse[]> {
    return this.http.get<SchoolListPayload>(this.endpoint).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.data ?? response.content ?? response.items ?? response.results ?? [];
      })
    );
  }
}
