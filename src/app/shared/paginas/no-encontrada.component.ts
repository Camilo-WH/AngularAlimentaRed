import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-encontrada',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main>
      <h1>Página no encontrada</h1>
      <p>La dirección solicitada no existe.</p>
      <a routerLink="/login">Ir al inicio</a>
    </main>
  `,
  styles: [
    `
      main {
        max-width: 560px;
        margin: 12vh auto;
        padding: 32px;
        font-family: system-ui, sans-serif;
        text-align: center;
      }
      a {
        color: #287a3d;
      }
    `,
  ],
})
export class NoEncontradaComponent {}
