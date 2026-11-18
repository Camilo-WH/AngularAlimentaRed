import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  get<TRespuesta>(ruta: string): Observable<TRespuesta> {
    return this.http.get<TRespuesta>(this.construirUrl(ruta));
  }

  post<TSolicitud, TRespuesta>(ruta: string, datos: TSolicitud): Observable<TRespuesta> {
    return this.http.post<TRespuesta>(this.construirUrl(ruta), datos);
  }

  put<TSolicitud, TRespuesta>(ruta: string, datos: TSolicitud): Observable<TRespuesta> {
    return this.http.put<TRespuesta>(this.construirUrl(ruta), datos);
  }

  patch<TSolicitud, TRespuesta>(ruta: string, datos: TSolicitud): Observable<TRespuesta> {
    return this.http.patch<TRespuesta>(this.construirUrl(ruta), datos);
  }

  delete<TRespuesta>(ruta: string): Observable<TRespuesta> {
    return this.http.delete<TRespuesta>(this.construirUrl(ruta));
  }

  private construirUrl(ruta: string): string {
    return `${this.baseUrl}/${ruta.replace(/^\/+/, '')}`;
  }
}
