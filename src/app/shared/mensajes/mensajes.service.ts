import { Injectable, signal } from '@angular/core';

export type TipoMensaje = 'exito' | 'error';

export interface Mensaje {
  id: number;
  tipo: TipoMensaje;
  texto: string;
}

@Injectable({ providedIn: 'root' })
export class MensajesService {
  readonly mensajes = signal<Mensaje[]>([]);
  private siguienteId = 0;

  exito(texto: string): void {
    this.agregar('exito', texto);
  }

  error(texto: string): void {
    this.agregar('error', texto);
  }

  descartar(id: number): void {
    this.mensajes.update((mensajes) => mensajes.filter((mensaje) => mensaje.id !== id));
  }

  private agregar(tipo: TipoMensaje, texto: string): void {
    const id = ++this.siguienteId;
    this.mensajes.update((mensajes) => [...mensajes, { id, tipo, texto }]);
    setTimeout(() => this.descartar(id), 5000);
  }
}
