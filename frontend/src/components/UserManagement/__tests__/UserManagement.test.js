import React from 'react';
import { screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders } from '../../../testUtils';
import UserManagement from '../index';

// Silence toast notifications during tests
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// useModalClose with animations causes setTimeout delays.
// Force no-animations so the modal closes synchronously (delay = 0).
beforeAll(() => { document.body.classList.add('no-animations'); });
afterAll(() => { document.body.classList.remove('no-animations'); });

const mock = new MockAdapter(axios);
beforeEach(() => {
  mock.reset();
  // Branches endpoint – default empty
  mock.onGet(/\/branches/).reply(200, []);
});
afterAll(() => mock.restore());

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────
const users = [
  { id: 1, nombre: 'Ana García',   email: 'ana@test.com',   rol: 'admin',      branch_id: null, activo: true  },
  { id: 2, nombre: 'Luis Pérez',   email: 'luis@test.com',  rol: 'cajero',     branch_id: 1,    activo: true  },
  { id: 3, nombre: 'Marta López',  email: 'marta@test.com', rol: 'supervisor', branch_id: null, activo: false },
];

const branches = [
  { id: 1, nombre: 'Sucursal Norte' },
  { id: 2, nombre: 'Sucursal Sur'   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
const setup = (usersData = users, branchesData = []) => {
  mock.onGet(/\/users/).reply(200, usersData);
  mock.onGet(/\/branches/).reply(200, branchesData);
  return renderWithProviders(<UserManagement />);
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Carga y lista de usuarios
// ─────────────────────────────────────────────────────────────────────────────
describe('UserManagement – lista', () => {
  test('muestra el título y el conteo de usuarios', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText('Gestión de Usuarios')).toBeInTheDocument();
      expect(screen.getByText(/3 usuario/i)).toBeInTheDocument();
    });
  });

  test('renderiza una fila por cada usuario', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
      expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
      expect(screen.getByText('Marta López')).toBeInTheDocument();
    });
  });

  test('muestra el email de cada usuario', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText('ana@test.com')).toBeInTheDocument();
      expect(screen.getByText('luis@test.com')).toBeInTheDocument();
    });
  });

  test('muestra mensaje cuando no hay usuarios', async () => {
    setup([]);
    await waitFor(() => {
      expect(screen.getByText(/No hay usuarios registrados/i)).toBeInTheDocument();
    });
  });

  test('realiza GET /users al montar', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    const usersCalls = mock.history.get.filter(r => /\/users/.test(r.url));
    expect(usersCalls.length).toBeGreaterThan(0);
  });

  test('realiza GET /branches al montar', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    const branchesCalls = mock.history.get.filter(r => /\/branches/.test(r.url));
    expect(branchesCalls.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Badge de rol
// ─────────────────────────────────────────────────────────────────────────────
describe('UserManagement – badge de rol', () => {
  test('admin muestra badge "Admin" con clase purple', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    const badge = screen.getByText('Admin');
    expect(badge.className).toMatch(/purple/);
  });

  test('cajero muestra badge "Cajero" con clase green', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    const badge = screen.getByText('Cajero');
    expect(badge.className).toMatch(/green/);
  });

  test('supervisor muestra badge "Supervisor" con clase blue', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    const badge = screen.getByText('Supervisor');
    expect(badge.className).toMatch(/blue/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sucursal
// ─────────────────────────────────────────────────────────────────────────────
describe('UserManagement – sucursal', () => {
  test('muestra nombre de sucursal cuando el usuario tiene branch_id', async () => {
    setup(users, branches);
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    expect(screen.getByText('Sucursal Norte')).toBeInTheDocument();
  });

  test('muestra "—" cuando el usuario no tiene sucursal', async () => {
    setup(users, branches);
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    // Ana García (branch_id null) → em-dash
    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Estado activo / inactivo
// ─────────────────────────────────────────────────────────────────────────────
describe('UserManagement – estado', () => {
  test('usuarios activos muestran "Activo"', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    const activeBadges = screen.getAllByText('Activo');
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
  });

  test('usuarios inactivos muestran "Inactivo"', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  test('toggleUserActive llama a PUT /users/:id con activo negado', async () => {
    setup();
    mock.onPut(/\/users\/1/).reply(200, {});
    mock.onGet(/\/users/).reply(200, users);

    await waitFor(() => screen.getByText('Gestión de Usuarios'));

    // Ana García es activo (id=1) – clic en su botón de estado (primer "Activo")
    const toggleButtons = screen.getAllByText('Activo');
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      const putCall = mock.history.put.find(r => /\/users\/1/.test(r.url));
      expect(putCall).toBeTruthy();
      const body = JSON.parse(putCall.data);
      expect(body.activo).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Crear usuario – modal
// ─────────────────────────────────────────────────────────────────────────────
describe('UserManagement – crear usuario', () => {
  test('botón "Nuevo Usuario" abre el modal', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Usuario/i }));

    expect(screen.getByText('Nuevo Usuario', { selector: 'h3' })).toBeInTheDocument();
  });

  test('modal de creación muestra campos Nombre, Email, Contraseña', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Usuario/i }));

    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
  });

  test('crear usuario llama a POST /auth/register con los datos', async () => {
    setup();
    mock.onPost(/\/auth\/register/).reply(201, { id: 4, nombre: 'Nuevo' });
    mock.onGet(/\/users/).reply(200, users);

    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Usuario/i }));

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Nuevo Usuario Test' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'nuevo@test.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'pass1234' } });

    fireEvent.submit(screen.getByRole('button', { name: /Crear Usuario/i }).closest('form'));

    await waitFor(() => {
      const postCall = mock.history.post.find(r => /\/auth\/register/.test(r.url));
      expect(postCall).toBeTruthy();
      const body = JSON.parse(postCall.data);
      expect(body.nombre).toBe('Nuevo Usuario Test');
      expect(body.email).toBe('nuevo@test.com');
      expect(body.password).toBe('pass1234');
    });
  });

  test('crear usuario con rol supervisor envía rol correcto', async () => {
    setup();
    mock.onPost(/\/auth\/register/).reply(201, {});
    mock.onGet(/\/users/).reply(200, users);

    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Usuario/i }));

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Super' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'super@test.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText(/Rol/i), { target: { value: 'supervisor' } });

    fireEvent.submit(screen.getByRole('button', { name: /Crear Usuario/i }).closest('form'));

    await waitFor(() => {
      const postCall = mock.history.post.find(r => /\/auth\/register/.test(r.url));
      const body = JSON.parse(postCall.data);
      expect(body.rol).toBe('supervisor');
    });
  });

  test('asignar sucursal al crear envía branch_id correcto', async () => {
    setup(users, branches);
    mock.onPost(/\/auth\/register/).reply(201, {});
    mock.onGet(/\/users/).reply(200, users);

    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Usuario/i }));

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test2@test.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: '1234' } });

    // Seleccionar sucursal
    fireEvent.change(screen.getByLabelText(/Sucursal/i), { target: { value: '1' } });

    fireEvent.submit(screen.getByRole('button', { name: /Crear Usuario/i }).closest('form'));

    await waitFor(() => {
      const postCall = mock.history.post.find(r => /\/auth\/register/.test(r.url));
      const body = JSON.parse(postCall.data);
      expect(body.branch_id).toBe('1');
    });
  });

  test('cerrar modal con X limpia el formulario', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Usuario/i }));

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Borrar esto' } });
    fireEvent.click(screen.getByRole('button', { name: '' , hidden: true })); // X button

    await waitFor(() => {
      expect(screen.queryByText('Nuevo Usuario', { selector: 'h3' })).not.toBeInTheDocument();
    });
  });

  test('error en POST /auth/register muestra toast.error', async () => {
    const { toast } = require('sonner');
    setup();
    mock.onPost(/\/auth\/register/).reply(400, { detail: 'Email ya existe' });

    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Usuario/i }));

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Dupe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'dup@test.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: '1234' } });

    fireEvent.submit(screen.getByRole('button', { name: /Crear Usuario/i }).closest('form'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Email ya existe');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Editar usuario
// ─────────────────────────────────────────────────────────────────────────────
describe('UserManagement – editar usuario', () => {
  test('botón editar abre modal con título "Editar Usuario"', async () => {
    setup();
    await waitFor(() => screen.getByText('Ana García'));

    const editButtons = screen.getAllByTitle('Editar');
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Editar Usuario')).toBeInTheDocument();
  });

  test('modal de edición precarga el nombre del usuario', async () => {
    setup();
    await waitFor(() => screen.getByText('Ana García'));

    fireEvent.click(screen.getAllByTitle('Editar')[0]);

    expect(screen.getByDisplayValue('Ana García')).toBeInTheDocument();
  });

  test('modal de edición NO muestra campos Email y Contraseña', async () => {
    setup();
    await waitFor(() => screen.getByText('Ana García'));

    fireEvent.click(screen.getAllByTitle('Editar')[0]);

    expect(screen.queryByLabelText(/Email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Contraseña/i)).not.toBeInTheDocument();
  });

  test('editar usuario llama a PUT /users/:id con los datos', async () => {
    setup();
    mock.onPut(/\/users\/1/).reply(200, {});
    mock.onGet(/\/users/).reply(200, users);

    await waitFor(() => screen.getByText('Ana García'));
    fireEvent.click(screen.getAllByTitle('Editar')[0]);

    const nombreInput = screen.getByDisplayValue('Ana García');
    fireEvent.change(nombreInput, { target: { value: 'Ana García Editada' } });

    fireEvent.submit(screen.getByRole('button', { name: /Actualizar Usuario/i }).closest('form'));

    await waitFor(() => {
      const putCall = mock.history.put.find(r => /\/users\/1/.test(r.url));
      expect(putCall).toBeTruthy();
      const body = JSON.parse(putCall.data);
      expect(body.nombre).toBe('Ana García Editada');
    });
  });

  test('cambiar rol en edición envía nuevo rol', async () => {
    setup();
    mock.onPut(/\/users\/2/).reply(200, {});
    mock.onGet(/\/users/).reply(200, users);

    await waitFor(() => screen.getByText('Luis Pérez'));
    // Luis Pérez es el 2do usuario
    fireEvent.click(screen.getAllByTitle('Editar')[1]);

    fireEvent.change(screen.getByLabelText(/Rol/i), { target: { value: 'admin' } });
    fireEvent.submit(screen.getByRole('button', { name: /Actualizar Usuario/i }).closest('form'));

    await waitFor(() => {
      const putCall = mock.history.put.find(r => /\/users\/2/.test(r.url));
      const body = JSON.parse(putCall.data);
      expect(body.rol).toBe('admin');
    });
  });

  test('asignar sucursal en edición envía branch_id', async () => {
    setup(users, branches);
    mock.onPut(/\/users\/1/).reply(200, {});
    mock.onGet(/\/users/).reply(200, users);

    await waitFor(() => screen.getByText('Ana García'));
    fireEvent.click(screen.getAllByTitle('Editar')[0]);

    fireEvent.change(screen.getByLabelText(/Sucursal/i), { target: { value: '2' } });
    fireEvent.submit(screen.getByRole('button', { name: /Actualizar Usuario/i }).closest('form'));

    await waitFor(() => {
      const putCall = mock.history.put.find(r => /\/users\/1/.test(r.url));
      const body = JSON.parse(putCall.data);
      expect(body.branch_id).toBe('2');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Sucursales en el select del modal
// ─────────────────────────────────────────────────────────────────────────────
describe('UserManagement – select de sucursales en modal', () => {
  test('lista las sucursales disponibles en el select', async () => {
    setup(users, branches);
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Usuario/i }));

    expect(screen.getByRole('option', { name: 'Sucursal Norte' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sucursal Sur' })).toBeInTheDocument();
  });

  test('opción "Sin sucursal" siempre presente en el select', async () => {
    setup();
    await waitFor(() => screen.getByText('Gestión de Usuarios'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Usuario/i }));

    expect(screen.getByRole('option', { name: 'Sin sucursal' })).toBeInTheDocument();
  });
});
