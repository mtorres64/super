import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders } from '../../../testUtils';
import Notificaciones from '../index';

const mock = new MockAdapter(axios);

beforeEach(() => {
  mock.reset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  mock.restore();
});

// ---------- helpers ----------

const notifNoLeida = {
  id: 1,
  tipo: 'plan_por_vencer_10',
  titulo: 'Tu plan vence en 10 días',
  mensaje: 'Recordá renovar tu suscripción para no perder el acceso.',
  leida: false,
  fecha: '2026-04-01T10:00:00',
};

const notifLeida = {
  id: 2,
  tipo: 'plan_por_vencer_5',
  titulo: 'Tu plan vence en 5 días',
  mensaje: 'Quedan muy pocos días.',
  leida: true,
  fecha: '2026-03-28T09:00:00',
};

const notifTipoDesconocido = {
  id: 3,
  tipo: 'otro_tipo',
  titulo: 'Notificación genérica',
  mensaje: 'Mensaje de prueba.',
  leida: false,
  fecha: '2026-04-02T08:00:00',
};

function setupListaMock(items = [notifNoLeida, notifLeida], total = null) {
  mock.onGet(/\/notificaciones/).reply(200, {
    items,
    total: total ?? items.length,
  });
}

// ---------- tests ----------

describe('Notificaciones — carga inicial', () => {
  it('llama a GET /notificaciones al montar', async () => {
    setupListaMock();
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      const calls = mock.history.get.filter(r => r.url.includes('/notificaciones'));
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('muestra los títulos de las notificaciones cargadas', async () => {
    setupListaMock();
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      expect(screen.getByText('Tu plan vence en 10 días')).toBeInTheDocument();
      expect(screen.getByText('Tu plan vence en 5 días')).toBeInTheDocument();
    });
  });

  it('muestra el mensaje de cada notificación', async () => {
    setupListaMock([notifNoLeida]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      expect(screen.getByText(/Recordá renovar tu suscripción/i)).toBeInTheDocument();
    });
  });
});

describe('Notificaciones — estado vacío', () => {
  it('muestra el mensaje de estado vacío cuando no hay notificaciones', async () => {
    setupListaMock([]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      expect(screen.getByText(/No tenés notificaciones/i)).toBeInTheDocument();
      expect(screen.getByText(/Estás al día con tu plan/i)).toBeInTheDocument();
    });
  });

  it('no muestra el contador de no leídas cuando la lista está vacía', async () => {
    setupListaMock([]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      expect(screen.queryByText(/sin leer/i)).not.toBeInTheDocument();
    });
  });
});

describe('Notificaciones — indicador visual de no leídas', () => {
  it('muestra el punto azul indicador solo en notificaciones no leídas', async () => {
    setupListaMock([notifNoLeida, notifLeida]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      // El punto (w-2 h-2 bg-indigo-500) solo aparece dentro del titulo no-leído
      const titulo = screen.getByText('Tu plan vence en 10 días');
      const punto = titulo.querySelector('.bg-indigo-500');
      expect(punto).not.toBeNull();
    });
  });

  it('NO muestra botón "Marcar como leída" en notificación ya leída', async () => {
    setupListaMock([notifLeida]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      expect(screen.queryByTitle('Marcar como leída')).not.toBeInTheDocument();
    });
  });

  it('muestra botón "Marcar como leída" solo en notificaciones no leídas', async () => {
    setupListaMock([notifNoLeida]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      expect(screen.getByTitle('Marcar como leída')).toBeInTheDocument();
    });
  });

  it('muestra el contador correcto de notificaciones sin leer', async () => {
    setupListaMock([notifNoLeida, notifTipoDesconocido, notifLeida]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      // 2 notificaciones no leídas
      expect(screen.getByText(/2 sin leer/i)).toBeInTheDocument();
    });
  });

  it('la notificación leída tiene clase opacity-70', async () => {
    setupListaMock([notifLeida]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      const contenedor = screen.getByText('Tu plan vence en 5 días').closest('.flex.items-start');
      expect(contenedor).toHaveClass('opacity-70');
    });
  });
});

describe('Notificaciones — marcar como leída (individual)', () => {
  it('llama a PUT /notificaciones/:id/leer al hacer click en el botón', async () => {
    setupListaMock([notifNoLeida]);
    mock.onPut(/\/notificaciones\/1\/leer/).reply(200);

    renderWithProviders(<Notificaciones />);

    await waitFor(() => screen.getByTitle('Marcar como leída'));

    fireEvent.click(screen.getByTitle('Marcar como leída'));

    await waitFor(() => {
      const putCalls = mock.history.put.filter(r => r.url.includes('/notificaciones/1/leer'));
      expect(putCalls.length).toBe(1);
    });
  });

  it('oculta el botón "Marcar como leída" después de marcarla', async () => {
    setupListaMock([notifNoLeida]);
    mock.onPut(/\/notificaciones\/1\/leer/).reply(200);

    renderWithProviders(<Notificaciones />);

    await waitFor(() => screen.getByTitle('Marcar como leída'));
    fireEvent.click(screen.getByTitle('Marcar como leída'));

    await waitFor(() => {
      expect(screen.queryByTitle('Marcar como leída')).not.toBeInTheDocument();
    });
  });

  it('actualiza el contador de no leídas a 0 después de marcar la única no leída', async () => {
    setupListaMock([notifNoLeida]);
    mock.onPut(/\/notificaciones\/1\/leer/).reply(200);

    renderWithProviders(<Notificaciones />);

    await waitFor(() => screen.getByTitle('Marcar como leída'));
    fireEvent.click(screen.getByTitle('Marcar como leída'));

    await waitFor(() => {
      expect(screen.queryByText(/sin leer/i)).not.toBeInTheDocument();
    });
  });
});

describe('Notificaciones — marcar todas como leídas', () => {
  it('muestra el botón "Marcar todas como leídas" cuando hay no leídas', async () => {
    setupListaMock([notifNoLeida]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      expect(screen.getByText(/Marcar todas como leídas/i)).toBeInTheDocument();
    });
  });

  it('NO muestra el botón cuando todas están leídas', async () => {
    setupListaMock([notifLeida]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      expect(screen.queryByText(/Marcar todas como leídas/i)).not.toBeInTheDocument();
    });
  });

  it('llama a PUT /notificaciones/leer-todas al hacer click', async () => {
    setupListaMock([notifNoLeida]);
    mock.onPut(/\/notificaciones\/leer-todas/).reply(200);

    renderWithProviders(<Notificaciones />);

    await waitFor(() => screen.getByText(/Marcar todas como leídas/i));
    fireEvent.click(screen.getByText(/Marcar todas como leídas/i));

    await waitFor(() => {
      const putCalls = mock.history.put.filter(r => r.url.includes('/notificaciones/leer-todas'));
      expect(putCalls.length).toBe(1);
    });
  });

  it('actualiza todas las notificaciones a leídas en el estado local', async () => {
    setupListaMock([notifNoLeida, notifTipoDesconocido]);
    mock.onPut(/\/notificaciones\/leer-todas/).reply(200);

    renderWithProviders(<Notificaciones />);

    await waitFor(() => screen.getByText(/Marcar todas como leídas/i));
    fireEvent.click(screen.getByText(/Marcar todas como leídas/i));

    await waitFor(() => {
      // Después de marcar todas, ya no debe haber botones individuales de marcar
      expect(screen.queryByTitle('Marcar como leída')).not.toBeInTheDocument();
      // El contador de no leídas desaparece
      expect(screen.queryByText(/sin leer/i)).not.toBeInTheDocument();
    });
  });
});

describe('Notificaciones — botón de actualizar', () => {
  it('vuelve a llamar a GET /notificaciones al hacer click en actualizar', async () => {
    setupListaMock();
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      expect(screen.getByTitle('Actualizar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Actualizar'));

    await waitFor(() => {
      const calls = mock.history.get.filter(r => r.url.includes('/notificaciones'));
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('Notificaciones — tipos de notificación', () => {
  it('muestra correctamente una notificación de tipo desconocido con icono Bell', async () => {
    setupListaMock([notifTipoDesconocido]);
    renderWithProviders(<Notificaciones />);

    await waitFor(() => {
      expect(screen.getByText('Notificación genérica')).toBeInTheDocument();
    });
  });
});
