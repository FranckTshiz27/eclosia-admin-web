import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SecurityService, Permission } from '../services/security.service';
import { MatDialog } from '@angular/material/dialog';

/**
 * Guard fonctionnel pour protéger les routes.
 * Il vérifie si l'utilisateur est connecté et s'il possède les permissions requises.
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const securityService = inject(SecurityService);
  const router = inject(Router);
  const dialog = inject(MatDialog);

  const currentUser = securityService.getCurrentUser();

  // 1. Vérification de l'authentification
  if (!currentUser) {
    console.warn('Accès refusé : Utilisateur non connecté.');
    // Optionnel : Ouvrir un dialogue ou rediriger vers login
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // 2. Vérification des permissions (si spécifiées dans la config de la route)
  const requiredPermission = route.data['permission'] as Permission;
  
  if (requiredPermission && !securityService.hasPermission(requiredPermission)) {
    console.error(`Accès refusé : Permission "${requiredPermission}" manquante.`);
    // Redirection vers dashboard ou affichage d'un message
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
