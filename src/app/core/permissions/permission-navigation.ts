import { APP_MENU, AppMenuItem } from './app-menu.config';
import { PermissionCode } from './permission.catalog';
import { PermissionService } from './permission.service';

/**
 * Première route accessible selon les permissions de l'utilisateur.
 */
export function resolveHomeUrl(permissionService: PermissionService): string {
  for (const item of APP_MENU) {
    const url = findFirstAllowedUrl(item, permissionService);
    if (url) {
      return url;
    }
  }
  return '/forbidden';
}

/**
 * Indique si l'URL est autorisée d'après les permissions déclarées dans APP_MENU.
 * Les URLs hors catalogue (ex. /forbidden) sont considérées accessibles si authentifié.
 */
export function canAccessUrl(url: string, permissionService: PermissionService): boolean {
  const path = normalizePath(url);
  if (!path || path === '/login' || path === '/forgot-password' || path === '/forbidden') {
    return true;
  }

  const required = findPermissionsForPath(path);
  if (!required) {
    // Route non recensée dans le menu : ne pas bloquer ici (le guard de route décide).
    return true;
  }
  if (!required.length) {
    return true;
  }
  return permissionService.hasAny(...required);
}

function findFirstAllowedUrl(
  item: AppMenuItem,
  permissionService: PermissionService
): string | null {
  if (item.children?.length) {
    for (const child of item.children) {
      const url = findFirstAllowedUrl(child, permissionService);
      if (url) {
        return url;
      }
    }
    return null;
  }

  if (!item.route) {
    return null;
  }

  const required = item.permissions ?? [];
  if (!required.length || !permissionService.hasAny(...required)) {
    return null;
  }

  return buildUrl(item.route, item.queryParams);
}

function findPermissionsForPath(path: string): PermissionCode[] | null {
  let matched: PermissionCode[] | null = null;

  const visit = (item: AppMenuItem): void => {
    if (item.route && pathsMatch(path, item.route)) {
      matched = item.permissions ?? [];
    }
    for (const child of item.children ?? []) {
      visit(child);
    }
  };

  for (const item of APP_MENU) {
    visit(item);
  }
  return matched;
}

function pathsMatch(current: string, route: string): boolean {
  const a = normalizePath(current);
  const b = normalizePath(route);
  return a === b || a.startsWith(`${b}/`);
}

function normalizePath(url: string): string {
  const raw = String(url ?? '').split('?')[0].split('#')[0].trim();
  if (!raw) {
    return '';
  }
  return raw.startsWith('/') ? raw.replace(/\/+$/, '') || '/' : `/${raw.replace(/\/+$/, '')}`;
}

function buildUrl(route: string, queryParams?: Record<string, string>): string {
  if (!queryParams || !Object.keys(queryParams).length) {
    return route;
  }
  const params = new URLSearchParams(queryParams);
  return `${route}?${params.toString()}`;
}
