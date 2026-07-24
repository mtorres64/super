import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MapPin, Store, FileText, CheckCircle, ShoppingCart, Building2, Banknote, CreditCard, ArrowRightLeft, ChevronDown } from 'lucide-react';
const MapaPicker = lazy(() => import('./MapaPicker'));

const PRIMARY = 'var(--primary, #10b981)';
const PRIMARY_BG = 'var(--primary-bg, #ecfdf5)';

const PROVINCIAS_AR = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

const MEDIOS_PAGO = [
  { value: 'efectivo',      label: 'Efectivo',               Icon: Banknote,         desc: 'Al recibir o retirar el pedido' },
  { value: 'transferencia', label: 'Transferencia bancaria',  Icon: ArrowRightLeft,   desc: 'Te enviamos los datos al confirmar' },
  { value: 'tarjeta',       label: 'Tarjeta',                 Icon: CreditCard,       desc: 'Al recibir o retirar el pedido' },
];


function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistancia(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function AnimatedPrice({ value, prefix = '', style }) {
  const [animKey, setAnimKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setAnimKey(k => k + 1);
    }
  }, [value]);
  return (
    <span style={style}>
      <span key={animKey} className={animKey > 0 ? 'price-changed' : ''}>
        {prefix}{typeof value === 'number' ? value.toFixed(2) : value}
      </span>
    </span>
  );
}

const TiendaCheckoutView = ({
  config, empresa_id, tiendaUser, isEcommerce,
  sucursales = [], sucursalId, onCambiarSucursal, cambiandoSucursal,
  carrito, tipoEntrega, setTipoEntrega,
  direccion, setDireccion, dirEcommerce, setDirEcommerce,
  coordenadas, setCoordenadas,
  medioPago, setMedioPago,
  observaciones, setObservaciones, loading,
  costoEnvio, costoExtraDistancia = 0, totalCarrito, totalFinal, currencySymbol,
  pedidoConfirmado, onConfirmar, onVolverCatalogo,
}) => {
  const setDir = (field, value) => setDirEcommerce(prev => ({ ...prev, [field]: value }));
  const adjustments = config?.payment_method_adjustments || {};
  const calcTotal = (metodo) => {
    const pct = adjustments[metodo] || 0;
    return pct !== 0 ? totalFinal * (1 + pct / 100) : totalFinal;
  };
  const sucursalActual = sucursales.find(s => s.id === sucursalId);
  const storeName = config?.company_name || config?.empresa_nombre || 'Tienda';
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [sucursalExpanded, setSucursalExpanded] = useState(false);
  const [entregaExpanded, setEntregaExpanded] = useState(false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Confirmación exitosa ─────────────────────────────────────────────────────
  if (pedidoConfirmado) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.1)', maxWidth: 440, width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }} className="fade-in">
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: PRIMARY_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <CheckCircle style={{ width: 36, height: 36, color: PRIMARY }} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>¡Pedido confirmado!</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Tu pedido fue registrado correctamente.
          </p>
          <div style={{ background: PRIMARY_BG, borderRadius: 12, padding: '1rem', margin: '1.5rem 0', display: 'inline-block', minWidth: 180 }}>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0 0 4px' }}>Número de pedido</p>
            <p style={{ fontWeight: 800, fontSize: '1.4rem', color: PRIMARY, margin: 0 }}>{pedidoConfirmado.numero_pedido}</p>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
            El negocio se comunicará con vos para coordinar la {tipoEntrega === 'domicilio' ? 'entrega' : 'retirada'}.
          </p>
          <button onClick={onVolverCatalogo}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 12, border: 'none', background: PRIMARY, color: 'var(--primary-text,white)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
            Volver a la tienda
          </button>
        </div>
      </div>
    );
  }

  // ── Formulario checkout ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: 12, height: 56 }}>
          <button onClick={onVolverCatalogo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
            <ArrowLeft size={16} /> Volver
          </button>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', flex: 1, textAlign: 'center' }}>Confirmar pedido</span>
          <div style={{ width: 60 }} />
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,340px)', gap: '1.5rem' }}>

        {/* Columna izquierda: formulario */}
        <form id="checkout-form" onSubmit={onConfirmar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Sucursal (solo si hay más de una) */}
          {sucursales.length > 1 && (
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {/* Header colapsable */}
              <button type="button" onClick={() => setSucursalExpanded(p => !p)}
                style={{ width: '100%', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <Building2 size={16} style={{ color: '#6b7280', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sucursal</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: PRIMARY }}>{sucursalActual?.nombre}</span>
                    {coordenadas && sucursalActual?.lat && sucursalActual?.lng && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: PRIMARY }}>
                        · {formatDistancia(haversineKm(coordenadas.lat, coordenadas.lng, sucursalActual.lat, sucursalActual.lng))}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown size={18} style={{ color: '#9ca3af', flexShrink: 0, transition: 'transform .2s', transform: sucursalExpanded ? 'rotate(180deg)' : 'none' }} />
              </button>
              {/* Lista desplegable */}
              {sucursalExpanded && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '0.75rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sucursales.map(s => {
                    const cerrada = s.tienda_activa === false;
                    return (
                      <button key={s.id} type="button" disabled={cambiandoSucursal || cerrada}
                        onClick={() => { if (!cerrada) { onCambiarSucursal(s.id); setSucursalExpanded(false); } }}
                        style={{ padding: '0.75rem 1rem', borderRadius: 12, border: `2px solid ${s.id === sucursalId ? PRIMARY : '#e5e7eb'}`, background: s.id === sucursalId ? PRIMARY_BG : cerrada ? '#f9fafb' : 'white', cursor: cerrada ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .15s', opacity: cambiandoSucursal ? 0.6 : cerrada ? 0.55 : 1, width: '100%', textAlign: 'left' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: s.id === sucursalId ? PRIMARY : cerrada ? '#9ca3af' : '#111827' }}>{s.nombre}</span>
                            {cerrada && <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', borderRadius: 99, padding: '1px 6px', fontWeight: 600 }}>Cerrada</span>}
                          </div>
                          {s.direccion && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{s.direccion}</span>}
                        </div>
                        {coordenadas && s.lat && s.lng && !cerrada && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.id === sucursalId ? PRIMARY : '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {formatDistancia(haversineKm(coordenadas.lat, coordenadas.lng, s.lat, s.lng))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {cambiandoSucursal && <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0 }}>Recalculando precios del carrito...</p>}
                </div>
              )}
            </div>
          )}

          {/* Tipo de entrega */}
          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            {/* Header colapsable */}
            <button type="button" onClick={() => setEntregaExpanded(p => !p)}
              style={{ width: '100%', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              {tipoEntrega === 'domicilio' ? <MapPin size={16} style={{ color: '#6b7280', flexShrink: 0 }} /> : <Store size={16} style={{ color: '#6b7280', flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Entrega</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: PRIMARY }}>
                    {tipoEntrega === 'domicilio' ? 'Envío a domicilio' : 'Retiro en local'}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: PRIMARY, fontWeight: 600 }}>
                    · {tipoEntrega === 'domicilio' ? (costoEnvio > 0 ? `${currencySymbol}${costoEnvio.toFixed(0)}` : 'Gratis') : 'Sin costo'}
                  </span>
                </div>
              </div>
              <ChevronDown size={18} style={{ color: '#9ca3af', flexShrink: 0, transition: 'transform .2s', transform: entregaExpanded ? 'rotate(180deg)' : 'none' }} />
            </button>
            {/* Opciones desplegables */}
            {entregaExpanded && (
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '0.75rem 1.25rem 1.25rem', display: 'flex', gap: 10 }}>
                {config?.tienda_envio_activo !== false && sucursalActual?.envio_activo !== false && (
                  <button type="button" onClick={() => { setTipoEntrega('domicilio'); setEntregaExpanded(false); }}
                    style={{ flex: 1, padding: '0.85rem', borderRadius: 12, border: `2px solid ${tipoEntrega === 'domicilio' ? PRIMARY : '#e5e7eb'}`, background: tipoEntrega === 'domicilio' ? PRIMARY_BG : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all .15s' }}>
                    <MapPin size={20} style={{ color: PRIMARY }} />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>Envío a domicilio</span>
                    {costoEnvio > 0 && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>+ {currencySymbol}{costoEnvio.toFixed(0)}</span>}
                  </button>
                )}
                {config?.tienda_retiro_activo !== false && (
                  <button type="button" onClick={() => { setTipoEntrega('retiro'); setEntregaExpanded(false); }}
                    style={{ flex: 1, padding: '0.85rem', borderRadius: 12, border: `2px solid ${tipoEntrega === 'retiro' ? PRIMARY : '#e5e7eb'}`, background: tipoEntrega === 'retiro' ? PRIMARY_BG : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all .15s' }}>
                    <Store size={20} style={{ color: PRIMARY }} />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>Retiro en local</span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Sin costo</span>
                  </button>
                )}
              </div>
            )}
            {config?.tienda_envio_activo !== false && sucursalActual?.envio_activo === false && (
              <p style={{ margin: '0 1.25rem 1rem', fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                ℹ️ Por el momento esta sucursal no realiza envíos a domicilio.
              </p>
            )}
          </div>

          {/* Dirección (solo si es domicilio) */}
          {tipoEntrega === 'domicilio' && !isEcommerce && (
            <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} style={{ color: PRIMARY }} /> Dirección de entrega
              </h3>
              <Suspense fallback={<div style={{ height: 260, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>Cargando mapa...</div>}>
                <MapaPicker
                  coordenadas={coordenadas}
                  onCoordenadas={setCoordenadas}
                  onDireccion={setDireccion}
                  direccionInicial={direccion}
                  sucursal={sucursalActual}
                  radioKm={sucursalActual?.radio_envio_km}
                />
              </Suspense>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Confirmá o editá la dirección</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><MapPin size={15} /></span>
                  <input type="text" className="form-input" value={direccion} onChange={e => setDireccion(e.target.value)}
                    placeholder="Ej: Av. Corrientes 1234, 3° B" required={tipoEntrega === 'domicilio'} />
                </div>
              </div>
            </div>
          )}

          {/* Dirección extendida ecommerce (todo el país) */}
          {tipoEntrega === 'domicilio' && isEcommerce && (
            <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} style={{ color: PRIMARY }} /> Dirección de entrega
              </h3>

              {/* Provincia */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Provincia <span style={{ color: '#ef4444' }}>*</span></label>
                <select className="form-input" value={dirEcommerce.provincia} onChange={e => setDir('provincia', e.target.value)} required>
                  <option value="">Seleccioná tu provincia</option>
                  {PROVINCIAS_AR.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Localidad + CP en fila */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Ciudad / Localidad <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" className="form-input" value={dirEcommerce.localidad}
                    onChange={e => setDir('localidad', e.target.value)}
                    placeholder="Ej: Rosario" required />
                </div>
                <div className="form-group" style={{ margin: 0, width: 110 }}>
                  <label className="form-label">Código postal</label>
                  <input type="text" className="form-input" value={dirEcommerce.cp}
                    onChange={e => setDir('cp', e.target.value)}
                    placeholder="Ej: 2000" maxLength={8} />
                </div>
              </div>

              {/* Calle + Número en fila */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Calle <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" className="form-input" value={dirEcommerce.calle}
                    onChange={e => setDir('calle', e.target.value)}
                    placeholder="Ej: Av. Corrientes" required />
                </div>
                <div className="form-group" style={{ margin: 0, width: 100 }}>
                  <label className="form-label">Número <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" className="form-input" value={dirEcommerce.numero}
                    onChange={e => setDir('numero', e.target.value)}
                    placeholder="1234" required />
                </div>
              </div>

              {/* Piso / Dpto opcional */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Piso / Departamento <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
                <input type="text" className="form-input" value={dirEcommerce.pisoDpto}
                  onChange={e => setDir('pisoDpto', e.target.value)}
                  placeholder="Ej: 3° B, PH, Local 4" />
              </div>

              {/* Mapa para fijar ubicación exacta */}
              <div>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
                  Ubicación en el mapa <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional — para entrega más precisa)</span>
                </label>
                <Suspense fallback={<div style={{ height: 260, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>Cargando mapa...</div>}>
                  <MapaPicker
                    coordenadas={coordenadas}
                    onCoordenadas={setCoordenadas}
                    onDireccion={() => {}}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} /> Observaciones <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#9ca3af' }}>(opcional)</span>
            </h3>
            <textarea
              value={observaciones} onChange={e => setObservaciones(e.target.value)}
              placeholder="Instrucciones especiales, referencias, aclaraciones..."
              rows={3}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = PRIMARY}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

        </form>

        {/* Columna derecha: resumen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', position: isMobile ? 'static' : 'sticky', top: 70 }}>
            <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={16} /> Resumen del pedido
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
              {carrito.map(item => (
                <div key={item.producto_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#374151', flex: 1, paddingRight: 8 }}>{item.nombre} <span style={{ color: '#9ca3af' }}>×{item.cantidad}</span></span>
                  <AnimatedPrice value={item.precio_unitario * item.cantidad} prefix={currencySymbol} style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }} />
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280' }}>
                <span>Subtotal</span>
                <AnimatedPrice value={totalCarrito} prefix={currencySymbol} />
              </div>
              {costoEnvio > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280' }}>
                  <span>Envío</span>
                  <AnimatedPrice value={costoExtraDistancia > 0 ? costoEnvio - costoExtraDistancia : costoEnvio} prefix={currencySymbol} />
                </div>
              )}
              {costoExtraDistancia > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#d97706', background: '#fffbeb', borderRadius: 6, padding: '4px 8px' }}>
                  <span>Recargo por distancia</span>
                  <span>+ {currencySymbol}{costoExtraDistancia.toFixed(0)}</span>
                </div>
              )}
              {costoEnvio === 0 && tipoEntrega === 'domicilio' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#10b981' }}>
                  <span>Envío</span>
                  <span>Gratis</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#111827', paddingTop: 4 }}>
                <span>Total</span>
                <AnimatedPrice value={totalFinal} prefix={currencySymbol} style={{ fontWeight: 700, fontSize: '1rem' }} />
              </div>
            </div>

            {/* Medios de pago (solo ecommerce) */}
            {isEcommerce && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', margin: '0 0 0.65rem' }}>Medio de pago</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {MEDIOS_PAGO.map(({ value, label, Icon, desc }) => {
                    const pct = adjustments[value] || 0;
                    const total = calcTotal(value);
                    const selected = medioPago === value;
                    return (
                      <button key={value} type="button" onClick={() => setMedioPago(value)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 0.85rem', borderRadius: 10, border: `2px solid ${selected ? PRIMARY : '#e5e7eb'}`, background: selected ? PRIMARY_BG : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                        <Icon size={18} style={{ color: selected ? PRIMARY : '#6b7280', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827', margin: 0 }}>{label}</p>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{desc}</p>
                        </div>
                        {pct !== 0 && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: pct < 0 ? '#10b981' : '#f59e0b', whiteSpace: 'nowrap' }}>
                            {pct < 0 ? `${pct}%` : `+${pct}%`}
                          </span>
                        )}
                        {selected && pct !== 0 && (
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: PRIMARY, whiteSpace: 'nowrap' }}>
                            {currencySymbol}{total.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(() => {
              const montoMinimo = config?.tienda_monto_minimo || 0;
              const bajoDemanda = montoMinimo > 0 && totalCarrito < montoMinimo;
              return (
                <>
                  {bajoDemanda && (
                    <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                      <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: '0 0 6px' }}>
                        Mínimo de pedido: {currencySymbol}{montoMinimo.toFixed(0)} (te faltan {currencySymbol}{(montoMinimo - totalCarrito).toFixed(0)})
                      </p>
                      <button type="button" onClick={onVolverCatalogo}
                        style={{ fontSize: '0.8rem', color: 'var(--primary,#10b981)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
                        Seguir comprando
                      </button>
                    </div>
                  )}
                  <button type="submit" form="checkout-form" className="btn btn-primary btn-lg w-full"
                    disabled={loading || carrito.length === 0 || bajoDemanda}
                    style={{ borderRadius: 12, marginTop: '0.5rem', opacity: bajoDemanda ? 0.5 : 1, cursor: bajoDemanda ? 'not-allowed' : 'pointer', background: '#10b981', borderColor: '#10b981' }}>
                    {loading ? <><div className="spinner" />Procesando...</> : <>Confirmar pedido · <AnimatedPrice value={calcTotal(medioPago)} prefix={currencySymbol} /></>}
                  </button>
                </>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TiendaCheckoutView;
