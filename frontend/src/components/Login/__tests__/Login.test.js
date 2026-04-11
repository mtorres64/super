import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders, mockUser } from '../../../testUtils';
import Login from '../index';

const mock = new MockAdapter(axios);
beforeEach(() => mock.reset());
afterAll(() => mock.restore());

describe('Login', () => {
  // ─── Renderizado del formulario ───────────────────────────────────────────
  describe('formulario de login', () => {
    it('renderiza el formulario con los campos email y contraseña', () => {
      renderWithProviders(<Login />, { user: null });

      expect(screen.getByPlaceholderText('tu@empresa.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    });

    it('muestra los campos de features en el panel izquierdo', () => {
      renderWithProviders(<Login />, { user: null });

      expect(screen.getByText('Punto de venta con escáner')).toBeInTheDocument();
      expect(screen.getByText('Inventario y alertas de stock')).toBeInTheDocument();
      expect(screen.getByText('Reportes y exportación Excel')).toBeInTheDocument();
      expect(screen.getByText('Multi-sucursal y multi-usuario')).toBeInTheDocument();
    });
  });

  // ─── Inputs ───────────────────────────────────────────────────────────────
  describe('interacción con inputs', () => {
    it('actualiza el campo de email al escribir', async () => {
      renderWithProviders(<Login />, { user: null });

      const emailInput = screen.getByPlaceholderText('tu@empresa.com');
      await userEvent.type(emailInput, 'user@test.com');

      expect(emailInput).toHaveValue('user@test.com');
    });

    it('actualiza el campo de contraseña al escribir', async () => {
      renderWithProviders(<Login />, { user: null });

      const passwordInput = screen.getByPlaceholderText('••••••••');
      await userEvent.type(passwordInput, 'secret123');

      expect(passwordInput).toHaveValue('secret123');
    });

    it('alterna la visibilidad de la contraseña con el botón de ojo', async () => {
      renderWithProviders(<Login />, { user: null });

      const passwordInput = screen.getByPlaceholderText('••••••••');
      expect(passwordInput).toHaveAttribute('type', 'password');

      // El botón de toggle es el que está junto al input de password en modo login
      const toggleBtn = passwordInput.closest('.input-icon-wrap').querySelector('.input-icon-right');
      await userEvent.click(toggleBtn);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  // ─── Submit exitoso ───────────────────────────────────────────────────────
  describe('submit del formulario de login', () => {
    it('llama a POST /auth/login y ejecuta login del contexto al enviar credenciales válidas', async () => {
      const loginFn = jest.fn();
      mock.onPost(/\/auth\/login/).reply(200, {
        user: mockUser,
        access_token: 'token123',
      });

      renderWithProviders(<Login />, {
        user: null,
        authValue: { user: null, setUser: jest.fn(), logout: jest.fn(), login: loginFn },
      });

      await userEvent.type(screen.getByPlaceholderText('tu@empresa.com'), 'test@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password');
      fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form'));

      await waitFor(() => {
        expect(loginFn).toHaveBeenCalledWith(mockUser, 'token123');
      });
    });

    it('muestra el spinner de carga mientras se procesa el login', async () => {
      mock.onPost(/\/auth\/login/).reply(() => new Promise(resolve =>
        setTimeout(() => resolve([200, { user: mockUser, access_token: 'tok' }]), 200)
      ));

      renderWithProviders(<Login />, {
        user: null,
        authValue: { user: null, setUser: jest.fn(), logout: jest.fn(), login: jest.fn() },
      });

      await userEvent.type(screen.getByPlaceholderText('tu@empresa.com'), 'a@b.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass');
      fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form'));

      expect(await screen.findByText(/iniciando sesión/i)).toBeInTheDocument();
    });
  });

  // ─── Error de login ───────────────────────────────────────────────────────
  describe('error de login', () => {
    it('llama a la API pero devuelve error 401', async () => {
      mock.onPost(/\/auth\/login/).reply(401, { detail: 'Credenciales inválidas' });

      renderWithProviders(<Login />, {
        user: null,
        authValue: { user: null, setUser: jest.fn(), logout: jest.fn(), login: jest.fn() },
      });

      await userEvent.type(screen.getByPlaceholderText('tu@empresa.com'), 'wrong@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
      fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form'));

      // La petición se realiza: verificamos que el mock fue llamado
      await waitFor(() => {
        expect(mock.history.post.length).toBe(1);
        expect(mock.history.post[0].url).toMatch(/\/auth\/login/);
      });
    });
  });

  // ─── Redirección si ya está logueado ──────────────────────────────────────
  describe('redirección para usuarios autenticados', () => {
    it('redirige a /dashboard si el usuario ya está logueado', () => {
      renderWithProviders(<Login />, {
        user: mockUser,
        initialEntries: ['/login'],
      });

      // Navigate reemplaza el componente, el formulario no debe estar presente
      expect(screen.queryByPlaceholderText('tu@empresa.com')).not.toBeInTheDocument();
    });
  });

  // ─── Cambiar a modo registro ──────────────────────────────────────────────
  describe('modo registro', () => {
    it('muestra el formulario de registro al hacer clic en "Registrá tu empresa"', async () => {
      renderWithProviders(<Login />, { user: null });

      await userEvent.click(screen.getByRole('button', { name: /registrá tu empresa/i }));

      expect(screen.getByPlaceholderText('Mi Supermercado S.A.')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enviar código de verificación/i })).toBeInTheDocument();
    });

    it('vuelve al login al hacer clic en "Iniciar sesión" desde el registro', async () => {
      renderWithProviders(<Login />, { user: null });

      await userEvent.click(screen.getByRole('button', { name: /registrá tu empresa/i }));
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

      expect(screen.getByPlaceholderText('tu@empresa.com')).toBeInTheDocument();
    });
  });

  // ─── Envío de OTP para registro ───────────────────────────────────────────
  describe('envío de OTP para registro', () => {
    it('llama a POST /auth/otp/enviar y muestra el bloque OTP', async () => {
      mock.onPost(/\/auth\/otp\/enviar/).reply(200, {});

      renderWithProviders(<Login />, { user: null });

      await userEvent.click(screen.getByRole('button', { name: /registrá tu empresa/i }));

      await userEvent.type(screen.getByPlaceholderText('Mi Supermercado S.A.'), 'Mi Empresa');
      await userEvent.type(screen.getByPlaceholderText('Juan Pérez'), 'Juan');
      await userEvent.type(screen.getByPlaceholderText('juan@miempresa.com'), 'juan@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass123');

      fireEvent.submit(
        screen.getByRole('button', { name: /enviar código de verificación/i }).closest('form')
      );

      await waitFor(() => {
        expect(mock.history.post.length).toBe(1);
        expect(mock.history.post[0].url).toMatch(/\/auth\/otp\/enviar/);
      });

      expect(await screen.findByText(/código de 4 dígitos/i)).toBeInTheDocument();
    });
  });

  // ─── Password reset ───────────────────────────────────────────────────────
  describe('recuperación de contraseña', () => {
    it('muestra el formulario de reset al hacer clic en "¿Olvidaste tu contraseña?"', async () => {
      renderWithProviders(<Login />, { user: null });

      await userEvent.click(screen.getByRole('button', { name: /olvidaste tu contraseña/i }));

      expect(screen.getByText(/recuperar contraseña/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enviar código/i })).toBeInTheDocument();
    });

    it('llama a POST /auth/password-reset/enviar y pasa al paso OTP', async () => {
      mock.onPost(/\/auth\/password-reset\/enviar/).reply(200, {});

      renderWithProviders(<Login />, { user: null });

      await userEvent.click(screen.getByRole('button', { name: /olvidaste tu contraseña/i }));

      await userEvent.type(screen.getByPlaceholderText('tu@empresa.com'), 'test@test.com');
      fireEvent.submit(screen.getByRole('button', { name: /enviar código/i }).closest('form'));

      await waitFor(() => {
        expect(mock.history.post.length).toBe(1);
        expect(mock.history.post[0].url).toMatch(/\/auth\/password-reset\/enviar/);
      });

      expect(await screen.findByText(/código de 4 dígitos/i)).toBeInTheDocument();
    });

    it('llama a POST /auth/password-reset/verificar y pasa al paso de nueva contraseña', async () => {
      mock.onPost(/\/auth\/password-reset\/enviar/).reply(200, {});
      mock.onPost(/\/auth\/password-reset\/verificar/).reply(200, { reset_token: 'reset-tok' });

      renderWithProviders(<Login />, { user: null });

      // Ir a reset
      await userEvent.click(screen.getByRole('button', { name: /olvidaste tu contraseña/i }));
      await userEvent.type(screen.getByPlaceholderText('tu@empresa.com'), 'test@test.com');
      fireEvent.submit(screen.getByRole('button', { name: /enviar código/i }).closest('form'));

      // Esperar bloque OTP
      await screen.findByText(/código de 4 dígitos/i);

      // Rellenar OTP con keyDown (el componente escucha onKeyDown para dígitos)
      const otpInputs = screen.getAllByRole('textbox');
      fireEvent.keyDown(otpInputs[0], { key: '1' });
      fireEvent.keyDown(otpInputs[1], { key: '2' });
      fireEvent.keyDown(otpInputs[2], { key: '3' });
      fireEvent.keyDown(otpInputs[3], { key: '4' });

      fireEvent.submit(
        screen.getByRole('button', { name: /verificar código/i }).closest('form')
      );

      await waitFor(() => {
        expect(mock.history.post.some(r => /password-reset\/verificar/.test(r.url))).toBe(true);
      });

      expect(await screen.findByText(/nueva contraseña/i)).toBeInTheDocument();
    });

    it('llama a POST /auth/password-reset/cambiar al guardar la nueva contraseña', async () => {
      mock.onPost(/\/auth\/password-reset\/enviar/).reply(200, {});
      mock.onPost(/\/auth\/password-reset\/verificar/).reply(200, { reset_token: 'reset-tok' });
      mock.onPost(/\/auth\/password-reset\/cambiar/).reply(200, {});

      renderWithProviders(<Login />, { user: null });

      // Paso 1: ir a reset
      await userEvent.click(screen.getByRole('button', { name: /olvidaste tu contraseña/i }));
      await userEvent.type(screen.getByPlaceholderText('tu@empresa.com'), 'test@test.com');
      fireEvent.submit(screen.getByRole('button', { name: /enviar código/i }).closest('form'));
      await screen.findByText(/código de 4 dígitos/i);

      // Paso 2: OTP
      const otpInputs = screen.getAllByRole('textbox');
      fireEvent.keyDown(otpInputs[0], { key: '1' });
      fireEvent.keyDown(otpInputs[1], { key: '2' });
      fireEvent.keyDown(otpInputs[2], { key: '3' });
      fireEvent.keyDown(otpInputs[3], { key: '4' });
      fireEvent.submit(
        screen.getByRole('button', { name: /verificar código/i }).closest('form')
      );
      await screen.findByText(/nueva contraseña/i);

      // Paso 3: cambiar password
      await userEvent.type(screen.getByPlaceholderText(/mínimo 6 caracteres/i), 'nuevaPass123');
      fireEvent.submit(
        screen.getByRole('button', { name: /cambiar contraseña/i }).closest('form')
      );

      await waitFor(() => {
        expect(mock.history.post.some(r => /password-reset\/cambiar/.test(r.url))).toBe(true);
      });
    });

    it('vuelve al login al hacer clic en "← Volver al inicio de sesión"', async () => {
      renderWithProviders(<Login />, { user: null });

      await userEvent.click(screen.getByRole('button', { name: /olvidaste tu contraseña/i }));
      expect(screen.getByText(/recuperar contraseña/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /← Volver al inicio de sesión/i }));

      expect(screen.getByPlaceholderText('tu@empresa.com')).toBeInTheDocument();
    });
  });
});
