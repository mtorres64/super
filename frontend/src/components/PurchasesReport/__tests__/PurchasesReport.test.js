import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders } from '../../../testUtils';
import PurchasesReport from '../index';

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
    splitTextToSize: jest.fn(() => ['']),
    save: jest.fn(),
    internal: { pages: [null, null] },
  };
  return { __esModule: true, default: jest.fn(() => mockPdfInstance) };
});

jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({})),
    json_to_sheet: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

jest.mock('recharts', () => {
  const React = require('react');
  const Noop = ({ children }) => React.createElement('div', null, children);
  return {
    ResponsiveContainer: Noop,
    BarChart: Noop,
    Bar: Noop,
    XAxis: Noop,
    YAxis: Noop,
    CartesianGrid: Noop,
    Tooltip: Noop,
  };
});

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

// ── Helpers de datos ────────────────────────────────────────────────────────

const NOW = new Date();
// Fecha dentro del último mes para que pase el filtro default ('month')
const RECENT_DATE = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 5).toISOString();

const makeCompra = (overrides = {}) => ({
  id: 'compra-1',
  numero_factura: 'FC-C001',
  fecha: RECENT_DATE,
  sucursal_id: null,
  proveedor_id: 'prov-1',
  subtotal: 800,
  impuestos: 168,
  total: 968,
  items: [
    { producto_id: 'p1', nombre: 'Insumo A', cantidad: 10, precio_unitario: 80 },
  ],
  ...overrides,
});

const BRANCHES = [{ id: 'b1', nombre: 'Sucursal Norte' }];
const PROVEEDORES = [{ id: 'prov-1', nombre: 'Proveedor Alfa' }];

// ── Setup del mock adapter ──────────────────────────────────────────────────

const mock = new MockAdapter(axios);

beforeEach(() => {
  mock.reset();
  mock.onGet(/\/api\/branches/).reply(200, BRANCHES);
  mock.onGet(/\/api\/proveedores/).reply(200, PROVEEDORES);
});

afterAll(() => mock.restore());

// ── Tests ───────────────────────────────────────────────────────────────────

describe('PurchasesReport', () => {

  // 1. Carga y muestra compras
  describe('carga de compras', () => {
    it('muestra el spinner mientras carga', () => {
      mock.onGet(/\/api\/compras/).reply(() => new Promise(() => {}));
      renderWithProviders(<PurchasesReport />);
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('muestra el título de la página tras cargar', async () => {
      mock.onGet(/\/api\/compras/).reply(200, []);
      renderWithProviders(<PurchasesReport />);
      await waitFor(() => {
        expect(screen.getByText('Reporte de Compras')).toBeInTheDocument();
      });
    });

    it('muestra compras una vez cargadas', async () => {
      mock.onGet(/\/api\/compras/).reply(200, [makeCompra()]);
      renderWithProviders(<PurchasesReport />);
      await waitFor(() => {
        expect(screen.getByText('FC-C001')).toBeInTheDocument();
      });
    });

    it('muestra el nombre del proveedor en la tabla', async () => {
      mock.onGet(/\/api\/compras/).reply(200, [makeCompra()]);
      renderWithProviders(<PurchasesReport />);
      await waitFor(() => {
        expect(screen.getByText('Proveedor Alfa')).toBeInTheDocument();
      });
    });

    it('muestra mensaje vacío cuando no hay compras en el período', async () => {
      mock.onGet(/\/api\/compras/).reply(200, []);
      renderWithProviders(<PurchasesReport />);
      await waitFor(() => {
        expect(screen.getByText(/No hay compras en el periodo seleccionado/i)).toBeInTheDocument();
      });
    });
  });

  // 2. Filtros
  describe('filtros', () => {
    it('filtra por período mostrando todas las compras', async () => {
      const oldCompra = makeCompra({
        id: 'old',
        numero_factura: 'FC-OLD',
        fecha: '2020-06-15T10:00:00',
      });
      mock.onGet(/\/api\/compras/).reply(200, [oldCompra]);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => screen.getByText('Reporte de Compras'));
      // Con filtro 'month' default, la compra antigua no aparece
      expect(screen.queryByText('FC-OLD')).not.toBeInTheDocument();

      // Cambiamos a "Todas"
      const selects = screen.getAllByRole('combobox');
      const dateSelect = selects.find(s =>
        Array.from(s.options || []).some(o => o.value === 'all')
      );
      fireEvent.change(dateSelect, { target: { value: 'all' } });

      await waitFor(() => {
        expect(screen.getByText('FC-OLD')).toBeInTheDocument();
      });
    });

    it('filtra por proveedor', async () => {
      const compra1 = makeCompra({ id: 'c1', numero_factura: 'FC-P1', proveedor_id: 'prov-1' });
      const compra2 = makeCompra({ id: 'c2', numero_factura: 'FC-P2', proveedor_id: 'prov-2' });
      mock.onGet(/\/api\/compras/).reply(200, [compra1, compra2]);
      mock.onGet(/\/api\/proveedores/).reply(200, [
        { id: 'prov-1', nombre: 'Proveedor Alfa' },
        { id: 'prov-2', nombre: 'Proveedor Beta' },
      ]);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => screen.getByText('Reporte de Compras'));

      // Primero expandimos a "Todas" para que aparezcan ambas
      const selects = screen.getAllByRole('combobox');
      const dateSelect = selects.find(s =>
        Array.from(s.options || []).some(o => o.value === 'all')
      );
      fireEvent.change(dateSelect, { target: { value: 'all' } });

      await waitFor(() => expect(screen.getByText('FC-P1')).toBeInTheDocument());

      // Filtramos por proveedor prov-2
      const provSelect = selects.find(s =>
        Array.from(s.options || []).some(o => o.value === 'prov-2')
      );
      fireEvent.change(provSelect, { target: { value: 'prov-2' } });

      await waitFor(() => {
        expect(screen.queryByText('FC-P1')).not.toBeInTheDocument();
        expect(screen.getByText('FC-P2')).toBeInTheDocument();
      });
    });

    it('filtra por sucursal', async () => {
      const compraB1 = makeCompra({ id: 'cB1', numero_factura: 'FC-B1', sucursal_id: 'b1' });
      const compraSinSuc = makeCompra({ id: 'cSin', numero_factura: 'FC-SIN', sucursal_id: null });
      mock.onGet(/\/api\/compras/).reply(200, [compraB1, compraSinSuc]);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => screen.getByText('Reporte de Compras'));

      // Expandimos a "Todas"
      const selects = screen.getAllByRole('combobox');
      const dateSelect = selects.find(s =>
        Array.from(s.options || []).some(o => o.value === 'all')
      );
      fireEvent.change(dateSelect, { target: { value: 'all' } });

      await waitFor(() => expect(screen.getByText('FC-B1')).toBeInTheDocument());

      const branchSelect = selects.find(s =>
        Array.from(s.options || []).some(o => o.value === 'b1')
      );
      fireEvent.change(branchSelect, { target: { value: 'b1' } });

      await waitFor(() => {
        expect(screen.getByText('FC-B1')).toBeInTheDocument();
        expect(screen.queryByText('FC-SIN')).not.toBeInTheDocument();
      });
    });

    it('muestra inputs de fecha para rango personalizado', async () => {
      mock.onGet(/\/api\/compras/).reply(200, []);
      renderWithProviders(<PurchasesReport />);
      await waitFor(() => screen.getByText('Reporte de Compras'));

      const selects = screen.getAllByRole('combobox');
      const dateSelect = selects.find(s =>
        Array.from(s.options || []).some(o => o.value === 'custom')
      );
      fireEvent.change(dateSelect, { target: { value: 'custom' } });

      const dateInputs = screen.getAllByDisplayValue('').filter(i => i.type === 'date');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  // 3. Estadísticas
  describe('estadísticas', () => {
    it('muestra el total de compras correcto', async () => {
      mock.onGet(/\/api\/compras/).reply(200, [
        makeCompra({ id: 'c1', total: 500 }),
        makeCompra({ id: 'c2', numero_factura: 'FC-C002', total: 300 }),
      ]);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => {
        const statValues = document.querySelectorAll('.stat-value');
        const totalCard = Array.from(statValues).find(c => c.textContent === '2');
        expect(totalCard).toBeInTheDocument();
      });
    });

    it('muestra el total gastado correcto', async () => {
      mock.onGet(/\/api\/compras/).reply(200, [
        makeCompra({ id: 'c1', total: 400 }),
        makeCompra({ id: 'c2', numero_factura: 'FC-C002', total: 600 }),
      ]);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => {
        // Total gastado = $1000
        expect(screen.getByText(/\$1\.000|\$1000/)).toBeInTheDocument();
      });
    });

    it('muestra el promedio correcto', async () => {
      mock.onGet(/\/api\/compras/).reply(200, [
        makeCompra({ id: 'c1', total: 200 }),
        makeCompra({ id: 'c2', numero_factura: 'FC-C002', total: 400 }),
      ]);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => {
        // Promedio = $300
        expect(screen.getByText(/\$300/)).toBeInTheDocument();
      });
    });

    it('muestra etiquetas de estadísticas', async () => {
      mock.onGet(/\/api\/compras/).reply(200, []);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => {
        expect(screen.getByText('Total Compras')).toBeInTheDocument();
        expect(screen.getByText('Total Gastado')).toBeInTheDocument();
        expect(screen.getByText('Compra Promedio')).toBeInTheDocument();
      });
    });
  });

  // 4. Exportar PDF
  describe('exportar PDF', () => {
    it('llama a jsPDF al hacer click en Descargar PDF', async () => {
      const jsPDF = require('jspdf').default;
      mock.onGet(/\/api\/compras/).reply(200, [makeCompra()]);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => screen.getByText('FC-C001'));

      fireEvent.click(screen.getByRole('button', { name: /Descargar PDF/i }));

      await waitFor(() => {
        expect(jsPDF).toHaveBeenCalled();
      });
    });

    it('el botón PDF está deshabilitado cuando no hay compras', async () => {
      mock.onGet(/\/api\/compras/).reply(200, []);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => screen.getByText('Reporte de Compras'));
      expect(screen.getByRole('button', { name: /Descargar PDF/i })).toBeDisabled();
    });
  });

  // 5. Exportar XLSX
  describe('exportar XLSX', () => {
    it('llama a xlsx.writeFile al hacer click en Exportar Excel', async () => {
      const XLSX = require('xlsx');
      mock.onGet(/\/api\/compras/).reply(200, [makeCompra()]);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => screen.getByText('FC-C001'));

      fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/i }));

      expect(XLSX.writeFile).toHaveBeenCalled();
    });

    it('el botón Excel está deshabilitado cuando no hay compras', async () => {
      mock.onGet(/\/api\/compras/).reply(200, []);
      renderWithProviders(<PurchasesReport />);

      await waitFor(() => screen.getByText('Reporte de Compras'));
      expect(screen.getByRole('button', { name: /Exportar Excel/i })).toBeDisabled();
    });
  });
});
