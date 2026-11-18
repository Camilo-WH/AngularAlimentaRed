import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import {
  ErrorApiCoordinador,
  EvaluarApelacionStrikeRequestDto,
  StrikeCoordinadorDto,
} from '../../../core/modelos-coordinador';
import { ColumnaTabla } from '../../../core/modelos';
import { DialogoConfirmacionComponent } from '../../../shared/confirmacion/dialogo-confirmacion.component';
import { IndicadorCargaComponent } from '../../../shared/carga/indicador-carga.component';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { TablaComponent } from '../../../shared/tabla/tabla.component';

interface FilaStrikeApelado {
  id: string;
  organizacion: string;
  strike: string;
  detalles: string;
  fechaRegistro: string;
  justificacionApelacion: string;
}

const VALIDADORES_JUSTIFICACION = [
  Validators.required,
  Validators.minLength(10),
  Validators.maxLength(500),
  Validators.pattern(/\S/),
];

function tieneApelacionPendiente(strike: StrikeCoordinadorDto): boolean {
  return (
    strike.vigente &&
    strike.fechaApelacion === null &&
    typeof strike.justificacionApelacion === 'string' &&
    strike.justificacionApelacion.trim().length > 0
  );
}

@Component({
  selector: 'app-evaluar-apelacion',
  standalone: true,
  imports: [
    DialogoConfirmacionComponent,
    IndicadorCargaComponent,
    ReactiveFormsModule,
    TablaComponent,
  ],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <div>
          <h2>Evaluar apelación</h2>
          <p class="resumen">
            Revisa las apelaciones pendientes de strikes vigentes y registra tu decisión.
          </p>
        </div>
        <span class="total">{{ apelacionesPendientes().length }} apelaciones pendientes</span>
      </header>

      @if (cargando()) {
        <p class="estado" role="status">Cargando strikes...</p>
      } @else if (errorCarga()) {
        <div class="estado error-carga" role="alert">
          <p>{{ errorCarga() }}</p>
          <button type="button" class="secundario" (click)="cargar()">Reintentar</button>
        </div>
      } @else if (apelacionesPendientes().length === 0) {
        <p class="estado">No hay strikes vigentes con apelaciones pendientes.</p>
      } @else {
        <app-tabla
          [filas]="filas()"
          [columnas]="columnas"
          [tamanoPagina]="20"
          textoVacio="No hay apelaciones pendientes."
        />

        <section class="evaluacion" aria-labelledby="titulo-evaluacion">
          <h3 id="titulo-evaluacion">Decisión sobre una apelación</h3>
          <label class="campo">
            Apelación pendiente
            <select
              [value]="strikeSeleccionadoId() ?? ''"
              (change)="cambiarStrike($event)"
            >
              <option value="">Selecciona un strike apelado</option>
              @for (strike of apelacionesPendientes(); track strike.id) {
                <option [value]="strike.id">
                  #{{ strike.id }} · {{ strike.organizacionNombre }} · {{ strike.nombreStrike }}
                </option>
              }
            </select>
          </label>
          @if (seleccionTocada() && strikeSeleccionadoId() === null) {
            <small class="error-carga" role="alert">Selecciona una apelación pendiente.</small>
          }

          @if (strikeSeleccionado(); as strike) {
            <article class="detalle">
              <h4>Strike #{{ strike.id }} · {{ strike.organizacionNombre }}</h4>
              <dl>
                <div><dt>Organización</dt><dd>{{ strike.organizacionNombre }} (#{{ strike.organizacionId }})</dd></div>
                <div><dt>Tipo de strike</dt><dd>{{ strike.nombreStrike }}</dd></div>
                <div><dt>Asignación</dt><dd>{{ strike.asignacionId === null ? '—' : '#' + strike.asignacionId }}</dd></div>
                <div><dt>Fecha de registro</dt><dd>{{ formatearFecha(strike.fechaRegistro) }}</dd></div>
                @if (strike.detalles) {
                  <div class="ancho-completo"><dt>Detalles del strike</dt><dd>{{ strike.detalles }}</dd></div>
                }
                <div class="ancho-completo">
                  <dt>Justificación de la apelación</dt>
                  <dd>{{ strike.justificacionApelacion }}</dd>
                </div>
              </dl>

              <form [formGroup]="form" (ngSubmit)="solicitarConfirmacion()">
                <fieldset>
                  <legend>Decisión</legend>
                  <label>
                    <input type="radio" formControlName="aprobada" [value]="true" />
                    Aprobar apelación
                  </label>
                  <label>
                    <input type="radio" formControlName="aprobada" [value]="false" />
                    Rechazar apelación
                  </label>
                </fieldset>
                @if (form.controls.aprobada.touched && form.controls.aprobada.hasError('required')) {
                  <small class="error-carga" role="alert">Selecciona aprobar o rechazar.</small>
                }

                <label class="campo">
                  Justificación de la evaluación
                  <textarea rows="4" minlength="10" maxlength="500" formControlName="justificacion"></textarea>
                </label>
                <small class="ayuda">
                  Obligatoria, de 10 a 500 caracteres y no puede contener solo espacios.
                </small>
                @if (form.controls.justificacion.touched && form.controls.justificacion.invalid) {
                  @if (form.controls.justificacion.hasError('required') ||
                    form.controls.justificacion.hasError('pattern')) {
                    <small class="error-carga" role="alert">La justificación es obligatoria.</small>
                  }
                  @if (form.controls.justificacion.hasError('minlength')) {
                    <small class="error-carga" role="alert">Escribe al menos 10 caracteres.</small>
                  }
                  @if (form.controls.justificacion.hasError('maxlength')) {
                    <small class="error-carga" role="alert">No superes los 500 caracteres.</small>
                  }
                }
                <button type="submit" [disabled]="guardando()">
                  {{ guardando() ? 'Procesando...' : 'Continuar' }}
                </button>
              </form>
            </article>
          }
        </section>
      }

      <app-dialogo-confirmacion
        [abierto]="dialogoAbierto()"
        [titulo]="tituloDialogo()"
        [mensaje]="mensajeDialogo()"
        [textoConfirmar]="textoConfirmar()"
        (confirmado)="evaluarApelacion()"
        (cancelado)="cerrarDialogo()"
      />
      <app-indicador-carga [visible]="guardando()" texto="Registrando evaluación..." />
    </section>
  `,
  styles: [
    `
      h2,
      h3,
      h4 {
        margin: 0;
      }
      .cabecera {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 12px;
      }
      .resumen,
      .estado,
      .total,
      .ayuda {
        color: #647168;
      }
      .resumen {
        margin: 5px 0 0;
      }
      .total {
        margin-bottom: 14px;
        font-size: 14px;
      }
      .estado {
        padding: 14px 0;
      }
      .error-carga {
        color: #991b1b;
      }
      .evaluacion {
        margin-top: 24px;
        padding: 18px;
        border: 1px solid #e1e7e2;
        border-radius: 8px;
        background: #fff;
      }
      .campo {
        display: grid;
        width: min(100%, 560px);
        gap: 5px;
        margin: 14px 0;
        color: #34443a;
        font-size: 14px;
      }
      select,
      textarea {
        width: 100%;
        padding: 9px 10px;
        border: 1px solid #cbd5ce;
        border-radius: 6px;
        background: #fff;
        color: #1f2a22;
        font: inherit;
      }
      textarea {
        resize: vertical;
      }
      button {
        padding: 8px 14px;
        border: 0;
        border-radius: 6px;
        background: #2e7d32;
        color: #fff;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .secundario {
        border: 1px solid #cbd5ce;
        background: #fff;
        color: #1f2a22;
      }
      .detalle h4 {
        margin: 18px 0 12px;
      }
      dl {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 12px;
        margin: 0;
      }
      dl div {
        padding: 10px;
        border-radius: 6px;
        background: #f3f7f4;
      }
      dl .ancho-completo {
        grid-column: 1 / -1;
      }
      dt {
        color: #647168;
        font-size: 13px;
      }
      dd {
        margin: 4px 0 0;
        overflow-wrap: anywhere;
      }
      form {
        display: grid;
        justify-items: start;
        gap: 6px;
        margin-top: 18px;
      }
      fieldset {
        display: flex;
        gap: 18px;
        padding: 10px 12px;
        border: 1px solid #d5ded7;
        border-radius: 6px;
      }
      @media (max-width: 600px) {
        .cabecera {
          align-items: flex-start;
          flex-direction: column;
        }
        fieldset {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class EvaluarApelacion implements OnInit {
  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    aprobada: this.fb.control<boolean | null>(null, Validators.required),
    justificacion: this.fb.nonNullable.control('', VALIDADORES_JUSTIFICACION),
  });

  readonly strikes = signal<StrikeCoordinadorDto[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);
  readonly strikeSeleccionadoId = signal<number | null>(null);
  readonly seleccionTocada = signal(false);
  readonly dialogoAbierto = signal(false);
  readonly guardando = signal(false);

  readonly apelacionesPendientes = computed(() => this.strikes().filter(tieneApelacionPendiente));
  readonly strikeSeleccionado = computed(
    () => this.apelacionesPendientes().find((strike) => strike.id === this.strikeSeleccionadoId()) ?? null,
  );
  readonly filas = computed<FilaStrikeApelado[]>(() =>
    this.apelacionesPendientes().map((strike) => ({
      id: `#${strike.id}`,
      organizacion: `${strike.organizacionNombre} (#${strike.organizacionId})`,
      strike: strike.nombreStrike,
      detalles: strike.detalles ?? '—',
      fechaRegistro: this.formatearFecha(strike.fechaRegistro),
      justificacionApelacion: strike.justificacionApelacion ?? '',
    })),
  );

  readonly columnas: ColumnaTabla<FilaStrikeApelado>[] = [
    { titulo: 'Strike', clave: 'id' },
    { titulo: 'Organización', clave: 'organizacion' },
    { titulo: 'Tipo', clave: 'strike' },
    { titulo: 'Detalles', clave: 'detalles' },
    { titulo: 'Fecha de registro', clave: 'fechaRegistro' },
    { titulo: 'Justificación de apelación', clave: 'justificacionApelacion' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.api.get<StrikeCoordinadorDto[]>('organizaciones/strikes').subscribe({
      next: (strikes) => {
        this.strikes.set(strikes);
        this.cargando.set(false);
        if (!this.apelacionesPendientes().some((strike) => strike.id === this.strikeSeleccionadoId())) {
          this.limpiarSeleccion();
        }
      },
      error: (error: unknown) => {
        this.strikes.set([]);
        this.cargando.set(false);
        this.limpiarSeleccion();
        const mensaje = this.mensajeError(error, 'No se pudieron cargar los strikes.');
        this.errorCarga.set(mensaje);
        this.mensajes.error(mensaje);
      },
    });
  }

  cambiarStrike(evento: Event): void {
    const elemento = evento.target;
    if (!(elemento instanceof HTMLSelectElement)) {
      return;
    }
    const id = Number(elemento.value);
    const estaPendiente = this.apelacionesPendientes().some((strike) => strike.id === id);
    this.strikeSeleccionadoId.set(Number.isInteger(id) && estaPendiente ? id : null);
    this.seleccionTocada.set(true);
    this.dialogoAbierto.set(false);
    this.form.reset({ aprobada: null, justificacion: '' });
  }

  solicitarConfirmacion(): void {
    if (!this.strikeSeleccionado()) {
      this.seleccionTocada.set(true);
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.dialogoAbierto.set(true);
  }

  evaluarApelacion(): void {
    const strike = this.strikeSeleccionado();
    this.form.markAllAsTouched();
    if (!strike || this.form.invalid || this.guardando()) {
      this.dialogoAbierto.set(false);
      return;
    }
    const aprobada = this.form.controls.aprobada.value;
    if (aprobada === null) {
      this.dialogoAbierto.set(false);
      return;
    }
    const cuerpo: EvaluarApelacionStrikeRequestDto = {
      strikeId: strike.id,
      justificacion: this.form.controls.justificacion.value.trim(),
      aprobada,
    };
    this.dialogoAbierto.set(false);
    this.guardando.set(true);
    this.api.patch<EvaluarApelacionStrikeRequestDto, StrikeCoordinadorDto>(
      `organizaciones/${strike.organizacionId}/strikes/apelar`,
      cuerpo,
    ).subscribe({
      next: (strikeEvaluado) => {
        this.guardando.set(false);
        const resultado = aprobada ? 'aprobada' : 'rechazada';
        this.mensajes.exito(`Apelación del strike #${strikeEvaluado.id} ${resultado}.`);
        this.limpiarSeleccion();
        this.cargar();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.mensajes.error(this.mensajeError(error, 'No se pudo evaluar la apelación.'));
      },
    });
  }

  cerrarDialogo(): void {
    this.dialogoAbierto.set(false);
  }

  tituloDialogo(): string {
    return this.form.controls.aprobada.value
      ? 'Aprobar apelación'
      : 'Rechazar apelación';
  }

  mensajeDialogo(): string {
    const strike = this.strikeSeleccionado();
    if (!strike) {
      return 'Selecciona una apelación pendiente.';
    }
    const resultado = this.form.controls.aprobada.value ? 'aprobar' : 'rechazar';
    return `¿Confirmas ${resultado} la apelación del strike #${strike.id} de ${strike.organizacionNombre}?`;
  }

  textoConfirmar(): string {
    return this.form.controls.aprobada.value ? 'Aprobar apelación' : 'Rechazar apelación';
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-CO');
  }

  private limpiarSeleccion(): void {
    this.strikeSeleccionadoId.set(null);
    this.seleccionTocada.set(false);
    this.dialogoAbierto.set(false);
    this.form.reset({ aprobada: null, justificacion: '' });
  }

  private mensajeError(error: unknown, porDefecto: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return porDefecto;
    }
    const cuerpo: unknown = error.error;
    if (typeof cuerpo !== 'object' || cuerpo === null) {
      return porDefecto;
    }
    const respuesta = cuerpo as Partial<ErrorApiCoordinador>;
    const mensaje = typeof respuesta.mensaje === 'string' ? respuesta.mensaje.trim() : '';
    const detalles = Array.isArray(respuesta.detalles)
      ? respuesta.detalles.filter((detalle): detalle is string => typeof detalle === 'string')
      : [];
    const textoDetalles = detalles.length > 0 ? ` Detalles: ${detalles.join(' · ')}` : '';
    return mensaje ? `${mensaje}${textoDetalles}` : porDefecto;
  }
}
