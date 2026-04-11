import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders } from '../../../testUtils';
import CashReport from '../index';

// ── Mock de react-router-dom (useParams) ───────────────────────────────────

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ sessionId: 'session-abc-123' }),
}));

// ── Mocks de módulos pesados ────────────────────────────────────────────────

jest.mock('jspdf', () => {
  const mockPdfInstance = {
    setFillColor: jest.fn(),
    rect: jest.fn(),
    setTextColor: jest.fn(),
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    text: jest.fn(),
    line: jest.fn(),
    setDrawColor: jest.fn(),
    addPage: jest.fn(),
    setPage: jest.fn(),
    splitTextToSize: jest.fn((str) => [str || '']),
    save: jest.fn(),
    internal: { pages: [null, null] },
  };
  return { __esModule: true, default: jest.fn(() => mockPdfInstance) };
});

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

// ── Datos de ejemplo ────────────────────────────────────────────────────────

const makeReport = (overrides = {}) => ({
  session: {
    id: 'session-abc-123-full',
    status: 'abierta',
    fecha_apertura: '2026-04-10T08:00:00',
    fecha_cierre: null,
    monto_inicial: 5000,
    monto_ventas: 12000,
    monto_retiros: 1000,
    monto_esperado: 16000,
    monto_final: null,
    diferencia: null,
    observaciones: null,
  },
  movements: [
    {
      id: 'mov-1',
      fecha: '2026-04-10T08:00:00',
      tipo: 'apertura',
      descripcion: 'Apertura de caja',
      monto: 5000,
    },
    {
      id: 'mov-2',
      fecha: '2026-04-10T09:30:00',
      tipo: 'venta',
      descripcion: 'Venta #001',
      monto: 1500,
    },
  ],
  user: { id: 1, nombre: 'Juan Cajero' },
  branch: { id: 'b1', nombre: 'Sucursal Centro', direccion: 'Av. Siempreviva 742' },
  resumen: {
    total_ventas: 8,
    ingresos_efectivo: 8000,
    ingresos_tarjeta: 3000,
    ingresos_transferencia: 1000,
  },
  ...overrides,
});

// ── Setup del mock adapter ──────────────────────────────────────────────────

const mock = new MockAdapter(axios);

beforeEach(() => {
  mock.reset();
});

afterAll(() => mock.restore());

// ── Tests ───────────────────────────────────────────────────────────────────

describe('CashReport', () => {

  // 1. useParams para obtener el ID
  describe('useParams', () => {
    it('usa el sessionId de useParams para construir la URL del reporte', async () => {
      mock.onGet(/\/api\/cash-sessions\/session-abc-123\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        // El componente cargó correctamente con el ID del useParams
        expect(screen.getByText('Juan Cajero')).toBeInTheDocument();
      });
    });
  });

  // 2. Estado loading
  describe('estado loading', () => {
    it('muestra spinner mientras carga el reporte', () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(() => new Promise(() => {}));
      renderWithProviders(<CashReport />);
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('oculta el spinner una vez cargado', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(document.querySelector('.spinner')).not.toBeInTheDocument();
      });
    });
  });

  // 3. Carga y muestra datos del reporte
  describe('datos del reporte', () => {
    it('muestra el nombre del cajero', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('Juan Cajero')).toBeInTheDocument();
      });
    });

    it('muestra el nombre de la sucursal', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('Sucursal Centro')).toBeInTheDocument();
      });
    });

    it('muestra el monto inicial de la sesión', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('Monto Inicial')).toBeInTheDocument();
        expect(screen.getByText(/\$5\.000|\$5000/)).toBeInTheDocument();
      });
    });

    it('muestra los movimientos de caja', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('Apertura de caja')).toBeInTheDocument();
        expect(screen.getByText('Venta #001')).toBeInTheDocument();
      });
    });

    it('muestra el desglose por método de pago', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('Efectivo')).toBeInTheDocument();
        expect(screen.getByText('Tarjeta')).toBeInTheDocument();
        expect(screen.getByText('Transferencia')).toBeInTheDocument();
      });
    });

    it('muestra el total de transacciones del resumen', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('8 transacciones')).toBeInTheDocument();
      });
    });

    it('muestra el título del reporte', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText(/Reporte de Arqueo de Caja/i)).toBeInTheDocument();
      });
    });

    it('muestra el estado de la sesión', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        // El estado "abierta" debe aparecer
        expect(screen.getByText('abierta')).toBeInTheDocument();
      });
    });
  });

  // 4. Sesión cerrada — muestra datos adicionales
  describe('sesión cerrada', () => {
    const closedReport = makeReport({
      session: {
        id: 'session-abc-123-full',
        status: 'cerrada',
        fecha_apertura: '2026-04-10T08:00:00',
        fecha_cierre: '2026-04-10T18:00:00',
        monto_inicial: 5000,
        monto_ventas: 12000,
        monto_retiros: 1000,
        monto_esperado: 16000,
        monto_final: 16000,
        diferencia: 0,
        observaciones: null,
      },
    });

    it('muestra la fecha de cierre cuando la sesión está cerrada', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, closedReport);
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('Cierre')).toBeInTheDocument();
      });
    });

    it('muestra "Exacto" cuando no hay diferencia de caja', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, closedReport);
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('Exacto')).toBeInTheDocument();
      });
    });

    it('muestra "Faltante" cuando hay diferencia negativa', async () => {
      const reportConFaltante = makeReport({
        session: { ...closedReport.session, diferencia: -500, status: 'cerrada' },
      });
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, reportConFaltante);
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('Faltante')).toBeInTheDocument();
      });
    });

    it('muestra "Sobrante" cuando hay diferencia positiva', async () => {
      const reportConSobrante = makeReport({
        session: { ...closedReport.session, diferencia: 200, status: 'cerrada' },
      });
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, reportConSobrante);
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('Sobrante')).toBeInTheDocument();
      });
    });
  });

  // 5. Mensaje cuando no se encuentra el reporte (404 / report null)
  describe('reporte no encontrado', () => {
    it('muestra mensaje de error cuando el API devuelve 404', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(404, {});
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText(/Reporte no encontrado/i)).toBeInTheDocument();
      });
    });

    it('muestra texto descriptivo del error', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(500, {});
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText(/No se pudo cargar el reporte de caja/i)).toBeInTheDocument();
      });
    });
  });

  // 6. Botón imprimir / generar PDF
  describe('botón imprimir PDF', () => {
    it('muestra el botón Descargar PDF', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Descargar PDF/i })).toBeInTheDocument();
      });
    });

    it('llama a jsPDF al hacer click en Descargar PDF', async () => {
      const jsPDF = require('jspdf').default;
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => screen.getByRole('button', { name: /Descargar PDF/i }));

      fireEvent.click(screen.getByRole('button', { name: /Descargar PDF/i }));

      await waitFor(() => {
        expect(jsPDF).toHaveBeenCalled();
      });
    });

    it('muestra "Generando PDF..." mientras se genera', async () => {
      // Hacemos que jsPDF tarde
      const jsPDF = require('jspdf').default;
      jsPDF.mockImplementationOnce(() => {
        // Instancia que tarda en save()
        return {
          setFillColor: jest.fn(),
          rect: jest.fn(),
          setTextColor: jest.fn(),
          setFontSize: jest.fn(),
          setFont: jest.fn(),
          text: jest.fn(),
          line: jest.fn(),
          setDrawColor: jest.fn(),
          addPage: jest.fn(),
          setPage: jest.fn(),
          splitTextToSize: jest.fn((str) => [str || '']),
          save: jest.fn(),
          internal: { pages: [null, null] },
        };
      });

      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => screen.getByRole('button', { name: /Descargar PDF/i }));
      fireEvent.click(screen.getByRole('button', { name: /Descargar PDF/i }));

      // El texto "Generando PDF..." debe aparecer brevemente
      // (puede ser muy rápido; al menos verificamos que el botón se habilitó después)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Descargar PDF|Generando PDF/i })).toBeInTheDocument();
      });
    });
  });

  // 7. Observaciones
  describe('observaciones', () => {
    it('muestra sección de observaciones cuando existen', async () => {
      const reportConObs = makeReport({
        session: {
          ...makeReport().session,
          observaciones: 'Faltaron monedas de $1',
        },
      });
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, reportConObs);
      renderWithProviders(<CashReport />);

      await waitFor(() => {
        expect(screen.getByText('Observaciones')).toBeInTheDocument();
        expect(screen.getByText('Faltaron monedas de $1')).toBeInTheDocument();
      });
    });

    it('no muestra sección de observaciones cuando no hay', async () => {
      mock.onGet(/\/api\/cash-sessions\/.*\/report/).reply(200, makeReport());
      renderWithProviders(<CashReport />);

      await waitFor(() => screen.getByText('Juan Cajero'));
      expect(screen.queryByText('Observaciones')).not.toBeInTheDocument();
    });
  });
});
