import { TestBed } from '@angular/core/testing';
import { TemaService } from './tema.service';

const CLAVE_TEMA = 'tema-alimentared';

describe('TemaService', () => {
  beforeEach(() => {
    window.localStorage.removeItem(CLAVE_TEMA);
    document.documentElement.removeAttribute('data-tema');
    TestBed.configureTestingModule({ providers: [TemaService] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.removeItem(CLAVE_TEMA);
    document.documentElement.removeAttribute('data-tema');
  });

  it('inicia en modo oscuro cuando no hay una preferencia guardada', () => {
    const servicio = TestBed.inject(TemaService);

    expect(servicio.tema()).toBe('oscuro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
  });

  it('alterna el modo y persiste la selección', () => {
    const servicio = TestBed.inject(TemaService);

    servicio.alternar();

    expect(servicio.tema()).toBe('claro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
    expect(window.localStorage.getItem(CLAVE_TEMA)).toBe('claro');
  });

  it('recupera la preferencia guardada', () => {
    window.localStorage.setItem(CLAVE_TEMA, 'claro');

    const servicio = TestBed.inject(TemaService);

    expect(servicio.tema()).toBe('claro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
  });

  it('permite alternar cuando localStorage no está disponible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Almacenamiento no disponible');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Almacenamiento no disponible');
    });

    const servicio = TestBed.inject(TemaService);
    servicio.alternar();

    expect(servicio.tema()).toBe('claro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
  });
});
