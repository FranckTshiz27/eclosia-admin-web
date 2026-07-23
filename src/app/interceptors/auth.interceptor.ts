import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, Observable, BehaviorSubject, filter, take } from 'rxjs';
import { SecurityService } from '../services/security.service';
import { InactivityService } from '../services/inactivity.service';

const isRefreshing$ = new BehaviorSubject<boolean>(false);
const refreshTokenSubject$ = new BehaviorSubject<string | null>(null);

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/complete-temporary-password'
];

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const securityService = inject(SecurityService);
  const inactivityService = inject(InactivityService);

  if (isPublicAuthRequest(req.url)) {
    return next(req);
  }

  const token = securityService.getAccessToken();
  if (!token) {
    return next(req);
  }

  const authReq = addTokenHeader(req, token);

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handle401Error(authReq, next, securityService, inactivityService);
      }
      return throwError(() => error);
    })
  );
};

function isPublicAuthRequest(url: string): boolean {
  const normalized = url.toLowerCase();
  return PUBLIC_AUTH_PATHS.some((path) => normalized.includes(path));
}

function addTokenHeader(request: HttpRequest<unknown>, token: string) {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  securityService: SecurityService,
  inactivityService: InactivityService
): Observable<HttpEvent<unknown>> {
  const refreshToken = securityService.getRefreshToken();
  if (!refreshToken) {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 401,
          statusText: 'Unauthorized',
          url: request.url
        })
    );
  }

  if (!isRefreshing$.value) {
    isRefreshing$.next(true);
    refreshTokenSubject$.next(null);

    return securityService.refreshToken().pipe(
      switchMap((result) => {
        isRefreshing$.next(false);
        refreshTokenSubject$.next(result.token);
        return next(addTokenHeader(request, result.token));
      }),
      catchError((err) => {
        isRefreshing$.next(false);
        inactivityService.logout('Session expirée. Veuillez vous reconnecter.');
        return throwError(() => err);
      })
    );
  }

  return refreshTokenSubject$.pipe(
    filter((token) => token !== null),
    take(1),
    switchMap((token) => next(addTokenHeader(request, token!)))
  );
}
