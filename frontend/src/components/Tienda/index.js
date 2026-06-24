import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_TIENDA = (empresaId) => `${BACKEND_URL}/api/tienda/${empresaId}`;

export const TiendaAuthContext = React.createContext();
export const TiendaContext = React.createContext();
export const TiendaSucursalContext = React.createContext();

// ── Helpers de tema (igual que App.js) ───────────────────────────────────────

const toRgb = (hex) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};
const brightness = (hex) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
};
const contrast = (hex) => brightness(hex) > 155 ? '#1f2937' : 'white';
const darken = (hex, amt) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `#${[r - amt, g - amt, b - amt].map(v => Math.max(0, v).toString(16).padStart(2, '0')).join('')}`;
};
const rgba = (hex, a) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const applyTiendaTheme = (primary, secondary, tertiary) => {
  const root = document.documentElement;
  if (primary) {
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-rgb', toRgb(primary));
    root.style.setProperty('--primary-dark', darken(primary, 25));
    root.style.setProperty('--primary-darker', darken(primary, 45));
    root.style.setProperty('--primary-light', rgba(primary, 0.1));
    root.style.setProperty('--primary-bg', rgba(primary, 0.05));
    root.style.setProperty('--primary-text', contrast(primary));
  }
  const applyExtra = (color, prefix) => {
    if (!color) return;
    root.style.setProperty(`--${prefix}`, color);
    root.style.setProperty(`--${prefix}-dark`, darken(color, 20));
    root.style.setProperty(`--${prefix}-light`, rgba(color, 0.1));
    root.style.setProperty(`--${prefix}-bg`, rgba(color, 0.05));
    root.style.setProperty(`--${prefix}-text`, contrast(color));
  };
  applyExtra(secondary, 'secondary');
  applyExtra(tertiary, 'tertiary');
};

const resetTheme = () => {
  const root = document.documentElement;
  ['--primary', '--primary-rgb', '--primary-dark', '--primary-darker', '--primary-light', '--primary-bg', '--primary-text',
    '--secondary', '--secondary-dark', '--secondary-light', '--secondary-bg', '--secondary-text',
    '--tertiary', '--tertiary-dark', '--tertiary-light', '--tertiary-bg', '--tertiary-text',
  ].forEach(v => root.style.removeProperty(v));
};

// ── Carrito ───────────────────────────────────────────────────────────────────

const CARRITO_KEY = (id) => `tienda_carrito_${id}`;

const loadCarrito = (empresaId) => {
  try { return JSON.parse(localStorage.getItem(CARRITO_KEY(empresaId))) || []; } catch { return []; }
};
const saveCarrito = (empresaId, items) => {
  localStorage.setItem(CARRITO_KEY(empresaId), JSON.stringify(items));
};

// ── Token auth ────────────────────────────────────────────────────────────────

const TOKEN_KEY = (id) => `tienda_token_${id}`;

// ── Wrapper principal ─────────────────────────────────────────────────────────

const Tienda = ({ seccion }) => {
  const { empresa_id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [error, setError] = useState(null);
  const [sucursales, setSucursales] = useState([]);

  // Auth del cliente tienda
  const [tiendaToken, setTiendaToken] = useState(() => localStorage.getItem(TOKEN_KEY(empresa_id)));
  const [tiendaUser, setTiendaUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(() => !!localStorage.getItem(TOKEN_KEY(empresa_id)));

  // Carrito
  const [carrito, setCarritoState] = useState(() => loadCarrito(empresa_id));
  const [carritoOpen, setCarritoOpen] = useState(false);

  // Cargar config de la empresa (colores, nombre, etc.)
  useEffect(() => {
    setLoadingConfig(true);
    Promise.all([
      axios.get(`${BACKEND_URL}/api/tienda/${empresa_id}/config`),
      axios.get(`${BACKEND_URL}/api/tienda/${empresa_id}/sucursales`),
    ])
      .then(([cfgRes, sucRes]) => {
        setConfig(cfgRes.data);
        setSucursales(sucRes.data);
        applyTiendaTheme(cfgRes.data.primary_color, cfgRes.data.secondary_color, cfgRes.data.tertiary_color);
      })
      .catch(() => setError('No se pudo cargar la tienda.'))
      .finally(() => setLoadingConfig(false));
    return () => resetTheme();
  }, [empresa_id]);

  // Validar token guardado
  useEffect(() => {
    if (!tiendaToken) { setLoadingAuth(false); return; }
    setLoadingAuth(true);
    axios.get(`${BACKEND_URL}/api/tienda/${empresa_id}/auth/me`, {
      headers: { Authorization: `Bearer ${tiendaToken}` }
    })
      .then(res => setTiendaUser(res.data))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY(empresa_id));
        setTiendaToken(null);
        setTiendaUser(null);
      })
      .finally(() => setLoadingAuth(false));
  }, [tiendaToken, empresa_id]);

  const tiendaLogin = (userData, token) => {
    localStorage.setItem(TOKEN_KEY(empresa_id), token);
    setTiendaToken(token);
    setTiendaUser(userData);
  };

  const updateTiendaUser = (partial) => {
    setTiendaUser(prev => prev ? { ...prev, ...partial } : prev);
  };

  const tiendaLogout = () => {
    localStorage.removeItem(TOKEN_KEY(empresa_id));
    setTiendaToken(null);
    setTiendaUser(null);
  };

  const persistCarrito = (items) => {
    setCarritoState(items);
    saveCarrito(empresa_id, items);
  };

  const agregarAlCarrito = (producto, cantidad = 1) => {
    setCarritoState(prev => {
      const idx = prev.findIndex(i => i.producto_id === producto.id);
      let next;
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + cantidad };
      } else {
        next = [...prev, { producto_id: producto.id, nombre: producto.nombre, precio_unitario: producto.precio, cantidad }];
      }
      saveCarrito(empresa_id, next);
      return next;
    });
  };

  const actualizarCantidad = (producto_id, cantidad) => {
    setCarritoState(prev => {
      const next = cantidad <= 0
        ? prev.filter(i => i.producto_id !== producto_id)
        : prev.map(i => i.producto_id === producto_id ? { ...i, cantidad } : i);
      saveCarrito(empresa_id, next);
      return next;
    });
  };

  const vaciarCarrito = () => {
    setCarritoState([]);
    saveCarrito(empresa_id, []);
  };

  const cambiarSucursal = async (nuevaSucursalId, token) => {
    try {
      await axios.patch(`${BACKEND_URL}/api/tienda/${empresa_id}/auth/sucursal`,
        { sucursal_id: nuevaSucursalId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Recalcular precios del carrito con la nueva sucursal
      setCarritoState(prev => {
        if (prev.length === 0) return prev;
        const ids = prev.map(i => i.producto_id);
        axios.post(`${BACKEND_URL}/api/tienda/${empresa_id}/carrito/precios`, {
          sucursal_id: nuevaSucursalId,
          producto_ids: ids,
        }).then(({ data: precios }) => {
          setCarritoState(current => {
            const updated = current
              .map(item => {
                const nuevoPrecio = precios[item.producto_id];
                if (nuevoPrecio === null || nuevoPrecio === undefined) return null; // producto no disponible
                return { ...item, precio_unitario: nuevoPrecio };
              })
              .filter(Boolean);
            saveCarrito(empresa_id, updated);
            return updated;
          });
        }).catch(() => {});
        return prev;
      });
    } catch (err) {
      throw err;
    }
  };

  const totalCarrito = carrito.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0);
  const cantidadCarrito = carrito.reduce((sum, i) => sum + i.cantidad, 0);

  if (loadingConfig) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
        <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  if (config && !config.tienda_activa) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, background: '#f9fafb' }}>
        <div style={{ fontSize: '3rem' }}>🛒</div>
        <h2 style={{ fontWeight: 700, fontSize: '1.4rem', color: '#111827' }}>{config.company_name || config.empresa_nombre}</h2>
        <p style={{ color: '#6b7280' }}>La tienda está temporalmente cerrada. ¡Volvé pronto!</p>
        {config.tienda_horario && <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{config.tienda_horario}</p>}
      </div>
    );
  }

  const authCtxValue = { tiendaUser, tiendaToken, tiendaLogin, tiendaLogout, updateTiendaUser, empresa_id, loadingAuth };
  const tiendaCtxValue = {
    config, empresa_id,
    sucursales,
    carrito, carritoOpen, setCarritoOpen,
    agregarAlCarrito, actualizarCantidad, vaciarCarrito,
    cambiarSucursal: (id) => cambiarSucursal(id, tiendaToken),
    totalCarrito, cantidadCarrito,
    apiBase: `${BACKEND_URL}/api/tienda/${empresa_id}`,
    authHeaders: tiendaToken ? { Authorization: `Bearer ${tiendaToken}` } : {},
  };

  return (
    <TiendaAuthContext.Provider value={authCtxValue}>
      <TiendaContext.Provider value={tiendaCtxValue}>
        <TiendaRouter seccion={seccion} />
      </TiendaContext.Provider>
    </TiendaAuthContext.Provider>
  );
};

// Lazy imports para evitar circular
const TiendaLogin = React.lazy(() => import('./TiendaLogin'));
const TiendaCatalogo = React.lazy(() => import('./TiendaCatalogo'));
const TiendaCheckout = React.lazy(() => import('./TiendaCheckout'));

const TiendaRouter = ({ seccion }) => {
  const { tiendaUser, loadingAuth } = React.useContext(TiendaAuthContext);
  const { empresa_id } = React.useContext(TiendaContext);
  const navigate = useNavigate();

  if (loadingAuth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-green-600" />
      </div>
    );
  }

  if (seccion === 'login') {
    if (tiendaUser) { navigate(`/tienda/${empresa_id}`); return null; }
    return <React.Suspense fallback={<div />}><TiendaLogin /></React.Suspense>;
  }
  if (!tiendaUser) {
    navigate(`/tienda/${empresa_id}/login`);
    return null;
  }
  if (seccion === 'checkout') {
    return <React.Suspense fallback={<div />}><TiendaCheckout /></React.Suspense>;
  }
  return <React.Suspense fallback={<div />}><TiendaCatalogo /></React.Suspense>;
};

export { API_TIENDA };
export default Tienda;
