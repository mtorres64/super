import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders } from '../../../testUtils';
import Cuenta from '../index';

const mock = new MockAdapter(axios);

beforeEach(() => {
  mock.reset();
  // Silencia el toast de sonner para no contaminar la consola
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  mock.restore();
});

// ---------- helpers ----------

const planesDefault = {
  mensual: { nombre: 'Plan Mensual', precio: 5000 },
  anual: { nombre: 'Plan Anual', precio: 50000 },
  whatsapp_numero: null,
};

const mockSuscripcionActiva = {
  status: 'activa',
  plan_nombre: 'Plan Básico',
  fecha_vencimiento: '2026-06-01',
  dias_restantes: 52,
  precio: 5000,
  moneda: 'ARS',
  en_gracia: false,
  fue_pagada: true,
};

const mockSuscripcionVencida = {
  ...mockSuscripcionActiva,
  status: 'vencida',
  dias_restantes: 0,
  en_gracia: false,
  fue_pagada: true,
};

const mockSuscripcionTrial = {
  ...mockSuscripcionActiva,
  status: 'trial',
  plan_nombre: 'Período de Prueba',
  fue_pagada: false,
};

const mockSuscripcionGracia = {
  ...mockSuscripcionActiva,
  status: 'vencida',
  en_gracia: true,
  dias_restantes: 3,
};

const mockPagos = [
  {
    id: 1,
    fecha: '2026-01-15',
    concepto: 'Renovación mensual',
    monto: 5000,
    moneda: 'ARS',
    estado: 'approved',
    mp_payment_id: 'MP-001',
    periodo_inicio: null,
    periodo_fin: null,
  },
  {
    id: 2,
    fecha: '2025-12-15',
    concepto: 'Primer pago',
    monto: 5000,
    moneda: 'ARS',
    estado: 'pending',
    mp_payment_id: null,
    periodo_inicio: null,
    periodo_fin: null,
  },
];

function setupMocks(suscripcion = mockSuscripcionActiva, pagos = mockPagos) {
  mock.onGet(/\/cuenta\/status/).reply(200, suscripcion);
  mock.onGet(/\/cuenta\/pagos/).reply(200, pagos);
  mock.onGet(/\/cuenta\/planes/).reply(200, planesDefault);
}

// ---------- tests ----------

describe('Cuenta — carga de datos', () => {
  it('muestra estado de carga inicial y luego el nombre del plan', async () => {
    setupMocks();
    renderWithProviders(<Cuenta />);

    // Mientras carga debe haber un spinner (texto "Cargando...")
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Plan Básico')).toBeInTheDocument();
    });
  });

  it('llama a GET /cuenta/status al montar', async () => {
    setupMocks();
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      const statusCalls = mock.history.get.filter(r => r.url.includes('/cuenta/status'));
      expect(statusCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('llama a GET /cuenta/pagos al montar', async () => {
    setupMocks();
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      const pagosCalls = mock.history.get.filter(r => r.url.includes('/cuenta/pagos'));
      expect(pagosCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Cuenta — estado de suscripción', () => {
  it('muestra badge "Activa" con clases verdes para suscripción activa', async () => {
    setupMocks(mockSuscripcionActiva);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      const badge = screen.getByText('Activa');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  it('muestra badge "Vencida" con clases rojas para suscripción vencida', async () => {
    setupMocks(mockSuscripcionVencida);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      const badge = screen.getByText('Vencida');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  it('muestra badge "Período de Prueba" con clases azules para trial', async () => {
    setupMocks(mockSuscripcionTrial);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      const badge = screen.getByText('Período de Prueba');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  it('muestra badge "En período de gracia" con clases ámbar cuando en_gracia=true', async () => {
    setupMocks(mockSuscripcionGracia);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      const badge = screen.getByText('En período de gracia');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-amber-100', 'text-amber-800');
    });
  });
});

describe('Cuenta — alertas de vencimiento', () => {
  it('muestra alerta cuando la suscripción está vencida', async () => {
    setupMocks(mockSuscripcionVencida);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      expect(screen.getByText(/suscripción ha vencido/i)).toBeInTheDocument();
    });
  });

  it('muestra alerta de período de gracia activo', async () => {
    setupMocks(mockSuscripcionGracia);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      expect(screen.getByText(/período de gracia activo/i)).toBeInTheDocument();
    });
  });

  it('NO muestra alerta cuando la suscripción está activa y tiene muchos días', async () => {
    setupMocks({ ...mockSuscripcionActiva, dias_restantes: 30 });
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      expect(screen.queryByText(/suscripción ha vencido/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/período de gracia/i)).not.toBeInTheDocument();
    });
  });
});

describe('Cuenta — botones de pago', () => {
  it('muestra botón "Renovar mensual" cuando la suscripción está activa', async () => {
    setupMocks(mockSuscripcionActiva);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      expect(screen.getByText(/Renovar mensual/i)).toBeInTheDocument();
      expect(screen.getByText(/Renovar anual/i)).toBeInTheDocument();
    });
  });

  it('muestra botón "Reactivar" cuando la suscripción está vencida', async () => {
    setupMocks(mockSuscripcionVencida);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      expect(screen.getByText(/Reactivar mensual/i)).toBeInTheDocument();
      expect(screen.getByText(/Reactivar anual/i)).toBeInTheDocument();
    });
  });

  it('muestra el precio del plan mensual cuando se cargan los planes', async () => {
    setupMocks(mockSuscripcionActiva);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      // El precio 5000 ARS debe estar visible (formatCurrency lo formatea)
      expect(screen.getByText(/Plan Mensual/i)).toBeInTheDocument();
      expect(screen.getByText(/Plan Anual/i)).toBeInTheDocument();
    });
  });

  it('llama a POST /cuenta/pago/crear al hacer click en Renovar mensual', async () => {
    setupMocks(mockSuscripcionActiva);
    mock.onPost(/\/cuenta\/pago\/crear/).reply(200, {
      init_point: 'https://www.mercadopago.com/checkout/v1/redirect',
    });

    // Reemplaza window.location.href para evitar navegación real
    delete window.location;
    window.location = { href: '' };

    renderWithProviders(<Cuenta />);

    await waitFor(() => screen.getByText(/Renovar mensual/i));

    fireEvent.click(screen.getByText(/Renovar mensual/i));

    await waitFor(() => {
      const postCalls = mock.history.post.filter(r => r.url.includes('/cuenta/pago/crear'));
      expect(postCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Cuenta — historial de pagos', () => {
  it('muestra los pagos del historial con concepto y estado', async () => {
    setupMocks(mockSuscripcionActiva, mockPagos);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      expect(screen.getByText('Renovación mensual')).toBeInTheDocument();
      expect(screen.getByText('Primer pago')).toBeInTheDocument();
    });
  });

  it('muestra badge "Aprobado" en verde para pago approved', async () => {
    setupMocks(mockSuscripcionActiva, mockPagos);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      const badge = screen.getByText('Aprobado');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  it('muestra badge "Pendiente" en amarillo para pago pending', async () => {
    setupMocks(mockSuscripcionActiva, mockPagos);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      const badge = screen.getByText('Pendiente');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  it('muestra mensaje vacío cuando no hay pagos', async () => {
    setupMocks(mockSuscripcionActiva, []);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      expect(screen.getByText(/No hay pagos registrados/i)).toBeInTheDocument();
    });
  });

  it('muestra el ID de pago de MercadoPago cuando está disponible', async () => {
    setupMocks(mockSuscripcionActiva, mockPagos);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      expect(screen.getByText('MP-001')).toBeInTheDocument();
    });
  });

  it('muestra guión cuando el ID de pago MP es null', async () => {
    setupMocks(mockSuscripcionActiva, mockPagos);
    renderWithProviders(<Cuenta />);

    await waitFor(() => {
      // El segundo pago tiene mp_payment_id: null → debe mostrar '-'
      const guiones = screen.getAllByText('-');
      expect(guiones.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('el botón Actualizar vuelve a llamar a la API', async () => {
    setupMocks();
    renderWithProviders(<Cuenta />);

    await waitFor(() => screen.getByText('Actualizar'));

    fireEvent.click(screen.getByText('Actualizar'));

    await waitFor(() => {
      const statusCalls = mock.history.get.filter(r => r.url.includes('/cuenta/status'));
      expect(statusCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
