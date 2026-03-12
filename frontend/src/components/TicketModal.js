import React from 'react';
import { Printer, X } from 'lucide-react';
import { formatAmount } from '../lib/utils';

const TIPO_CBTE_NOMBRES = { 1: 'FACTURA A', 6: 'FACTURA B', 11: 'FACTURA C' };

const TicketModal = ({ sale, returns = [], config, afipConfig, cajeroName, title, closing, onClose, onPrint }) => {
  if (!sale) return null;

  const sym = config?.currency_symbol || '$';

  const handlePrint = onPrint || (() => window.print());

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
          {config?.company_logo && (
            <img src={config.company_logo} alt="logo" className="ticket-logo" />
          )}
          <div className="ticket-company-name">{config?.company_name || 'Mi Empresa'}</div>
          {config?.company_address && <div className="ticket-line">{config.company_address}</div>}
          {config?.company_phone && <div className="ticket-line">Tel: {config.company_phone}</div>}
          {config?.company_tax_id && <div className="ticket-line">CUIT: {config.company_tax_id}</div>}

          <div className="ticket-separator">{'- '.repeat(16)}</div>

          {sale.afip_estado === 'autorizado' && sale.tipo_comprobante ? (
            <>
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px', margin: '4px 0 2px' }}>
                {TIPO_CBTE_NOMBRES[sale.tipo_comprobante] || 'FACTURA'}
              </div>
              <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '2px' }}>
                Pto.Vta: {String(afipConfig?.punto_venta || 1).padStart(4, '0')} &nbsp;|&nbsp; N°: {String(sale.nro_comprobante_afip || 0).padStart(8, '0')}
              </div>
            </>
          ) : (
            <div className="ticket-info-row">
              <span>Comprobante:</span>
              <span>{sale.numero_factura}</span>
            </div>
          )}

          <div className="ticket-info-row">
            <span>Fecha:</span>
            <span>{new Date(sale.fecha).toLocaleString('es-AR')}</span>
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
                <span>-{sym}{formatAmount(returns.reduce((s, r) => s + r.total, 0))}</span>
              </div>
              <div className="ticket-separator">{'- '.repeat(16)}</div>
            </>
          )}

          <div className="ticket-total-row">
            <span>Subtotal:</span>
            <span>{sym}{formatAmount(sale.subtotal)}</span>
          </div>
          {sale.impuestos > 0 && (
            <div className="ticket-total-row">
              <span>Impuestos ({((config?.tax_rate ?? 0) * 100).toFixed(0)}%):</span>
              <span>{sym}{formatAmount(sale.impuestos)}</span>
            </div>
          )}
          {(() => {
            const adjAmount = sale.total - sale.subtotal - sale.impuestos;
            if (Math.abs(adjAmount) < 0.001) return null;
            const pct = (config?.payment_method_adjustments || {})[sale.metodo_pago] ?? 0;
            const label = pct < 0
              ? `Descuento ${sale.metodo_pago} (${Math.abs(pct)}%):`
              : `Recargo ${sale.metodo_pago} (${pct}%):`;
            return (
              <div className="ticket-total-row" style={{ color: adjAmount < 0 ? '#16a34a' : '#dc2626' }}>
                <span>{label}</span>
                <span>{adjAmount < 0 ? '-' : '+'}{sym}{formatAmount(Math.abs(adjAmount))}</span>
              </div>
            );
          })()}
          <div className="ticket-total-row ticket-total-final">
            <span>TOTAL:</span>
            <span>{sym}{formatAmount(sale.total)}</span>
          </div>

          {sale.cae && (
            <>
              <div className="ticket-separator">{'- '.repeat(16)}</div>
              <div className="ticket-info-row">
                <span>CAE:</span>
                <span style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{sale.cae}</span>
              </div>
              <div className="ticket-info-row">
                <span>Venc. CAE:</span>
                <span>{sale.cae_vencimiento
                  ? `${sale.cae_vencimiento.slice(0,4)}-${sale.cae_vencimiento.slice(4,6)}-${sale.cae_vencimiento.slice(6,8)}`
                  : ''}</span>
              </div>
              <div className="ticket-info-row">
                <span>Comp. N°:</span>
                <span>{String(sale.nro_comprobante_afip || '').padStart(8, '0')}</span>
              </div>
            </>
          )}
          {sale.afip_estado === 'contingencia' && (
            <div style={{ textAlign: 'center', color: '#b45309', fontWeight: 'bold', fontSize: '10px', margin: '6px 0', border: '1px dashed #b45309', padding: '3px' }}>
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

export default TicketModal;
