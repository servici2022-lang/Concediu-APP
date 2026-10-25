import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, filter, take, finalize } from 'rxjs';
import { AuthService } from '../services/auth.service';

const withBearer = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

// Doar login și refresh-token merg fără token și fără refresh. Restul rutelor /auth/
// (register, logout, me) au nevoie de ambele: altfel un admin care crea un utilizator
// după o oră de inactivitate primea doar „Token expired”.
const isPublicAuthCall = (url: string) => /\/auth\/(login|refresh-token)$/.test(url);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (isPublicAuthCall(req.url)) {
    return next(req);
  }

  return next(withBearer(req, auth.getToken())).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !auth.getRefreshToken()) {
        return throwError(() => error);
      }

      // Primul 401 pornește refresh-ul; cererile care pică între timp îl așteaptă.
      if (!auth.isRefreshing$.value) {
        auth.isRefreshing$.next(true);
        return auth.refreshToken().pipe(
          // Dacă refresh-ul eșuează, refreshToken() închide singur sesiunea și duce la login.
          finalize(() => auth.isRefreshing$.next(false)),
          switchMap((tokens) => next(withBearer(req, tokens.accessToken))),
        );
      }

      return auth.isRefreshing$.pipe(
        filter((refreshing) => !refreshing),
        take(1),
        switchMap(() => {
          const token = auth.getToken();
          return token ? next(withBearer(req, token)) : throwError(() => error);
        }),
      );
    }),
  );
};
