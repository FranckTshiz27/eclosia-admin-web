import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SecurityService } from '../../services/security.service';
import { PermissionCode } from './permission.catalog';
import { PermissionService } from './permission.service';
import { resolveHomeUrl } from './permission-navigation';

/**
 * Guard d'authentification + permission(s) déclarées sur la route courante uniquement
 * (pas d'agrégation avec les parents — chaque niveau déclare ses droits).
 *
 * data: {
 *   permission?: PermissionCode
 *   permissions?: PermissionCode[]
 *   permissionMode?: 'any' | 'all'
 * }
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const securityService = inject(SecurityService);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  if (!securityService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const required = collectRequiredPermissions(route);
  if (!required.length) {
    return true;
  }

  const mode = (route.data['permissionMode'] as 'any' | 'all' | undefined) ?? 'any';
  const allowed =
    mode === 'all' ? permissionService.hasAll(...required) : permissionService.hasAny(...required);

  if (allowed) {
    return true;
  }

  const home = resolveHomeUrl(permissionService);
  const currentPath = state.url.split('?')[0];
  const homePath = home.split('?')[0];

  // Redirige vers une page autorisée plutôt que de bloquer l'utilisateur.
  if (home && home !== '/forbidden' && homePath !== currentPath) {
    router.navigateByUrl(home);
    return false;
  }

  router.navigate(['/forbidden'], { queryParams: { from: state.url } });
  return false;
};

function collectRequiredPermissions(route: ActivatedRouteSnapshot): PermissionCode[] {
  const single = route.data['permission'] as PermissionCode | undefined;
  const many = route.data['permissions'] as PermissionCode[] | undefined;
  const collected: PermissionCode[] = [];
  if (single) {
    collected.push(single);
  }
  if (Array.isArray(many)) {
    collected.push(...many);
  }
  return collected;
}
