import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BotonTemaComponent } from './boton-tema.component';
import { TemaService } from '../../core/tema.service';

describe('BotonTemaComponent', () => {
  let fixture: ComponentFixture<BotonTemaComponent>;

  beforeEach(() => {
    window.localStorage.removeItem('tema-alimentared');
    document.documentElement.removeAttribute('data-tema');
    TestBed.configureTestingModule({
      imports: [BotonTemaComponent],
      providers: [TemaService],
    });
    fixture = TestBed.createComponent(BotonTemaComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    window.localStorage.removeItem('tema-alimentared');
    document.documentElement.removeAttribute('data-tema');
  });

  it('muestra el modo actual y una etiqueta accesible', () => {
    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(boton.textContent).toContain('Modo oscuro');
    expect(boton.getAttribute('aria-label')).toContain('Modo actual: oscuro');
  });

  it('alterna el modo al hacer clic', () => {
    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    boton.click();
    fixture.detectChanges();

    expect(boton.textContent).toContain('Modo claro');
    expect(boton.getAttribute('aria-label')).toContain('Modo actual: claro');
  });
});
