import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoanService } from './loan.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const loanService = inject(LoanService);
  const token = localStorage.getItem('auth_token');

  let authReq = req.clone({
    withCredentials: true
  });

  if (token) {
    authReq = authReq.clone({
      headers: authReq.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 Unauthorized signals an expired or invalid Access Token
      // Do not try to refresh on login or refresh requests themselves to prevent loops
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh')
      ) {
        return loanService.refreshTokenObservable().pipe(
          switchMap((newToken: string) => {
            const retryReq = req.clone({
              withCredentials: true,
              headers: req.headers.set('Authorization', `Bearer ${newToken}`)
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            if (refreshErr.status === 401 || refreshErr.status === 403) {
              loanService.logout(false);
            }
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
