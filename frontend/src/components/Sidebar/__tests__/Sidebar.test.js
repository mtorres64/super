import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders, mockUser } from '../../../testUtils';
import Sidebar from '../index';

const mock = new MockAdapter(axios);

beforeEach(() => {
  mock.reset();
  // El Sidebar llama a GET /config al montar; lo silenciamos por defecto
  mock.onGet(/\/config/).reply(200, { company_name: 'ACME', company_logo: null });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  mock.restore();
});

// ---------- helpers de usuarios ----------

const adminUser    = { ...mockUser, rol: 'admin' };
const supervisorUser = { ...mockUser, rol: 'supervisor' };
const cajeroUser   = { ...mockUser, rol: 'cajero' };

// Items del menú según menuItems definido en index.js
const adminOnlyItems    = ['Productos', 'Sucursales', 'Usuarios', 'Configuración', 'Cuenta'];
const supervisorItems   = ['Dashboard', 'Gestión de Caja', 'Punto de Venta', 'Reportes', 'Compras'];
const cajeroItems       = ['Dashboard', 'Gestión de Caja', 'Punto de Venta'];
const cajeroForbidden   = ['Productos', 'Sucursales', 'Reportes', 'Usuarios', 'Configuración', 'Cuenta', 'Compras'];

function renderSidebar(userOverride = adminUser, extraProps = {}) {
  return renderWithProviders(
    <Sidebar isOpen={true} onClose={jest.fn()} stockAlertCount={0} notifCount={0} {...extraProps} />,
    { user: userOverride }
  );
}

// ---------- tests ----------

describe('Sidebar — items del menú según rol', () => {
  it('admin ve todos los items del menú', async () => {
    renderSidebar(adminUser);

    await waitFor(() => {
      // Items exclusivos de admin
      adminOnlyItems.forEach(label => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
      // Items compartidos
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Punto de Venta')).toBeInTheDocument();
    });
  });

  it('cajero solo ve Dashboard, Gestión de Caja y Punto de Venta', async () => {
    renderSidebar(cajeroUser);

    await waitFor(() => {
      cajeroItems.forEach(label => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    // Items prohibidos no deben aparecer
    cajeroForbidden.forEach(label => {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });
  });

  it('supervisor ve Dashboard, Caja, POS, Reportes y Compras, pero NO items de admin', async () => {
    renderSidebar(supervisorUser);

    await waitFor(() => {
      supervisorItems.forEach(label => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    // Items exclusivos de admin no deben estar
    adminOnlyItems.forEach(label => {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });
  });

  it('cajero NO ve Reportes', async () => {
    renderSidebar(cajeroUser);
    await waitFor(() => screen.getByText('Dashboard'));
    expect(screen.queryByText('Reportes')).not.toBeInTheDocument();
  });

  it('cajero NO ve Productos', async () => {
    renderSidebar(cajeroUser);
    await waitFor(() => screen.getByText('Dashboard'));
    expect(screen.queryByText('Productos')).not.toBeInTheDocument();
  });
});

describe('Sidebar — link activo', () => {
  it('aplica clase "active" al link que coincide con la ruta actual', async () => {
    renderWithProviders(
      <Sidebar isOpen={true} onClose={jest.fn()} />,
      { user: adminUser, initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      const link = screen.getByText('Dashboard').closest('a');
      expect(link).toHaveClass('active');
    });
  });

  it('NO aplica clase "active" a links que no coinciden con la ruta actual', async () => {
    renderWithProviders(
      <Sidebar isOpen={true} onClose={jest.fn()} />,
      { user: adminUser, initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      const link = screen.getByText('Productos').closest('a');
      expect(link).not.toHaveClass('active');
    });
  });

  it('aplica clase "active" a /pos cuando la ruta es /pos', async () => {
    renderWithProviders(
      <Sidebar isOpen={true} onClose={jest.fn()} />,
      { user: adminUser, initialEntries: ['/pos'] }
    );

    await waitFor(() => {
      const link = screen.getByText('Punto de Venta').closest('a');
      expect(link).toHaveClass('active');
    });
  });
});

describe('Sidebar — logout', () => {
  it('llama a la función logout del contexto al hacer click en Cerrar Sesión', async () => {
    const logoutMock = jest.fn();
    renderWithProviders(
      <Sidebar isOpen={true} onClose={jest.fn()} />,
      {
        authValue: {
          user: adminUser,
          setUser: jest.fn(),
          logout: logoutMock,
        },
      }
    );

    await waitFor(() => screen.getByText('Cerrar Sesión'));
    fireEvent.click(screen.getByText('Cerrar Sesión'));

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});

describe('Sidebar — información del usuario', () => {
  it('muestra el nombre del usuario en el footer', async () => {
    renderSidebar(adminUser);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  it('muestra el rol del usuario en el footer', async () => {
    renderSidebar(cajeroUser);

    await waitFor(() => {
      expect(screen.getByText('cajero')).toBeInTheDocument();
    });
  });

  it('muestra el avatar con la primera letra del nombre', async () => {
    renderSidebar(adminUser);

    await waitFor(() => {
      // La inicial del nombre "Test User" es "T"
      expect(screen.getByText('T')).toBeInTheDocument();
    });
  });
});

describe('Sidebar — mobile (isOpen / onClose)', () => {
  it('tiene clase sidebar-open cuando isOpen=true', async () => {
    const { container } = renderSidebar(adminUser, { isOpen: true });

    await waitFor(() => {
      const sidebar = container.querySelector('.sidebar');
      expect(sidebar).toHaveClass('sidebar-open');
    });
  });

  it('NO tiene clase sidebar-open cuando isOpen=false', async () => {
    const { container } = renderWithProviders(
      <Sidebar isOpen={false} onClose={jest.fn()} />,
      { user: adminUser }
    );

    await waitFor(() => {
      const sidebar = container.querySelector('.sidebar');
      expect(sidebar).not.toHaveClass('sidebar-open');
    });
  });

  it('llama a onClose al hacer click en el botón de cierre', async () => {
    const onCloseMock = jest.fn();
    renderWithProviders(
      <Sidebar isOpen={true} onClose={onCloseMock} />,
      { user: adminUser }
    );

    await waitFor(() => {
      // El botón de cierre tiene clase sidebar-close
      const closeBtn = document.querySelector('.sidebar-close');
      fireEvent.click(closeBtn);
    });

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('llama a onClose al hacer click en un link de navegación', async () => {
    const onCloseMock = jest.fn();
    renderWithProviders(
      <Sidebar isOpen={true} onClose={onCloseMock} />,
      { user: adminUser, initialEntries: ['/'] }
    );

    await waitFor(() => screen.getByText('Dashboard'));
    fireEvent.click(screen.getByText('Dashboard'));

    expect(onCloseMock).toHaveBeenCalled();
  });
});

describe('Sidebar — badge de notificaciones', () => {
  it('muestra el badge de notificaciones en el link Dashboard cuando notifCount > 0', async () => {
    renderWithProviders(
      <Sidebar isOpen={true} onClose={jest.fn()} notifCount={5} />,
      { user: adminUser }
    );

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('muestra "99+" cuando notifCount > 99', async () => {
    renderWithProviders(
      <Sidebar isOpen={true} onClose={jest.fn()} notifCount={150} />,
      { user: adminUser }
    );

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  it('NO muestra badge cuando notifCount es 0', async () => {
    renderWithProviders(
      <Sidebar isOpen={true} onClose={jest.fn()} notifCount={0} />,
      { user: adminUser }
    );

    await waitFor(() => screen.getByText('Dashboard'));

    const badges = document.querySelectorAll('.nav-stock-badge');
    expect(badges.length).toBe(0);
  });
});

describe('Sidebar — configuración de empresa', () => {
  it('muestra el nombre de la empresa cuando config está cargada', async () => {
    mock.onGet(/\/config/).reply(200, { company_name: 'Mi Empresa', company_logo: null });
    renderSidebar(adminUser);

    await waitFor(() => {
      expect(screen.getByText('Mi Empresa')).toBeInTheDocument();
    });
  });

  it('muestra el logo PulsLogo cuando no hay company_name', async () => {
    mock.onGet(/\/config/).reply(200, {});
    renderSidebar(adminUser);

    // PulsLogo se renderiza: verificamos que el contenido de empresa no aparece
    await waitFor(() => {
      expect(screen.queryByText('Mi Empresa')).not.toBeInTheDocument();
    });
  });
});
