import { screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders } from '../../../testUtils';
import ProductManagement from '../index';

// Suppress sonner toasts in tests
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Disable modal close animation delay so useModalClose fires synchronously
beforeAll(() => {
  document.body.classList.add('no-animations');
});

const mock = new MockAdapter(axios);

beforeEach(() => {
  mock.reset();
  mock.onGet(/\/config/).reply(200, { items_per_page: 10 });
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

const makeProduct = (overrides = {}) => ({
  id: 1,
  nombre: 'Coca Cola',
  codigo_barras: '7790001',
  tipo: 'codigo_barras',
  kind: 'normal',
  precio: 150,
  precio_por_peso: null,
  categoria_id: 1,
  stock: 20,
  stock_minimo: 5,
  control_stock: true,
  activo: true,
  combo_items: [],
  ...overrides,
});

const products = [
  makeProduct(),
  makeProduct({
    id: 2,
    nombre: 'Leche Entera',
    codigo_barras: '7790002',
    categoria_id: 2,
    stock: 3,
    stock_minimo: 10,
  }),
];

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Mounts ProductManagement and waits for the initial data load to finish.
 * Accepts an optional `prods` list to override the default product fixture.
 */
async function renderAndWait(prods = products) {
  mock.onGet(/\/products/).reply(200, prods);
  await act(async () => {
    renderWithProviders(<ProductManagement />);
  });
  // Wait for loading spinner to disappear (products are shown)
  await waitFor(() => expect(screen.queryByText('Gestión de Productos')).toBeInTheDocument());
}

/** Returns the modal container (the first .modal-content in the DOM). */
const getModal = () => document.querySelector('.modal-content');

/** Clicks a button whose accessible name matches the given regex/string. */
async function clickBtn(name) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('ProductManagement – carga inicial', () => {
  test('muestra el título y la lista de productos', async () => {
    await renderAndWait();

    expect(screen.getByText('Gestión de Productos')).toBeInTheDocument();
    expect(screen.getByText('Coca Cola')).toBeInTheDocument();
    expect(screen.getByText('Leche Entera')).toBeInTheDocument();
    expect(screen.getByText('2 productos registrados')).toBeInTheDocument();
  });

  test('muestra la categoría de cada producto', async () => {
    await renderAndWait();

    expect(screen.getAllByText('Bebidas').length).toBeGreaterThan(0);
    expect(screen.getByText('Lácteos')).toBeInTheDocument();
  });
});

describe('ProductManagement – búsqueda', () => {
  test('filtra productos al escribir en el buscador', async () => {
    await renderAndWait();

    const input = screen.getByPlaceholderText('Buscar productos...');
    await act(async () => { await userEvent.type(input, 'Coca'); });

    expect(screen.getByText('Coca Cola')).toBeInTheDocument();
    expect(screen.queryByText('Leche Entera')).not.toBeInTheDocument();
  });

  test('filtra por código de barras', async () => {
    await renderAndWait();

    const input = screen.getByPlaceholderText('Buscar productos...');
    await act(async () => { await userEvent.type(input, '7790002'); });

    expect(screen.getByText('Leche Entera')).toBeInTheDocument();
    expect(screen.queryByText('Coca Cola')).not.toBeInTheDocument();
  });

  test('muestra todos los productos al borrar la búsqueda', async () => {
    await renderAndWait();

    const input = screen.getByPlaceholderText('Buscar productos...');
    await act(async () => { await userEvent.type(input, 'Coca'); });
    await act(async () => { await userEvent.clear(input); });

    expect(screen.getByText('Coca Cola')).toBeInTheDocument();
    expect(screen.getByText('Leche Entera')).toBeInTheDocument();
  });
});

describe('ProductManagement – modal nuevo producto', () => {
  test('abre el modal al hacer click en "Nuevo Producto"', async () => {
    await renderAndWait();

    await clickBtn(/nuevo producto/i);

    const modal = getModal();
    expect(within(modal).getByText('Nuevo Producto')).toBeInTheDocument();
    // El formulario tiene un input de texto visible (nombre)
    const textInputs = within(modal).getAllByRole('textbox');
    expect(textInputs.length).toBeGreaterThan(0);
  });

  test('crea un producto llamando a POST /products', async () => {
    mock.onPost(/\/products/).reply(201, {});
    // fetchProducts se llama de nuevo tras crear
    mock.onGet(/\/products/).reply(200, products);

    await renderAndWait();

    // Abrir modal de nuevo producto
    await clickBtn(/nuevo producto/i);

    const modal = getModal();

    // Nombre del producto (primer textbox)
    const [nombreInput] = within(modal).getAllByRole('textbox');
    await act(async () => { await userEvent.type(nombreInput, 'Nuevo Prod'); });

    // Selects: Clase, Modo precio, Categoría
    const selects = within(modal).getAllByRole('combobox');
    // selects[2] es Categoría
    await act(async () => {
      fireEvent.change(selects[2], { target: { value: '1' } });
    });

    // Spinbuttons: Precio Unitario, Precio por Kg, Stock Actual, Stock Mínimo
    const spinbuttons = within(modal).getAllByRole('spinbutton');
    await act(async () => {
      fireEvent.change(spinbuttons[0], { target: { value: '100' } }); // precio
      fireEvent.change(spinbuttons[2], { target: { value: '50' } });  // stock actual
      fireEvent.change(spinbuttons[3], { target: { value: '5' } });   // stock mínimo
    });

    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /crear producto/i }));
    });

    await waitFor(() => {
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toMatch(/\/products/);
    });

    const body = JSON.parse(mock.history.post[0].data);
    expect(body.nombre).toBe('Nuevo Prod');
    expect(body.precio).toBe(100);
  });
});

describe('ProductManagement – edición', () => {
  test('abre el modal con datos precargados al hacer click en editar', async () => {
    await renderAndWait();

    // El ícono Edit de Lucide genera el svg con clase "lucide-edit"
    const editBtn = document.querySelector('button svg.lucide-edit')?.closest('button');
    await act(async () => { fireEvent.click(editBtn); });

    const modal = getModal();
    expect(within(modal).getByText('Editar Producto')).toBeInTheDocument();

    // El primer textbox debe tener el nombre del primer producto precargado
    const [nombreInput] = within(modal).getAllByRole('textbox');
    expect(nombreInput).toHaveValue('Coca Cola');
  });

  test('llama a PUT /products/:id al guardar edición', async () => {
    mock.onPut(/\/products\/1/).reply(200, {});
    mock.onGet(/\/products/).reply(200, products);

    await renderAndWait();

    const editBtn = document.querySelector('button svg.lucide-edit')?.closest('button');
    await act(async () => { fireEvent.click(editBtn); });

    const modal = getModal();
    const [nombreInput] = within(modal).getAllByRole('textbox');

    await act(async () => {
      await userEvent.clear(nombreInput);
      await userEvent.type(nombreInput, 'Coca Cola Editada');
    });

    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /actualizar producto/i }));
    });

    await waitFor(() => {
      expect(mock.history.put.length).toBe(1);
      expect(mock.history.put[0].url).toMatch(/\/products\/1/);
    });

    const body = JSON.parse(mock.history.put[0].data);
    expect(body.nombre).toBe('Coca Cola Editada');
  });
});

describe('ProductManagement – eliminación masiva', () => {
  test('seleccionar un producto muestra la barra de acciones masivas', async () => {
    await renderAndWait();

    // checkboxes[0] = select all, checkboxes[1] = primer producto
    const checkboxes = screen.getAllByRole('checkbox');
    await act(async () => { fireEvent.click(checkboxes[1]); });

    expect(screen.getByText('1 seleccionado(s)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar seleccionados/i })).toBeInTheDocument();
  });

  test('seleccionar todo con el checkbox de cabecera selecciona todos los de la página', async () => {
    await renderAndWait();

    await act(async () => { fireEvent.click(screen.getAllByRole('checkbox')[0]); });

    expect(screen.getByText('2 seleccionado(s)')).toBeInTheDocument();
  });

  test('llama a DELETE /products/:id por cada producto seleccionado', async () => {
    mock.onDelete(/\/products\/1/).reply(200, {});
    mock.onDelete(/\/products\/2/).reply(200, {});
    mock.onGet(/\/products/).reply(200, []);

    await renderAndWait();

    const checkboxes = screen.getAllByRole('checkbox');
    await act(async () => {
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);
    });

    await clickBtn(/eliminar seleccionados/i);

    // Modal de confirmación
    expect(screen.getByText(/estás por eliminar/i)).toBeInTheDocument();

    // Confirmar eliminación
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^eliminar$/i }));
    });

    await waitFor(() => {
      expect(mock.history.delete.length).toBe(2);
    });
  });
});

describe('ProductManagement – importar CSV', () => {
  test('abre el modal de importación', async () => {
    await renderAndWait();

    await clickBtn(/^importar$/i);

    expect(screen.getByText('Importar Productos')).toBeInTheDocument();
    // Hay un input type="file"
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  test('llama a POST /products/import con el archivo y muestra el resultado', async () => {
    mock.onPost(/\/products\/import/).reply(200, {
      created: 3,
      updated: 1,
      errors: [],
      new_categories: [],
    });
    mock.onGet(/\/products/).reply(200, products);

    await renderAndWait();

    await clickBtn(/^importar$/i);

    const file = new File(['nombre,precio\nProd A,100'], 'productos.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Dentro del modal, el botón de submit también dice "Importar"
    const modal = getModal();
    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /^importar$/i }));
    });

    await waitFor(() => {
      expect(mock.history.post.some(r => r.url?.match(/\/products\/import/))).toBe(true);
    });

    // Resultado: muestra "3" como creados
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByText('Creados')).toBeInTheDocument();
  });
});

describe('ProductManagement – paginación', () => {
  test('pagina correctamente cuando hay más productos que itemsPerPage', async () => {
    const manyProducts = Array.from({ length: 12 }, (_, i) =>
      makeProduct({ id: i + 1, nombre: `Producto ${i + 1}`, codigo_barras: `000${i}` })
    );

    await renderAndWait(manyProducts);

    // Página 1: productos 1-10
    expect(screen.getByText('Producto 1')).toBeInTheDocument();
    expect(screen.queryByText('Producto 11')).not.toBeInTheDocument();

    // Navegar a página 2
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '2' }));
    });

    expect(screen.getByText('Producto 11')).toBeInTheDocument();
    expect(screen.getByText('Producto 12')).toBeInTheDocument();
    expect(screen.queryByText('Producto 1')).not.toBeInTheDocument();
  });

  test('la búsqueda reinicia a la primera página', async () => {
    const manyProducts = Array.from({ length: 12 }, (_, i) =>
      makeProduct({ id: i + 1, nombre: `Producto ${i + 1}`, codigo_barras: `000${i}` })
    );

    await renderAndWait(manyProducts);

    // Ir a página 2
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '2' }));
    });
    expect(screen.getByText('Producto 11')).toBeInTheDocument();

    // Buscar algo → vuelve a página 1
    const input = screen.getByPlaceholderText('Buscar productos...');
    await act(async () => { await userEvent.type(input, 'Producto 1'); });

    // Producto 1 vuelve a ser visible (al menos como substring)
    expect(screen.getByText('Producto 1')).toBeInTheDocument();
    // Producto 11 sigue visible si matchea, pero Producto 5 no debe estar
    expect(screen.queryByText('Producto 5')).not.toBeInTheDocument();
  });
});

describe('ProductManagement – combo/compuesto', () => {
  test('seleccionar "Combo" muestra la sección de items del combo', async () => {
    await renderAndWait();

    await clickBtn(/nuevo producto/i);

    const modal = getModal();
    const selects = within(modal).getAllByRole('combobox');
    // selects[0] es "Clase"
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: 'combo' } });
    });

    expect(within(modal).getByText('Productos del combo')).toBeInTheDocument();
    expect(within(modal).getByPlaceholderText('Buscar producto...')).toBeInTheDocument();
  });

  test('agrega un item al combo desde el buscador interno', async () => {
    const prods = [
      makeProduct({ id: 1, nombre: 'Coca Cola', kind: 'normal' }),
      makeProduct({ id: 2, nombre: 'Sprite', kind: 'normal' }),
    ];
    mock.onGet(/\/products/).reply(200, prods);

    await act(async () => { renderWithProviders(<ProductManagement />); });
    await waitFor(() => screen.getByText('Coca Cola'));

    await clickBtn(/nuevo producto/i);

    const modal = getModal();
    const selects = within(modal).getAllByRole('combobox');
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: 'combo' } });
    });

    // Escribir en el buscador del combo
    const comboSearchInput = within(modal).getByPlaceholderText('Buscar producto...');
    await act(async () => { await userEvent.type(comboSearchInput, 'Sprite'); });

    // El dropdown aparece
    await waitFor(() => {
      const dropdown = modal.querySelector('.absolute.z-20');
      expect(dropdown).toBeInTheDocument();
      expect(within(dropdown).getByText('Sprite')).toBeInTheDocument();
    });

    // Seleccionar Sprite del dropdown
    await act(async () => {
      const dropdown = modal.querySelector('.absolute.z-20');
      fireEvent.mouseDown(within(dropdown).getByText('Sprite'));
    });

    // Hacer click en Agregar
    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /agregar/i }));
    });

    // Sprite debe aparecer en la tabla de items del combo
    await waitFor(() => {
      const rows = modal.querySelectorAll('tbody tr');
      const texts = Array.from(rows).map(r => r.textContent);
      expect(texts.some(t => t.includes('Sprite'))).toBe(true);
    });
  });

  test('elimina un item del combo al hacer click en el botón X', async () => {
    const prods = [
      makeProduct({ id: 1, nombre: 'Coca Cola', kind: 'normal' }),
      makeProduct({ id: 2, nombre: 'Sprite', kind: 'normal' }),
    ];
    mock.onGet(/\/products/).reply(200, prods);

    await act(async () => { renderWithProviders(<ProductManagement />); });
    await waitFor(() => screen.getByText('Coca Cola'));

    await clickBtn(/nuevo producto/i);

    const modal = getModal();
    const selects = within(modal).getAllByRole('combobox');
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: 'combo' } });
    });

    // Agregar Sprite
    const comboSearchInput = within(modal).getByPlaceholderText('Buscar producto...');
    await act(async () => { await userEvent.type(comboSearchInput, 'Sprite'); });

    await waitFor(() => {
      const dropdown = modal.querySelector('.absolute.z-20');
      expect(within(dropdown).getByText('Sprite')).toBeInTheDocument();
    });
    await act(async () => {
      const dropdown = modal.querySelector('.absolute.z-20');
      fireEvent.mouseDown(within(dropdown).getByText('Sprite'));
    });
    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: /agregar/i }));
    });

    await waitFor(() => {
      const rows = modal.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    // Eliminar usando el botón X de la fila
    const removeBtn = modal.querySelector('tbody button');
    await act(async () => { fireEvent.click(removeBtn); });

    await waitFor(() => {
      const rows = modal.querySelectorAll('tbody tr');
      expect(rows.length).toBe(0);
    });
  });
});
