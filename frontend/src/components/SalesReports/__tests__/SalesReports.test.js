import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders, mockUser } from '../../../testUtils';
import SalesReports from '../index';

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
    PieChart: Noop,
    Pie: Noop,
    Cell: Noop,
    Legend: Noop,
  };
});

jest.mock('../../ReturnModal', () => {
  const React = require('react');
  return function ReturnModal({ sale, onClose }) {
    return React.createElement('div', { 'data-testid': 'return-modal' },
      React.createElement('span', null, `Devolución: ${sale?.numero_factura}`),
      React.createElement('button', { onClick: onClose }, 'Cerrar')
    );
  };
});

jest.mock('../../TicketModal', () => {
  const React = require('react');
  return function TicketModal({ sale, onClose }) {
    if (!sale) return null;
    return React.createElement('div', { 'data-testid': 'ticket-modal' },
      React.createElement('span', null, `Ticket: ${sale?.numero_factura}`),
      React.createElement('button', { onClick: onClose }, 'Cerrar ticket')
    );
  };
});

jest.mock('../../Pagination', () => {
  const React = require('react');
  return function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;
    return React.createElement('div', { 'data-testid': 'pagination' },
      React.createElement('span', null, `Página ${currentPage} de ${totalPages}`),
      React.createElement('button', { onClick: () => onPageChange(currentPage + 1) }, 'Siguiente')
    );
  };
});

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

// ── Helpers de datos ────────────────────────────────────────────────────────

const TODAY = new Date().toISOString();

const makeSale = (overrides = {}) => ({
  id: 'sale-1',
  numero_factura: 'FC-001',
  fecha: TODAY,
  branch_id: null,
  cajero_id: 1,
  subtotal: 80,
  total: 100,
  net_total: 100,
  metodo_pago: 'efectivo',
  estado: 'activa',
  items: [{ producto_id: 'p1', nombre: 'Producto A', cantidad: 2, precio_unitario: 50 }],
  ...overrides,
});

// GET /reportes/ventas ahora devuelve página + stats calculados en el backend
// sobre todo el rango filtrado (no solo la página). Este helper arma esa forma
// a partir de una lista de ventas "de prueba", como hacía antes el filtrado en
// memoria del lado del cliente.
const statsFromItems = (items) => {
  const totalSales = items.length;
  const totalRevenue = items.reduce((s, i) => s + (i.total || 0), 0);
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
  const paymentMethods = {};
  items.forEach(i => {
    const key = i.metodo_pago;
    if (!paymentMethods[key]) paymentMethods[key] = { count: 0, total: 0 };
    paymentMethods[key].count++;
    paymentMethods[key].total += i.total || 0;
  });
  const branchStats = {};
  items.forEach(i => {
    const key = i.branch_id || 'global';
    if (!branchStats[key]) branchStats[key] = { count: 0, total: 0, nombre: key === 'global' ? 'Sin sucursal' : key };
    branchStats[key].count++;
    branchStats[key].total += i.total || 0;
  });
  return { totalSales, totalRevenue, averageSale, paymentMethods, branchStats };
};

const reportResponse = (items, extra = {}) => ({
  items,
  total: items.length,
  page: 1,
  per_page: 10,
  stats: statsFromItems(items),
  daily: [],
  topProducts: [],
  creditNotes: [],
  ...extra,
});

const BRANCHES = [{ id: 'b1', nombre: 'Sucursal Central' }];
const USERS = [{ id: 1, nombre: 'Cajero Uno' }];

// ── Setup del mock adapter ──────────────────────────────────────────────────

const mock = new MockAdapter(axios);

beforeEach(() => {
  mock.reset();
  // Mocks mínimos que siempre se necesitan
  mock.onGet(/\/api\/branches/).reply(200, BRANCHES);
  mock.onGet(/\/api\/config/).reply(200, { items_per_page: 10 });
  mock.onGet(/\/api\/afip\/config/).reply(404, {});
  mock.onGet(/\/api\/users/).reply(200, USERS);
});

afterAll(() => mock.restore());

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SalesReports', () => {

  // 1. Carga y muestra ventas
  describe('carga de ventas', () => {
    it('muestra el spinner mientras carga', () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(() => new Promise(() => {})); // never resolves
      renderWithProviders(<SalesReports />);
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('muestra ventas una vez cargadas', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([makeSale()]));
      renderWithProviders(<SalesReports />);
      await waitFor(() => {
        expect(screen.getByText('FC-001')).toBeInTheDocument();
      });
    });

    it('muestra mensaje vacío cuando no hay ventas en el período', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([]));
      renderWithProviders(<SalesReports />);
      await waitFor(() => {
        expect(screen.getByText(/No hay ventas en el periodo seleccionado/i)).toBeInTheDocument();
      });
    });

    it('muestra el título de la página', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([]));
      renderWithProviders(<SalesReports />);
      await waitFor(() => {
        expect(screen.getByText('Reportes de Ventas')).toBeInTheDocument();
      });
    });
  });

  // 2. Filtro por rango de fechas
  describe('filtro por fecha', () => {
    it('filtra a "Todas" y muestra ventas antiguas', async () => {
      const pad = (n) => String(n).padStart(2, '0');
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      const recentSale = makeSale({ id: 'sale-recent', numero_factura: 'FC-TODAY', fecha: TODAY });
      const oldSale = makeSale({
        id: 'sale-old',
        numero_factura: 'FC-OLD',
        fecha: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // El backend filtra por rango de fechas: con "Hoy" (fecha_desde = hoy) no
      // devuelve la venta vieja; con "Todas" (rango de ~1 año) sí.
      mock.onGet(/\/api\/reportes\/ventas/).reply((config) => {
        if (config.params.fecha_desde === todayStr) {
          return [200, reportResponse([recentSale])];
        }
        return [200, reportResponse([recentSale, oldSale])];
      });
      renderWithProviders(<SalesReports />);

      await waitFor(() => expect(screen.queryByText(/Reportes de Ventas/i)).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText('FC-TODAY')).toBeInTheDocument());

      // Con filtro "today" (default) no aparece venta antigua
      expect(screen.queryByText('FC-OLD')).not.toBeInTheDocument();

      // Cambiamos a "Todas"
      const dateSelect = screen.getAllByRole('combobox').find(s =>
        Array.from(s.options || []).some(o => o.value === 'all')
      );
      fireEvent.change(dateSelect, { target: { value: 'all' } });

      await waitFor(() => {
        expect(screen.getByText('FC-OLD')).toBeInTheDocument();
      });
    });

    it('muestra inputs de fecha cuando se selecciona rango personalizado', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([]));
      renderWithProviders(<SalesReports />);
      await waitFor(() => screen.getByText('Reportes de Ventas'));

      const selects = screen.getAllByRole('combobox');
      const dateSelect = selects.find(s =>
        Array.from(s.options || []).some(o => o.value === 'custom')
      );
      fireEvent.change(dateSelect, { target: { value: 'custom' } });

      expect(screen.getAllByDisplayValue('').filter(i => i.type === 'date').length).toBeGreaterThanOrEqual(2);
    });
  });

  // 3. Filtro por método de pago — verificado a través de estadísticas
  describe('filtro por método de pago', () => {
    it('muestra el método de pago de cada venta', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([
        makeSale({ metodo_pago: 'efectivo', fecha: TODAY }),
        makeSale({ id: 'sale-2', numero_factura: 'FC-002', metodo_pago: 'tarjeta', fecha: TODAY }),
      ]));
      renderWithProviders(<SalesReports />);

      await waitFor(() => expect(screen.getByText('FC-001')).toBeInTheDocument());
      expect(screen.getByText('Efectivo')).toBeInTheDocument();
      expect(screen.getByText('Tarjeta')).toBeInTheDocument();
    });

    it('muestra el desglose de métodos de pago en estadísticas', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([
        makeSale({ total: 200, metodo_pago: 'transferencia', fecha: TODAY }),
      ]));
      renderWithProviders(<SalesReports />);

      await waitFor(() => {
        // La sección "Métodos de Pago" debe aparecer
        expect(screen.getByText('Métodos de Pago')).toBeInTheDocument();
        expect(screen.getByText('Transferencia')).toBeInTheDocument();
      });
    });
  });

  // 4. Búsqueda / filtro de producto — en SalesReports se filtra por sucursal y usuario,
  //    no hay input de búsqueda de texto libre; validamos filtro por sucursal
  describe('filtro por sucursal', () => {
    it('filtra ventas por sucursal', async () => {
      const saleB1 = makeSale({ id: 's1', numero_factura: 'FC-B1', branch_id: 'b1', fecha: TODAY });
      const saleGlobal = makeSale({ id: 's2', numero_factura: 'FC-GLOBAL', branch_id: null, fecha: TODAY });
      mock.onGet(/\/api\/reportes\/ventas/).reply((config) => {
        if (config.params.branch_id === 'b1') return [200, reportResponse([saleB1])];
        return [200, reportResponse([saleB1, saleGlobal])];
      });
      renderWithProviders(<SalesReports />);

      await waitFor(() => expect(screen.getByText('FC-B1')).toBeInTheDocument());

      const branchSelect = screen.getAllByRole('combobox').find(s =>
        Array.from(s.options || []).some(o => o.value === 'b1')
      );
      fireEvent.change(branchSelect, { target: { value: 'b1' } });

      await waitFor(() => {
        expect(screen.getByText('FC-B1')).toBeInTheDocument();
        expect(screen.queryByText('FC-GLOBAL')).not.toBeInTheDocument();
      });
    });
  });

  // 5. Estadísticas correctas
  describe('estadísticas', () => {
    it('muestra el total de ventas correcto', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([
        makeSale({ total: 100, fecha: TODAY }),
        makeSale({ id: 's2', numero_factura: 'FC-002', total: 200, fecha: TODAY }),
      ]));
      renderWithProviders(<SalesReports />);

      await waitFor(() => {
        // stat-card Total Ventas = 2
        const statCards = document.querySelectorAll('.stat-value');
        const totalVentasCard = Array.from(statCards).find(c => c.textContent === '2');
        expect(totalVentasCard).toBeInTheDocument();
      });
    });

    it('muestra ingresos totales correctos', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([
        makeSale({ total: 150, fecha: TODAY }),
        makeSale({ id: 's2', numero_factura: 'FC-002', total: 350, fecha: TODAY }),
      ]));
      renderWithProviders(<SalesReports />);

      await waitFor(() => {
        // Total = $500
        expect(screen.getByText(/\$500/)).toBeInTheDocument();
      });
    });

    it('muestra venta promedio correcta', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([
        makeSale({ total: 100, fecha: TODAY }),
        makeSale({ id: 's2', numero_factura: 'FC-002', total: 300, fecha: TODAY }),
      ]));
      renderWithProviders(<SalesReports />);

      await waitFor(() => {
        // Promedio = $200
        expect(screen.getByText(/\$200/)).toBeInTheDocument();
      });
    });
  });

  // 6. Exportar PDF
  describe('exportar PDF', () => {
    it('llama a jsPDF al hacer click en Descargar PDF', async () => {
      const jsPDF = require('jspdf').default;
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([makeSale({ fecha: TODAY })]));
      renderWithProviders(<SalesReports />);

      await waitFor(() => screen.getByText('FC-001'));

      const pdfBtn = screen.getByRole('button', { name: /Descargar PDF/i });
      fireEvent.click(pdfBtn);

      await waitFor(() => {
        expect(jsPDF).toHaveBeenCalled();
      });
    });

    it('el botón PDF está deshabilitado cuando no hay ventas', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([]));
      renderWithProviders(<SalesReports />);

      await waitFor(() => screen.getByText('Reportes de Ventas'));
      expect(screen.getByRole('button', { name: /Descargar PDF/i })).toBeDisabled();
    });
  });

  // 7. Exportar XLSX
  describe('exportar XLSX', () => {
    it('llama a xlsx.writeFile al hacer click en Exportar Excel', async () => {
      const XLSX = require('xlsx');
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([makeSale({ fecha: TODAY })]));
      renderWithProviders(<SalesReports />);

      await waitFor(() => screen.getByText('FC-001'));

      const xlsxBtn = screen.getByRole('button', { name: /Exportar Excel/i });
      fireEvent.click(xlsxBtn);

      // El export ahora pide TODAS las ventas del período al backend antes de
      // armar el archivo, así que el resultado llega después de una request async.
      await waitFor(() => {
        expect(XLSX.writeFile).toHaveBeenCalled();
      });
    });

    it('el botón Excel está deshabilitado cuando no hay ventas', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([]));
      renderWithProviders(<SalesReports />);

      await waitFor(() => screen.getByText('Reportes de Ventas'));
      expect(screen.getByRole('button', { name: /Exportar Excel/i })).toBeDisabled();
    });
  });

  // 8. Click en venta abre TicketModal (botón reimprimir)
  describe('TicketModal', () => {
    it('abre el TicketModal al hacer click en reimprimir', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([makeSale({ fecha: TODAY })]));
      mock.onGet(/\/api\/sales\/sale-1\/returns/).reply(200, []);
      renderWithProviders(<SalesReports />);

      await waitFor(() => screen.getByText('FC-001'));

      // Botón reimprimir (Printer icon)
      const reprintBtns = screen.getAllByTitle('Reimprimir ticket');
      fireEvent.click(reprintBtns[0]);

      await waitFor(() => {
        expect(screen.getByTestId('ticket-modal')).toBeInTheDocument();
      });
    });
  });

  // 9. Botón de devolución abre ReturnModal
  describe('ReturnModal', () => {
    it('abre el ReturnModal al hacer click en devolución', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([makeSale({ fecha: TODAY })]));
      mock.onGet(/\/api\/sales\/sale-1\/returns/).reply(200, []);
      mock.onGet(/\/api\/products/).reply(200, [{ id: 'p1', nombre: 'Producto A' }]);
      renderWithProviders(<SalesReports />);

      await waitFor(() => screen.getByText('FC-001'));

      const returnBtns = screen.getAllByTitle('Procesar devolución');
      fireEvent.click(returnBtns[0]);

      await waitFor(() => {
        expect(screen.getByTestId('return-modal')).toBeInTheDocument();
      });
    });

    it('no muestra botón de devolución para ventas canceladas', async () => {
      mock.onGet(/\/api\/reportes\/ventas/).reply(200, reportResponse([
        makeSale({ estado: 'cancelado', fecha: TODAY }),
      ]));
      renderWithProviders(<SalesReports />);

      await waitFor(() => screen.getByText('FC-001'));
      expect(screen.queryByTitle('Procesar devolución')).not.toBeInTheDocument();
    });
  });

  // 10. Paginación — ahora la pagina el backend: la página visible trae solo
  //     `per_page` filas, y `total` es el conteo real sobre todo el rango.
  describe('paginación', () => {
    it('muestra paginación cuando hay más ventas que items_per_page', async () => {
      mock.onGet(/\/api\/config/).reply(200, { items_per_page: 2 });
      const allSales = Array.from({ length: 5 }, (_, i) =>
        makeSale({ id: `s${i}`, numero_factura: `FC-00${i}`, fecha: TODAY })
      );
      mock.onGet(/\/api\/reportes\/ventas/).reply((config) => {
        const page = Number(config.params.page) || 1;
        const perPage = Number(config.params.per_page) || 2;
        const slice = allSales.slice((page - 1) * perPage, page * perPage);
        return [200, reportResponse(slice, { total: allSales.length })];
      });
      renderWithProviders(<SalesReports />);

      await waitFor(() => {
        expect(screen.getByTestId('pagination')).toBeInTheDocument();
      });
    });

    it('avanza a la siguiente página al hacer click', async () => {
      mock.onGet(/\/api\/config/).reply(200, { items_per_page: 2 });
      const allSales = Array.from({ length: 4 }, (_, i) =>
        makeSale({ id: `s${i}`, numero_factura: `FC-${String(i).padStart(3, '0')}`, fecha: TODAY })
      );
      mock.onGet(/\/api\/reportes\/ventas/).reply((config) => {
        const page = Number(config.params.page) || 1;
        const perPage = Number(config.params.per_page) || 2;
        const slice = allSales.slice((page - 1) * perPage, page * perPage);
        return [200, reportResponse(slice, { total: allSales.length })];
      });
      renderWithProviders(<SalesReports />);

      await waitFor(() => screen.getByTestId('pagination'));

      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

      await waitFor(() => {
        expect(screen.getByText(/Página 2/)).toBeInTheDocument();
      });
    });
  });
});
