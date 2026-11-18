import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { OrganizacionDto, Pagina } from '../../../core/modelos-admin';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';

interface StrikeDto {
  id: number;
  organizacionId: number;
  organizacionNombre: string;
  asignacionId: number | null;
  nombreStrike: string;
  detalles: string | null;
  fechaRegistro: string;
  vigente: boolean;
  justificacionApelacion: string | null;
  fechaApelacion: string | null;
}

type Filtro = 'con-strikes' | 'suspendidas';

@Component({
  selector: 'app-gestionar-cuentas',
  imports: [DatePipe],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <div>
          <h2>Suspender o reactivar cuenta</h2>
          <p class="resumen">
            La suspensión es automática: una organización con 3 strikes vigentes queda suspendida.
            Se reactiva cuando el Coordinador acepta la apelación de un strike. Aquí puedes
            consultar el estado de las cuentas.
          </p>
        </div>
        <button type="button" class="secundario" [disabled]="cargando()" (click)="cargar()">
          Actualizar
        </button>
      </header>

      <div class="resumenes">
        <div class="tarjeta">
          <strong>{{ suspendidas() }}</strong>
          <span>Suspendidas</span>
        </div>
        <div class="tarjeta">
          <strong>{{ conStrikes() }}</strong>
          <span>Con strikes vigentes</span>
        </div>
        <div class="tarjeta">
          <strong>{{ organizaciones().length }}</strong>
          <span>Organizaciones</span>
        </div>
      </div>

      @if (cargando()) {
        <p class="estado">Cargando... Si el servidor estaba inactivo, puede tardar hasta un minuto.</p>
      } @else {
        <div class="barra">
          <label class="filtro">
            Mostrar
            <select [value]="filtro()" (change)="cambiarFiltro($any($event.target).value)">
              <option value="con-strikes">Con strikes o suspendidas</option>
              <option value="suspendidas">Solo suspendidas</option>
            </select>
          </label>
        </div>

        @if (cuentas().length === 0) {
          <p class="estado">
            {{
              filtro() === 'suspendidas'
                ? 'Ninguna organización está suspendida.'
                : 'Ninguna organización tiene strikes vigentes.'
            }}
          </p>
        } @else {
          <div class="contenedor">
            <table>
              <thead>
                <tr>
                  <th scope="col">NIT</th>
                  <th scope="col">Organización</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Strikes vigentes</th>
                  <th scope="col">Estado</th>
                  <th scope="col"><span class="oculto">Detalle</span></th>
                </tr>
              </thead>
              <tbody>
                @for (org of cuentas(); track org.id) {
                  <tr [class.activa]="seleccionadaId() === org.id">
                    <td>{{ org.nit }}</td>
                    <td>{{ org.nombre }}</td>
                    <td>{{ org.correo }}</td>
                    <td>{{ org.strikesVigentes }}</td>
                    <td>
                      <span class="etiqueta" [class.suspendida]="org.bloqueada">
                        {{ org.bloqueada ? 'Suspendida' : 'Activa' }}
                      </span>
                    </td>
                    <td class="celda-accion">
                      <button type="button" class="secundario" (click)="alternar(org.id)">
                        {{ seleccionadaId() === org.id ? 'Ocultar strikes' : 'Ver strikes' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (seleccionada(); as org) {
          <h3 class="subtitulo">Strikes de {{ org.nombre }}</h3>

          @if (strikesSeleccionada().length === 0) {
            <p class="estado">Esta organización no tiene strikes registrados.</p>
          } @else {
            <div class="contenedor">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Detalles</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Apelación</th>
                  </tr>
                </thead>
                <tbody>
                  @for (strike of strikesSeleccionada(); track strike.id) {
                    <tr>
                      <td>{{ strike.fechaRegistro | date: 'dd/MM/yyyy HH:mm' }}</td>
                      <td>{{ strike.nombreStrike }}</td>
                      <td>{{ strike.detalles || '—' }}</td>
                      <td>{{ strike.vigente ? 'Vigente' : 'Retirado' }}</td>
                      <td>{{ strike.justificacionApelacion || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </section>
  `,
  styles: [
    `
      h2,
      h3 {
        margin: 0;
        color: var(--color-texto);
        font-family: var(--fuente-titulos);
      }
      .cabecera {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }
      .subtitulo {
        margin: 24px 0 12px;
      }
      .resumen,
      .estado {
        color: var(--color-texto-secundario);
      }
      .resumenes {
        display: grid;
        grid-template-columns: repeat(3, minmax(150px, 1fr));
        gap: 16px;
        margin: 24px 0;
      }
      .tarjeta {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 4px;
        padding: 18px 20px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        color: var(--color-texto);
        box-shadow: var(--sombra-tarjeta);
      }
      .tarjeta strong {
        font-family: var(--fuente-titulos);
        font-size: var(--texto-3xl);
        font-weight: var(--peso-bold);
      }
      .tarjeta span {
        color: var(--color-texto-secundario);
        font-size: var(--texto-sm);
      }
      .barra {
        margin-bottom: 12px;
      }
      .filtro {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: var(--color-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
      }
      select {
        min-height: 42px;
        padding: 8px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-superficie);
        color: var(--color-texto);
        font: inherit;
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
      tr.activa td {
        background: var(--color-superficie-hover);
      }
      .etiqueta {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--color-exito-fondo);
        color: var(--color-exito);
        font-size: var(--texto-xs);
        font-weight: var(--peso-semibold);
      }
      .etiqueta.suspendida {
        background: var(--color-error-fondo);
        color: var(--color-error);
      }
      .celda-accion {
        text-align: right;
      }
      button {
        min-height: 38px;
        padding: 7px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-superficie);
        color: var(--color-texto);
        cursor: pointer;
      }
      button:hover:not(:disabled) {
        background: var(--color-superficie-hover);
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
export class GestionarCuentas implements OnInit {
  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);

  readonly organizaciones = signal<OrganizacionDto[]>([]);
  readonly strikes = signal<StrikeDto[]>([]);
  readonly cargando = signal(true);
  readonly filtro = signal<Filtro>('con-strikes');
  readonly seleccionadaId = signal<number | null>(null);

  readonly suspendidas = computed(() => this.organizaciones().filter((o) => o.bloqueada).length);
  readonly conStrikes = computed(
    () => this.organizaciones().filter((o) => o.strikesVigentes > 0).length,
  );

  // Primero las suspendidas, luego las que tienen más strikes
  readonly cuentas = computed(() => {
    const soloSuspendidas = this.filtro() === 'suspendidas';
    const lista = this.organizaciones().filter((o) =>
      soloSuspendidas ? o.bloqueada : o.bloqueada || o.strikesVigentes > 0,
    );
    return [...lista].sort(
      (a, b) =>
        Number(b.bloqueada) - Number(a.bloqueada) ||
        b.strikesVigentes - a.strikesVigentes ||
        a.nombre.localeCompare(b.nombre),
    );
  });

  readonly seleccionada = computed(
    () => this.organizaciones().find((o) => o.id === this.seleccionadaId()) ?? null,
  );
  readonly strikesSeleccionada = computed(() =>
    this.strikes().filter((s) => s.organizacionId === this.seleccionadaId()),
  );

  ngOnInit(): void {
    this.cargar();
  }

  cambiarFiltro(valor: string): void {
    this.filtro.set(valor as Filtro);
  }

  alternar(id: number): void {
    this.seleccionadaId.update((actual) => (actual === id ? null : id));
  }

  cargar(): void {
    this.cargando.set(true);
    forkJoin({
      organizaciones: this.api.get<Pagina<OrganizacionDto>>('organizaciones?size=100'),
      strikes: this.api.get<StrikeDto[]>('organizaciones/strikes/todos'),
    }).subscribe({
      next: ({ organizaciones, strikes }) => {
        this.organizaciones.set(organizaciones.contenido);
        this.strikes.set(strikes);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.mensajes.error('No se pudo cargar el estado de las cuentas.');
      },
    });
  }
}