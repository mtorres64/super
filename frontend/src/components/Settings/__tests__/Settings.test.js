import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders } from '../../../testUtils';
import Settings from '../index';

// Silence toast notifications during tests
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// LogoUploader touches file APIs – stub it out
jest.mock('../../LogoUploader', () => () => <div data-testid="logo-uploader" />);

const mock = new MockAdapter(axios);
beforeEach(() => {
  mock.reset();
  // AFIP endpoint is always called on mount; default to 404 (no config yet)
  mock.onGet(/\/afip\/config/).reply(404);
});
afterAll(() => mock.restore());

const baseConfig = {
  company_name: 'Super Test',
  company_tax_id: '12345',
  company_address: 'Calle 1',
  company_phone: '555-1234',
  company_email: 'test@super.com',
  company_logo: null,
  tax_rate: 0.12,
  currency_symbol: '$',
  currency_code: 'USD',
  sounds_enabled: true,
  auto_focus_barcode: false,
  barcode_scan_timeout: 100,
  default_minimum_stock: 10,
  low_stock_alert_enabled: true,
  auto_update_inventory: true,
  modal_animations: true,
  primary_color: '#10b981',
  secondary_color: '#e0f6ff',
  tertiary_color: '#ede0ff',
  payment_method_adjustments: { efectivo: 0, tarjeta: 0, transferencia: 0 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
const setup = (configOverride = {}) => {
  mock.onGet(/\/config$/).reply(200, { ...baseConfig, ...configOverride });
  return renderWithProviders(<Settings />);
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Carga de configuración
// ─────────────────────────────────────────────────────────────────────────────
describe('Settings – carga inicial', () => {
  test('realiza GET /config al montar y muestra la pantalla', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText('Configuración del Sistema')).toBeInTheDocument();
    });
  });

  test('muestra spinner mientras carga', () => {
    // Delay the response so the spinner is visible
    mock.onGet(/\/config$/).reply(() => new Promise(resolve => setTimeout(() => resolve([200, baseConfig]), 200)));
    renderWithProviders(<Settings />);
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('muestra contenido de empresa tras cargar', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Super Test')).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pestañas
// ─────────────────────────────────────────────────────────────────────────────
describe('Settings – pestañas', () => {
  const tabCases = [
    { label: 'Empresa',        heading: 'Información de la Empresa' },
    { label: 'Finanzas',       heading: 'Configuración Financiera' },
    { label: 'Punto de Venta', heading: 'Configuración del Punto de Venta' },
    { label: 'Inventario',     heading: 'Configuración de Inventario' },
    { label: 'Interfaz',       heading: 'Configuración de Interfaz' },
    { label: 'Sistema',        heading: /Sistema/i },
    { label: 'Recibos',        heading: /Recibos/i },
  ];

  test.each(tabCases)(
    'pestaña "$label" muestra su contenido',
    async ({ label, heading }) => {
      setup();
      await waitFor(() => screen.getByText('Configuración del Sistema'));

      fireEvent.click(screen.getByRole('button', { name: new RegExp(label, 'i') }));

      await waitFor(() => {
        expect(screen.getByText(heading instanceof RegExp ? heading : new RegExp(heading, 'i'))).toBeInTheDocument();
      });
    }
  );

  test('pestaña activa por defecto es Empresa', async () => {
    setup();
    await waitFor(() => screen.getByText('Configuración del Sistema'));
    expect(screen.getByText(/Información de la Empresa/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Editar nombre de empresa
// ─────────────────────────────────────────────────────────────────────────────
describe('Settings – editar empresa', () => {
  test('editar nombre de empresa actualiza el campo', async () => {
    setup();
    await waitFor(() => screen.getByDisplayValue('Super Test'));

    const input = screen.getByDisplayValue('Super Test');
    fireEvent.change(input, { target: { value: 'Nuevo Nombre' } });

    expect(input.value).toBe('Nuevo Nombre');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Guardar configuración
// ─────────────────────────────────────────────────────────────────────────────
describe('Settings – guardar', () => {
  test('Guardar Cambios llama a PUT /config', async () => {
    setup();
    mock.onPut(/\/config$/).reply(200, {});

    await waitFor(() => screen.getByText('Configuración del Sistema'));

    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      const putCalls = mock.history.put.filter(r => /\/config$/.test(r.url));
      expect(putCalls.length).toBeGreaterThan(0);
    });
  });

  test('PUT /config envía los datos de configuración', async () => {
    setup();
    mock.onPut(/\/config$/).reply(200, {});

    await waitFor(() => screen.getByText('Configuración del Sistema'));

    // Cambiar el nombre y luego guardar
    const input = screen.getByDisplayValue('Super Test');
    fireEvent.change(input, { target: { value: 'Editado' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      const putCall = mock.history.put.find(r => /\/config$/.test(r.url));
      expect(putCall).toBeTruthy();
      const body = JSON.parse(putCall.data);
      expect(body.company_name).toBe('Editado');
    });
  });

  test('muestra error si PUT /config falla', async () => {
    const { toast } = require('sonner');
    setup();
    mock.onPut(/\/config$/).reply(500, { detail: 'Error interno' });

    await waitFor(() => screen.getByText('Configuración del Sistema'));
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Restaurar defaults
// ─────────────────────────────────────────────────────────────────────────────
describe('Settings – restaurar defaults', () => {
  test('Restaurar predeterminados llama a PUT /config con colores por defecto', async () => {
    setup();
    mock.onPut(/\/config$/).reply(200, {});

    await waitFor(() => screen.getByText('Configuración del Sistema'));

    // Navegar a la pestaña Interfaz donde está el botón
    fireEvent.click(screen.getByRole('button', { name: /Interfaz/i }));
    await waitFor(() => screen.getByText(/Restaurar predeterminados/i));

    fireEvent.click(screen.getByText(/Restaurar predeterminados/i));

    await waitFor(() => {
      const putCall = mock.history.put.find(r => /\/config$/.test(r.url));
      expect(putCall).toBeTruthy();
      const body = JSON.parse(putCall.data);
      expect(body.primary_color).toBe('#10b981');
      expect(body.secondary_color).toBe('#e0f6ff');
      expect(body.tertiary_color).toBe('#ede0ff');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cambiar tema de color
// ─────────────────────────────────────────────────────────────────────────────
describe('Settings – temas de color', () => {
  test('seleccionar un tema preset aplica el color primario', async () => {
    setup({ primary_color: '#3b82f6' });

    await waitFor(() => screen.getByText('Configuración del Sistema'));
    fireEvent.click(screen.getByRole('button', { name: /Interfaz/i }));

    await waitFor(() => screen.getByTitle('Azul Océano'));
    fireEvent.click(screen.getByTitle('Azul Océano'));

    await waitFor(() => {
      const rootStyle = document.documentElement.style.getPropertyValue('--primary');
      expect(rootStyle).toBe('#3b82f6');
    });
  });

  test('los temas preset se muestran en la pestaña Interfaz', async () => {
    setup();
    await waitFor(() => screen.getByText('Configuración del Sistema'));
    fireEvent.click(screen.getByRole('button', { name: /Interfaz/i }));

    await waitFor(() => {
      expect(screen.getByTitle('Verde Esmeralda')).toBeInTheDocument();
      expect(screen.getByTitle('Azul Océano')).toBeInTheDocument();
      expect(screen.getByTitle('Violeta')).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Tax rate
// ─────────────────────────────────────────────────────────────────────────────
describe('Settings – tax_rate', () => {
  test('muestra el impuesto en porcentaje (tax_rate=0.12 → "12")', async () => {
    setup();
    await waitFor(() => screen.getByText('Configuración del Sistema'));

    fireEvent.click(screen.getByRole('button', { name: /Finanzas/i }));

    await waitFor(() => {
      const input = screen.getByPlaceholderText('12');
      expect(input.value).toBe('12');
    });
  });

  test('editar el impuesto actualiza el campo de texto', async () => {
    setup();
    await waitFor(() => screen.getByText('Configuración del Sistema'));

    fireEvent.click(screen.getByRole('button', { name: /Finanzas/i }));
    await waitFor(() => screen.getByPlaceholderText('12'));

    const input = screen.getByPlaceholderText('12');
    fireEvent.change(input, { target: { value: '21' } });
    expect(input.value).toBe('21');
  });

  test('onBlur convierte el porcentaje a fracción en config', async () => {
    setup();
    mock.onPut(/\/config$/).reply(200, {});

    await waitFor(() => screen.getByText('Configuración del Sistema'));
    fireEvent.click(screen.getByRole('button', { name: /Finanzas/i }));
    await waitFor(() => screen.getByPlaceholderText('12'));

    const input = screen.getByPlaceholderText('12');
    fireEvent.change(input, { target: { value: '21' } });
    fireEvent.blur(input);

    // Guardar para verificar que la fracción se almacenó
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      const putCall = mock.history.put.find(r => /\/config$/.test(r.url));
      const body = JSON.parse(putCall.data);
      expect(body.tax_rate).toBeCloseTo(0.21);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Sección AFIP
// ─────────────────────────────────────────────────────────────────────────────
describe('Settings – AFIP (tab comentado, lógica en index.js)', () => {
  // La pestaña AFIP está comentada en la vista pero el índice expone
  // handleSaveAfip y handleTestAfip. Validamos mediante la lógica interna
  // disparando directamente las requests que el componente hace al montar.

  test('fetchAfipConfig llama a GET /afip/config al montar', async () => {
    mock.onGet(/\/config$/).reply(200, baseConfig);
    mock.onGet(/\/afip\/config/).reply(200, {
      configurado: true,
      cuit: '20-12345678-9',
      punto_venta: 1,
      ambiente: 'produccion',
      tipo_comprobante_default: 6,
      razon_social: 'Test SA',
    });

    renderWithProviders(<Settings />);

    await waitFor(() => {
      const afipCalls = mock.history.get.filter(r => /\/afip\/config/.test(r.url));
      expect(afipCalls.length).toBeGreaterThan(0);
    });
  });

  test('fetchAfipConfig con 404 no rompe el componente', async () => {
    setup(); // AFIP ya configurado en beforeEach con 404
    await waitFor(() => {
      expect(screen.getByText('Configuración del Sistema')).toBeInTheDocument();
    });
  });
});
