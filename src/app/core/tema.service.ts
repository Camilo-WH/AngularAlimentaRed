import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

export type ModoTema = 'claro' | 'oscuro';

const CLAVE_TEMA = 'tema-alimentared';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  readonly tema = signal<ModoTema>(this.leerTemaInicial());
  readonly esOscuro = computed(() => this.tema() === 'oscuro');

  constructor() {
    this.documento.documentElement.setAttribute('data-tema', this.tema());
  }

  alternar(): void {
    const nuevoTema: ModoTema = this.esOscuro() ? 'claro' : 'oscuro';
    this.tema.set(nuevoTema);
    this.documento.documentElement.setAttribute('data-tema', nuevoTema);

    try {
      this.documento.defaultView?.localStorage.setItem(CLAVE_TEMA, nuevoTema);
    } catch {
      // El cambio visual funciona aunque el navegador no permita guardar la preferencia.
    }
  }

  private leerTemaInicial(): ModoTema {
    try {
      const guardado = this.documento.defaultView?.localStorage.getItem(CLAVE_TEMA);
      if (guardado === 'claro' || guardado === 'oscuro') {
        return guardado;
      }
    } catch {
      // Se continúa con el atributo inicial, establecido antes de cargar la aplicación.
    }

    return this.documento.documentElement.getAttribute('data-tema') === 'claro'
      ? 'claro'
      : 'oscuro';
  }
}
