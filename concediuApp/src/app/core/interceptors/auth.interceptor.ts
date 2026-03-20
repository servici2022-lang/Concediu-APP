import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // Skip auth header for login and refresh endpoints
  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh-token')) {
    return next(req);
  }

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/')) {
        // Try refresh token
        if (!auth.isRefreshing$.value) {
          auth.isRefreshing$.next(true);
          return auth.refreshToken().pipe(
            switchMap((tokens) => {
              auth.isRefreshing$.next(false);
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
              });
              return next(retryReq);
            }),
            catchError((refreshError) => {
              auth.isRefreshing$.next(false);
              auth.logout();
              return throwError(() => refreshError);
            }),
          );
        } else {
          // Wait for the refresh to complete
          return auth.isRefreshing$.pipe(
            filter((refreshing) => !refreshing),
            take(1),
            switchMap(() => {
              const newToken = auth.getToken();
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              });
              return next(retryReq);
            }),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
