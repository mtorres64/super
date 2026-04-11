import { screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders } from '../../../testUtils';
import BranchManagement from '../index';

// Suppress sonner toasts in tests
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Disable modal close animation delay
beforeAll(() => {
  document.body.classList.add('no-animations');
});

const mock = new MockAdapter(axios);

beforeEach(() => {
  mock.reset();
  mock.onGet(/\/config/).reply(200, { items_per_page: 10 });
  mock.onGet(/\/users/).reply(200, []);
  mock.onGet(/\/categories/).reply(200, [
    { id: 1, nombre: 'Bebidas' },
    { id: 2, nombre: 'Lácteos' },
  ]);
});

afterAll(() => {
  mock.restore();
  document.body.classList.remove('no-animations');
});

// ─── fixtures ────────────────────────────────────────────────────────────────

const makeBranch = (overrides = {}) => ({
  id: 1,
  nombre: 'Sucursal Centro',
  direccion: 'Av. Siempre Viva 123',
  telefono: '0351-1234567',
  activo: true,
  ...overrides,
});

const makeBranchProduct = (overrides = {}) => ({
  product_id: 1,
  branch_product_id: 10,
  nombre: 'Coca Cola',
  codigo_barras: '7790001',
  tipo: 'codigo_barras',
  categoria_id: 1,
  precio_global: 150,
  precio_sucursal: 165,
  precio_por_peso_sucursal: null,
  margen_sucursal: 10,
  stock_global: 20,
  stock_sucursal: 15,
  stock_minimo_sucursal: 5,
  activo_sucursal: true,
  ...overrides,
});

const branches = [
  makeBranch(),
  makeBranch({ id: 2, nombre: 'Sucursal Norte', direccion: 'Bv. San Juan 500', activo: false }),
];

// ─── helpers ─────────────────────────────────────────────────────────────────

async function renderAndWait(branchList = branches) {
  mock.onGet(/\/branches$/).reply(200, branchList);
  await act(async () => {
    renderWithProviders(<BranchManagement />);
  });
  await waitFor(() => expect(screen.queryByText('Gestión de Sucursales')).toBeInTheDocument());
}

/** Clicks the "Ver Productos" button of the branch at position `idx` (0-based). */
async function goToBranchDetail(idx = 0) {
  const btns = await screen.findAllByRole('button', { name: /ver productos/i });
  await act(async () => { fireEvent.click(btns[idx]); });
}

const getModal = () => document.querySelector('.modal-content');

// ─── tests ───────────────────────────────────────────────────────────────────

describe('BranchManagement – carga inicial', () => {
  test('muestra el título y lista de sucursales', async () => {
    await renderAndWait();

    expect(screen.getByText('Gestión de Sucursales')).toBeInTheDocument();
    expect(screen.getByText('Sucursal Centro')).toBeInTheDocument();
    expect(screen.getByText('Sucursal Norte')).toBeInTheDocument();
    expect(screen.getByText('2 sucursal(es) registrada(s)')).toBeInTheDocument();
  });

  test('muestra el estado activo/inactivo de cada sucursal', async () => {
    await renderAndWait();

    await screen.findByText('Sucursal Centro');
    expect(screen.getAllByText('Activa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactiva').length).toBeGreaterThan(0);
  });

  test('muestra "Sin sucursales" cuando la lista está vacía', async () => {
    await renderAndWait([]);

    expect(screen.getByText('Sin sucursales')).toBeInTheDocument();
  });
});

describe('BranchManagement – crear sucursal', () => {
  test('abre el modal al hacer click en "Nueva Sucursal"', async () => {
    await renderAndWait();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /nueva sucursal/i }));
    });

    const modal = getModal();
    expect(within(modal).getByText('Nueva Sucursal')).toBeInTheDocument();
    // Los tres campos del formulario son textboxes
    expect(within(modal).getAllByRole('textbox').length).toBe(3);
  });

  test('llama a POST /branches con los datos del formulario', async () => {
    mock.onPost(/\/branches/).reply(201, {});
    mock.onGet(/\/branches$/).reply(200, branches);

    await renderAndWait();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /nueva sucursal/i }));
    });

    const modal = getModal();
    const [nombreInput, dirInput, telInput] = within(modal).getAllByRole('textbox');

    await act(async () => {
      await userEvent.type(nombreInput, 'Sucursal Sur');
      await userEvent.type(dirInput, 'Calle Falsa 742');
      await userEvent.type(telInput, '0351-9999999');
    });

    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /crear sucursal/i }));
    });

    await waitFor(() => {
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toMatch(/\/branches/);
    });

    const body = JSON.parse(mock.history.post[0].data);
    expect(body.nombre).toBe('Sucursal Sur');
    expect(body.direccion).toBe('Calle Falsa 742');
    expect(body.telefono).toBe('0351-9999999');
  });
});

describe('BranchManagement – editar sucursal', () => {
  test('abre el modal con datos precargados al hacer click en editar', async () => {
    await renderAndWait();
    await screen.findByText('Sucursal Centro');

    // Botón de editar (ícono Edit de Lucide)
    const editBtn = document.querySelector('button svg.lucide-edit')?.closest('button');
    await act(async () => { fireEvent.click(editBtn); });

    const modal = getModal();
    expect(within(modal).getByText('Editar Sucursal')).toBeInTheDocument();

    const [nombreInput, dirInput] = within(modal).getAllByRole('textbox');
    expect(nombreInput).toHaveValue('Sucursal Centro');
    expect(dirInput).toHaveValue('Av. Siempre Viva 123');
  });

  test('llama a PUT /branches/:id al guardar cambios', async () => {
    mock.onPut(/\/branches\/1/).reply(200, {});
    mock.onGet(/\/branches$/).reply(200, branches);

    await renderAndWait();
    await screen.findByText('Sucursal Centro');

    const editBtn = document.querySelector('button svg.lucide-edit')?.closest('button');
    await act(async () => { fireEvent.click(editBtn); });

    const modal = getModal();
    const [nombreInput] = within(modal).getAllByRole('textbox');

    await act(async () => {
      await userEvent.clear(nombreInput);
      await userEvent.type(nombreInput, 'Sucursal Centro Actualizada');
    });

    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /actualizar sucursal/i }));
    });

    await waitFor(() => {
      expect(mock.history.put.some(r => r.url?.match(/\/branches\/1/))).toBe(true);
    });

    const putCall = mock.history.put.find(r => r.url?.match(/\/branches\/1/));
    const body = JSON.parse(putCall.data);
    expect(body.nombre).toBe('Sucursal Centro Actualizada');
  });
});

describe('BranchManagement – activar/desactivar sucursal', () => {
  test('llama a PUT /branches/:id con activo invertido al hacer click en toggle', async () => {
    mock.onPut(/\/branches\/1/).reply(200, {});
    mock.onGet(/\/branches$/).reply(200, branches);

    await renderAndWait();
    await screen.findByText('Sucursal Centro');

    // El primer ToggleRight corresponde a la sucursal activa (id=1)
    const toggleBtn = document.querySelector('button svg.lucide-toggle-right')?.closest('button');
    await act(async () => { fireEvent.click(toggleBtn); });

    await waitFor(() => {
      expect(mock.history.put.some(r => r.url?.match(/\/branches\/1/))).toBe(true);
    });

    const putCall = mock.history.put.find(r => r.url?.match(/\/branches\/1/));
    const body = JSON.parse(putCall.data);
    // La sucursal era activo=true; el toggle la desactiva
    expect(body.activo).toBe(false);
  });

  test('activa una sucursal inactiva al hacer click en su toggle', async () => {
    mock.onPut(/\/branches\/2/).reply(200, {});
    mock.onGet(/\/branches$/).reply(200, branches);

    await renderAndWait();
    await screen.findByText('Sucursal Norte');

    // El primer ToggleLeft corresponde a la sucursal inactiva (id=2)
    const toggleBtn = document.querySelector('button svg.lucide-toggle-left')?.closest('button');
    await act(async () => { fireEvent.click(toggleBtn); });

    await waitFor(() => {
      expect(mock.history.put.some(r => r.url?.match(/\/branches\/2/))).toBe(true);
    });

    const putCall = mock.history.put.find(r => r.url?.match(/\/branches\/2/));
    const body = JSON.parse(putCall.data);
    expect(body.activo).toBe(true);
  });
});

describe('BranchManagement – vista de detalle (productos de sucursal)', () => {
  test('muestra la vista de detalle con productos al seleccionar una sucursal', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);

    await renderAndWait();
    await goToBranchDetail(0);

    await waitFor(() => {
      // Heading con el nombre de la sucursal
      expect(screen.getByRole('heading', { name: /sucursal centro/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Coca Cola')).toBeInTheDocument();
  });

  test('botón Volver regresa a la lista de sucursales', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);

    await renderAndWait();
    await goToBranchDetail(0);

    await waitFor(() => screen.getByRole('button', { name: /volver/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /volver/i }));
    });

    expect(screen.getByText('Gestión de Sucursales')).toBeInTheDocument();
  });

  test('cambiar precio de producto en sucursal muestra indicador de cambios pendientes', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);

    await renderAndWait();
    await goToBranchDetail(0);

    await waitFor(() => screen.getByText('Coca Cola'));

    // El input de precio sucursal tiene value="165" (precio_sucursal del fixture)
    const precioInput = screen.getAllByRole('spinbutton').find(i => i.value === '165');
    expect(precioInput).toBeDefined();

    await act(async () => {
      fireEvent.change(precioInput, { target: { value: '180' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/cambio\(s\) sin guardar/i)).toBeInTheDocument();
    });
  });

  test('guardar cambios llama a PUT /branch-products/:id', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);
    mock.onPut(/\/branch-products\/10/).reply(200, {});

    await renderAndWait();
    await goToBranchDetail(0);

    await waitFor(() => screen.getByText('Coca Cola'));

    // Cambiar precio
    const precioInput = screen.getAllByRole('spinbutton').find(i => i.value === '165');
    await act(async () => {
      fireEvent.change(precioInput, { target: { value: '200' } });
    });

    const saveBtn = await screen.findByRole('button', { name: /guardar cambios/i });
    await act(async () => { fireEvent.click(saveBtn); });

    await waitFor(() => {
      expect(mock.history.put.some(r => r.url?.match(/\/branch-products\/10/))).toBe(true);
    });
  });
});

describe('BranchManagement – búsqueda en detalle de sucursal', () => {
  test('filtra productos en la vista de detalle', async () => {
    const branchProducts = [
      makeBranchProduct({ product_id: 1, nombre: 'Coca Cola' }),
      makeBranchProduct({ product_id: 2, branch_product_id: 11, nombre: 'Sprite', codigo_barras: '7790003' }),
    ];
    mock.onGet(/\/branches\/1\/products$/).reply(200, branchProducts);

    await renderAndWait();
    await goToBranchDetail(0);
    await waitFor(() => screen.getByText('Coca Cola'));

    const searchInput = screen.getByPlaceholderText('Buscar productos...');
    await act(async () => { await userEvent.type(searchInput, 'Sprite'); });

    expect(screen.getByText('Sprite')).toBeInTheDocument();
    expect(screen.queryByText('Coca Cola')).not.toBeInTheDocument();
  });
});

describe('BranchManagement – selección masiva', () => {
  test('seleccionar productos muestra la barra de acciones masivas', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);

    await renderAndWait();
    await goToBranchDetail(0);
    await waitFor(() => screen.getByText('Coca Cola'));

    // checkboxes[0] = select all de cabecera, checkboxes[1] = primer producto
    const checkboxes = screen.getAllByRole('checkbox');
    await act(async () => { fireEvent.click(checkboxes[1]); });

    expect(screen.getByText('1 seleccionado(s)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /margen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stock mín\./i })).toBeInTheDocument();
  });

  test('checkbox de cabecera selecciona todos los productos filtrados', async () => {
    const branchProducts = [
      makeBranchProduct({ product_id: 1, nombre: 'Coca Cola' }),
      makeBranchProduct({ product_id: 2, branch_product_id: 11, nombre: 'Sprite' }),
    ];
    mock.onGet(/\/branches\/1\/products$/).reply(200, branchProducts);

    await renderAndWait();
    await goToBranchDetail(0);
    await waitFor(() => screen.getByText('Coca Cola'));

    await act(async () => { fireEvent.click(screen.getAllByRole('checkbox')[0]); });

    expect(screen.getByText('2 seleccionado(s)')).toBeInTheDocument();
  });
});

describe('BranchManagement – bulk: ajuste de margen', () => {
  test('abre el modal de margen masivo, ingresa valor y aplica', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);

    await renderAndWait();
    await goToBranchDetail(0);
    await waitFor(() => screen.getByText('Coca Cola'));

    // Seleccionar producto
    await act(async () => { fireEvent.click(screen.getAllByRole('checkbox')[1]); });

    // Abrir modal de margen
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /margen/i }));
    });

    const modal = getModal();
    expect(within(modal).getByText('Cambio masivo de Margen')).toBeInTheDocument();

    // Ingresar valor
    const margenInput = within(modal).getByPlaceholderText('0.00');
    await act(async () => {
      fireEvent.change(margenInput, { target: { value: '15' } });
    });

    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /aplicar/i }));
    });

    // Modal se cierra y aparece indicador de cambios
    await waitFor(() => {
      expect(screen.queryByText('Cambio masivo de Margen')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/cambio\(s\) sin guardar/i)).toBeInTheDocument();
  });

  test('cambia el tipo de ajuste de margen (establecer / incrementar / decrementar)', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);

    await renderAndWait();
    await goToBranchDetail(0);
    await waitFor(() => screen.getByText('Coca Cola'));

    await act(async () => { fireEvent.click(screen.getAllByRole('checkbox')[1]); });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /margen/i }));
    });

    const modal = getModal();

    // Cambiar a "Incrementar"
    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /incrementar/i }));
    });

    expect(within(modal).getByText(/incremento/i)).toBeInTheDocument();

    // Cambiar a "Decrementar"
    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /decrementar/i }));
    });

    expect(within(modal).getByText(/decremento/i)).toBeInTheDocument();
  });
});

describe('BranchManagement – bulk: stock mínimo', () => {
  test('abre el modal de stock mínimo masivo y aplica', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);

    await renderAndWait();
    await goToBranchDetail(0);
    await waitFor(() => screen.getByText('Coca Cola'));

    await act(async () => { fireEvent.click(screen.getAllByRole('checkbox')[1]); });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /stock mín\./i }));
    });

    const modal = getModal();
    expect(within(modal).getByText('Cambio masivo de Stock Mínimo')).toBeInTheDocument();

    const stockInput = within(modal).getByPlaceholderText('0');
    await act(async () => {
      fireEvent.change(stockInput, { target: { value: '20' } });
    });

    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /aplicar/i }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Cambio masivo de Stock Mínimo')).not.toBeInTheDocument();
    });
  });
});

describe('BranchManagement – exportar productos de sucursal', () => {
  test('llama al endpoint de exportación CSV al hacer click en "CSV"', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);
    mock.onGet(/\/branches\/1\/products\/export/).reply(200, new Blob(['csv content']), {
      'Content-Type': 'text/csv',
    });

    // Mock DOM APIs que JSDOM no soporta
    global.URL.createObjectURL = jest.fn(() => 'blob:fake');
    global.URL.revokeObjectURL = jest.fn();

    const createElementSpy = jest.spyOn(document, 'createElement');
    const mockAnchor = { href: '', setAttribute: jest.fn(), click: jest.fn(), remove: jest.fn() };
    createElementSpy.mockImplementation((tag) => {
      if (tag === 'a') return mockAnchor;
      return document.createElement.wrappedMethod
        ? document.createElement.wrappedMethod(tag)
        : HTMLElement.call(document, tag);
    });

    await renderAndWait();
    await goToBranchDetail(0);
    await waitFor(() => screen.getByText('Coca Cola'));

    // Abrir menú de exportar
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /exportar/i }));
    });

    // Hacer click en CSV
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^csv$/i }));
    });

    await waitFor(() => {
      expect(
        mock.history.get.some(r => r.url?.match(/\/branches\/1\/products\/export/))
      ).toBe(true);
    });

    createElementSpy.mockRestore();
  });

  test('llama al endpoint de exportación XLSX al hacer click en "Excel (XLSX)"', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);
    mock.onGet(/\/branches\/1\/products\/export/).reply(200, new Blob(['xlsx']), {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    global.URL.createObjectURL = jest.fn(() => 'blob:fake');
    global.URL.revokeObjectURL = jest.fn();

    const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});

    await renderAndWait();
    await goToBranchDetail(0);
    await waitFor(() => screen.getByText('Coca Cola'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /exportar/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /excel/i }));
    });

    await waitFor(() => {
      const exportCalls = mock.history.get.filter(r => r.url?.match(/\/branches\/1\/products\/export/));
      expect(exportCalls.length).toBeGreaterThan(0);
      expect(exportCalls[0].params?.format).toBe('xlsx');
    });

    appendSpy.mockRestore();
  });
});

describe('BranchManagement – eliminación masiva de productos de sucursal', () => {
  test('confirmar eliminación llama a DELETE /branch-products/:id', async () => {
    mock.onGet(/\/branches\/1\/products$/).reply(200, [makeBranchProduct()]);
    mock.onDelete(/\/branch-products\/10/).reply(200, {});

    await renderAndWait();
    await goToBranchDetail(0);
    await waitFor(() => screen.getByText('Coca Cola'));

    // Seleccionar producto
    await act(async () => { fireEvent.click(screen.getAllByRole('checkbox')[1]); });

    // Abrir modal de eliminación
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /eliminar seleccionados/i }));
    });

    expect(screen.getByText(/estás por eliminar/i)).toBeInTheDocument();
    expect(screen.getByText('Sucursal Centro')).toBeInTheDocument();

    // Confirmar
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^eliminar$/i }));
    });

    await waitFor(() => {
      expect(mock.history.delete.some(r => r.url?.match(/\/branch-products\/10/))).toBe(true);
    });
  });
});
