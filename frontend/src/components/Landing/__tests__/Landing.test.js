import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../index';

// Landing usa react-router Link → necesita MemoryRouter
const renderLanding = () =>
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );

// Mock del componente PulsLogo para simplificar el render
jest.mock('../../PulsLogo', () => () => <span data-testid="puls-logo">PulsLogo</span>);

const mock = new MockAdapter(axios);
beforeEach(() => mock.reset());
afterAll(() => mock.restore());

const planesData = {
  mensual: { precio: 15000 },
  anual: { precio: 150000 },
  trial_dias: 30,
};

describe('Landing', () => {
  test('renderiza la landing page con los elementos clave', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData);

    renderLanding();

    // Navbar
    expect(screen.getAllByText(/Ingresar/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Registrarse gratis/i).length).toBeGreaterThan(0);

    // Heading principal
    expect(
      screen.getByRole('heading', { name: /El sistema de gestión que tu negocio necesita/i })
    ).toBeInTheDocument();
  });

  test('muestra "Planes simples y transparentes" en la sección de precios', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData);

    renderLanding();

    await waitFor(() => {
      expect(screen.getByText(/Planes simples y transparentes/i)).toBeInTheDocument();
    });
  });

  test('carga y muestra los precios mensuales desde la API', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData);

    renderLanding();

    await waitFor(() => {
      // El precio mensual 15000 formateado como "15.000" en es-AR
      expect(screen.getByText(/15\.000/)).toBeInTheDocument();
    });
  });

  test('carga y muestra los precios anuales desde la API', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData);

    renderLanding();

    await waitFor(() => {
      // El precio anual 150000 formateado como "150.000" en es-AR
      expect(screen.getByText(/150\.000/)).toBeInTheDocument();
    });
  });

  test('muestra los días de trial dinámicos desde la API', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData); // trial_dias: 30

    renderLanding();

    await waitFor(() => {
      // "Primeros 30 días gratis"
      expect(screen.getAllByText(/30 días/i).length).toBeGreaterThan(0);
    });
  });

  test('usa 15 días de trial por defecto si la API falla', async () => {
    mock.onGet(/\/public\/planes/).networkError();

    renderLanding();

    await waitFor(() => {
      expect(screen.getAllByText(/15 días/i).length).toBeGreaterThan(0);
    });
  });

  test('muestra precios como "—" si la API no devuelve datos', async () => {
    mock.onGet(/\/public\/planes/).reply(200, {});

    renderLanding();

    await waitFor(() => {
      // formatCurrency(null) devuelve '—'
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
  });

  test('links de "Ingresar" apuntan a /login', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData);

    renderLanding();

    const loginLinks = screen.getAllByRole('link', { name: /Ingresar/i });
    loginLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '/login');
    });
  });

  test('links de registro apuntan a /login', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData);

    renderLanding();

    // Todos los links de registro usan to="/login" con state mode=register
    const registerLinks = screen.getAllByRole('link', { name: /Registrarse gratis/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    registerLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '/login');
    });
  });

  test('muestra las features del plan en la sección de pricing', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData);

    renderLanding();

    await waitFor(() => {
      expect(screen.getByText('Sucursales ilimitadas')).toBeInTheDocument();
      expect(screen.getByText('Usuarios ilimitados')).toBeInTheDocument();
    });
  });

  test('el badge "1 mes gratis" aparece en el plan anual', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData);

    renderLanding();

    await waitFor(() => {
      expect(screen.getByText(/1 mes gratis/i)).toBeInTheDocument();
    });
  });

  test('muestra el footer con el año actual', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData);

    renderLanding();

    const currentYear = new Date().getFullYear().toString();
    await waitFor(() => {
      expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
    });
  });

  test('muestra los pasos "Cómo funciona"', async () => {
    mock.onGet(/\/public\/planes/).reply(200, planesData);

    renderLanding();

    await waitFor(() => {
      expect(screen.getByText('Registrá tu empresa')).toBeInTheDocument();
      expect(screen.getByText('Cargá tus productos')).toBeInTheDocument();
      expect(screen.getByText('Empezá a vender')).toBeInTheDocument();
    });
  });
});
