import React, { useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import { Store, User, Lock, Building2, LogIn, UserPlus } from 'lucide-react';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useContext(AuthContext);

  if (user) {
    return <Navigate to="/" />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      login(userData, access_token);
      toast.success(`¡Bienvenido, ${userData.nombre}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterEmpresa = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/empresa/register`, {
        empresa_nombre: empresaNombre,
        admin_nombre: adminNombre,
        admin_email: email,
        admin_password: password,
      });
      const { access_token, user: userData } = response.data;
      login(userData, access_token);
      toast.success(`¡Empresa "${empresaNombre}" registrada! Bienvenido, ${userData.nombre}.`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar la empresa');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setEmail('');
    setPassword('');
    setEmpresaNombre('');
    setAdminNombre('');
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-header">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center">
              <Store className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="login-title">SuperMarket POS</h1>
          <p className="login-subtitle">
            {mode === 'login' ? 'Sistema de Gestión de Supermercado' : 'Registrar mi empresa'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">
                <User className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@supermarket.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock className="w-4 h-4 inline mr-2" />
                Contraseña
              </label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 inline mr-2" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterEmpresa}>
            <div className="form-group">
              <label className="form-label">
                <Building2 className="w-4 h-4 inline mr-2" />
                Nombre de la empresa
              </label>
              <input
                type="text"
                className="form-input"
                value={empresaNombre}
                onChange={(e) => setEmpresaNombre(e.target.value)}
                placeholder="Mi Supermercado S.A."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <User className="w-4 h-4 inline mr-2" />
                Tu nombre (administrador)
              </label>
              <input
                type="text"
                className="form-input"
                value={adminNombre}
                onChange={(e) => setAdminNombre(e.target.value)}
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <User className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@miempresa.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock className="w-4 h-4 inline mr-2" />
                Contraseña
              </label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Se creará una cuenta de administrador. Podrás agregar usuarios desde el sistema.
            </p>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  Registrando empresa...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 inline mr-2" />
                  Registrar Empresa
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-sm text-green-600 hover:text-green-800 underline"
          >
            {mode === 'login'
              ? '¿Eres nuevo? Registra tu empresa'
              : '¿Ya tienes cuenta? Iniciar sesión'}
          </button>
        </div>

        {mode === 'login' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Usuarios de prueba:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Admin:</strong> admin@supermarket.com / admin123</p>
              <p><strong>Cajero:</strong> cajero@supermarket.com / cajero123</p>
              <p><strong>Supervisor:</strong> supervisor@supermarket.com / super123</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
