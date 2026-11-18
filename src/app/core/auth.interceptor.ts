import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const baseApi = environment.apiUrl.replace(/\/$/, '');
  const esPeticionApi = req.url === baseApi || req.url.startsWith(`${baseApi}/`);
  const esLogin = req.url.includes('/auth/login');

  const peticion =
    token && esPeticionApi && !esLogin
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && esPeticionApi && !esLogin) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};