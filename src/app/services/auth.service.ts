import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/config/api.config';

export interface AuthRoleDto {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  systemRole?: boolean;
  active?: boolean;
  displayOrder?: number;
}

export interface AuthFeatureDto {
  id?: string;
  code?: string;
  name?: string;
  action?: string;
  description?: string | null;
  moduleId?: string;
  moduleCode?: string;
  module_code?: string;
  moduleName?: string;
  module_name?: string;
  active?: boolean;
  displayOrder?: number;
}

export interface AuthenticatedUserDto {
  id?: string;
  keycloakId?: string;
  username?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  groupId?: string;
  schoolIds?: string[];
  active?: boolean;
  roles?: AuthRoleDto[] | string[];
  permissions?: Array<AuthFeatureDto | string>;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  user?: AuthenticatedUserDto;
  roles?: AuthRoleDto[] | string[];
  permissions?: Array<AuthFeatureDto | string>;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  username: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CompleteTemporaryPasswordRequest {
  username: string;
  temporaryPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly endpoint = API_ENDPOINTS.auth;

  constructor(private readonly http: HttpClient) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.endpoint}/login`, request);
  }

  completeTemporaryPassword(
    request: CompleteTemporaryPasswordRequest
  ): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.endpoint}/complete-temporary-password`, request);
  }

  logout(request: LogoutRequest): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/logout`, request);
  }

  refresh(request: RefreshTokenRequest): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(`${this.endpoint}/refresh`, request);
  }

  me(): Observable<AuthenticatedUserDto> {
    return this.http.get<AuthenticatedUserDto>(`${this.endpoint}/me`);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/change-password`, request);
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/forgot-password`, request);
  }
}
