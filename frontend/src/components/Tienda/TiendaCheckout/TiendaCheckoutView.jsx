import React from 'react';
import { ArrowLeft, MapPin, Store, FileText, CheckCircle, ShoppingCart, Building2 } from 'lucide-react';

const PRIMARY = 'var(--primary, #10b981)';
const PRIMARY_BG = 'var(--primary-bg, #ecfdf5)';

const TiendaCheckoutView = ({
  config, empresa_id, tiendaUser,
  sucursales = [], sucursalId, onCambiarSucursal, cambiandoSucursal,
  carrito, tipoEntrega, setTipoEntrega, direccion, setDireccion,
  observaciones, setObservaciones, loading,
  costoEnvio, totalCarrito, totalFinal, currencySymbol,
  pedidoConfirmado, onConfirmar, onVolverCatalogo,
}) => {
  const sucursalActual = sucursales.find(s => s.id === sucursalId);
  const storeName = config?.company_name || config?.empresa_nombre || 'Tienda';

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

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,340px)', gap: '1.5rem' }}>

        {/* Columna izquierda: formulario */}
        <form onSubmit={onConfirmar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Sucursal (solo si hay más de una) */}
          {sucursales.length > 1 && (
            <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={16} /> Sucursal
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sucursales.map(s => (
                  <button key={s.id} type="button" onClick={() => onCambiarSucursal(s.id)} disabled={cambiandoSucursal}
                    style={{ padding: '0.75rem 1rem', borderRadius: 12, border: `2px solid ${s.id === sucursalId ? PRIMARY : '#e5e7eb'}`, background: s.id === sucursalId ? PRIMARY_BG : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, transition: 'all .15s', opacity: cambiandoSucursal ? 0.6 : 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: s.id === sucursalId ? PRIMARY : '#111827' }}>{s.nombre}</span>
                    {s.direccion && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{s.direccion}</span>}
                  </button>
                ))}
              </div>
              {cambiandoSucursal && <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 8 }}>Recalculando precios del carrito...</p>}
            </div>
          )}

          {/* Tipo de entrega */}
          <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', marginBottom: '1rem' }}>Tipo de entrega</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              {config?.tienda_envio_activo !== false && (
                <button type="button" onClick={() => setTipoEntrega('domicilio')}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: 12, border: `2px solid ${tipoEntrega === 'domicilio' ? PRIMARY : '#e5e7eb'}`, background: tipoEntrega === 'domicilio' ? PRIMARY_BG : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all .15s' }}>
                  <MapPin size={20} style={{ color: PRIMARY }} />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>Envío a domicilio</span>
                  {costoEnvio > 0 && tipoEntrega !== 'domicilio' && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>+ {currencySymbol}{costoEnvio.toFixed(0)}</span>}
                </button>
              )}
              {config?.tienda_retiro_activo !== false && (
                <button type="button" onClick={() => setTipoEntrega('retiro')}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: 12, border: `2px solid ${tipoEntrega === 'retiro' ? PRIMARY : '#e5e7eb'}`, background: tipoEntrega === 'retiro' ? PRIMARY_BG : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all .15s' }}>
                  <Store size={20} style={{ color: PRIMARY }} />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>Retiro en local</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Sin costo</span>
                </button>
              )}
            </div>
          </div>

          {/* Dirección (solo si es domicilio) */}
          {tipoEntrega === 'domicilio' && (
            <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', marginBottom: '1rem' }}>Dirección de entrega</h3>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Calle, número, piso, dpto.</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><MapPin size={15} /></span>
                  <input type="text" className="form-input" value={direccion} onChange={e => setDireccion(e.target.value)}
                    placeholder="Ej: Av. Corrientes 1234, 3° B" required={tipoEntrega === 'domicilio'} />
                </div>
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

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || carrito.length === 0}
            style={{ borderRadius: 12 }}>
            {loading ? <><div className="spinner" />Procesando...</> : `Confirmar pedido · ${currencySymbol}${totalFinal.toFixed(2)}`}
          </button>
        </form>

        {/* Columna derecha: resumen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', position: 'sticky', top: 70 }}>
            <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={16} /> Resumen del pedido
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
              {carrito.map(item => (
                <div key={item.producto_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#374151', flex: 1, paddingRight: 8 }}>{item.nombre} <span style={{ color: '#9ca3af' }}>×{item.cantidad}</span></span>
                  <span style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{currencySymbol}{(item.precio_unitario * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280' }}>
                <span>Subtotal</span>
                <span>{currencySymbol}{totalCarrito.toFixed(2)}</span>
              </div>
              {costoEnvio > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280' }}>
                  <span>Envío</span>
                  <span>{currencySymbol}{costoEnvio.toFixed(2)}</span>
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
                <span>{currencySymbol}{totalFinal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TiendaCheckoutView;
