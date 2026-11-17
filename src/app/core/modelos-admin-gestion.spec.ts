import { describe, expect, it } from 'vitest';
import { mensajeErrorAdminGestion } from './modelos-admin-gestion';

describe('mensajeErrorAdminGestion', () => {
  it('combina el mensaje y los detalles entregados por la API', () => {
    expect(
      mensajeErrorAdminGestion(
        {
          mensaje: 'El NIT ya está registrado.',
          detalles: ['Revisa el NIT', 'Usa otro identificador'],
        },
        'No se pudo completar la operación.',
      ),
    ).toBe('El NIT ya está registrado. Detalles: Revisa el NIT · Usa otro identificador');
  });

  it('usa el mensaje alternativo y omite detalles que no sean texto', () => {
    expect(
      mensajeErrorAdminGestion(
        { mensaje: ' ', detalles: ['   ', 3, 'Campo inválido'] },
        'No se pudo completar la operación.',
      ),
    ).toBe('No se pudo completar la operación. Detalles: Campo inválido');
  });
});
