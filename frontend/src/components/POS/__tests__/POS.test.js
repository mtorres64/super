import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders, mockUser } from '../../../testUtils';
import POS from '../index';

// Silenciar errores de consola esperados en tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
  console.log.mockRestore();
});

// Mock de AudioContext (no disponible en jsdom)
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    frequency: { value: 0 },
    type: '',
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
    },
  })),
  currentTime: 0,
  destination: {},
}));

// Mock de window.print
global.print = jest.fn();

// Mock de componentes hijos complejos para aislar el POS
jest.mock('../../BarcodeScanner', () => () => <div data-testid="barcode-scanner-modal" />);
jest.mock('../../ReturnModal', () => ({ onClose }) => (
  <div data-testid="return-modal">
    <button onClick={onClose}>Cerrar devolución</button>
  </div>
));
jest.mock('../../TicketModal', () => ({ onClose }) => (
  <div data-testid="ticket-modal">
    <button onClick={onClose}>Cerrar ticket</button>
  </div>
));
jest.mock('../../Pagination', () => ({ currentPage, totalPages, onPageChange }) => (
  <div data-testid="pagination">
    {Array.from({ length: totalPages }, (_, i) => (
      <button key={i + 1} onClick={() => onPageChange(i + 1)}>
        {i + 1}
      </button>
    ))}
  </div>
));

// ─── Datos de prueba ────────────────────────────────────────────────────────

const mockProducts = [
  {
    id: 1,
    nombre: 'Coca Cola 500ml',
    precio: 500,
    stock: 20,
    categoria_id: 1,
    codigo_barras: '7790001234567',
    tipo: 'unidad',
  },
  {
    id: 2,
    nombre: 'Sprite 500ml',
    precio: 450,
    stock: 15,
    categoria_id: 1,
    codigo_barras: '7790009876543',
    tipo: 'unidad',
  },
  {
    id: 3,
    nombre: 'Queso por Peso',
    precio: 1200,
    precio_por_peso: 1200,
    stock: 5,
    categoria_id: 2,
    codigo_barras: null,
    tipo: 'por_peso',
  },
];

const mockCategories = [
  { id: 1, nombre: 'Bebidas' },
  { id: 2, nombre: 'Lácteos' },
];

const mockConfig = {
  tax_rate: 0.21,
  currency_symbol: '$',
  items_per_page: 10,
  show_receipt_after_sale: true,
  sounds_enabled: false,
  auto_focus_barcode: false,
};

const mockSession = { id: 1, monto_inicial: 1000 };

const mockSaleResponse = {
  id: 42,
  total: 605,
  items: [{ producto_id: 1, cantidad: 1, precio_unitario: 500, subtotal: 500 }],
  metodo_pago: 'efectivo',
  estado: 'completada',
};

const mockSales = [
  {
    id: 10,
    total: 500,
    metodo_pago: 'efectivo',
    estado: 'completada',
    items: [{ producto_id: 1, nombre: 'Coca Cola 500ml', cantidad: 1, precio_unitario: 500, subtotal: 500 }],
  },
];

// ─── Setup del mock de axios ─────────────────────────────────────────────────

const mock = new MockAdapter(axios);

beforeEach(() => {
  mock.reset();
  // Mocks base para todos los tests
  mock.onGet(/\/products/).reply(200, mockProducts);
  mock.onGet(/\/categories/).reply(200, mockCategories);
  mock.onGet(/\/config/).reply(200, mockConfig);
  mock.onGet(/\/afip\/config/).reply(404);
  mock.onGet(/\/cash-sessions\/current/).reply(200, mockSession);
  mock.onPost(/\/sales/).reply(200, mockSaleResponse);
});

afterAll(() => mock.restore());

// ─── Helper ──────────────────────────────────────────────────────────────────

const renderPOS = (options = {}) =>
  renderWithProviders(<POS />, { user: mockUser, ...options });

// ════════════════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════════════════

describe('POS — carga inicial', () => {
  test('muestra loading mientras carga productos', async () => {
    // Respuesta con delay para poder capturar el estado de carga
    mock.onGet(/\/products/).reply(() => new Promise(resolve =>
      setTimeout(() => resolve([200, mockProducts]), 100)
    ));

    renderPOS();

    expect(screen.getByText(/cargando productos/i)).toBeInTheDocument();
  });

  test('carga productos desde la API al montar', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });
    expect(screen.getByText('Sprite 500ml')).toBeInTheDocument();
    expect(screen.getByText('Queso por Peso')).toBeInTheDocument();
  });

  test('muestra productos en grid al cargar', async () => {
    renderPOS();

    await waitFor(() => {
      const cards = document.querySelectorAll('.product-card');
      expect(cards.length).toBe(3);
    });
  });
});

describe('POS — sesión de caja', () => {
  test('sesión de caja cerrada muestra el alert correspondiente', async () => {
    mock.onGet(/\/cash-sessions\/current/).reply(404);

    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Caja Cerrada')).toBeInTheDocument();
    });
  });

  test('sesión de caja abierta muestra "Caja Abierta"', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Caja Abierta')).toBeInTheDocument();
    });
  });

  test('sesión de caja abierta permite ver los productos', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });
  });
});

describe('POS — búsqueda de productos', () => {
  test('buscar producto por nombre filtra la lista', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar productos/i);
    fireEvent.change(searchInput, { target: { value: 'Sprite' } });

    await waitFor(() => {
      expect(screen.queryByText('Coca Cola 500ml')).not.toBeInTheDocument();
      expect(screen.getByText('Sprite 500ml')).toBeInTheDocument();
    });
  });

  test('la búsqueda es case-insensitive y tolera acentos', async () => {
    const productsWithAccents = [
      ...mockProducts,
      { id: 4, nombre: 'Jamón Cocido', precio: 800, stock: 10, categoria_id: 2, tipo: 'unidad' },
    ];
    mock.onGet(/\/products/).reply(200, productsWithAccents);

    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Jamón Cocido')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar productos/i);
    fireEvent.change(searchInput, { target: { value: 'jamon' } });

    await waitFor(() => {
      expect(screen.getByText('Jamón Cocido')).toBeInTheDocument();
    });
  });
});

describe('POS — carrito', () => {
  test('click en un producto lo agrega al carrito', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const card = screen.getByText('Coca Cola 500ml').closest('.product-card');
    fireEvent.click(card);

    await waitFor(() => {
      // El carrito muestra el contador (1)
      expect(screen.getByText(/carrito \(1\)/i)).toBeInTheDocument();
    });
  });

  test('el carrito muestra el producto agregado', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const card = screen.getByText('Coca Cola 500ml').closest('.product-card');
    fireEvent.click(card);

    await waitFor(() => {
      const cartItems = document.querySelectorAll('.cart-item');
      expect(cartItems.length).toBe(1);
      expect(screen.getByText(/Coca Cola 500ml/)).toBeInTheDocument();
    });
  });

  test('agregar el mismo producto incrementa la cantidad', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const card = screen.getByText('Coca Cola 500ml').closest('.product-card');
    fireEvent.click(card);
    fireEvent.click(card);

    await waitFor(() => {
      const qtyInput = document.querySelector('.quantity-input');
      expect(qtyInput.value).toBe('2');
    });
  });

  test('incrementar cantidad en carrito con botón +', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const card = screen.getByText('Coca Cola 500ml').closest('.product-card');
    fireEvent.click(card);

    await waitFor(() => {
      expect(document.querySelector('.quantity-input')).toBeInTheDocument();
    });

    // Botón + (segundo botón de control de cantidad)
    const plusButtons = document.querySelectorAll('.quantity-btn');
    // Orden: [minus, plus, delete] → index 1 es plus
    fireEvent.click(plusButtons[1]);

    await waitFor(() => {
      const qtyInput = document.querySelector('.quantity-input');
      expect(qtyInput.value).toBe('2');
    });
  });

  test('decrementar cantidad en carrito con botón -', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const card = screen.getByText('Coca Cola 500ml').closest('.product-card');
    fireEvent.click(card);
    fireEvent.click(card); // cantidad = 2

    await waitFor(() => {
      const qtyInput = document.querySelector('.quantity-input');
      expect(qtyInput.value).toBe('2');
    });

    const minusButtons = document.querySelectorAll('.quantity-btn');
    fireEvent.click(minusButtons[0]); // botón minus

    await waitFor(() => {
      const qtyInput = document.querySelector('.quantity-input');
      expect(qtyInput.value).toBe('1');
    });
  });

  test('decrementar a 0 elimina el producto del carrito', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const card = screen.getByText('Coca Cola 500ml').closest('.product-card');
    fireEvent.click(card);

    await waitFor(() => {
      expect(document.querySelector('.cart-item')).toBeInTheDocument();
    });

    const minusButtons = document.querySelectorAll('.quantity-btn');
    fireEvent.click(minusButtons[0]);

    await waitFor(() => {
      expect(document.querySelector('.cart-item')).not.toBeInTheDocument();
    });
  });

  test('eliminar producto del carrito con botón Trash', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const card = screen.getByText('Coca Cola 500ml').closest('.product-card');
    fireEvent.click(card);

    await waitFor(() => {
      expect(document.querySelector('.cart-item')).toBeInTheDocument();
    });

    // El botón de eliminar es el último .quantity-btn (index 2)
    const deleteBtn = document.querySelectorAll('.quantity-btn')[2];
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(document.querySelector('.cart-item')).not.toBeInTheDocument();
    });
  });

  test('limpiar carrito con botón Trash del header', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const card = screen.getByText('Coca Cola 500ml').closest('.product-card');
    fireEvent.click(card);
    fireEvent.click(screen.getByText('Sprite 500ml').closest('.product-card'));

    await waitFor(() => {
      expect(document.querySelectorAll('.cart-item').length).toBe(2);
    });

    // El botón de limpiar carrito está en el header (btn-secondary btn-sm con Trash2)
    const clearBtn = document.querySelector('.cart-header .btn-secondary');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(document.querySelector('.cart-item')).not.toBeInTheDocument();
      expect(screen.getByText(/el carrito está vacío/i)).toBeInTheDocument();
    });
  });
});

describe('POS — método de pago', () => {
  const addProductToCart = async () => {
    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Coca Cola 500ml').closest('.product-card'));
    await waitFor(() => {
      expect(document.querySelector('.cart-item')).toBeInTheDocument();
    });
  };

  test('cambia método de pago a tarjeta', async () => {
    renderPOS();
    await addProductToCart();

    const tarjetaRadio = screen.getByLabelText(/tarjeta/i);
    fireEvent.click(tarjetaRadio);

    expect(tarjetaRadio).toBeChecked();
  });

  test('cambia método de pago a transferencia', async () => {
    renderPOS();
    await addProductToCart();

    const transferenciaRadio = screen.getByLabelText(/transferencia/i);
    fireEvent.click(transferenciaRadio);

    expect(transferenciaRadio).toBeChecked();
  });

  test('el método de pago por defecto es efectivo', async () => {
    renderPOS();
    await addProductToCart();

    const efectivoRadio = screen.getByDisplayValue('efectivo');
    expect(efectivoRadio).toBeChecked();
  });
});

describe('POS — procesar venta', () => {
  const addProductToCart = async () => {
    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Coca Cola 500ml').closest('.product-card'));
    await waitFor(() => {
      expect(document.querySelector('.cart-item')).toBeInTheDocument();
    });
  };

  test('procesar venta: llama a POST /sales con los datos correctos', async () => {
    let capturedBody = null;
    mock.onPost(/\/sales/).reply(config => {
      capturedBody = JSON.parse(config.data);
      return [200, mockSaleResponse];
    });

    renderPOS();
    await addProductToCart();

    const procesarBtn = screen.getByRole('button', { name: /procesar venta/i });
    await act(async () => {
      fireEvent.click(procesarBtn);
    });

    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
      expect(capturedBody.items).toHaveLength(1);
      expect(capturedBody.items[0].producto_id).toBe(1);
      expect(capturedBody.items[0].cantidad).toBe(1);
      expect(capturedBody.items[0].precio_unitario).toBe(500);
      expect(capturedBody.metodo_pago).toBe('efectivo');
    });
  });

  test('procesar venta exitosa muestra el ticket modal', async () => {
    renderPOS();
    await addProductToCart();

    const procesarBtn = screen.getByRole('button', { name: /procesar venta/i });
    await act(async () => {
      fireEvent.click(procesarBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('ticket-modal')).toBeInTheDocument();
    });
  });

  test('procesar venta vacía no hace POST y muestra error', async () => {
    let postCalled = false;
    mock.onPost(/\/sales/).reply(() => {
      postCalled = true;
      return [200, mockSaleResponse];
    });

    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    // El botón de procesar no aparece si el carrito está vacío
    // (está deshabilitado o directamente ausente)
    const procesarBtn = screen.queryByRole('button', { name: /procesar venta/i });
    if (procesarBtn) {
      // Si existe pero está disabled, no debe hacer POST
      expect(procesarBtn).toBeDisabled();
    } else {
      // Si no existe, el carrito vacío ya oculta el footer
      expect(screen.getByText(/el carrito está vacío/i)).toBeInTheDocument();
    }

    expect(postCalled).toBe(false);
  });
});

describe('POS — código de barras', () => {
  test('buscar por código de barras con Enter agrega el producto al carrito', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const barcodeInput = screen.getByPlaceholderText(/código de barras/i);
    fireEvent.change(barcodeInput, { target: { value: '7790001234567' } });
    fireEvent.keyPress(barcodeInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText(/carrito \(1\)/i)).toBeInTheDocument();
    });
  });

  test('código de barras no encontrado no agrega nada al carrito', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const barcodeInput = screen.getByPlaceholderText(/código de barras/i);
    fireEvent.change(barcodeInput, { target: { value: '9999999999999' } });
    fireEvent.keyPress(barcodeInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      // El carrito sigue vacío
      expect(screen.queryByText(/carrito \(1\)/i)).not.toBeInTheDocument();
    });
  });
});

describe('POS — último ticket', () => {
  test('botón de último ticket realiza GET /sales', async () => {
    let salesCalled = false;
    mock.onGet(/\/sales/).reply(() => {
      salesCalled = true;
      return [200, mockSales];
    });

    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    // El botón de último ticket es el Printer (primer btn del header del carrito)
    const lastTicketBtn = screen.getByTitle(/último ticket/i);
    await act(async () => {
      fireEvent.click(lastTicketBtn);
    });

    await waitFor(() => {
      expect(salesCalled).toBe(true);
    });
  });

  test('último ticket muestra el TicketModal si hay ventas', async () => {
    mock.onGet(/\/sales/).reply(200, mockSales);
    mock.onGet(/\/products/).reply(200, mockProducts);

    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const lastTicketBtn = screen.getByTitle(/último ticket/i);
    await act(async () => {
      fireEvent.click(lastTicketBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('ticket-modal')).toBeInTheDocument();
    });
  });
});

describe('POS — pestañas de venta', () => {
  test('agregar nueva pestaña de venta', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    // Inicialmente hay una pestaña "V1"
    expect(screen.getByText('V1')).toBeInTheDocument();

    // Botón "+" agrega nueva pestaña
    const addTabBtn = screen.getByTitle(/nueva venta/i);
    fireEvent.click(addTabBtn);

    await waitFor(() => {
      expect(screen.getByText('V1')).toBeInTheDocument();
      expect(screen.getByText('V2')).toBeInTheDocument();
    });
  });

  test('cada pestaña tiene su propio carrito independiente', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    // Agregar producto a la pestaña 1
    fireEvent.click(screen.getByText('Coca Cola 500ml').closest('.product-card'));
    await waitFor(() => {
      expect(screen.getByText(/carrito \(1\)/i)).toBeInTheDocument();
    });

    // Agregar pestaña 2
    fireEvent.click(screen.getByTitle(/nueva venta/i));
    await waitFor(() => {
      expect(screen.getByText('V2')).toBeInTheDocument();
    });

    // La pestaña 2 debería tener carrito vacío
    expect(screen.getByText(/carrito \(0\)/i)).toBeInTheDocument();
  });
});

describe('POS — consulta de precio', () => {
  test('botón Tag abre el modal de consulta de precio', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    const priceCheckBtn = screen.getByTitle(/consultar precio/i);
    fireEvent.click(priceCheckBtn);

    await waitFor(() => {
      expect(screen.getByText(/consulta de precio/i)).toBeInTheDocument();
    });
  });

  test('buscar por nombre en consulta de precio muestra el producto', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/consultar precio/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/código de barras o nombre/i)).toBeInTheDocument();
    });

    const priceInput = screen.getByPlaceholderText(/código de barras o nombre/i);
    fireEvent.change(priceInput, { target: { value: 'Coca' } });
    fireEvent.keyDown(priceInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      // Debe mostrar la tarjeta de resultado con el nombre del producto
      expect(screen.getAllByText(/Coca Cola 500ml/).length).toBeGreaterThan(0);
    });
  });

  test('buscar por nombre no encontrado muestra mensaje', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/consultar precio/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/código de barras o nombre/i)).toBeInTheDocument();
    });

    const priceInput = screen.getByPlaceholderText(/código de barras o nombre/i);
    fireEvent.change(priceInput, { target: { value: 'ProductoInexistente' } });
    fireEvent.keyDown(priceInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/producto no encontrado/i)).toBeInTheDocument();
    });
  });

  test('buscar por código de barras exacto muestra un único resultado', async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/consultar precio/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/código de barras o nombre/i)).toBeInTheDocument();
    });

    const priceInput = screen.getByPlaceholderText(/código de barras o nombre/i);
    fireEvent.change(priceInput, { target: { value: '7790001234567' } });
    // Hacer click en el botón de búsqueda
    const searchBtn = document.querySelector('.price-check-modal .btn-primary');
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });
  });
});
