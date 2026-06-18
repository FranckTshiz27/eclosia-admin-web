import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, Observable, BehaviorSubject, filter, take } from 'rxjs';
import { SecurityService } from '../services/security.service';

// On utilise un BehaviorSubject pour gérer le rafraîchissement du token si plusieurs requêtes échouent en même temps
const isRefreshing$ = new BehaviorSubject<boolean>(false);
const refreshTokenSubject$ = new BehaviorSubject<string | null>(null);

import { InactivityService } from '../services/inactivity.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const securityService = inject(SecurityService);
  const inactivityService = inject(InactivityService);

  // 1. Ne pas intercepter la route de login
  if (req.url.includes('login')) {
    return next(req);
  }

  // 2. Vérification rapide de la session locale
  const token = localStorage.getItem('token');
  if (!token) {
    // Laisse passer la requête sans header Authorization.
    // Evite de déconnecter l'utilisateur tant qu'on n'a pas une vraie session tokenisée.
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
  }

  // 3. Cloner la requête pour ajouter le header Authorization
  const authReq = addTokenHeader(req, token);

  // 4. Envoyer la requête et gérer les erreurs (notamment 401)
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handle401Error(authReq, next, securityService, inactivityService);
      }
      return throwError(() => error);
    })
  );
};

/**
 * Ajoute le header Authorization à la requête
 */
function addTokenHeader(request: HttpRequest<unknown>, token: string) {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

/**
 * Gère l'erreur 401 (Token expiré)
 */
function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  securityService: SecurityService,
  inactivityService: InactivityService
): Observable<HttpEvent<unknown>> {
  const currentToken = localStorage.getItem('token');
  const refreshFn = (securityService as any).refreshToken;

  // Si aucune session locale n'existe (ou pas de stratégie de refresh), on renvoie l'erreur
  // au composant appelant au lieu de rediriger automatiquement vers login.
  if (!currentToken || typeof refreshFn !== 'function') {
    return throwError(() => new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
      url: request.url
    }));
  }

  if (!isRefreshing$.value) {
    isRefreshing$.next(true);
    refreshTokenSubject$.next(null);

    return refreshFn.call(securityService).pipe(
      switchMap((newToken: any) => {
        isRefreshing$.next(false);
        localStorage.setItem('token', newToken.token);
        refreshTokenSubject$.next(newToken.token);

        return next(addTokenHeader(request, newToken.token));
      }),
      catchError((err) => {
        isRefreshing$.next(false);
        inactivityService.logout('Session expirée. Veuillez vous reconnecter.'); 
        return throwError(() => err);
      })
    );
  } else {
    // Si un rafraîchissement est déjà en cours, on attend que le nouveau token arrive
    return refreshTokenSubject$.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next(addTokenHeader(request, token!)))
    );
  }
}
