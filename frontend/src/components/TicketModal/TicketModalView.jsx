import React from 'react';
import { Printer, X } from 'lucide-react';
import { formatAmount, parseApiDate } from '../../lib/utils';

const TIPO_CBTE_NOMBRES = { 1: 'FACTURA A', 6: 'FACTURA B', 11: 'FACTURA C' };
const TIPO_CBTE_LETRA  = { 1: 'A', 6: 'B', 11: 'C' };

const fmtVencCAE = (v) =>
  v ? `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}` : '';

const TicketModalView = ({ sale, returns = [], config, afipConfig, cajeroName, title, closing, onClose, onPrint, customer }) => {
  if (!sale) return null;

  const sym = config?.currency_symbol || '$';
  const handlePrint = onPrint || (() => window.print());

  const totalReturns = returns.reduce((s, r) => s + r.total, 0);
  const netSubtotal  = sale.subtotal - totalReturns;
  const pct          = (config?.payment_method_adjustments || {})[sale.metodo_pago] ?? 0;
  const storedAdj    = sale.total - sale.subtotal - (sale.impuestos || 0);
  const netAdj       = totalReturns > 0 ? (netSubtotal * pct / 100) : storedAdj;
  const netTotal     = netSubtotal + (sale.impuestos || 0) + netAdj;

  const isAfipFactura  = sale.afip_estado === 'autorizado' && sale.tipo_comprobante;
  const letraComp      = TIPO_CBTE_LETRA[sale.tipo_comprobante] || '';

  return (
    <div className={`ticket-modal-overlay${closing ? ' closing' : ''}`}>
      <div className={`ticket-modal-container${closing ? ' closing' : ''}`}>
        <div className="ticket-modal-actions">
          <h3>{title}</h3>
          <div className="ticket-modal-btns">
            <button onClick={handlePrint} className="btn btn-primary btn-sm">
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button onClick={onClose} className="btn btn-secondary btn-sm">
              <X className="w-4 h-4" />
              Cerrar
            </button>
          </div>
        </div>

        <div id="ticket-print-area">

          {/* ── Datos de empresa ── */}
          {config?.company_logo && (
            <img src={config.company_logo} alt="logo" className="ticket-logo" />
          )}
          <div className="ticket-company-name">{config?.company_name || 'Mi Empresa'}</div>
          {config?.company_address && <div className="ticket-line">{config.company_address}</div>}
          {config?.company_phone   && <div className="ticket-line">Tel: {config.company_phone}</div>}
          {config?.company_tax_id  && <div className="ticket-line">CUIT: {config.company_tax_id}</div>}
          {isAfipFactura && afipConfig?.condicion_iva_emisor && (
            <div className="ticket-line" style={{ textAlign: 'center', fontWeight: 'bold' }}>
              {afipConfig.condicion_iva_emisor}
            </div>
          )}

          <div className="ticket-separator">{'- '.repeat(16)}</div>

          {/* ── Encabezado del comprobante ── */}
          {isAfipFactura ? (
            <>
              {/* Fila: Pto.Vta | [LETRA] | Nº */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
                <div style={{ flex: 1, fontSize: '10px' }}>
                  <div style={{ fontWeight: 'bold' }}>Pto.Vta</div>
                  <div>{String(afipConfig?.punto_venta || 1).padStart(4, '0')}</div>
                </div>
                <div style={{
                  border: '2px solid black',
                  width: '28px', height: '28px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '18px', flexShrink: 0, margin: '0 6px'
                }}>
                  {letraComp}
                </div>
                <div style={{ flex: 1, fontSize: '10px', textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>Nº</div>
                  <div>{String(sale.nro_comprobante_afip || 0).padStart(8, '0')}</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', margin: '2px 0' }}>
                {TIPO_CBTE_NOMBRES[sale.tipo_comprobante] || 'FACTURA'}
              </div>
              <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '2px' }}>ORIGINAL</div>

              {customer && (
                <>
                  <div className="ticket-info-row">
                    <span>Cliente:</span>
                    <span>{customer.nombre}</span>
                  </div>
                  {customer.documento && (
                    <div className="ticket-info-row">
                      <span>{(customer.tipo_documento || 'DNI').toUpperCase()}:</span>
                      <span>{customer.documento}</span>
                    </div>
                  )}
                  {sale.cuit_receptor && (
                    <div className="ticket-info-row">
                      <span>CUIT:</span>
                      <span>{sale.cuit_receptor}</span>
                    </div>
                  )}
                  {customer.direccion && (
                    <div className="ticket-info-row">
                      <span>Domicilio:</span>
                      <span>{customer.direccion}</span>
                    </div>
                  )}
                </>
              )}
              {!customer && sale.cuit_receptor && (
                <div className="ticket-info-row">
                  <span>CUIT Receptor:</span>
                  <span>{sale.cuit_receptor}</span>
                </div>
              )}
            </>
          ) : (
            <div className="ticket-info-row">
              <span>Comprobante:</span>
              <span>{sale.numero_factura}</span>
            </div>
          )}

          <div className="ticket-info-row">
            <span>Fecha:</span>
            <span>{parseApiDate(sale.fecha).toLocaleString('es-AR')}</span>
          </div>
          {cajeroName && (
            <div className="ticket-info-row">
              <span>Cajero:</span>
              <span>{cajeroName}</span>
            </div>
          )}
          <div className="ticket-info-row">
            <span>Pago:</span>
            <span>
              {sale.metodo_pago === 'efectivo' ? 'Efectivo'
                : sale.metodo_pago === 'tarjeta' ? 'Tarjeta'
                : 'Transferencia'}
            </span>
          </div>

          <div className="ticket-separator">{'- '.repeat(16)}</div>

          {/* ── Items ── */}
          <div className="ticket-items-header">
            <span>PRODUCTO</span>
            <span>TOTAL</span>
          </div>
          {sale.items.map((item, idx) => (
            <div key={idx} className="ticket-item">
              <div className="ticket-item-name">{item.nombre}</div>
              <div className="ticket-item-detail">
                <span>{item.cantidad} x {sym}{formatAmount(item.precio_unitario)}</span>
                <span>{sym}{formatAmount(item.subtotal)}</span>
              </div>
            </div>
          ))}

          <div className="ticket-separator">{'- '.repeat(16)}</div>

          {/* ── Devoluciones ── */}
          {returns.length > 0 && (
            <>
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', margin: '4px 0' }}>
                DEVOLUCIONES
              </div>
              {returns.map((ret, ri) => (
                <div key={ri}>
                  {ret.items.map((item, ii) => {
                    const nombre = item.nombre || sale.items.find(i => i.producto_id === item.producto_id)?.nombre || item.producto_id;
                    return (
                      <div key={ii} className="ticket-item">
                        <div className="ticket-item-name" style={{ color: '#b45309' }}>↩ {nombre}</div>
                        <div className="ticket-item-detail">
                          <span>{item.cantidad} x {sym}{formatAmount(item.precio_unitario)}</span>
                          <span style={{ color: '#b45309' }}>-{sym}{formatAmount(item.subtotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="ticket-total-row" style={{ color: '#b45309' }}>
                <span>Total devuelto:</span>
                <span>-{sym}{formatAmount(totalReturns)}</span>
              </div>
              <div className="ticket-separator">{'- '.repeat(16)}</div>
            </>
          )}

          {/* ── Totales ── */}
          <div className="ticket-total-row">
            <span>Subtotal:</span>
            <span>{sym}{formatAmount(netSubtotal)}</span>
          </div>
          {sale.impuestos > 0 && (
            <div className="ticket-total-row">
              <span>Impuestos ({((config?.tax_rate ?? 0) * 100).toFixed(0)}%):</span>
              <span>{sym}{formatAmount(sale.impuestos)}</span>
            </div>
          )}
          {Math.abs(netAdj) >= 0.001 && (() => {
            const label = pct < 0
              ? `Descuento efectivo (${Math.abs(pct)}%):`
              : `Recargo ${sale.metodo_pago} (${pct}%):`;
            return (
              <div className="ticket-total-row" style={{ color: netAdj < 0 ? '#16a34a' : '#dc2626' }}>
                <span>{label}</span>
                <span>{netAdj < 0 ? '-' : '+'}{sym}{formatAmount(Math.abs(netAdj))}</span>
              </div>
            );
          })()}
          <div className="ticket-total-row ticket-total-final">
            <span>TOTAL:</span>
            <span>{sym}{formatAmount(Math.max(0, netTotal))}</span>
          </div>

          {/* ── CAE / ARCA ── */}
          {sale.cae && (
            <>
              <div className="ticket-separator">{'- '.repeat(16)}</div>
              <div style={{
                textAlign: 'center', fontSize: '9px', fontWeight: 'bold',
                letterSpacing: '0.5px', margin: '3px 0'
              }}>
                COMPROBANTE AUTORIZADO POR ARCA
              </div>
              <div className="ticket-info-row" style={{ marginTop: '3px' }}>
                <span>CAE N°:</span>
                <span style={{ fontSize: '10px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                  {sale.cae}
                </span>
              </div>
              <div className="ticket-info-row">
                <span>Vto. CAE:</span>
                <span style={{ fontWeight: 'bold' }}>{fmtVencCAE(sale.cae_vencimiento)}</span>
              </div>
            </>
          )}

          {sale.afip_estado === 'contingencia' && (
            <div style={{
              textAlign: 'center', color: '#b45309', fontWeight: 'bold',
              fontSize: '10px', margin: '6px 0', border: '1px dashed #b45309', padding: '3px'
            }}>
              COMPROBANTE EN CONTINGENCIA
            </div>
          )}

          <div className="ticket-separator">{'- '.repeat(16)}</div>
          <div className="ticket-footer">
            {config?.receipt_footer_text || '¡Gracias por su compra!'}
          </div>

        </div>
      </div>
    </div>
  );
};

export default TicketModalView;
