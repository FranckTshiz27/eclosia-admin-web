import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PermissionCode } from './permission.catalog';

const SUPER_ADMIN_ROLE = 'super_admin';

/**
 * Source unique de vérité pour les permissions frontend.
 * Les décisions passent par les codes Feature du login
 * (`moduleName.action`, active === true).
 * Exception : SUPER_ADMIN a toujours accès à tout.
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private static readonly STORAGE_KEY = 'auth_permissions';
  private static readonly ROLES_STORAGE_KEY = 'auth_role_codes';

  private readonly permissionsSubject = new BehaviorSubject<ReadonlySet<string>>(new Set());
  private readonly roleCodesSubject = new BehaviorSubject<ReadonlySet<string>>(new Set());
  readonly permissions$ = this.permissionsSubject.asObservable();

  constructor() {
    this.restore();
  }

  /** Remplace entièrement le jeu de permissions (après login /me). */
  setPermissions(codes: Iterable<string>): void {
    const normalized = new Set<string>();
    for (const code of codes) {
      const value = this.normalize(code);
      if (value) {
        normalized.add(value);
      }
    }
    this.permissionsSubject.next(normalized);
    localStorage.setItem(PermissionService.STORAGE_KEY, JSON.stringify([...normalized]));
  }

  /** Codes de rôles (détection SUPER_ADMIN + info). */
  setRoleCodes(codes: Iterable<string>): void {
    const normalized = new Set<string>();
    for (const code of codes) {
      const value = this.normalize(code);
      if (value) {
        normalized.add(value);
      }
    }
    this.roleCodesSubject.next(normalized);
    localStorage.setItem(PermissionService.ROLES_STORAGE_KEY, JSON.stringify([...normalized]));
  }

  clear(): void {
    this.permissionsSubject.next(new Set());
    this.roleCodesSubject.next(new Set());
    localStorage.removeItem(PermissionService.STORAGE_KEY);
    localStorage.removeItem(PermissionService.ROLES_STORAGE_KEY);
  }

  getPermissions(): readonly string[] {
    return [...this.permissionsSubject.value];
  }

  /** SUPER_ADMIN : accès total à l'UI, indépendamment des features. */
  isSuperAdmin(): boolean {
    const roles = this.roleCodesSubject.value;
    return (
      roles.has(SUPER_ADMIN_ROLE) ||
      roles.has('superadmin') ||
      roles.has('super-admin')
    );
  }

  has(permission: PermissionCode | null | undefined): boolean {
    if (this.isSuperAdmin()) {
      return true;
    }
    if (!permission) {
      return false;
    }
    return this.permissionsSubject.value.has(this.normalize(permission));
  }

  hasAny(...permissions: PermissionCode[]): boolean {
    if (this.isSuperAdmin()) {
      return true;
    }
    if (!permissions.length) {
      return false;
    }
    return permissions.some((permission) => this.has(permission));
  }

  hasAll(...permissions: PermissionCode[]): boolean {
    if (this.isSuperAdmin()) {
      return true;
    }
    if (!permissions.length) {
      return false;
    }
    return permissions.every((permission) => this.has(permission));
  }

  has$(permission: PermissionCode): Observable<boolean> {
    return this.permissions$.pipe(map(() => this.has(permission)));
  }

  private restore(): void {
    const rolesRaw = localStorage.getItem(PermissionService.ROLES_STORAGE_KEY);
    if (rolesRaw) {
      try {
        const parsed = JSON.parse(rolesRaw) as unknown;
        if (Array.isArray(parsed)) {
          this.setRoleCodes(parsed.map((item) => String(item ?? '')));
        }
      } catch {
        localStorage.removeItem(PermissionService.ROLES_STORAGE_KEY);
      }
    }

    const raw = localStorage.getItem(PermissionService.STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          this.setPermissions(parsed.map((item) => String(item ?? '')));
        }
      } catch {
        localStorage.removeItem(PermissionService.STORAGE_KEY);
      }
    }
  }

  private normalize(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }
}
