import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const esLogin = req.url.includes('/auth/login');

  // Agrega el token a todas las peticiones, menos al login
  const peticion =
    token && !esLogin
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      // Token vencido o inválido: volver al login
      if (error.status === 401 && !esLogin) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};