import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-acceso-denegado',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main>
      <h1>Acceso denegado</h1>
      <p>Tu cuenta no tiene permiso para entrar a esta sección.</p>
      <a routerLink="/login">Volver al inicio de sesión</a>
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
export class AccesoDenegadoComponent {}
