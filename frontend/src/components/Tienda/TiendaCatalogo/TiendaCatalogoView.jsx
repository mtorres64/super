import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingCart, X, Plus, Minus, User, ChevronRight, Star, Package, LogOut, MapPin, ChevronDown, Scale } from 'lucide-react';
import PaginationView from '../../Pagination/PaginationView';

const PRIMARY = 'var(--primary, #10b981)';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const driveToProxyUrl = (url) => {
  if (!url || !url.includes('drive.google.com')) return url;
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? `${BACKEND_URL}/api/drive-image?file_id=${m[1]}` : url;
};

// ── Modal cantidad por peso ───────────────────────────────────────────────────

const ModalKg = ({ producto, currencySymbol, onClose, onConfirm }) => {
  const [kg, setKg] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const cantidad = parseFloat(kg) || 0;
  const total = cantidad * (producto.precio || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cantidad <= 0) return;
    onConfirm(cantidad);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, padding: '1.75rem', maxWidth: 340, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', margin: '0 0 2px' }}>{producto.nombre}</p>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>{currencySymbol}{producto.precio?.toLocaleString('es-AR', { minimumFractionDigits: 2 })} /kg</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Cantidad (kg)</label>
          <div style={{ display: 'flex', border: '2px solid var(--primary,#10b981)', borderRadius: 10, overflow: 'hidden', marginBottom: '1rem' }}>
            <input
              ref={inputRef}
              type="number"
              step="0.001"
              min="0.001"
              value={kg}
              onChange={e => setKg(e.target.value)}
              placeholder="0.00"
              style={{ flex: 1, border: 'none', padding: '0.65rem 0.75rem', fontSize: '1.1rem', fontWeight: 700, outline: 'none', textAlign: 'center' }}
            />
            <span style={{ padding: '0 0.85rem', display: 'flex', alignItems: 'center', background: '#f9fafb', fontWeight: 700, color: '#374151', fontSize: '0.9rem', borderLeft: '1px solid #e5e7eb' }}>kg</span>
          </div>

          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#374151' }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary,#10b981)' }}>
              {currencySymbol}{total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
              Cancelar
            </button>
            <button type="submit" disabled={cantidad <= 0}
              style={{ flex: 2, padding: '0.65rem', borderRadius: 10, border: 'none', background: cantidad > 0 ? 'var(--primary,#10b981)' : '#e5e7eb', color: cantidad > 0 ? 'var(--primary-text,white)' : '#9ca3af', fontWeight: 700, cursor: cantidad > 0 ? 'pointer' : 'default', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={14} /> Agregar {cantidad > 0 ? `${cantidad} kg` : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Tarjeta de producto ───────────────────────────────────────────────────────

const ProductCard = ({ producto, onAgregar, onAgregarPeso, cantidadEnCarrito, onActualizar, currencySymbol, companyLogo }) => {
  const esPeso = producto.tipo === 'por_peso';

  return (
    <div style={{
      background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.13)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
    >
      {/* Imagen o placeholder */}
      <div style={{ height: 140, background: 'var(--primary-bg, #ecfdf5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
        {producto.imagen
          ? <img src={driveToProxyUrl(producto.imagen)} alt={producto.nombre} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
          : companyLogo
            ? <img src={companyLogo} alt="logo" style={{ height: '70%', width: '70%', objectFit: 'contain', opacity: 0.4 }} />
            : <Package style={{ width: 40, height: 40, color: PRIMARY, opacity: 0.5 }} />
        }
        {esPeso && (
          <div style={{ position: 'absolute', top: 6, left: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Scale size={10} style={{ color: 'var(--primary,#10b981)' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary,#10b981)' }}>por kg</span>
          </div>
        )}
        {cantidadEnCarrito > 0 && (
          <div style={{ position: 'absolute', top: 6, right: 6, background: PRIMARY, color: 'var(--primary-text,white)', borderRadius: esPeso ? 8 : '50%', minWidth: 20, height: 20, padding: esPeso ? '0 5px' : 0, fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {esPeso ? `${cantidadEnCarrito}kg` : cantidadEnCarrito}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '0.85rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', lineHeight: 1.3, flex: 1 }}>{producto.nombre}</p>
        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: PRIMARY, margin: 0 }}>
          {currencySymbol}{producto.precio?.toFixed(2)}
          {esPeso && <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#9ca3af' }}> / kg</span>}
        </p>

        {esPeso ? (
          cantidadEnCarrito > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <button onClick={() => onActualizar(producto.id, 0)}
                style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} />
              </button>
              <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.82rem', flex: 1, textAlign: 'center' }}>{cantidadEnCarrito} kg</span>
              <button onClick={() => onAgregarPeso(producto)}
                style={{ flex: 1, height: 30, borderRadius: 8, border: 'none', background: PRIMARY, color: 'var(--primary-text,white)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <Plus size={11} /> Más
              </button>
            </div>
          ) : (
            <button onClick={() => onAgregarPeso(producto)}
              style={{ marginTop: 4, padding: '0.45rem', borderRadius: 10, border: 'none', background: PRIMARY, color: 'var(--primary-text,white)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Scale size={13} /> Elegir cantidad
            </button>
          )
        ) : (
          cantidadEnCarrito > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <button onClick={() => onActualizar(producto.id, cantidadEnCarrito - 1)}
                style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${PRIMARY}`, background: 'white', color: PRIMARY, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={13} />
              </button>
              <span style={{ fontWeight: 700, color: '#111827', minWidth: 20, textAlign: 'center', fontSize: '0.9rem' }}>{cantidadEnCarrito}</span>
              <button onClick={() => onActualizar(producto.id, cantidadEnCarrito + 1)}
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: PRIMARY, color: 'var(--primary-text, white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={13} />
              </button>
            </div>
          ) : (
            <button onClick={() => onAgregar(producto)}
              style={{ marginTop: 4, padding: '0.45rem', borderRadius: 10, border: 'none', background: PRIMARY, color: 'var(--primary-text, white)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Plus size={13} /> Agregar
            </button>
          )
        )}
      </div>
    </div>
  );
};

// ── Drawer carrito ────────────────────────────────────────────────────────────

const DrawerCarrito = ({ carrito, carritoOpen, setCarritoOpen, onActualizar, onAgregarPeso, totalCarrito, onIrAlCheckout, currencySymbol, config }) => {
  return (
    <>
      {carritoOpen && <div onClick={() => setCarritoOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: Math.min(380, window.innerWidth - 32),
        background: 'white', zIndex: 50, boxShadow: '-4px 0 32px rgba(0,0,0,0.15)',
        transform: carritoOpen ? 'translateX(0)' : 'translateX(105%)',
        transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={18} style={{ color: PRIMARY }} /> Tu pedido
          </h3>
          <button onClick={() => setCarritoOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
          {carrito.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9ca3af' }}>
              <ShoppingCart size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem' }}>Tu carrito está vacío</p>
            </div>
          ) : carrito.map(item => (
            <div key={item.producto_id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid #f9fafb' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827', margin: '0 0 2px' }}>{item.nombre}</p>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                  {currencySymbol}{item.precio_unitario?.toFixed(2)} {item.tipo === 'por_peso' ? '/kg' : 'c/u'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {item.tipo === 'por_peso' ? (
                  <>
                    <button onClick={() => onActualizar(item.producto_id, 0)}
                      style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <X size={10} />
                    </button>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={item.cantidad}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v > 0) onActualizar(item.producto_id, v);
                      }}
                      style={{ width: 56, textAlign: 'center', border: `1.5px solid var(--primary,#10b981)`, borderRadius: 6, padding: '3px 4px', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>kg</span>
                    <button onClick={() => onAgregarPeso({ id: item.producto_id, nombre: item.nombre, precio: item.precio_unitario, tipo: 'por_peso' })}
                      style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: PRIMARY, color: 'var(--primary-text,white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Plus size={10} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onActualizar(item.producto_id, item.cantidad - 1)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: `1.5px solid ${PRIMARY}`, background: 'white', color: PRIMARY, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Minus size={11} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: 18, textAlign: 'center' }}>{item.cantidad}</span>
                    <button onClick={() => onActualizar(item.producto_id, item.cantidad + 1)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: PRIMARY, color: 'var(--primary-text,white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={11} />
                    </button>
                  </>
                )}
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', minWidth: 60, textAlign: 'right' }}>
                {currencySymbol}{(item.precio_unitario * item.cantidad).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {carrito.length > 0 && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f3f4f6' }}>
            {config?.tienda_costo_envio > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>
                <span>Subtotal</span>
                <span>{currencySymbol}{totalCarrito.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: '1rem' }}>
              <span>Total</span>
              <span>{currencySymbol}{totalCarrito.toFixed(2)}</span>
            </div>
            <button onClick={onIrAlCheckout}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 12, border: 'none', background: PRIMARY, color: 'var(--primary-text,white)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Confirmar pedido <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ── Menú usuario ──────────────────────────────────────────────────────────────

const UserMenu = ({ tiendaUser, onLogoutClick }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ fontSize: '0.8rem', color: '#374151', background: open ? '#f3f4f6' : 'none', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '0.35rem 0.65rem' }}>
        <User size={14} style={{ color: PRIMARY }} />
        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tiendaUser.nombre}</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '0.6rem 0.85rem', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Sesión iniciada como</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tiendaUser.nombre}</p>
          </div>
          <button onClick={() => { setOpen(false); onLogoutClick(); }}
            style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#ef4444', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};

const SucursalSelector = ({ sucursales, sucursalId, onCambiar }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const actual = sucursales.find(s => s.id === sucursalId) || sucursales[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (sucursales.length > 0 && !sucursalId && onCambiar) {
      onCambiar(sucursales[0].id);
    }
  }, [sucursales, sucursalId, onCambiar]);

  if (sucursales.length <= 1) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.35rem 0.65rem', borderRadius: 8, border: '1px solid #e5e7eb', background: open ? '#f3f4f6' : 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#374151' }}>
        <MapPin size={13} style={{ color: PRIMARY, flexShrink: 0 }} />
        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {actual ? actual.nombre : 'Sucursal'}
        </span>
        <ChevronDown size={12} style={{ color: '#9ca3af' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 200, zIndex: 100, overflow: 'hidden' }}>
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', padding: '0.5rem 0.85rem 0.25rem', margin: 0 }}>Seleccioná tu sucursal</p>
          {sucursales.map(s => (
            <button key={s.id} onClick={() => { onCambiar(s.id); setOpen(false); }}
              style={{ width: '100%', padding: '0.6rem 0.85rem', background: s.id === sucursalId ? 'var(--primary-bg, #ecfdf5)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 1 }}
              onMouseEnter={e => { if (s.id !== sucursalId) e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { if (s.id !== sucursalId) e.currentTarget.style.background = 'none'; }}>
              <span style={{ fontSize: '0.85rem', fontWeight: s.id === sucursalId ? 700 : 500, color: s.id === sucursalId ? PRIMARY : '#111827' }}>{s.nombre}</span>
              {s.direccion && <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{s.direccion}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Vista principal ───────────────────────────────────────────────────────────

const TiendaCatalogoView = ({
  config, empresa_id, tiendaUser,
  sucursales, sucursalId, onCambiarSucursal,
  categorias, categoriaActiva, onCategoriaClick,
  masVendidos, loadingMasVendidos,
  productos, loading, total, totalPages, page, perPage, onPageChange,
  searchInput, onSearchChange,
  carrito, carritoOpen, setCarritoOpen, agregarAlCarrito, actualizarCantidad, vaciarCarrito,
  totalCarrito, cantidadCarrito,
  onIrAlCheckout, onLoginClick, onLogoutClick,
}) => {
  const currencySymbol = config?.currency_symbol || '$';
  const storeName = config?.company_name || config?.empresa_nombre || 'Tienda';
  const getCantidadEnCarrito = (productoId) => (carrito.find(i => i.producto_id === productoId)?.cantidad || 0);

  const [kgModal, setKgModal] = useState(null);
  const handleAgregarPeso = (producto) => setKgModal(producto);
  const handleConfirmarKg = (cantidad) => { agregarAlCarrito(kgModal, cantidad); setKgModal(null); };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      backgroundImage: `
        linear-gradient(to bottom, rgba(var(--primary-rgb, 16, 185, 129), 0.38) 0%, rgba(var(--primary-rgb, 16, 185, 129), 0.00) 50%),
        linear-gradient(rgba(249,250,251,0.78) 0%, rgba(249,250,251,0.97) 22%, rgba(249,250,251,0.99) 100%),
        url('https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1800&q=80')
      `,
      backgroundSize: 'auto, auto, cover',
      backgroundPosition: 'top, top, center top',
      backgroundAttachment: 'scroll, scroll, fixed',
    }}>
      {/* ── Navbar ── */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: 12, height: 60 }}>
          {config?.company_logo
            ? <img src={config.company_logo} alt={storeName} style={{ height: 36, objectFit: 'contain' }} />
            : <div style={{ width: 36, height: 36, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{storeName.charAt(0).toUpperCase()}</span>
              </div>
          }
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', lineHeight: 1.2 }}>{storeName}</span>
            <span style={{ fontSize: '0.6rem', color: '#9ca3af', letterSpacing: '0.04em' }}>powered by <strong style={{ color: PRIMARY }}>PULS</strong></span>
          </div>

          <SucursalSelector sucursales={sucursales || []} sucursalId={sucursalId} onCambiar={onCambiarSucursal} />

          {tiendaUser ? (
            <UserMenu tiendaUser={tiendaUser} onLogoutClick={onLogoutClick} />
          ) : (
            <button onClick={onLoginClick}
              style={{ fontSize: '0.8rem', color: PRIMARY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              Ingresar
            </button>
          )}

          <button onClick={() => setCarritoOpen(true)}
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ShoppingCart size={22} style={{ color: '#374151' }} />
            {cantidadCarrito > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: PRIMARY, color: 'var(--primary-text,white)', borderRadius: '50%', width: 18, height: 18, fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cantidadCarrito > 99 ? '99+' : cantidadCarrito}
              </span>
            )}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* ── Buscador ── */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: 18, height: 18 }} />
          <input type="text" placeholder="Buscar productos..." value={searchInput} onChange={e => onSearchChange(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: '0.95rem', outline: 'none', background: 'white', boxSizing: 'border-box', transition: 'border-color .15s' }}
            onFocus={e => e.target.style.borderColor = PRIMARY}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          {searchInput && (
            <button onClick={() => onSearchChange('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Categorías ── */}
        {categorias.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              <button onClick={() => onCategoriaClick(null)}
                style={{ flexShrink: 0, padding: '0.5rem 1rem', borderRadius: 999, border: `1.5px solid ${!categoriaActiva ? PRIMARY : '#e5e7eb'}`, background: !categoriaActiva ? PRIMARY : 'white', color: !categoriaActiva ? 'var(--primary-text,white)' : '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                Todas
              </button>
              {categorias.map(cat => (
                <button key={cat.id} onClick={() => onCategoriaClick(cat.id)}
                  style={{ flexShrink: 0, padding: '0.5rem 1rem', borderRadius: 999, border: `1.5px solid ${categoriaActiva === cat.id ? PRIMARY : '#e5e7eb'}`, background: categoriaActiva === cat.id ? PRIMARY : 'white', color: categoriaActiva === cat.id ? 'var(--primary-text,white)' : '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap' }}>
                  {cat.nombre} {cat.count > 0 && <span style={{ opacity: 0.7, fontWeight: 400 }}>({cat.count})</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Más vendidos ── */}
        {masVendidos.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star size={18} style={{ color: '#f59e0b', fill: '#f59e0b' }} /> Más vendidos
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {masVendidos.map(p => (
                <ProductCard key={p.id} producto={p} currencySymbol={currencySymbol}
                  cantidadEnCarrito={getCantidadEnCarrito(p.id)}
                  onAgregar={agregarAlCarrito}
                  onAgregarPeso={handleAgregarPeso}
                  onActualizar={actualizarCantidad}
                  companyLogo={config?.company_logo}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Grilla de productos ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              {searchInput ? `Resultados para "${searchInput}"` : categoriaActiva ? categorias.find(c => c.id === categoriaActiva)?.nombre || 'Productos' : 'Todos los productos'}
            </h2>
            {!loading && <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{total} producto{total !== 1 ? 's' : ''}</span>}
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 16, background: '#f3f4f6', height: 240, animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', color: '#9ca3af' }}>
              <Package size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p>No se encontraron productos</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {productos.map(p => (
                  <ProductCard key={p.id} producto={p} currencySymbol={currencySymbol}
                    cantidadEnCarrito={getCantidadEnCarrito(p.id)}
                    onAgregar={agregarAlCarrito}
                    onAgregarPeso={handleAgregarPeso}
                    onActualizar={actualizarCantidad}
                    companyLogo={config?.company_logo}
                  />
                ))}
              </div>
              <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden' }}>
                <PaginationView currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={perPage} onPageChange={onPageChange} itemName="productos" />
              </div>
            </>
          )}
        </section>
      </div>

      <DrawerCarrito
        carrito={carrito} carritoOpen={carritoOpen} setCarritoOpen={setCarritoOpen}
        onActualizar={actualizarCantidad} onAgregarPeso={handleAgregarPeso}
        totalCarrito={totalCarrito} onIrAlCheckout={onIrAlCheckout}
        currencySymbol={currencySymbol} config={config}
      />

      {cantidadCarrito > 0 && !carritoOpen && (
        <button onClick={() => setCarritoOpen(true)}
          style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: PRIMARY, color: 'var(--primary-text,white)', border: 'none', borderRadius: 999, padding: '0.85rem 1.25rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8, zIndex: 35 }}>
          <ShoppingCart size={18} /> {cantidadCarrito} · {currencySymbol}{totalCarrito.toFixed(2)}
        </button>
      )}

      {kgModal && (
        <ModalKg
          producto={kgModal}
          currencySymbol={currencySymbol}
          onClose={() => setKgModal(null)}
          onConfirm={handleConfirmarKg}
        />
      )}
    </div>
  );
};

export default TiendaCatalogoView;
