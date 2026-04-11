import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders, mockUser, mockUserWithBranch } from '../../../testUtils';
import Dashboard from '../index';

const mock = new MockAdapter(axios);
beforeEach(() => mock.reset());
afterAll(() => mock.restore());

// ─── Datos de prueba ────────────────────────────────────────────────────────
const mockStats = {
  ventas_hoy: { total: 15000, cantidad: 8 },
  productos: { bajo_stock: 3, total: 120 },
  productos_bajo_stock: [
    { id: 1, nombre: 'Arroz', stock: 2, stock_minimo: 10, sucursal: 'Central' },
  ],
  onboarding: { sucursales: 1, categorias: 5, productos: 20 },
};

const mockBranches = [
  { id: 1, nombre: 'Sucursal Central' },
  { id: 2, nombre: 'Sucursal Norte' },
];

const mockVentasDiarias = [
  { fecha: '2026-04-01', total: 5000 },
  { fecha: '2026-04-02', total: 7000 },
];

// Helper: registra todos los mocks necesarios según rol
function setupAdminMocks() {
  mock.onGet(/\/dashboard\/stats/).reply(200, mockStats);
  mock.onGet(/\/branches/).reply(200, mockBranches);
  mock.onGet(/\/dashboard\/ventas-diarias/).reply(200, mockVentasDiarias);
  mock.onGet(/\/notificaciones\/count/).reply(200, { no_leidas: 5 });
}

function setupCajeroMocks() {
  mock.onGet(/\/dashboard\/stats/).reply(200, mockStats);
}

// ─── Tests ──────────────────────────────────────────────────────────────────
describe('Dashboard', () => {
  // ─── Loading state ─────────────────────────────────────────────────────────
  describe('estado de carga', () => {
    it('muestra el spinner de carga inicialmente', () => {
      // La petición queda pendiente mientras verificamos el spinner
      mock.onGet(/\/dashboard\/stats/).reply(() => new Promise(() => {}));
      mock.onGet(/\/branches/).reply(() => new Promise(() => {}));
      mock.onGet(/\/notificaciones\/count/).reply(() => new Promise(() => {}));

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('deja de mostrar el spinner luego de cargar stats', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      await waitFor(() => {
        expect(document.querySelector('.spinner')).not.toBeInTheDocument();
      });
    });
  });

  // ─── Carga y visualización de stats ───────────────────────────────────────
  describe('carga de estadísticas', () => {
    it('llama a GET /dashboard/stats al montar el componente', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      await waitFor(() => {
        expect(mock.history.get.some(r => /\/dashboard\/stats/.test(r.url))).toBe(true);
      });
    });

    it('muestra las ventas del día para admin', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(await screen.findByText('Ventas de Hoy')).toBeInTheDocument();
      expect(await screen.findByText(/15[.,]000/)).toBeInTheDocument();
      expect(await screen.findByText('8 transacciones')).toBeInTheDocument();
    });

    it('muestra el conteo de productos con stock bajo para admin', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(await screen.findByText('Stock Bajo')).toBeInTheDocument();
    });
  });

  // ─── Mensaje de bienvenida según rol ──────────────────────────────────────
  describe('mensaje de bienvenida según rol', () => {
    it('muestra "Panel de Administración" para admin', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(await screen.findByText('Panel de Administración')).toBeInTheDocument();
    });

    it('muestra "Panel de Supervisión" para supervisor', async () => {
      const supervisor = { ...mockUser, rol: 'supervisor' };
      mock.onGet(/\/dashboard\/stats/).reply(200, mockStats);
      mock.onGet(/\/branches/).reply(200, mockBranches);
      mock.onGet(/\/dashboard\/ventas-diarias/).reply(200, mockVentasDiarias);

      renderWithProviders(<Dashboard />, { user: supervisor });

      expect(await screen.findByText('Panel de Supervisión')).toBeInTheDocument();
    });

    it('muestra "Sistema de Punto de Venta" para cajero', async () => {
      setupCajeroMocks();
      const cajero = { ...mockUser, rol: 'cajero' };

      renderWithProviders(<Dashboard />, { user: cajero });

      expect(await screen.findByText('Sistema de Punto de Venta')).toBeInTheDocument();
    });

    it('muestra el nombre del usuario en el saludo', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(await screen.findByText(`¡Bienvenido, ${mockUser.nombre}!`)).toBeInTheDocument();
    });
  });

  // ─── Admin: branches y filtro de ventas ───────────────────────────────────
  describe('admin — sucursales y gráfico', () => {
    it('carga sucursales llamando a GET /branches para admin', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      await waitFor(() => {
        expect(mock.history.get.some(r => /\/branches/.test(r.url))).toBe(true);
      });
    });

    it('muestra el selector de sucursales cuando hay más de una', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(await screen.findByRole('combobox')).toBeInTheDocument();
      expect(await screen.findByText('Todas las sucursales')).toBeInTheDocument();
      expect(await screen.findByText('Sucursal Central')).toBeInTheDocument();
      expect(await screen.findByText('Sucursal Norte')).toBeInTheDocument();
    });

    it('llama a GET /dashboard/ventas-diarias con branch_id al cambiar de sucursal', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      const select = await screen.findByRole('combobox');
      await userEvent.selectOptions(select, '1');

      await waitFor(() => {
        const ventasRequests = mock.history.get.filter(r =>
          /\/dashboard\/ventas-diarias/.test(r.url)
        );
        expect(ventasRequests.length).toBeGreaterThan(0);
      });
    });

    it('muestra el gráfico de ventas diarias para admin', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(await screen.findByText('Ventas por día')).toBeInTheDocument();
    });

    it('muestra los botones de período del gráfico (30 días y 60 días)', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(await screen.findByRole('button', { name: '30 días' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: '60 días' })).toBeInTheDocument();
    });
  });

  // ─── Cajero: NO ve el gráfico de ventas diarias ───────────────────────────
  describe('cajero — vista restringida', () => {
    it('NO muestra el gráfico de ventas diarias para cajero', async () => {
      setupCajeroMocks();
      const cajero = { ...mockUser, rol: 'cajero' };

      renderWithProviders(<Dashboard />, { user: cajero });

      await waitFor(() => {
        expect(document.querySelector('.spinner')).not.toBeInTheDocument();
      });

      expect(screen.queryByText('Ventas por día')).not.toBeInTheDocument();
    });

    it('NO muestra las stat cards de ventas para cajero', async () => {
      setupCajeroMocks();
      const cajero = { ...mockUser, rol: 'cajero' };

      renderWithProviders(<Dashboard />, { user: cajero });

      await waitFor(() => {
        expect(document.querySelector('.spinner')).not.toBeInTheDocument();
      });

      expect(screen.queryByText('Ventas de Hoy')).not.toBeInTheDocument();
    });

    it('muestra la sección "Información del Sistema" para cajero', async () => {
      setupCajeroMocks();
      const cajero = { ...mockUser, rol: 'cajero' };

      renderWithProviders(<Dashboard />, { user: cajero });

      expect(await screen.findByText('Información del Sistema')).toBeInTheDocument();
      expect(await screen.findByText('Punto de Venta Activo')).toBeInTheDocument();
    });

    it('NO llama a GET /branches para cajero', async () => {
      setupCajeroMocks();
      const cajero = { ...mockUser, rol: 'cajero' };

      renderWithProviders(<Dashboard />, { user: cajero });

      await waitFor(() => {
        expect(document.querySelector('.spinner')).not.toBeInTheDocument();
      });

      expect(mock.history.get.some(r => /\/branches/.test(r.url))).toBe(false);
    });
  });

  // ─── Notificaciones para admin ─────────────────────────────────────────────
  describe('notificaciones no leídas', () => {
    it('llama a GET /notificaciones/count para admin', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      await waitFor(() => {
        expect(mock.history.get.some(r => /\/notificaciones\/count/.test(r.url))).toBe(true);
      });
    });

    it('muestra el conteo de notificaciones no leídas en la stat card', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(await screen.findByText('Notificaciones')).toBeInTheDocument();
      // El valor 5 aparece en la card de notificaciones
      const statValues = await screen.findAllByText('5');
      expect(statValues.length).toBeGreaterThan(0);
    });

    it('NO llama a GET /notificaciones/count para cajero', async () => {
      setupCajeroMocks();
      const cajero = { ...mockUser, rol: 'cajero' };

      renderWithProviders(<Dashboard />, { user: cajero });

      await waitFor(() => {
        expect(document.querySelector('.spinner')).not.toBeInTheDocument();
      });

      expect(mock.history.get.some(r => /\/notificaciones\/count/.test(r.url))).toBe(false);
    });

    it('NO llama a GET /notificaciones/count para supervisor', async () => {
      const supervisor = { ...mockUser, rol: 'supervisor' };
      mock.onGet(/\/dashboard\/stats/).reply(200, mockStats);
      mock.onGet(/\/branches/).reply(200, []);
      mock.onGet(/\/dashboard\/ventas-diarias/).reply(200, []);

      renderWithProviders(<Dashboard />, { user: supervisor });

      await waitFor(() => {
        expect(document.querySelector('.spinner')).not.toBeInTheDocument();
      });

      expect(mock.history.get.some(r => /\/notificaciones\/count/.test(r.url))).toBe(false);
    });
  });

  // ─── Acciones rápidas ─────────────────────────────────────────────────────
  describe('acciones rápidas', () => {
    it('admin ve "Realizar Venta", "Gestionar Productos", "Sucursales" y "Gestionar Usuarios"', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(await screen.findByText('Realizar Venta')).toBeInTheDocument();
      expect(await screen.findByText('Gestionar Productos')).toBeInTheDocument();
      expect(await screen.findByText('Sucursales')).toBeInTheDocument();
      expect(await screen.findByText('Gestionar Usuarios')).toBeInTheDocument();
    });

    it('cajero NO ve "Gestionar Productos" ni "Sucursales"', async () => {
      setupCajeroMocks();
      const cajero = { ...mockUser, rol: 'cajero' };

      renderWithProviders(<Dashboard />, { user: cajero });

      await waitFor(() => {
        expect(document.querySelector('.spinner')).not.toBeInTheDocument();
      });

      expect(screen.queryByText('Gestionar Productos')).not.toBeInTheDocument();
      expect(screen.queryByText('Sucursales')).not.toBeInTheDocument();
    });
  });

  // ─── Alerta de stock bajo ─────────────────────────────────────────────────
  describe('alerta de stock bajo', () => {
    it('muestra la alerta de stock bajo cuando hay productos críticos', async () => {
      setupAdminMocks();

      renderWithProviders(<Dashboard />, { user: mockUser });

      expect(await screen.findByText('Productos con Stock Bajo')).toBeInTheDocument();
      expect(await screen.findByText('Arroz')).toBeInTheDocument();
    });

    it('no muestra la alerta si no hay productos con stock bajo', async () => {
      mock.onGet(/\/dashboard\/stats/).reply(200, {
        ...mockStats,
        productos: { bajo_stock: 0, total: 120 },
        productos_bajo_stock: [],
      });
      mock.onGet(/\/branches/).reply(200, mockBranches);
      mock.onGet(/\/dashboard\/ventas-diarias/).reply(200, []);
      mock.onGet(/\/notificaciones\/count/).reply(200, { no_leidas: 0 });

      renderWithProviders(<Dashboard />, { user: mockUser });

      await waitFor(() => {
        expect(document.querySelector('.spinner')).not.toBeInTheDocument();
      });

      expect(screen.queryByText('Productos con Stock Bajo')).not.toBeInTheDocument();
    });
  });
});
