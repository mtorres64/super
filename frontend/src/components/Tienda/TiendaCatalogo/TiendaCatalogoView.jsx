import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingCart, X, Plus, Minus, User, ChevronRight, ChevronLeft, Star, Package, LogOut, MapPin, ChevronDown, Scale } from 'lucide-react';
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

const ProductCard = ({ producto, onAgregar, onAgregarPeso, cantidadEnCarrito, onActualizar, currencySymbol, companyLogo, style, sucursalCerrada, onVerDetalle }) => {
  const esPeso = producto.tipo === 'por_peso';

  return (
    <div style={{
      background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow .2s',
      ...style,
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.13)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
    >
      {/* Imagen o placeholder — click abre detalle */}
      <div onClick={() => onVerDetalle?.(producto)} style={{ aspectRatio: '1 / 1', width: '100%', background: 'var(--primary-bg, #ecfdf5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
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
          <div style={{ position: 'absolute', top: 6, right: 6, background: '#10b981', color: 'white', borderRadius: esPeso ? 8 : '50%', minWidth: 20, height: 20, padding: esPeso ? '0 5px' : 0, fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {esPeso ? `${cantidadEnCarrito}kg` : cantidadEnCarrito}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '0.85rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p onClick={() => onVerDetalle?.(producto)} style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', lineHeight: 1.3, flex: 1, cursor: 'pointer' }}>{producto.nombre}</p>
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
              <button onClick={sucursalCerrada ? undefined : () => onAgregarPeso(producto)} disabled={sucursalCerrada}
                style={{ flex: 1, height: 30, borderRadius: 8, border: 'none', background: sucursalCerrada ? '#e5e7eb' : PRIMARY, color: sucursalCerrada ? '#9ca3af' : 'var(--primary-text,white)', cursor: sucursalCerrada ? 'not-allowed' : 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <Plus size={11} /> Más
              </button>
            </div>
          ) : (
            <button onClick={sucursalCerrada ? undefined : () => onAgregarPeso(producto)} disabled={sucursalCerrada}
              style={{ marginTop: 4, padding: '0.45rem', borderRadius: 10, border: 'none', background: sucursalCerrada ? '#e5e7eb' : PRIMARY, color: sucursalCerrada ? '#9ca3af' : 'var(--primary-text,white)', cursor: sucursalCerrada ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
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
              <button onClick={sucursalCerrada ? undefined : () => onActualizar(producto.id, cantidadEnCarrito + 1)} disabled={sucursalCerrada}
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: sucursalCerrada ? '#e5e7eb' : PRIMARY, color: sucursalCerrada ? '#9ca3af' : 'var(--primary-text, white)', cursor: sucursalCerrada ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={13} />
              </button>
            </div>
          ) : (
            <button onClick={sucursalCerrada ? undefined : () => onAgregar(producto)} disabled={sucursalCerrada}
              style={{ marginTop: 4, padding: '0.45rem', borderRadius: 10, border: 'none', background: sucursalCerrada ? '#e5e7eb' : PRIMARY, color: sucursalCerrada ? '#9ca3af' : 'var(--primary-text, white)', cursor: sucursalCerrada ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Plus size={13} /> Agregar
            </button>
          )
        )}
      </div>
    </div>
  );
};

// ── Modal detalle producto ────────────────────────────────────────────────────

const ModalProducto = ({ producto, config, currencySymbol, companyLogo, cantidadEnCarrito, onAgregar, onAgregarPeso, onActualizar, sucursalCerrada, onClose }) => {
  const esPeso = producto.tipo === 'por_peso';
  const [kgModal, setKgModal] = useState(null);
  const isMobile = window.innerWidth < 640;

  const paymentAdj = config?.payment_method_adjustments || {};
  const metodosPago = [
    { key: 'efectivo', label: 'Efectivo', icon: '💵' },
    { key: 'tarjeta', label: 'Tarjeta', icon: '💳' },
    { key: 'transferencia', label: 'Transferencia', icon: '🏦' },
  ].filter(m => paymentAdj[m.key] !== undefined);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: isMobile ? '20px 20px 0 0' : 20,
        width: '100%', maxWidth: isMobile ? '100%' : 560,
        maxHeight: isMobile ? '92vh' : '88vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
      }}>
        {/* Imagen */}
        <div style={{ position: 'relative', background: 'var(--primary-bg,#ecfdf5)', flexShrink: 0 }}>
          <div style={{ aspectRatio: isMobile ? '4/3' : '16/9', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {producto.imagen
              ? <img src={driveToProxyUrl(producto.imagen)} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : companyLogo
                ? <img src={companyLogo} alt="logo" style={{ height: '50%', objectFit: 'contain', opacity: 0.35 }} />
                : <Package size={64} style={{ color: PRIMARY, opacity: 0.3 }} />
            }
          </div>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <X size={16} />
          </button>
          {esPeso && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Scale size={11} style={{ color: 'var(--primary,#10b981)' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary,#10b981)' }}>por kg</span>
            </div>
          )}
        </div>

        {/* Contenido scrolleable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>{producto.nombre}</h2>

          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: PRIMARY, margin: '0 0 1rem' }}>
            {currencySymbol}{producto.precio?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            {esPeso && <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#9ca3af' }}> / kg</span>}
          </p>

          {producto.descripcion && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripción</p>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{producto.descripcion}</p>
            </div>
          )}

          {/* Métodos de pago */}
          {metodosPago.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medios de pago</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {metodosPago.map(m => {
                  const adj = paymentAdj[m.key] || 0;
                  return (
                    <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.4rem 0.75rem' }}>
                      <span>{m.icon}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{m.label}</span>
                      {adj !== 0 && (
                        <span style={{ fontSize: '0.72rem', color: adj > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                          {adj > 0 ? `+${adj}%` : `${adj}%`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Métodos de envío */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entrega</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {config?.tienda_envio_activo !== false && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.5rem 0.85rem' }}>
                  <span>🚚</span>
                  <span style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 500 }}>
                    Envío a domicilio
                    {config?.tienda_costo_envio > 0
                      ? <span style={{ color: '#6b7280', fontWeight: 400 }}> · {currencySymbol}{config.tienda_costo_envio.toLocaleString('es-AR')}</span>
                      : <span style={{ color: '#10b981', fontWeight: 700 }}> · Gratis</span>
                    }
                  </span>
                </div>
              )}
              {config?.tienda_retiro_activo !== false && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.5rem 0.85rem' }}>
                  <span>🏪</span>
                  <span style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 500 }}>Retiro en sucursal · Gratis</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botón agregar */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
          {esPeso ? (
            cantidadEnCarrito > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => onActualizar(producto.id, 0)}
                  style={{ width: 44, height: 44, borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={16} />
                </button>
                <span style={{ fontWeight: 700, color: '#111827', flex: 1, textAlign: 'center' }}>{cantidadEnCarrito} kg</span>
                <button onClick={sucursalCerrada ? undefined : () => onAgregarPeso(producto)} disabled={sucursalCerrada}
                  style={{ flex: 2, height: 44, borderRadius: 10, border: 'none', background: sucursalCerrada ? '#e5e7eb' : PRIMARY, color: sucursalCerrada ? '#9ca3af' : 'var(--primary-text,white)', cursor: sucursalCerrada ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Plus size={15} /> Agregar más
                </button>
              </div>
            ) : (
              <button onClick={sucursalCerrada ? undefined : () => onAgregarPeso(producto)} disabled={sucursalCerrada}
                style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: sucursalCerrada ? '#e5e7eb' : PRIMARY, color: sucursalCerrada ? '#9ca3af' : 'var(--primary-text,white)', cursor: sucursalCerrada ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Scale size={16} /> Elegir cantidad
              </button>
            )
          ) : (
            cantidadEnCarrito > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => onActualizar(producto.id, cantidadEnCarrito - 1)}
                  style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${PRIMARY}`, background: 'white', color: PRIMARY, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Minus size={16} />
                </button>
                <span style={{ fontWeight: 800, color: '#111827', flex: 1, textAlign: 'center', fontSize: '1.1rem' }}>{cantidadEnCarrito}</span>
                <button onClick={sucursalCerrada ? undefined : () => onActualizar(producto.id, cantidadEnCarrito + 1)} disabled={sucursalCerrada}
                  style={{ width: 44, height: 44, borderRadius: 10, border: 'none', background: sucursalCerrada ? '#e5e7eb' : PRIMARY, color: sucursalCerrada ? '#9ca3af' : 'var(--primary-text,white)', cursor: sucursalCerrada ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <button onClick={sucursalCerrada ? undefined : () => { onAgregar(producto); onClose(); }} disabled={sucursalCerrada}
                style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: sucursalCerrada ? '#e5e7eb' : PRIMARY, color: sucursalCerrada ? '#9ca3af' : 'var(--primary-text,white)', cursor: sucursalCerrada ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Plus size={18} /> Agregar al carrito
              </button>
            )
          )}
        </div>

        {kgModal && (
          <ModalKg
            producto={kgModal}
            currencySymbol={currencySymbol}
            onClose={() => setKgModal(null)}
            onConfirm={(cantidad) => { onAgregar(kgModal, cantidad); setKgModal(null); }}
          />
        )}
      </div>
    </div>
  );
};

// ── Drawer carrito ────────────────────────────────────────────────────────────

const DrawerCarrito = ({ carrito, carritoOpen, setCarritoOpen, onActualizar, onAgregarPeso, totalCarrito, onIrAlCheckout, currencySymbol, config }) => {
  const isMobile = window.innerWidth < 640;
  return (
    <>
      {carritoOpen && !isMobile && <div onClick={() => setCarritoOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh',
        width: isMobile ? '100%' : Math.min(380, window.innerWidth - 32),
        background: 'white', zIndex: 50, boxShadow: isMobile ? 'none' : '-4px 0 32px rgba(0,0,0,0.15)',
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
              style={{ width: '100%', padding: '0.75rem', borderRadius: 12, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
      <button onClick={() => setOpen(o => !o)} className="tienda-usermenu-btn"
        style={{ fontSize: '0.8rem', color: '#374151', background: open ? '#f3f4f6' : 'none', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '0.35rem 0.65rem' }}>
        <User size={14} style={{ color: PRIMARY }} />
        <span className="hidden sm:inline-block" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tiendaUser.nombre}</span>
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
        <MapPin size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {actual ? actual.nombre : 'Sucursal'}
        </span>
        <ChevronDown size={12} style={{ color: '#9ca3af' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 220, zIndex: 100, overflow: 'hidden' }}>
          <p style={{ fontSize: '0.68rem', color: '#9ca3af', padding: '0.6rem 1rem 0.3rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Seleccioná tu sucursal</p>
          {sucursales.map(s => {
            const cerrada = s.tienda_activa === false;
            return (
              <button key={s.id}
                onClick={() => { if (!cerrada) { onCambiar(s.id); setOpen(false); } }}
                style={{ width: '100%', padding: '0.6rem 1rem', background: s.id === sucursalId ? 'var(--primary-bg, #ecfdf5)' : 'none', border: 'none', cursor: cerrada ? 'default' : 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 10, opacity: cerrada ? 0.55 : 1 }}
                onMouseEnter={e => { if (s.id !== sucursalId && !cerrada) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { if (s.id !== sucursalId) e.currentTarget.style.background = 'none'; }}>
                <MapPin size={14} style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: s.id === sucursalId ? 700 : 500, color: s.id === sucursalId ? PRIMARY : '#111827' }}>{s.nombre}</span>
                    {cerrada && <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', borderRadius: 99, padding: '1px 6px', fontWeight: 600 }}>Cerrada</span>}
                  </div>
                  {s.direccion && <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{s.direccion}</span>}
                </div>
              </button>
            );
          })}
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
  sort, onSortChange,
  carrito, carritoOpen, setCarritoOpen, agregarAlCarrito, actualizarCantidad, vaciarCarrito,
  totalCarrito, cantidadCarrito,
  onIrAlCheckout, onLoginClick, onLogoutClick,
}) => {
  const currencySymbol = config?.currency_symbol || '$';
  const storeName = config?.company_name || config?.empresa_nombre || 'Tienda';
  const getCantidadEnCarrito = (productoId) => (carrito.find(i => i.producto_id === productoId)?.cantidad || 0);
  const sucursalCerrada = sucursales.find(s => s.id === sucursalId)?.tienda_activa === false;

  const [kgModal, setKgModal] = useState(null);
  const handleAgregarPeso = (producto) => setKgModal(producto);
  const handleConfirmarKg = (cantidad) => { agregarAlCarrito(kgModal, cantidad); setKgModal(null); };

  const [productoDetalle, setProductoDetalle] = useState(null);

  const footerRef = useRef(null);
  const [cartBottom, setCartBottom] = useState(24);
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCartBottom(entry.intersectionRect.height + 24);
        } else {
          setCartBottom(24);
        }
      },
      { threshold: Array.from({ length: 101 }, (_, i) => i / 100) }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const masVendidosRef = useRef(null);
  const isMobile = window.innerWidth < 768;
  const scrollMasVendidos = (dir) => {
    masVendidosRef.current?.scrollBy({ left: dir * 530, behavior: 'smooth' });
  };

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
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', height: 60 }}>
          {/* Izquierda: logo + nombre (desktop) */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            {config?.company_logo
              ? <img src={config.company_logo} alt={storeName} style={{ height: 36, objectFit: 'contain' }} />
              : <div style={{ width: 36, height: 36, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{storeName.charAt(0).toUpperCase()}</span>
                </div>
            }
            <div className="hidden sm:flex sm:flex-col" style={{ gap: '1px' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', lineHeight: 1.2 }}>{storeName}</span>
              <span style={{ fontSize: '0.6rem', color: '#9ca3af', letterSpacing: '0.04em' }}>powered by <a href="/" target="_blank" rel="noreferrer" style={{ color: '#10b981', fontWeight: 700, textDecoration: 'none' }}>PULS</a></span>
            </div>
          </div>
          {/* Centro: sucursal */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <SucursalSelector sucursales={sucursales || []} sucursalId={sucursalId} onCambiar={onCambiarSucursal} />
          </div>

          {/* Derecha: usuario, carrito */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            {tiendaUser ? (
              <UserMenu tiendaUser={tiendaUser} onLogoutClick={onLogoutClick} />
            ) : (
              <button onClick={onLoginClick}
                style={{ fontSize: '0.8rem', color: PRIMARY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={16} style={{ color: PRIMARY }} />
                <span className="hidden sm:inline-block">Ingresar</span>
              </button>
            )}

            <button onClick={() => setCarritoOpen(true)}
              style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <ShoppingCart size={22} style={{ color: '#374151' }} />
              {cantidadCarrito > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: '#10b981', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cantidadCarrito > 99 ? '99+' : cantidadCarrito}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Buscador + Categorías (sticky) ── */}
      <div style={{ position: 'sticky', top: 60, zIndex: 20, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0.75rem 1rem' }}>
          <div style={{ position: 'relative', marginBottom: categorias.length > 0 ? '0.6rem' : 0 }}>
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
          {categorias.length > 0 && (
            <div className="tienda-cats-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
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
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* ── Sucursal cerrada ── */}
        {sucursales.find(s => s.id === sucursalId)?.tienda_activa === false && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontWeight: 700, color: '#dc2626', margin: 0, fontSize: '1rem' }}>Esta sucursal está cerrada</p>
            {sucursales.some(s => s.id !== sucursalId && s.tienda_activa !== false) && (
              <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>
                Probá seleccionando otra sucursal disponible.
              </p>
            )}
          </div>
        )}

        {/* ── Más vendidos ── */}
        {masVendidos.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star size={18} style={{ color: '#f59e0b', fill: '#f59e0b' }} /> Más vendidos
            </h2>
            <div style={{ position: 'relative' }}>
              {!isMobile && (
                <button onClick={() => scrollMasVendidos(-1)}
                  style={{ position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 5, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
                  <ChevronLeft size={18} />
                </button>
              )}
              <div ref={masVendidosRef} style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {masVendidos.map(p => (
                  <div key={p.id} style={{ flexShrink: 0, width: 160, display: 'flex', flexDirection: 'column' }}>
                    <ProductCard producto={p} currencySymbol={currencySymbol}
                      cantidadEnCarrito={getCantidadEnCarrito(p.id)}
                      onAgregar={agregarAlCarrito}
                      onAgregarPeso={handleAgregarPeso}
                      onActualizar={actualizarCantidad}
                      companyLogo={config?.company_logo}
                      sucursalCerrada={sucursalCerrada}
                      onVerDetalle={setProductoDetalle}
                      style={{ flex: 1 }}
                    />
                  </div>
                ))}
              </div>
              {!isMobile && (
                <button onClick={() => scrollMasVendidos(1)}
                  style={{ position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 5, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── Grilla de productos ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: 8 }}>
            <div className="tienda-section-title-group" style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                {searchInput ? `Resultados para "${searchInput}"` : categoriaActiva ? categorias.find(c => c.id === categoriaActiva)?.nombre || 'Productos' : 'Todos los productos'}
              </h2>
              {!loading && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{total} producto{total !== 1 ? 's' : ''}</span>}
            </div>
            <select value={sort} onChange={e => onSortChange(e.target.value)}
              style={{ fontSize: '0.8rem', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.3rem 0.6rem', background: 'white', cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
              <option value="nombre_asc">Ordenar por</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
            </select>
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
                    sucursalCerrada={sucursalCerrada}
                    onVerDetalle={setProductoDetalle}
                  />
                ))}
              </div>
              <div id="tienda-paginacion" style={{ background: 'white', borderRadius: 12, overflow: 'hidden' }}>
                <PaginationView currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={perPage} onPageChange={onPageChange} itemName="productos" />
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── Footer ── */}
      <footer ref={footerRef} style={{ marginTop: isMobile ? '0.5rem' : '2rem', padding: '2rem 1rem', paddingBottom: isMobile && cantidadCarrito > 0 && !carritoOpen ? '5rem' : '2rem', background: PRIMARY }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem', alignItems: isMobile ? 'center' : 'flex-start' }}>

            {/* Columna izquierda: info empresa */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', gap: '0.6rem', textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {config?.company_logo
                  ? <img src={config.company_logo} alt={storeName} style={{ height: 36, objectFit: 'contain' }} />
                  : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{storeName.charAt(0).toUpperCase()}</span>
                    </div>
                }
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'white' }}>{storeName}</span>
              </div>
              {config?.tienda_descripcion && (
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{config.tienda_descripcion}</p>
              )}
              {config?.tienda_horario && (
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>🕐 {config.tienda_horario}</p>
              )}
              <div style={{ marginTop: '0.25rem', background: 'white', borderRadius: 999, padding: '0.3rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', letterSpacing: '0.04em' }}>Powered by</span>
                <a href="/" target="_blank" rel="noreferrer" style={{ color: '#10b981', fontWeight: 700, fontSize: '0.7rem', textDecoration: 'none', letterSpacing: '0.04em' }}>PULS</a>
              </div>
            </div>

            {/* Columna derecha: sucursales */}
            {sucursales?.length > 0 && sucursales.some(s => s.direccion || s.telefono) && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sucursales</span>
                {sucursales.filter(s => s.direccion || s.telefono).map(s => (
                  <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{s.nombre}</span>
                    {s.direccion && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={11} style={{ color: '#ef4444', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>{s.direccion}</span>
                      </div>
                    )}
                    {s.telefono && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>📞 {s.telefono}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </footer>

      <DrawerCarrito
        carrito={carrito} carritoOpen={carritoOpen} setCarritoOpen={setCarritoOpen}
        onActualizar={actualizarCantidad} onAgregarPeso={handleAgregarPeso}
        totalCarrito={totalCarrito} onIrAlCheckout={onIrAlCheckout}
        currencySymbol={currencySymbol} config={config}
      />

      {cantidadCarrito > 0 && !carritoOpen && (
        <button onClick={() => setCarritoOpen(true)}
          style={isMobile
            ? { position: 'fixed', bottom: 0, left: 0, right: 0, background: PRIMARY, color: 'var(--primary-text,white)', border: 'none', borderRadius: 0, padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 -2px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 35 }
            : { position: 'fixed', bottom: cartBottom, right: '1.5rem', background: PRIMARY, color: 'var(--primary-text,white)', border: 'none', borderRadius: 999, padding: '0.85rem 1.25rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8, zIndex: 35, transition: 'bottom 0.2s ease' }
          }>
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

      {productoDetalle && (
        <ModalProducto
          producto={productoDetalle}
          config={config}
          currencySymbol={currencySymbol}
          companyLogo={config?.company_logo}
          cantidadEnCarrito={getCantidadEnCarrito(productoDetalle.id)}
          onAgregar={agregarAlCarrito}
          onAgregarPeso={handleAgregarPeso}
          onActualizar={actualizarCantidad}
          sucursalCerrada={sucursalCerrada}
          onClose={() => setProductoDetalle(null)}
        />
      )}
    </div>
  );
};

export default TiendaCatalogoView;
