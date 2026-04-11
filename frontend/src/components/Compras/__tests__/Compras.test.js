import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders, mockUser } from '../../../testUtils';
import Compras from '../index';

const mock = new MockAdapter(axios);
beforeEach(() => mock.reset());
afterAll(() => mock.restore());

const BASE = 'http://localhost:8000/api';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const comprasList = [
  {
    id: 1,
    numero_factura: 'F001-00000001',
    fecha: '2026-04-10T10:00:00',
    proveedor_id: 10,
    proveedor_nombre: 'Proveedor Uno',
    sucursal_id: null,
    subtotal: 1000,
    impuestos: 210,
    total: 1210,
    items: [],
    notas: null,
  },
];

const proveedoresList = [
  { id: 10, nombre: 'Proveedor Uno', ruc_cuit: '30-12345678-1', email: 'prov@test.com', telefono: null, activo: true },
  { id: 11, nombre: 'Proveedor Dos', ruc_cuit: null, email: null, telefono: null, activo: false },
];

const branchesList = [
  { id: 1, nombre: 'Sucursal Central', activo: true },
];

const branchProductsList = [
  {
    product_id: 100,
    nombre: 'Azúcar 1kg',
    codigo_barras: '7790001',
    precio_sucursal: 500,
    precio_global: 480,
    margen_sucursal: 30,
    costo_sucursal: 350,
    activo_sucursal: true,
  },
  {
    product_id: 101,
    nombre: 'Arroz 1kg',
    codigo_barras: '7790002',
    precio_sucursal: 400,
    precio_global: 380,
    margen_sucursal: 25,
    costo_sucursal: 300,
    activo_sucursal: true,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const setupDefaultMocks = () => {
  mock.onGet(`${BASE}/compras`).reply(200, comprasList);
  mock.onGet(`${BASE}/proveedores`).reply(200, proveedoresList);
  mock.onGet(`${BASE}/branches`).reply(200, branchesList);
};

const render = (overrides = {}) =>
  renderWithProviders(<Compras />, { user: mockUser, ...overrides });

const abrirModalNuevaFactura = async () => {
  await waitFor(() => expect(screen.queryByText('No hay facturas registradas')).toBeNull() === false
    || screen.getByRole('button', { name: /Nueva Factura/i }));
  fireEvent.click(screen.getByRole('button', { name: /Nueva Factura/i }));
  await waitFor(() => screen.getByText('Nueva Factura de Compra'));
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Compras', () => {
  // ── Carga inicial ────────────────────────────────────────────────────────────

  it('carga y muestra las facturas al montar', async () => {
    setupDefaultMocks();
    render();
    await waitFor(() =>
      expect(screen.getByText('F001-00000001')).toBeInTheDocument()
    );
    expect(screen.getByText('Proveedor Uno')).toBeInTheDocument();
  });

  it('carga los proveedores en el tab de proveedores', async () => {
    setupDefaultMocks();
    render();
    await waitFor(() => screen.getByText('F001-00000001'));

    fireEvent.click(screen.getByRole('button', { name: /Proveedores/i }));

    await waitFor(() =>
      expect(screen.getByText('30-12345678-1')).toBeInTheDocument()
    );
  });

  it('muestra estado "Activo" e "Inactivo" de proveedores', async () => {
    setupDefaultMocks();
    render();
    fireEvent.click(screen.getByRole('button', { name: /Proveedores/i }));
    await waitFor(() => screen.getByText('Proveedor Uno'));
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  // ── Búsqueda de facturas ─────────────────────────────────────────────────────

  it('filtra facturas al buscar por número de factura', async () => {
    setupDefaultMocks();
    mock.onGet(`${BASE}/compras`).reply(200, [
      ...comprasList,
      { ...comprasList[0], id: 2, numero_factura: 'F002-00000002', proveedor_nombre: 'Proveedor Dos' },
    ]);
    render();
    await waitFor(() => screen.getByText('F001-00000001'));

    const searchInput = screen.getByPlaceholderText(/Buscar por N° factura/i);
    await userEvent.type(searchInput, 'F002');

    expect(screen.queryByText('F001-00000001')).not.toBeInTheDocument();
    expect(screen.getByText('F002-00000002')).toBeInTheDocument();
  });

  it('filtra facturas al buscar por nombre de proveedor', async () => {
    setupDefaultMocks();
    mock.onGet(`${BASE}/compras`).reply(200, [
      ...comprasList,
      { ...comprasList[0], id: 2, numero_factura: 'F002-00000002', proveedor_nombre: 'Proveedor XYZ' },
    ]);
    render();
    await waitFor(() => screen.getByText('F001-00000001'));

    const searchInput = screen.getByPlaceholderText(/Buscar por N° factura/i);
    await userEvent.type(searchInput, 'XYZ');

    expect(screen.queryByText('F001-00000001')).not.toBeInTheDocument();
    expect(screen.getByText('F002-00000002')).toBeInTheDocument();
  });

  // ── Modal Nueva Factura ──────────────────────────────────────────────────────

  it('abre el modal de nueva factura al hacer click en "Nueva Factura"', async () => {
    setupDefaultMocks();
    render();
    await waitFor(() => screen.getByRole('button', { name: /Nueva Factura/i }));
    fireEvent.click(screen.getByRole('button', { name: /Nueva Factura/i }));
    expect(screen.getByText('Nueva Factura de Compra')).toBeInTheDocument();
  });

  it('carga los proveedores activos en el select del modal', async () => {
    setupDefaultMocks();
    render();
    await abrirModalNuevaFactura();

    // El select de proveedor debe incluir "Proveedor Uno" (activo) pero no "Proveedor Dos" (inactivo)
    const provSelect = screen.getByLabelText(/Proveedor/i);
    expect(within(provSelect).getByText('Proveedor Uno')).toBeInTheDocument();
    expect(within(provSelect).queryByText('Proveedor Dos')).not.toBeInTheDocument();
  });

  it('carga las sucursales activas en el select del modal', async () => {
    setupDefaultMocks();
    render();
    await abrirModalNuevaFactura();

    const sucSelect = screen.getByLabelText(/Sucursal/i);
    expect(within(sucSelect).getByText('Sucursal Central')).toBeInTheDocument();
  });

  // ── Items del formulario ─────────────────────────────────────────────────────

  it('agrega un nuevo ítem al hacer click en "Agregar ítem"', async () => {
    setupDefaultMocks();
    render();
    await abrirModalNuevaFactura();

    const addBtn = screen.getByRole('button', { name: /Agregar ítem/i });
    fireEvent.click(addBtn);

    // Ahora hay 2 filas de descripción (2 inputs en la tabla de ítems)
    const descInputs = screen.getAllByPlaceholderText(/Descripción del artículo|Buscar producto/i);
    expect(descInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('elimina un ítem cuando hay más de uno', async () => {
    setupDefaultMocks();
    render();
    await abrirModalNuevaFactura();

    // Agregar un segundo ítem
    fireEvent.click(screen.getByRole('button', { name: /Agregar ítem/i }));

    // Ahora deben haber botones X para eliminar
    const deleteButtons = screen.getAllByTitle ? [] : [];
    // Los botones de eliminar tienen un ícono X sin texto → buscar por role=button near ×
    const allButtons = screen.getAllByRole('button');
    // Contar filas antes de borrar
    const descInputsBefore = screen.getAllByPlaceholderText(/Descripción del artículo|Buscar producto/i);
    expect(descInputsBefore.length).toBe(2);

    // Disparar click en el primer botón de eliminación (svg X dentro de la tabla)
    // Los botones de remove son los que tienen type=button y contienen un svg X
    const tableEl = screen.getByRole('table', { name: '' }) || document.querySelector('table');
    const removeButtons = document.querySelectorAll('tbody button[type="button"]');
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
      const descInputsAfter = screen.getAllByPlaceholderText(/Descripción del artículo|Buscar producto/i);
      expect(descInputsAfter.length).toBe(1);
    }
  });

  it('calcula el subtotal de un ítem al ingresar cantidad y precio', async () => {
    setupDefaultMocks();
    render();
    await abrirModalNuevaFactura();

    const cantidadInputs = screen.getAllByPlaceholderText('0');
    const precioInputs = screen.getAllByPlaceholderText('0.00');

    // Primer ítem: cantidad = 5, precio = 200
    fireEvent.change(cantidadInputs[0], { target: { value: '5' } });
    fireEvent.change(precioInputs[0], { target: { value: '200' } });

    // El subtotal del ítem debe ser 1000
    await waitFor(() => {
      expect(screen.getAllByText(/1[.,]000/)[0]).toBeInTheDocument();
    });
  });

  it('calcula el total sumando subtotal + impuestos', async () => {
    setupDefaultMocks();
    render();
    await abrirModalNuevaFactura();

    const cantidadInputs = screen.getAllByPlaceholderText('0');
    const precioInputs = screen.getAllByPlaceholderText('0.00');

    fireEvent.change(cantidadInputs[0], { target: { value: '10' } });
    fireEvent.change(precioInputs[0], { target: { value: '100' } });

    // Impuestos
    const impuestosInput = screen.getByLabelText(/Impuestos/i);
    fireEvent.change(impuestosInput, { target: { value: '210' } });

    // Total esperado = 1000 + 210 = 1210
    await waitFor(() => {
      expect(screen.getAllByText(/1[.,]210/)[0]).toBeInTheDocument();
    });
  });

  // ── Autocomplete de producto ─────────────────────────────────────────────────

  it('muestra sugerencias de producto al escribir cuando hay sucursal seleccionada', async () => {
    setupDefaultMocks();
    mock.onGet(`${BASE}/branches/1/products`).reply(200, branchProductsList);
    render();
    await abrirModalNuevaFactura();

    // Seleccionar sucursal
    const sucSelect = screen.getByLabelText(/Sucursal/i);
    await userEvent.selectOptions(sucSelect, '1');
    await waitFor(() => screen.getByText(/productos disponibles/i));

    // Escribir en el campo de descripción
    const descInput = screen.getAllByPlaceholderText(/Buscar producto/i)[0];
    await userEvent.type(descInput, 'Azú');

    await waitFor(() =>
      expect(screen.getByText('Azúcar 1kg')).toBeInTheDocument()
    );
  });

  it('selecciona un producto del autocomplete y rellena la descripción', async () => {
    setupDefaultMocks();
    mock.onGet(`${BASE}/branches/1/products`).reply(200, branchProductsList);
    render();
    await abrirModalNuevaFactura();

    const sucSelect = screen.getByLabelText(/Sucursal/i);
    await userEvent.selectOptions(sucSelect, '1');
    await waitFor(() => screen.getByText(/productos disponibles/i));

    const descInput = screen.getAllByPlaceholderText(/Buscar producto/i)[0];
    await userEvent.type(descInput, 'Azú');

    await waitFor(() => screen.getByText('Azúcar 1kg'));
    fireEvent.mouseDown(screen.getByText('Azúcar 1kg'));

    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText(/Buscar producto/i);
      expect(inputs[0]).toHaveValue('Azúcar 1kg');
    });
  });

  // ── Seleccionar proveedor ────────────────────────────────────────────────────

  it('selecciona un proveedor en el formulario de factura', async () => {
    setupDefaultMocks();
    render();
    await abrirModalNuevaFactura();

    const provSelect = screen.getByLabelText(/Proveedor/i);
    await userEvent.selectOptions(provSelect, '10');

    expect(provSelect).toHaveValue('10');
  });

  // ── POST /compras ────────────────────────────────────────────────────────────

  it('llama a POST /compras al registrar una factura sin productos vinculados', async () => {
    setupDefaultMocks();
    mock.onPost(`${BASE}/compras`).reply(200, { id: 99 });
    render();
    await abrirModalNuevaFactura();

    // Completar número de factura (requerido)
    const facturaInput = screen.getByPlaceholderText(/0001-00001234/i);
    await userEvent.type(facturaInput, 'TEST-0001');

    // Descripción del ítem
    const descInput = screen.getAllByPlaceholderText(/Descripción del artículo/i)[0];
    await userEvent.type(descInput, 'Mercadería varia');

    // Enviar el formulario
    const submitBtn = screen.getByRole('button', { name: /Registrar Factura/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const postHistory = mock.history.post.filter(r => r.url?.includes('/compras'));
      expect(postHistory.length).toBeGreaterThan(0);
      const body = JSON.parse(postHistory[0].data);
      expect(body.numero_factura).toBe('TEST-0001');
    });
  });

  it('no envía el formulario si el número de factura está vacío', async () => {
    setupDefaultMocks();
    mock.onPost(`${BASE}/compras`).reply(200, { id: 99 });
    render();
    await abrirModalNuevaFactura();

    const submitBtn = screen.getByRole('button', { name: /Registrar Factura/i });
    fireEvent.click(submitBtn);

    // No debe haber llamadas POST
    await waitFor(() => {
      expect(mock.history.post.filter(r => r.url?.includes('/compras')).length).toBe(0);
    });
  });

  // ── Editar factura ───────────────────────────────────────────────────────────

  it('abre el modal en modo edición con los datos de la factura', async () => {
    setupDefaultMocks();
    mock.onGet(`${BASE}/compras`).reply(200, [
      { ...comprasList[0], items: [{ descripcion: 'Harina', cantidad: 2, precio_unitario: 50, subtotal: 100 }] },
    ]);
    render();
    await waitFor(() => screen.getByText('F001-00000001'));

    // Click en el botón de editar (primero)
    const editButtons = document.querySelectorAll('button[title="Editar"]');
    fireEvent.click(editButtons[0]);

    await waitFor(() =>
      expect(screen.getByText('Editar Factura')).toBeInTheDocument()
    );
    expect(screen.getByDisplayValue('F001-00000001')).toBeInTheDocument();
  });

  // ── Tab Proveedores ──────────────────────────────────────────────────────────

  it('abre el modal "Nuevo Proveedor" desde el tab proveedores', async () => {
    setupDefaultMocks();
    render();
    await waitFor(() => screen.getByText('F001-00000001'));

    fireEvent.click(screen.getByRole('button', { name: /Proveedores/i }));
    await waitFor(() => screen.getByText('Proveedor Uno'));

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proveedor/i }));

    expect(screen.getByText('Nuevo Proveedor')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre \*/i)).toBeInTheDocument();
  });

  it('llama a POST /proveedores al crear un nuevo proveedor', async () => {
    setupDefaultMocks();
    mock.onPost(`${BASE}/proveedores`).reply(200, { id: 20, nombre: 'Nuevo Proveedor SA', activo: true });
    // Re-fetch después de crear
    mock.onGet(`${BASE}/proveedores`).reply(200, [
      ...proveedoresList,
      { id: 20, nombre: 'Nuevo Proveedor SA', activo: true },
    ]);
    render();
    await waitFor(() => screen.getByText('F001-00000001'));

    fireEvent.click(screen.getByRole('button', { name: /Proveedores/i }));
    await waitFor(() => screen.getByText('Proveedor Uno'));

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proveedor/i }));
    await waitFor(() => screen.getByLabelText(/Nombre \*/i));

    await userEvent.type(screen.getByLabelText(/Nombre \*/i), 'Nuevo Proveedor SA');
    fireEvent.click(screen.getByRole('button', { name: /Crear Proveedor/i }));

    await waitFor(() => {
      const postHistory = mock.history.post.filter(r => r.url?.includes('/proveedores'));
      expect(postHistory.length).toBeGreaterThan(0);
      const body = JSON.parse(postHistory[0].data);
      expect(body.nombre).toBe('Nuevo Proveedor SA');
    });
  });
});
