import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/api.service';
import { OrganizacionDto, Pagina } from '../../../core/modelos-admin';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';

@Component({
  selector: 'app-verificar-organizacion',
  imports: [DatePipe],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <h2>Verificar organización</h2>
        <p class="resumen">
          Una organización verificada puede operar por completo en la plataforma.
        </p>
      </header>

      @if (cargando()) {
        <p class="estado">Cargando... Si el servidor estaba inactivo, puede tardar hasta un minuto.</p>
      } @else if (pendientes().length === 0) {
        <p class="estado">No hay organizaciones pendientes de verificación.</p>
      } @else {
        <div class="contenedor">
          <table>
            <thead>
              <tr>
                <th scope="col">NIT</th>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Registro</th>
                <th scope="col"><span class="oculto">Acción</span></th>
              </tr>
            </thead>
            <tbody>
              @for (org of pendientes(); track org.id) {
                <tr>
                  <td>{{ org.nit }}</td>
                  <td>{{ org.nombre }}</td>
                  <td>{{ org.correo }}</td>
                  <td>{{ org.fechaRegistro | date: 'dd/MM/yyyy' }}</td>
                  <td>
                    <button
                      type="button"
                      [disabled]="verificandoId() === org.id"
                      (click)="verificar(org)"
                    >
                      {{ verificandoId() === org.id ? 'Verificando...' : 'Verificar' }}
                    </button>
                  </td>
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
      h2 {
        margin: 0;
        color: var(--color-texto);
        font-family: var(--fuente-titulos);
      }
      .resumen,
      .estado {
        color: var(--color-texto-secundario);
      }
      .contenedor {
        overflow-x: auto;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        color: var(--color-texto);
        box-shadow: var(--sombra-tarjeta);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-family: var(--fuente-texto);
      }
      th,
      td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--color-borde);
      }
      th {
        background: var(--color-superficie-secundaria);
        font-weight: var(--peso-semibold);
      }
      tbody tr:hover {
        background: var(--color-superficie-hover);
      }
      tbody tr:last-child td {
        border-bottom: 0;
      }
      button {
        min-height: 40px;
        padding: 8px 16px;
        border: 1px solid transparent;
        border-radius: var(--radio-control);
        background: var(--color-acento);
        color: var(--color-acento-texto);
        font-weight: var(--peso-semibold);
        cursor: pointer;
      }
      button:hover:not(:disabled) {
        background: var(--color-acento-hover);
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .oculto {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        clip-path: inset(50%);
      }
    `,
  ],
})
export class VerificarOrganizacion implements OnInit {
  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);

  readonly pendientes = signal<OrganizacionDto[]>([]);
  readonly cargando = signal(true);
  readonly verificandoId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  verificar(org: OrganizacionDto): void {
    // Acción crítica: se pide confirmación antes de enviar
    const confirmado = window.confirm(
      `¿Verificar a ${org.nombre} (NIT ${org.nit})? Podrá operar por completo en la plataforma.`,
    );
    if (!confirmado) {
      return;
    }

    this.verificandoId.set(org.id);
    this.api.patch<null, OrganizacionDto>(`organizaciones/${org.id}/verificar`, null).subscribe({
      next: () => {
        this.pendientes.update((lista) => lista.filter((o) => o.id !== org.id));
        this.verificandoId.set(null);
        this.mensajes.exito(`Organización ${org.nombre} verificada.`);
      },
      error: () => {
        this.verificandoId.set(null);
        this.mensajes.error('No se pudo verificar la organización. Intenta de nuevo.');
      },
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.api.get<Pagina<OrganizacionDto>>('organizaciones?verificada=false&size=100').subscribe({
      next: (pagina) => {
        this.pendientes.set(pagina.contenido);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.mensajes.error('No se pudieron cargar las organizaciones pendientes.');
      },
    });
  }
}