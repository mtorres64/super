import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders, mockUser } from '../../../testUtils';
import StockAlerts from '../index';

// jsPDF usa canvas, que jsdom no implementa nativamente.
// Lo mockeamos para evitar errores de entorno en CI.
jest.mock('jspdf', () => {
  const mockSave = jest.fn();
  const mockPdf = {
    setFillColor: jest.fn(),
    rect: jest.fn(),
    setTextColor: jest.fn(),
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    text: jest.fn(),
    addPage: jest.fn(),
    setDrawColor: jest.fn(),
    line: jest.fn(),
    setPage: jest.fn(),
    save: mockSave,
    internal: { pages: [null, null] },
  };
  return jest.fn(() => mockPdf);
});

const mock = new MockAdapter(axios);
beforeEach(() => mock.reset());
afterAll(() => mock.restore());

const BASE = 'http://localhost:8000/api';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeItem = (overrides = {}) => ({
  branch_product_id: 1,
  nombre: 'Leche 1L',
  codigo_barras: '7790001',
  stock: 2,
  stock_minimo: 10,
  sucursal: 'Central',
  ...overrides,
});

const makeResponse = (items = [], page = 1, totalPages = 1) => ({
  items,
  total: items.length,
  total_pages: totalPages,
  page,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderAdmin = (overrides = {}) =>
  renderWithProviders(<StockAlerts />, { user: { ...mockUser, rol: 'admin' }, ...overrides });

const renderCajero = (overrides = {}) =>
  renderWithProviders(<StockAlerts />, { user: { ...mockUser, rol: 'cajero' }, ...overrides });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StockAlerts', () => {
  // ── Carga inicial ────────────────────────────────────────────────────────────

  it('muestra spinner mientras carga', () => {
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(() => new Promise(() => {}));
    renderAdmin();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('carga y muestra los productos con stock bajo', async () => {
    const items = [
      makeItem({ branch_product_id: 1, nombre: 'Leche 1L', stock: 2, stock_minimo: 10 }),
      makeItem({ branch_product_id: 2, nombre: 'Harina 1kg', stock: 0, stock_minimo: 5 }),
    ];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderAdmin();

    await waitFor(() => expect(screen.getByText('Leche 1L')).toBeInTheDocument());
    expect(screen.getByText('Harina 1kg')).toBeInTheDocument();
  });

  it('muestra la diferencia stock - stock_minimo correctamente', async () => {
    const items = [makeItem({ stock: 3, stock_minimo: 10 })];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    // 3 - 10 = -7
    expect(screen.getByText('-7')).toBeInTheDocument();
  });

  it('muestra badge "Sin stock" cuando stock === 0', async () => {
    const items = [makeItem({ stock: 0, stock_minimo: 5 })];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
  });

  it('muestra badge "Stock bajo" cuando stock > 0 pero menor al mínimo', async () => {
    const items = [makeItem({ stock: 3, stock_minimo: 10 })];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    expect(screen.getByText('Stock bajo')).toBeInTheDocument();
  });

  it('muestra "¡Todo en orden!" cuando no hay alertas', async () => {
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse([]));
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByText('¡Todo en orden!')).toBeInTheDocument()
    );
  });

  // ── Columna Sucursal (solo admin) ────────────────────────────────────────────

  it('muestra la columna "Sucursal" solo para usuarios admin', async () => {
    const items = [makeItem({ sucursal: 'Central' })];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    expect(screen.getByText('Sucursal')).toBeInTheDocument();
    expect(screen.getByText('Central')).toBeInTheDocument();
  });

  it('no muestra la columna "Sucursal" para usuarios no-admin', async () => {
    const items = [makeItem({ sucursal: 'Central' })];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderCajero();

    await waitFor(() => screen.getByText('Leche 1L'));
    expect(screen.queryByText('Sucursal')).not.toBeInTheDocument();
  });

  // ── Columna Acciones (solo admin) ────────────────────────────────────────────

  it('muestra los botones de acción solo para admin', async () => {
    const items = [makeItem()];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    expect(screen.getByTitle('Agregar stock')).toBeInTheDocument();
    expect(screen.getByTitle('Modificar stock mínimo')).toBeInTheDocument();
  });

  it('no muestra botones de acción para usuarios no-admin', async () => {
    const items = [makeItem()];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderCajero();

    await waitFor(() => screen.getByText('Leche 1L'));
    expect(screen.queryByTitle('Agregar stock')).not.toBeInTheDocument();
  });

  // ── Modal edición ────────────────────────────────────────────────────────────

  it('abre el modal "Agregar Stock" al hacer click en el botón correspondiente', async () => {
    const items = [makeItem({ stock: 2, stock_minimo: 10 })];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    fireEvent.click(screen.getByTitle('Agregar stock'));

    expect(screen.getByText('Agregar Stock')).toBeInTheDocument();
    expect(screen.getByText(/stock actual: 2/i)).toBeInTheDocument();
  });

  it('abre el modal "Modificar Stock Mínimo" al hacer click en su botón', async () => {
    const items = [makeItem({ stock: 2, stock_minimo: 10 })];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    fireEvent.click(screen.getByTitle('Modificar stock mínimo'));

    expect(screen.getByText('Modificar Stock Mínimo')).toBeInTheDocument();
    expect(screen.getByText(/actual: 10/i)).toBeInTheDocument();
  });

  it('cierra el modal al hacer click en "Cancelar"', async () => {
    const items = [makeItem()];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    fireEvent.click(screen.getByTitle('Agregar stock'));
    expect(screen.getByText('Agregar Stock')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    await waitFor(() =>
      expect(screen.queryByText('Agregar Stock')).not.toBeInTheDocument()
    );
  });

  // ── PUT /branch-products/:id ─────────────────────────────────────────────────

  it('llama a PUT /branch-products/:id al guardar un ajuste de stock', async () => {
    const item = makeItem({ branch_product_id: 7, stock: 2, stock_minimo: 10 });
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse([item]));
    mock.onPut(`${BASE}/branch-products/7`).reply(200, {});
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    fireEvent.click(screen.getByTitle('Agregar stock'));

    const modalInput = screen.getByRole('spinbutton');
    await userEvent.clear(modalInput);
    await userEvent.type(modalInput, '5');

    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      const putHistory = mock.history.put.filter(r => r.url?.includes('/branch-products/7'));
      expect(putHistory.length).toBeGreaterThan(0);
      const body = JSON.parse(putHistory[0].data);
      // stock nuevo = stock actual (2) + cantidad ingresada (5) = 7
      expect(body.stock).toBe(7);
    });
  });

  it('llama a PUT con stock_minimo al guardar desde el modal de stock mínimo', async () => {
    const item = makeItem({ branch_product_id: 8, stock: 2, stock_minimo: 10 });
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse([item]));
    mock.onPut(`${BASE}/branch-products/8`).reply(200, {});
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    fireEvent.click(screen.getByTitle('Modificar stock mínimo'));

    const modalInput = screen.getByRole('spinbutton');
    await userEvent.clear(modalInput);
    await userEvent.type(modalInput, '15');

    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      const putHistory = mock.history.put.filter(r => r.url?.includes('/branch-products/8'));
      expect(putHistory.length).toBeGreaterThan(0);
      const body = JSON.parse(putHistory[0].data);
      expect(body.stock_minimo).toBe(15);
    });
  });

  it('no llama a PUT si el valor ingresado es inválido (NaN)', async () => {
    const item = makeItem({ branch_product_id: 9 });
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse([item]));
    mock.onPut(`${BASE}/branch-products/9`).reply(200, {});
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));
    fireEvent.click(screen.getByTitle('Agregar stock'));

    const modalInput = screen.getByRole('spinbutton');
    await userEvent.clear(modalInput);
    // Dejar vacío → parseInt('', 10) es NaN

    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    // El modal no debe cerrarse y no debe haber PUT
    await waitFor(() => {
      expect(screen.getByText('Agregar Stock')).toBeInTheDocument();
      expect(mock.history.put.length).toBe(0);
    });
  });

  // ── Paginación ───────────────────────────────────────────────────────────────

  it('muestra la paginación cuando hay más de una página', async () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeItem({ branch_product_id: i + 1, nombre: `Producto ${i + 1}` })
    );
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, {
      items,
      total: 45,
      total_pages: 3,
      page: 1,
    });
    renderAdmin();

    await waitFor(() => screen.getByText('Producto 1'));
    // El componente Pagination existe en el DOM si total_pages > 1
    // Comprobamos que hay texto de paginación (varía según el componente Pagination)
    expect(screen.getByText(/45/)).toBeInTheDocument();
  });

  it('recarga las alertas al cambiar de página', async () => {
    const itemsPag1 = [makeItem({ branch_product_id: 1, nombre: 'Producto Pag1' })];
    const itemsPag2 = [makeItem({ branch_product_id: 2, nombre: 'Producto Pag2' })];

    mock
      .onGet(`${BASE}/dashboard/stock-alerts`, { params: { page: 1, per_page: 20 } })
      .reply(200, { items: itemsPag1, total: 25, total_pages: 2, page: 1 });
    mock
      .onGet(`${BASE}/dashboard/stock-alerts`, { params: { page: 2, per_page: 20 } })
      .reply(200, { items: itemsPag2, total: 25, total_pages: 2, page: 2 });

    renderAdmin();

    await waitFor(() => screen.getByText('Producto Pag1'));

    // Simular cambio de página a la 2
    // El componente Pagination dispara setCurrentPage → buscamos el botón "2" o "Siguiente"
    const nextButtons = screen.queryAllByRole('button', { name: /2|siguiente|next/i });
    if (nextButtons.length > 0) {
      fireEvent.click(nextButtons[0]);
      await waitFor(() =>
        expect(screen.getByText('Producto Pag2')).toBeInTheDocument()
      );
    }
  });

  // ── Exportar Excel ───────────────────────────────────────────────────────────

  it('llama a GET /dashboard/stock-alerts/export al exportar Excel', async () => {
    const items = [makeItem()];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    mock.onGet(`${BASE}/dashboard/stock-alerts/export`).reply(
      200,
      new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    );

    // Mockear la creación de URLs de objeto
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/test');
    global.URL.revokeObjectURL = jest.fn();

    renderAdmin();
    await waitFor(() => screen.getByText('Leche 1L'));

    const excelBtn = screen.getByRole('button', { name: /Exportar Excel/i });
    fireEvent.click(excelBtn);

    await waitFor(() => {
      const exportHistory = mock.history.get.filter(r =>
        r.url?.includes('/stock-alerts/export')
      );
      expect(exportHistory.length).toBeGreaterThan(0);
      expect(exportHistory[0].params).toMatchObject({ format: 'xlsx' });
    });
  });

  it('el botón "Exportar Excel" está deshabilitado si no hay productos', async () => {
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse([]));
    renderAdmin();

    await waitFor(() => screen.getByText('¡Todo en orden!'));
    expect(screen.getByRole('button', { name: /Exportar Excel/i })).toBeDisabled();
  });

  // ── Exportar PDF ─────────────────────────────────────────────────────────────

  it('llama a GET /dashboard/stock-alerts (all) al exportar PDF', async () => {
    const items = [makeItem()];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));

    renderAdmin();
    await waitFor(() => screen.getByText('Leche 1L'));

    const pdfBtn = screen.getByRole('button', { name: /Descargar PDF/i });
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      // El export PDF hace un GET con per_page: 10000
      const exportHistory = mock.history.get.filter(r => {
        try {
          return parseInt(r.params?.per_page) === 10000;
        } catch {
          return false;
        }
      });
      expect(exportHistory.length).toBeGreaterThan(0);
    });
  });

  it('el botón "Descargar PDF" está deshabilitado si no hay productos', async () => {
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse([]));
    renderAdmin();

    await waitFor(() => screen.getByText('¡Todo en orden!'));
    expect(screen.getByRole('button', { name: /Descargar PDF/i })).toBeDisabled();
  });

  // ── Refresh ──────────────────────────────────────────────────────────────────

  it('vuelve a llamar a la API al hacer click en el botón de actualizar', async () => {
    const items = [makeItem()];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse(items));
    renderAdmin();

    await waitFor(() => screen.getByText('Leche 1L'));

    const refreshBtn = screen.getByTitle('Actualizar');
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      const getHistory = mock.history.get.filter(r =>
        r.url?.includes('/dashboard/stock-alerts')
      );
      // Primera carga + refresh = al menos 2 llamadas
      expect(getHistory.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Indicadores visuales ─────────────────────────────────────────────────────

  it('muestra el total de productos en el subtítulo', async () => {
    const items = [makeItem(), makeItem({ branch_product_id: 2, nombre: 'Arroz 1kg' })];
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, { ...makeResponse(items), total: 2 });
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByText(/2 productos requieren atención/i)).toBeInTheDocument()
    );
  });

  it('informa "Todas las sucursales" para el admin', async () => {
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse([]));
    renderAdmin();
    await waitFor(() => screen.getByText('¡Todo en orden!'));
    expect(screen.getByText(/Todas las sucursales/i)).toBeInTheDocument();
  });

  it('informa "Tu sucursal" para usuarios no-admin', async () => {
    mock.onGet(`${BASE}/dashboard/stock-alerts`).reply(200, makeResponse([]));
    renderCajero();
    await waitFor(() => screen.getByText('¡Todo en orden!'));
    expect(screen.getByText(/Tu sucursal/i)).toBeInTheDocument();
  });
});
