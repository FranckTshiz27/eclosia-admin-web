import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { PermissionService } from '../core/permissions/permission.service';
import { PermissionCode } from '../core/permissions/permission.catalog';
import {
  AuthFeatureDto,
  AuthRoleDto,
  AuthService,
  AuthenticatedUserDto,
  LoginResponse,
  RefreshTokenResponse
} from './auth.service';

/** @deprecated Utiliser PermissionCode / P du catalogue. Conservé pour compat settings. */
export type Permission = PermissionCode;

export interface Role {
  id: string;
  code?: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  groupId: string;
  schoolIds: string[];
  active: boolean;
  roles: Role[];
  /** Codes de fonctionnalités (ex: module.view) — info miroir, source = PermissionService */
  permissionCodes: string[];
  roleCodes: string[];
  role: Role;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private static readonly ACCESS_TOKEN_KEY = 'token';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly USER_KEY = 'auth_user';

  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();
  private localExtraRoles: Role[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly permissionService: PermissionService
  ) {
    this.restoreSessionFromStorage();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(SecurityService.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(SecurityService.REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string): Observable<User> {
    return this.authService.login({ username: username.trim(), password }).pipe(
      tap((response) => this.applyLoginResponse(response)),
      map(() => {
        const user = this.currentUserSubject.value;
        if (!user) {
          throw new Error('Session utilisateur invalide après connexion.');
        }
        return user;
      })
    );
  }

  completeTemporaryPassword(
    username: string,
    temporaryPassword: string,
    newPassword: string
  ): Observable<User> {
    return this.authService
      .completeTemporaryPassword({
        username: username.trim(),
        temporaryPassword,
        newPassword
      })
      .pipe(
        tap((response) => this.applyLoginResponse(response)),
        map(() => {
          const user = this.currentUserSubject.value;
          if (!user) {
            throw new Error('Session utilisateur invalide après changement de mot de passe.');
          }
          return user;
        })
      );
  }

  refreshToken(): Observable<{ token: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Aucun refresh token disponible.'));
    }

    return this.authService.refresh({ refreshToken }).pipe(
      tap((response) => this.applyTokenResponse(response)),
      map((response) => {
        const token = String(response.accessToken ?? '').trim();
        if (!token) {
          throw new Error('Access token manquant dans la réponse de refresh.');
        }
        return { token };
      })
    );
  }

  loadCurrentUser(): Observable<User | null> {
    if (!this.getAccessToken()) {
      return of(null);
    }

    return this.authService.me().pipe(
      map((dto) => {
        const current = this.currentUserSubject.value;
        const rolesRaw = dto.roles ?? current?.roles.map((role) => this.toAuthRole(role)) ?? [];
        const roles = (Array.isArray(rolesRaw) ? rolesRaw : []).map((role) =>
          typeof role === 'string' ? ({ code: role, name: role, id: role } as AuthRoleDto) : role
        );
        const user = this.mapAuthenticatedUser(dto, roles, dto.permissions ?? []);
        this.persistUser(user);
        this.syncPermissions(user.permissionCodes, user.roleCodes);
        this.currentUserSubject.next(user);
        return user;
      }),
      catchError(() => of(this.currentUserSubject.value))
    );
  }

  logout(callApi = true): void {
    const refreshToken = this.getRefreshToken();
    this.clearSession();

    if (callApi && refreshToken) {
      this.authService.logout({ refreshToken }).subscribe({
        error: () => {
          // Session locale déjà nettoyée.
        }
      });
    }
  }

  /** Délègue au PermissionService (SUPER_ADMIN = accès total). */
  hasPermission(permission: PermissionCode): boolean {
    return this.permissionService.has(permission);
  }

  getAvailableRoles(): Role[] {
    return [...(this.currentUserSubject.value?.roles ?? []), ...this.localExtraRoles];
  }

  getAllPermissions(): Permission[] {
    return [...this.permissionService.getPermissions()];
  }

  addRole(role: Role): void {
    const normalized: Role = {
      ...role,
      id: role.id || role.name,
      code: role.code || role.id || role.name,
      permissions: role.permissions ?? []
    };
    this.localExtraRoles = [...this.localExtraRoles, normalized];
  }

  private applyLoginResponse(response: LoginResponse): void {
    this.applyTokenResponse(response);

    const rolesRaw = response.roles ?? response.user?.roles ?? [];
    const roles = (Array.isArray(rolesRaw) ? rolesRaw : []).map((role) =>
      typeof role === 'string' ? ({ code: role, name: role, id: role } as AuthRoleDto) : role
    );
    const permissions = response.permissions ?? response.user?.permissions ?? [];
    const userDto = response.user;

    if (!userDto) {
      this.clearSession();
      throw new Error('Réponse de connexion sans utilisateur.');
    }

    const user = this.mapAuthenticatedUser(userDto, roles, permissions);
    this.persistUser(user);
    this.syncPermissions(user.permissionCodes, user.roleCodes);
    this.currentUserSubject.next(user);

    console.log('[Auth] Utilisateur connecté', {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        groupId: user.groupId,
        schoolIds: user.schoolIds,
        active: user.active
      },
      roles: user.roleCodes,
      permissions: user.permissionCodes,
      permissionsDerivedFrom: (Array.isArray(response.permissions) ? response.permissions : [])
        .filter((item) => typeof item !== 'string')
        .map((item) => {
          const feature = item as AuthFeatureDto;
          const moduleName = feature.moduleName ?? feature.module_name;
          const moduleCode = feature.moduleCode ?? feature.module_code;
          const modulePart = moduleName || moduleCode;
          return {
            moduleName,
            moduleCode,
            action: feature.action,
            active: feature.active,
            derived:
              feature.active === false
                ? null
                : `${String(modulePart ?? '')
                    .trim()
                    .toLowerCase()}.${String(feature.action ?? '')
                    .trim()
                    .toLowerCase()}`
          };
        }),
      rawLoginResponse: {
        roles: response.roles,
        permissions: response.permissions,
        user: response.user
      }
    });
  }

  private applyTokenResponse(response: LoginResponse | RefreshTokenResponse): void {
    const accessToken = String(response.accessToken ?? '').trim();
    const refreshToken = String(response.refreshToken ?? '').trim();

    if (accessToken) {
      localStorage.setItem(SecurityService.ACCESS_TOKEN_KEY, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(SecurityService.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  private restoreSessionFromStorage(): void {
    const token = this.getAccessToken();
    if (!token) {
      this.currentUserSubject.next(null);
      this.permissionService.clear();
      return;
    }

    const raw = localStorage.getItem(SecurityService.USER_KEY);
    if (!raw) {
      return;
    }

    try {
      const user = JSON.parse(raw) as User;
      if (user?.id) {
        this.currentUserSubject.next(user);
        this.syncPermissions(user.permissionCodes ?? [], user.roleCodes ?? []);
      }
    } catch {
      this.clearSession();
    }
  }

  private persistUser(user: User): void {
    localStorage.setItem(SecurityService.USER_KEY, JSON.stringify(user));
  }

  private clearSession(): void {
    localStorage.removeItem(SecurityService.ACCESS_TOKEN_KEY);
    localStorage.removeItem(SecurityService.REFRESH_TOKEN_KEY);
    localStorage.removeItem(SecurityService.USER_KEY);
    this.permissionService.clear();
    this.currentUserSubject.next(null);
  }

  private syncPermissions(codes: string[], roleCodes: string[] = []): void {
    this.permissionService.setRoleCodes(roleCodes);
    this.permissionService.setPermissions(codes);
  }

  private mapAuthenticatedUser(
    dto: AuthenticatedUserDto,
    roles: AuthRoleDto[],
    permissions: Array<AuthFeatureDto | string>
  ): User {
    const mappedRoles = roles.map((role) => this.mapRole(role));
    const permissionCodes = this.extractPermissionCodes(permissions);
    const roleCodes = mappedRoles.map((role) => role.code || role.id).filter(Boolean);
    const primaryRole =
      mappedRoles[0] ||
      ({
        id: 'USER',
        code: 'USER',
        name: 'Utilisateur',
        permissions: permissionCodes
      } as Role);

    const firstName = String(dto.firstName ?? '').trim();
    const lastName = String(dto.lastName ?? '').trim();
    const username = String(dto.username ?? '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || username;

    return {
      id: String(dto.id ?? ''),
      username,
      email: String(dto.email ?? '').trim(),
      firstName,
      lastName,
      fullName,
      groupId: String(dto.groupId ?? '').trim(),
      schoolIds: (dto.schoolIds ?? []).map((id) => String(id)),
      active: dto.active !== false,
      roles: mappedRoles,
      roleCodes,
      permissionCodes,
      role: {
        ...primaryRole,
        permissions: permissionCodes
      }
    };
  }

  private mapRole(role: AuthRoleDto): Role {
    return {
      id: String(role.id ?? role.code ?? ''),
      code: String(role.code ?? '').trim(),
      name: String(role.name ?? role.code ?? 'Rôle').trim(),
      permissions: []
    };
  }

  private toAuthRole(role: Role): AuthRoleDto {
    return {
      id: role.id,
      code: role.code,
      name: role.name
    };
  }

  /**
   * Construit les permissions depuis rawLoginResponse.permissions :
   * `${moduleName}.${action}` en minuscules, uniquement si active !== false.
   * moduleCode n'est utilisé que s'il est sémantique (pas un code numérique type "001").
   */
  private extractPermissionCodes(permissions: Array<AuthFeatureDto | string>): string[] {
    const codes = new Set<string>();

    for (const item of permissions ?? []) {
      if (typeof item === 'string') {
        const code = this.normalizePermissionToken(item);
        if (code) {
          codes.add(code);
        }
        continue;
      }

      // Ne pas autoriser une feature inactive
      if (item.active === false) {
        continue;
      }

      const actionPart = this.normalizePermissionToken(item.action ?? '');
      const moduleName = this.normalizePermissionToken(
        item.moduleName ?? item.module_name ?? ''
      );
      const moduleCode = this.pickSemanticModuleCode(
        item.moduleCode ?? item.module_code ?? ''
      );

      // Règle métier : moduleName.action (ex. PAIEMENT + VIEW → paiement.view)
      const modulePart = moduleName || moduleCode;
      if (modulePart && actionPart) {
        codes.add(`${modulePart}.${actionPart}`);
        continue;
      }

      // Fallback : code déjà combiné côté API
      const existingCode = this.normalizePermissionToken(item.code ?? '');
      if (existingCode.includes('.')) {
        codes.add(existingCode);
      }
    }

    return Array.from(codes);
  }

  /** Ignore les codes techniques purement numériques (ex. "001"). */
  private pickSemanticModuleCode(raw: string): string {
    const code = this.normalizePermissionToken(raw);
    if (!code || /^\d+$/.test(code)) {
      return '';
    }
    return code;
  }

  private normalizePermissionToken(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }
}
