import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders, mockUser } from '../../../testUtils';
import CashManager from '../index';

const mock = new MockAdapter(axios);
beforeEach(() => mock.reset());
afterAll(() => mock.restore());

// La URL base que construye el componente
const BASE = 'http://localhost:8000/api';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sessionActiva = {
  id: 42,
  fecha_apertura: '2026-04-10T08:00:00',
  monto_inicial: 1000,
  monto_ventas: 2500,
  monto_retiros: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const render = (overrides = {}) =>
  renderWithProviders(<CashManager />, { user: mockUser, ...overrides });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CashManager', () => {
  // ── Carga inicial ────────────────────────────────────────────────────────────

  it('muestra spinner mientras carga la sesión', () => {
    // El mock nunca resuelve → el componente queda en loading
    mock.onGet(`${BASE}/cash-sessions/current`).reply(() => new Promise(() => {}));
    render();
    // El spinner existe; en el diseño el componente devuelve un div con clase "spinner"
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('muestra "Caja Cerrada" cuando la API retorna 404', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(404);
    render();
    await waitFor(() =>
      expect(screen.getByText('Caja Cerrada')).toBeInTheDocument()
    );
  });

  it('muestra "Caja Abierta" cuando hay una sesión activa', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(200, sessionActiva);
    render();
    await waitFor(() =>
      expect(screen.getByText('Caja Abierta')).toBeInTheDocument()
    );
  });

  it('muestra los datos de la sesión activa en pantalla', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(200, sessionActiva);
    render();
    await waitFor(() =>
      expect(screen.getByText('Caja Abierta')).toBeInTheDocument()
    );
    // Monto inicial formateado como "$1.000,00" o similar dependiendo de formatAmount
    expect(screen.getByText(/1[.,]000/)).toBeInTheDocument();
    // Ventas del día
    expect(screen.getByText(/2[.,]500/)).toBeInTheDocument();
  });

  it('muestra el nombre del cajero', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(404);
    render();
    await waitFor(() =>
      expect(screen.getByText(/Test User/)).toBeInTheDocument()
    );
  });

  // ── Modal abrir caja ─────────────────────────────────────────────────────────

  it('abre el modal "Abrir Caja" al hacer click en el botón', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(404);
    render();
    await waitFor(() => screen.getByText('Caja Cerrada'));

    fireEvent.click(screen.getByRole('button', { name: /Abrir Caja/i }));

    expect(screen.getByText('Monto Inicial *')).toBeInTheDocument();
  });

  it('el botón "Abrir Caja" del modal está deshabilitado si el monto está vacío', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(404);
    render();
    await waitFor(() => screen.getByText('Caja Cerrada'));

    fireEvent.click(screen.getByRole('button', { name: /Abrir Caja/i }));

    // Dentro del modal hay también un botón "Abrir Caja"
    const modalButtons = screen.getAllByRole('button', { name: /Abrir Caja/i });
    const modalBtn = modalButtons[modalButtons.length - 1];
    expect(modalBtn).toBeDisabled();
  });

  it('llama a POST /cash-sessions al confirmar apertura con monto válido', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(404);
    mock.onPost(`${BASE}/cash-sessions`).reply(200, sessionActiva);
    render();
    await waitFor(() => screen.getByText('Caja Cerrada'));

    // Abrir modal
    fireEvent.click(screen.getByRole('button', { name: /Abrir Caja/i }));

    // Ingresar monto
    const input = screen.getByPlaceholderText('0.00');
    await userEvent.type(input, '1000');

    // Confirmar
    const modalButtons = screen.getAllByRole('button', { name: /Abrir Caja/i });
    const modalBtn = modalButtons[modalButtons.length - 1];
    fireEvent.click(modalBtn);

    await waitFor(() => {
      const history = mock.history.post;
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].url).toContain('/cash-sessions');
      const body = JSON.parse(history[0].data);
      expect(body.monto_inicial).toBe(1000);
    });
  });

  it('muestra "Caja Abierta" después de abrir la caja exitosamente', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(404);
    mock.onPost(`${BASE}/cash-sessions`).reply(200, sessionActiva);
    render();
    await waitFor(() => screen.getByText('Caja Cerrada'));

    fireEvent.click(screen.getByRole('button', { name: /Abrir Caja/i }));
    const input = screen.getByPlaceholderText('0.00');
    await userEvent.type(input, '1000');

    const modalButtons = screen.getAllByRole('button', { name: /Abrir Caja/i });
    fireEvent.click(modalButtons[modalButtons.length - 1]);

    await waitFor(() =>
      expect(screen.getByText('Caja Abierta')).toBeInTheDocument()
    );
  });

  // ── Modal cerrar caja ────────────────────────────────────────────────────────

  it('abre el modal "Cerrar Caja" al hacer click en el botón', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(200, sessionActiva);
    render();
    await waitFor(() => screen.getByText('Caja Abierta'));

    fireEvent.click(screen.getByRole('button', { name: /Cerrar Caja/i }));

    expect(screen.getByText('Monto Final en Caja *')).toBeInTheDocument();
  });

  it('muestra el resumen de la sesión dentro del modal de cierre', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(200, sessionActiva);
    render();
    await waitFor(() => screen.getByText('Caja Abierta'));

    fireEvent.click(screen.getByRole('button', { name: /Cerrar Caja/i }));

    expect(screen.getByText(/Resumen de la sesión/i)).toBeInTheDocument();
  });

  it('llama a PUT /cash-sessions/:id/close al confirmar cierre', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(200, sessionActiva);
    mock.onPut(`${BASE}/cash-sessions/42/close`).reply(200, { diferencia: 0 });
    render();
    await waitFor(() => screen.getByText('Caja Abierta'));

    fireEvent.click(screen.getByRole('button', { name: /Cerrar Caja/i }));

    // Hay dos inputs con placeholder "0.00": el de apertura (no visible) y el de cierre
    const inputs = screen.getAllByPlaceholderText('0.00');
    await userEvent.type(inputs[0], '3500');

    // Botón "Cerrar Caja" dentro del modal
    const closeButtons = screen.getAllByRole('button', { name: /Cerrar Caja/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    await waitFor(() => {
      const history = mock.history.put;
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].url).toContain('/cash-sessions/42/close');
    });
  });

  it('muestra "Caja Cerrada" luego de cerrar exitosamente', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(200, sessionActiva);
    mock.onPut(`${BASE}/cash-sessions/42/close`).reply(200, { diferencia: 0 });
    render();
    await waitFor(() => screen.getByText('Caja Abierta'));

    fireEvent.click(screen.getByRole('button', { name: /Cerrar Caja/i }));
    const inputs = screen.getAllByPlaceholderText('0.00');
    await userEvent.type(inputs[0], '3500');
    const closeButtons = screen.getAllByRole('button', { name: /Cerrar Caja/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    await waitFor(() =>
      expect(screen.getByText('Caja Cerrada')).toBeInTheDocument()
    );
  });

  // ── Quick actions ────────────────────────────────────────────────────────────

  it('muestra el link "Realizar Venta" (habilitado solo con sesión activa)', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(200, sessionActiva);
    render();
    await waitFor(() => screen.getByText('Caja Abierta'));
    expect(screen.getByText('Realizar Venta')).toBeInTheDocument();
  });

  it('muestra el link "Reporte de Caja"', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(200, sessionActiva);
    render();
    await waitFor(() => screen.getByText('Caja Abierta'));
    expect(screen.getByText('Reporte de Caja')).toBeInTheDocument();
  });

  it('muestra el link "Historial"', async () => {
    mock.onGet(`${BASE}/cash-sessions/current`).reply(404);
    render();
    await waitFor(() => screen.getByText('Caja Cerrada'));
    expect(screen.getByText('Historial')).toBeInTheDocument();
  });
});
