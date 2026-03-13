import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Menu } from 'lucide-react';
import './App.css';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import ProductManagement from './components/ProductManagement';
import Reports from './components/Reports';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import CashManager from './components/CashManager';
import CashReport from './components/CashReport';
import Sidebar from './components/Sidebar';
import BranchManagement from './components/BranchManagement';
import Compras from './components/Compras';
import Cuenta from './components/Cuenta';
import Landing from './components/Landing';
import OwnerPanel from './components/OwnerPanel';
import SalesReports from './components/SalesReports';
import StockAlerts from './components/StockAlerts';
import Notificaciones from './components/Notificaciones';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context for authentication
export const AuthContext = React.createContext();

// Apply animation preference on startup
if (localStorage.getItem('modal_animations') === 'false') {
  document.body.classList.add('no-animations');
}

const applyTheme = (token) => {
  const root = document.documentElement;
  const brightness = (hex) => {
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return (r*299 + g*587 + b*114) / 1000;
  };
  const contrast = (hex) => brightness(hex) > 155 ? '#1f2937' : 'white';
  const darken = (hex, amt) => {
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return `#${[r-amt,g-amt,b-amt].map(v=>Math.max(0,v).toString(16).padStart(2,'0')).join('')}`;
  };
  const rgba = (hex, a) => {
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  };
  const applyColorVar = (color, prefix) => {
    root.style.setProperty(`--${prefix}`,       color);
    root.style.setProperty(`--${prefix}-dark`,  darken(color, 20));
    root.style.setProperty(`--${prefix}-light`, rgba(color, 0.1));
    root.style.setProperty(`--${prefix}-bg`,    rgba(color, 0.05));
    root.style.setProperty(`--${prefix}-text`,  contrast(color));
  };
  try {
    const saved = localStorage.getItem('app_theme');
    if (saved) {
      const theme = JSON.parse(saved);
      root.style.setProperty('--primary',        theme.primary);
      root.style.setProperty('--primary-dark',   theme.dark);
      root.style.setProperty('--primary-darker', theme.darker);
      root.style.setProperty('--primary-light',  theme.light);
      root.style.setProperty('--primary-bg',     theme.bg);
      root.style.setProperty('--primary-text',   contrast(theme.primary));
      if (theme.secondary) applyColorVar(theme.secondary, 'secondary');
      if (theme.tertiary)  applyColorVar(theme.tertiary,  'tertiary');
    }
  } catch (_) {}
  axios.get(`${API}/config`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => {
    const data = res.data;
    if (data?.secondary_color) applyColorVar(data.secondary_color, 'secondary');
    if (data?.tertiary_color)  applyColorVar(data.tertiary_color,  'tertiary');
  }).catch(() => {});
};

// Auth Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Restaurar usuario tras recarga de página
      axios.get(`${API}/auth/me`)
        .then(res => setUser(res.data))
        .catch(() => {
          // Token inválido o expirado
          localStorage.removeItem('token');
          setToken(null);
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
      // Aplicar colores configurados al tener sesión activa
      applyTheme(token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setLoading(false);
    }
  }, [token]);

  const login = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    // Restaurar colores por defecto (verde) al cerrar sesión
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-dark');
    root.style.removeProperty('--primary-darker');
    root.style.removeProperty('--primary-light');
    root.style.removeProperty('--primary-bg');
    root.style.removeProperty('--primary-text');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--secondary-dark');
    root.style.removeProperty('--secondary-light');
    root.style.removeProperty('--secondary-bg');
    root.style.removeProperty('--secondary-text');
    root.style.removeProperty('--tertiary');
    root.style.removeProperty('--tertiary-dark');
    root.style.removeProperty('--tertiary-light');
    root.style.removeProperty('--tertiary-bg');
    root.style.removeProperty('--tertiary-text');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Layout component
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = React.useContext(AuthContext);
  const [stockAlertCount, setStockAlertCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchStockCount = () => {
      axios.get(`${API}/dashboard/stats`)
        .then(res => setStockAlertCount(res.data?.productos?.bajo_stock || 0))
        .catch(() => {});
    };
    fetchStockCount();
    const interval = setInterval(fetchStockCount, 5 * 60 * 1000);
    window.addEventListener('stock-updated', fetchStockCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener('stock-updated', fetchStockCount);
    };
  }, [user]);

  return (
    <div className="flex h-screen bg-gray-100">
      {sidebarOpen && (
        <div
          className="sidebar-overlay overlay-visible"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} stockAlertCount={stockAlertCount} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
            {stockAlertCount > 0 && (
              <span className="hamburger-stock-badge">
                {stockAlertCount > 99 ? '99+' : stockAlertCount}
              </span>
            )}
          </button>
          <span className="text-sm font-semibold text-gray-700">PULS market·app</span>
          <div className="w-9" />
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = React.useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Landing />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos"
              element={
                <ProtectedRoute allowedRoles={['admin', 'cajero', 'supervisor']}>
                  <POS />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ProductManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/branches"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <BranchManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash"
              element={
                <ProtectedRoute allowedRoles={['admin', 'cajero', 'supervisor']}>
                  <CashManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/compras"
              element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                  <Compras />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash-report/:sessionId"
              element={
                <ProtectedRoute allowedRoles={['admin', 'cajero', 'supervisor']}>
                  <CashReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cuenta"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Cuenta />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute allowedRoles={['admin', 'cajero', 'supervisor']}>
                  <SalesReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-alerts"
              element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor', 'cajero']}>
                  <StockAlerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notificaciones"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Notificaciones />
                </ProtectedRoute>
              }
            />
            <Route path="/owner" element={<OwnerPanel />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </div>
  );
}

export { API };
export default App;