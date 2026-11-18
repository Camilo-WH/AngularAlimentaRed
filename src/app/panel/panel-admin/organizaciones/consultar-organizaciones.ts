import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/api.service';
import { ColumnaTabla } from '../../../core/modelos';
import { OrganizacionDto, Pagina } from '../../../core/modelos-admin';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { TablaComponent } from '../../../shared/tabla/tabla.component';

type Filtro = 'todas' | 'verificadas' | 'pendientes';

interface FilaOrganizacion {
  nit: string;
  nombre: string;
  ubicacion: string;
  correo: string;
  telefono: string;
  verificada: string;
  estado: string;
  strikes: string;
  registro: string;
}

@Component({
  selector: 'app-consultar-organizaciones',
  imports: [TablaComponent],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <div>
          <h2>Organizaciones</h2>
          <p class="resumen">{{ total() }} organizaciones con el filtro actual</p>
        </div>

        <label class="filtro">
          Mostrar
          <select [value]="filtro()" (change)="cambiarFiltro($any($event.target).value)">
            <option value="todas">Todas</option>
            <option value="verificadas">Verificadas</option>
            <option value="pendientes">Pendientes de verificación</option>
          </select>
        </label>
      </header>

      @if (cargando()) {
        <p class="estado">Cargando organizaciones... Si el servidor estaba inactivo, puede tardar hasta un minuto.</p>
      } @else {
        <app-tabla
          [filas]="filas()"
          [columnas]="columnas"
          [tamanoPagina]="10"
          textoVacio="No hay organizaciones para mostrar."
        />
      }
    </section>
  `,
  styles: [
    `
      .cabecera {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        margin-bottom: 16px;
      }
      h2 {
        margin: 0;
        color: var(--color-texto);
        font-family: var(--fuente-titulos);
      }
      .resumen {
        margin: 4px 0 0;
        color: var(--color-texto-secundario);
      }
      .filtro {
        display: flex;
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
      .estado {
        color: var(--color-texto-secundario);
      }
    `,
  ],
})
export class ConsultarOrganizaciones implements OnInit {
  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);

  readonly filtro = signal<Filtro>('todas');
  readonly organizaciones = signal<OrganizacionDto[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);

  readonly columnas: ColumnaTabla<FilaOrganizacion>[] = [
    { titulo: 'NIT', clave: 'nit' },
    { titulo: 'Nombre', clave: 'nombre' },
    { titulo: 'Ubicación', clave: 'ubicacion' },
    { titulo: 'Correo', clave: 'correo' },
    { titulo: 'Teléfono', clave: 'telefono' },
    { titulo: 'Verificada', clave: 'verificada' },
    { titulo: 'Estado', clave: 'estado' },
    { titulo: 'Strikes', clave: 'strikes' },
    { titulo: 'Registro', clave: 'registro' },
  ];

  // La tabla muestra texto, así que se convierten los datos antes de pasarlos
  readonly filas = computed<FilaOrganizacion[]>(() =>
    this.organizaciones().map((o) => ({
      nit: o.nit,
      nombre: o.nombre,
      ubicacion: o.ubicacion ?? '',
      correo: o.correo,
      telefono: o.telefono ?? '',
      verificada: o.verificada ? 'Sí' : 'No',
      estado: o.bloqueada ? 'Bloqueada' : 'Activa',
      strikes: String(o.strikesVigentes),
      registro: new Date(o.fechaRegistro).toLocaleDateString('es-CO'),
    })),
  );

  ngOnInit(): void {
    this.cargar();
  }

  cambiarFiltro(valor: string): void {
    this.filtro.set(valor as Filtro);
    this.cargar();
  }

  private cargar(): void {
    const filtro = this.filtro();
    const consulta = filtro === 'todas' ? '' : `&verificada=${filtro === 'verificadas'}`;

    this.cargando.set(true);
    this.api.get<Pagina<OrganizacionDto>>(`organizaciones?size=100${consulta}`).subscribe({
      next: (pagina) => {
        this.organizaciones.set(pagina.contenido);
        this.total.set(pagina.totalElementos);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.mensajes.error('No se pudieron cargar las organizaciones.');
      },
    });
  }
}