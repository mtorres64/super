import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Menu, AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
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
import Manual from './components/Manual';
import CustomerManagement from './components/CustomerManagement';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import BranchSelectionModal from './components/BranchSelectionModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context for authentication
export const AuthContext = React.createContext();

// Apply animation preference on startup
if (localStorage.getItem('modal_animations') === 'false') {
  document.body.classList.add('no-animations');
}

// Apply dark mode preference on startup (skip login/landing)
if (localStorage.getItem('dark_mode') === 'true') {
  const path = window.location.pathname;
  if (path !== '/login' && path !== '/') {
    document.documentElement.classList.add('dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1e1e1e');
  }
}

const resetTheme = () => {
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-rgb');
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
  localStorage.removeItem('app_theme');
};

const applyTheme = (token) => {
  const root = document.documentElement;
  const brightness = (hex) => {
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return (r*299 + g*587 + b*114) / 1000;
  };
  const toRgb = (hex) => {
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return `${r}, ${g}, ${b}`;
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
      root.style.setProperty('--primary-rgb',    toRgb(theme.primary));
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
    if (data?.primary_color) {
      const c = data.primary_color;
      root.style.setProperty('--primary',        c);
      root.style.setProperty('--primary-rgb',    toRgb(c));
      root.style.setProperty('--primary-dark',   darken(c, 25));
      root.style.setProperty('--primary-darker', darken(c, 45));
      root.style.setProperty('--primary-light',  rgba(c, 0.1));
      root.style.setProperty('--primary-bg',     rgba(c, 0.05));
      root.style.setProperty('--primary-text',   contrast(c));
      localStorage.setItem('app_theme', JSON.stringify({
        primary:   c,
        dark:      darken(c, 25),
        darker:    darken(c, 45),
        light:     rgba(c, 0.1),
        bg:        rgba(c, 0.05),
        secondary: data.secondary_color || null,
        tertiary:  data.tertiary_color  || null,
      }));
    }
    if (data?.secondary_color) applyColorVar(data.secondary_color, 'secondary');
    if (data?.tertiary_color)  applyColorVar(data.tertiary_color,  'tertiary');
  }).catch(() => {});
};

// Manages dark class based on route — login and landing are always light
const DarkModeManager = () => {
  const location = useLocation();
  React.useEffect(() => {
    const PUBLIC_PATHS = ['/', '/login'];
    const isDark = localStorage.getItem('dark_mode') === 'true';
    if (isDark && !PUBLIC_PATHS.includes(location.pathname)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [location.pathname]);
  return null;
};

// Auth Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [suscripcion, setSuscripcion] = useState(null);
  const [modulosActivos, setModulosActivos] = useState([]);
  const [isImpersonating] = useState(() => localStorage.getItem('impersonation_active') === 'true');
  const impersonationEmpresa = localStorage.getItem('impersonation_empresa_nombre') || '';
  const [activeBranch, setActiveBranch] = useState(null);
  const [userBranches, setUserBranches] = useState([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchModalLoading, setBranchModalLoading] = useState(false);
  const freshLoginRef = React.useRef(false);

  const fetchSuscripcion = React.useCallback((currentToken) => {
    const tkn = currentToken || localStorage.getItem('token');
    if (!tkn) return;
    axios.get(`${API}/auth/suscripcion`, {
      headers: { Authorization: `Bearer ${tkn}` }
    }).then(res => {
      setSuscripcion(res.data);
      setModulosActivos(res.data.modules_activos || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          setUser(null);
          setToken(null);
          setSuscripcion(null);
          setModulosActivos([]);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          resetTheme();
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const fetchUserBranches = React.useCallback(async (branchIds, activeBranchId) => {
    if (!branchIds || branchIds.length === 0) return;
    try {
      const res = await axios.get(`${API}/branches`);
      const owned = res.data.filter(b => branchIds.includes(b.id));
      setUserBranches(owned);
      if (activeBranchId) {
        const branch = owned.find(b => b.id === activeBranchId);
        if (branch) setActiveBranch(branch);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Restaurar usuario tras recarga de página
      axios.get(`${API}/auth/me`)
        .then(async res => {
          setUser(res.data);
          fetchSuscripcion(token);
          const branchIds = res.data.branch_ids || [];
          const activeBranchId = res.data.active_branch_id;
          const isAdmin = res.data.rol === 'admin';
          const isFreshLogin = freshLoginRef.current;
          freshLoginRef.current = false;
          try {
            const brRes = await axios.get(`${API}/branches`);
            const allBranches = brRes.data;
            const available = isAdmin ? allBranches : allBranches.filter(b => branchIds.includes(b.id));
            setUserBranches(available);
            if (available.length > 1 && (isFreshLogin || !activeBranchId)) {
              // Login fresco con múltiples sucursales, o token sin sucursal activa: pedir selección
              setShowBranchModal(true);
            } else if (activeBranchId) {
              const branch = available.find(b => b.id === activeBranchId);
              if (branch) setActiveBranch(branch);
            } else if (available.length === 1) {
              setActiveBranch(available[0]);
            }
          } catch (_) {}
        })
        .catch(() => {
          // Token inválido o expirado
          localStorage.removeItem('token');
          setToken(null);
          delete axios.defaults.headers.common['Authorization'];
          resetTheme();
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
    resetTheme();
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    freshLoginRef.current = true;  // Marcar como login fresco (no recarga)
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
  };

  const selectBranch = async (branchId) => {
    try {
      const res = await axios.post(`${API}/auth/select-branch`, { branch_id: branchId });
      const newToken = res.data.access_token;
      const newUser = res.data.user;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      const branch = userBranches.find(b => b.id === branchId);
      setActiveBranch(branch || null);
      setShowBranchModal(false);
    } catch (_) {}
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSuscripcion(null);
    setModulosActivos([]);
    setActiveBranch(null);
    setUserBranches([]);
    setShowBranchModal(false);
    localStorage.removeItem('token');
    localStorage.removeItem('dark_mode');
    localStorage.removeItem('impersonation_active');
    localStorage.removeItem('impersonation_empresa_nombre');
    document.documentElement.classList.remove('dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
    delete axios.defaults.headers.common['Authorization'];
    resetTheme();
  };

  const stopImpersonation = () => {
    localStorage.removeItem('impersonation_active');
    localStorage.removeItem('impersonation_empresa_nombre');
    localStorage.removeItem('token');
    window.location.href = '/owner';
  };

  return (
    <AuthContext.Provider value={{
      user, token, login, logout, loading,
      suscripcion, modulosActivos, refreshSuscripcion: fetchSuscripcion,
      isImpersonating, impersonationEmpresa, stopImpersonation,
      activeBranch, userBranches, selectBranch,
      openBranchSelector: () => setShowBranchModal(true),
    }}>
      {children}
      {showBranchModal && (
        <BranchSelectionModal
          branches={userBranches}
          loading={branchModalLoading}
          onSelect={selectBranch}
        />
      )}
    </AuthContext.Provider>
  );
};

// Layout component
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, suscripcion, isImpersonating, impersonationEmpresa, stopImpersonation } = React.useContext(AuthContext);
  const [stockAlertCount, setStockAlertCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

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

  useEffect(() => {
    if (!user) return;
    const fetchNotifCount = () => {
      axios.get(`${API}/notificaciones/count`)
        .then(res => setNotifCount(res.data?.no_leidas || 0))
        .catch(() => {});
    };
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 2 * 60 * 1000);
    window.addEventListener('notif-updated', fetchNotifCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notif-updated', fetchNotifCount);
    };
  }, [user]);

  const enGracia = suscripcion?.en_gracia;
  const graciaVenc = suscripcion?.gracia_vencimiento;
  const diasGracia = suscripcion?.dias_restantes ?? 0;

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="sidebar-overlay overlay-visible"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} stockAlertCount={stockAlertCount} notifCount={notifCount} />
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(
              to bottom,
              rgba(var(--primary-rgb, 16, 185, 129), 0.12) 0%,
              rgba(var(--primary-rgb, 16, 185, 129), 0.00) 50%
            )
          `,
        }}
      >
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
            {(stockAlertCount > 0 || notifCount > 0) && (
              <span className="hamburger-stock-badge">
                {(stockAlertCount + notifCount) > 99 ? '99+' : (stockAlertCount + notifCount)}
              </span>
            )}
          </button>
          <span className="text-sm font-semibold text-gray-700">PULS market·app</span>
          <div className="w-9" />
        </div>
        {isImpersonating && (
          <div className="bg-orange-600 text-white px-4 py-2.5 flex items-center justify-between text-sm font-medium shrink-0">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Modo impersonación: <strong>{impersonationEmpresa}</strong></span>
            </div>
            <button
              onClick={stopImpersonation}
              className="flex items-center gap-1.5 bg-orange-700 hover:bg-orange-800 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Volver al panel owner
            </button>
          </div>
        )}
        {enGracia && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Tu suscripción venció.{' '}
              {diasGracia > 0
                ? `Tenés ${diasGracia} día${diasGracia !== 1 ? 's' : ''} de gracia para renovar`
                : graciaVenc
                  ? `El período de gracia vence hoy`
                  : 'El período de gracia está por vencer'
              }.{' '}
              <a href="/cuenta" className="underline font-bold">Renovar ahora</a>
            </span>
          </div>
        )}
        <main
          className="flex-1 overflow-auto"
          style={{ backgroundColor: 'transparent' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

// Pantalla de suscripción bloqueada
const SuscripcionBloqueada = ({ user }) => (
  <Layout>
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-red-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Suscripción vencida</h1>
        {user?.rol === 'admin' ? (
          <>
            <p className="text-gray-600 mb-4">
              Tu suscripción ha vencido. Renovála para continuar usando el sistema.
            </p>
            <a
              href="/cuenta"
              className="btn btn-primary inline-flex items-center gap-2"
            >
              Ir a Mi Cuenta
            </a>
          </>
        ) : (
          <p className="text-gray-600">
            La suscripción de esta cuenta ha vencido. Contactá al administrador para renovarla.
          </p>
        )}
      </div>
    </div>
  </Layout>
);

// Pantalla cuando el módulo no está disponible en el plan
const ModuloNoDisponible = () => (
  <Layout>
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-yellow-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Módulo no disponible</h1>
        <p className="text-gray-600 mb-4">
          Esta función no está incluida en tu plan actual. Contactá al administrador para habilitarla.
        </p>
        <a href="/cuenta" className="btn btn-primary inline-flex items-center gap-2">
          Ver mi plan
        </a>
      </div>
    </div>
  </Layout>
);

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles = [], skipSubscriptionCheck = false, modulo = null }) => {
  const { user, loading, suscripcion, modulosActivos } = React.useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" />;
  }

  // Control de acceso por suscripción (saltar para /cuenta y /settings)
  if (!skipSubscriptionCheck && suscripcion?.bloqueado) {
    if (user.rol === 'admin' && location.pathname !== '/cuenta') {
      return <Navigate to="/cuenta" />;
    }
    if (user.rol !== 'admin') {
      return <SuscripcionBloqueada user={user} />;
    }
  }

  // Control de acceso por módulo (solo si la suscripción no está bloqueada y hay módulos cargados)
  if (modulo && !suscripcion?.bloqueado && modulosActivos.length > 0 && !modulosActivos.includes(modulo)) {
    return <ModuloNoDisponible />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <DarkModeManager />
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
                <ProtectedRoute allowedRoles={['admin', 'cajero', 'supervisor']} modulo="pos">
                  <POS />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute allowedRoles={['admin']} modulo="inventario">
                  <ProductManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor']} modulo="reportes">
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={<Navigate to="/settings" replace />}
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']} modulo="configuracion">
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute allowedRoles={['admin']} modulo="clientes">
                  <CustomerManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/branches"
              element={
                <ProtectedRoute allowedRoles={['admin']} modulo="multi_sucursal">
                  <BranchManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash"
              element={
                <ProtectedRoute allowedRoles={['admin', 'cajero', 'supervisor']} modulo="caja">
                  <CashManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/compras"
              element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor']} modulo="compras">
                  <Compras />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash-report/:sessionId"
              element={
                <ProtectedRoute allowedRoles={['admin', 'cajero', 'supervisor']} modulo="caja">
                  <CashReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cuenta"
              element={
                <ProtectedRoute allowedRoles={['admin']} skipSubscriptionCheck>
                  <Cuenta />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute allowedRoles={['admin', 'cajero', 'supervisor']} modulo="reportes">
                  <SalesReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-alerts"
              element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor', 'cajero']} modulo="alertas_stock">
                  <StockAlerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notificaciones"
              element={
                <ProtectedRoute allowedRoles={['admin']} modulo="notificaciones">
                  <Notificaciones />
                </ProtectedRoute>
              }
            />
            <Route path="/owner" element={<OwnerPanel />} />
            <Route
              path="/manual"
              element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor', 'cajero']}>
                  <Manual />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </div>
  );
}

export { API };
export default App;