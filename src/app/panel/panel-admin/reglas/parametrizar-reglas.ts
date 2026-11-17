import { Component } from '@angular/core';

interface Regla {
  nombre: string;
  valor: string;
  descripcion: string;
}

interface GrupoReglas {
  titulo: string;
  reglas: Regla[];
}

// Valores tomados de application.properties del backend (alimentared.reglas.*).
// La API no los expone, así que si el equipo los cambia en el servidor,
// hay que actualizarlos también aquí.
const GRUPOS: GrupoReglas[] = [
  {
    titulo: 'Solicitudes',
    reglas: [
      {
        nombre: 'Máximo de solicitudes activas por organización',
        valor: '3',
        descripcion: 'Una organización receptora no puede tener más solicitudes pendientes o asignadas a la vez (RN07).',
      },
      {
        nombre: 'Tiempo para confirmar una solicitud (SLA)',
        valor: '60 minutos',
        descripcion: 'Si no se confirma en ese plazo, la solicitud expira y el lote se libera (RN06).',
      },
      {
        nombre: 'Ventana de empate entre solicitudes',
        valor: '60 segundos',
        descripcion: 'Tiempo de espera para detectar varias solicitudes sobre el mismo lote (RN09).',
      },
    ],
  },
  {
    titulo: 'Strikes y cuentas',
    reglas: [
      {
        nombre: 'Strikes para suspender una cuenta',
        valor: '3',
        descripcion: 'Al llegar a este número de strikes vigentes, la organización queda suspendida (RN08).',
      },
      {
        nombre: 'Duración de la sesión',
        valor: '60 minutos',
        descripcion: 'Tiempo de vida del token de acceso después de iniciar sesión.',
      },
    ],
  },
  {
    titulo: 'Lotes y entregas',
    reglas: [
      {
        nombre: 'Plazo para retirar un lote asignado',
        valor: '24 horas',
        descripcion: 'Tiempo máximo para retirar un lote una vez asignado.',
      },
      {
        nombre: 'Umbral de rescate urgente',
        valor: '4 horas',
        descripcion: 'Un lote que vence en menos de este tiempo se marca como rescate urgente.',
      },
      {
        nombre: 'Zona horaria',
        valor: 'America/Bogota',
        descripcion: 'Zona usada por el sistema para fechas, vencimientos y tareas programadas.',
      },
    ],
  },
];

@Component({
  selector: 'app-parametrizar-reglas',
  template: `
    <section class="pagina">
      <header class="cabecera">
        <h2>Parametrizar reglas</h2>
        <p class="resumen">Reglas de negocio que aplica el sistema.</p>
      </header>

     

      @for (grupo of grupos; track grupo.titulo) {
        <h3 class="grupo">{{ grupo.titulo }}</h3>
        <div class="contenedor">
          <table>
            <thead>
              <tr>
                <th scope="col">Regla</th>
                <th scope="col">Valor</th>
                <th scope="col">Descripción</th>
              </tr>
            </thead>
            <tbody>
              @for (regla of grupo.reglas; track regla.nombre) {
                <tr>
                  <td>{{ regla.nombre }}</td>
                  <td class="valor">{{ regla.valor }}</td>
                  <td>{{ regla.descripcion }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: [
    `
      h2,
      h3 {
        margin: 0;
      }
      .resumen {
        color: #647168;
      }
      .aviso {
        margin: 12px 0 8px;
        padding: 12px 14px;
        border-radius: 8px;
        background: #fef9c3;
        color: #854d0e;
      }
      .grupo {
        margin: 24px 0 12px;
      }
      .contenedor {
        overflow-x: auto;
        border: 1px solid #e1e7e2;
        border-radius: 8px;
        background: #fff;
        color: #1f2a22;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }
      th,
      td {
        padding: 12px 14px;
        border-bottom: 1px solid #e8ece9;
      }
      th {
        background: #f3f7f4;
        font-weight: 600;
      }
      .valor {
        font-weight: 600;
        white-space: nowrap;
      }
    `,
  ],
})
export class ParametrizarReglas {
  readonly grupos = GRUPOS;
}
