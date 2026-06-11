import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, ShoppingBag, Receipt, ChevronDown, Package } from 'lucide-react';
import { API } from '../../App';
import { formatAmount, parseApiDate } from '../../lib/utils';

const METODO_LABEL = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  mixto: 'Mixto',
};

const CustomerPurchaseHistoryModal = ({ customer, closing, onClose }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/sales`, { params: { customer_id: customer.id } });
        setSales(res.data);
      } catch {
        setSales([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [customer.id]);

  const toggleRow = (id) => setExpandedRows(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const formatDate = (iso) => {
    if (!iso) return '—';
    return parseApiDate(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const totalCompras = sales.reduce((acc, s) => acc + (s.total || 0), 0);

  return (
    <div className={`ticket-modal-overlay${closing ? ' closing' : ''}`}>
      <div
        className={`ticket-modal-container${closing ? ' closing' : ''}`}
        style={{ maxWidth: '780px', width: '95vw' }}
      >
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h3 className="modal-title">Historial de compras — {customer.nombre}</h3>
          </div>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="spinner w-8 h-8" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Este cliente no tiene compras registradas</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 px-1">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-0.5">Compras</p>
                <p className="text-xl font-bold text-gray-800">{sales.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-0.5">Total acumulado</p>
                <p className="text-xl font-bold text-gray-800">${formatAmount(totalCompras)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-0.5">Ticket promedio</p>
                <p className="text-xl font-bold text-gray-800">${formatAmount(totalCompras / sales.length)}</p>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '1rem' }}></th>
                    <th>Fecha</th>
                    <th>Comprobante</th>
                    <th style={{ textAlign: 'center' }}>Método</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => {
                    const expanded = expandedRows.has(s.id);
                    const items = s.items || [];
                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => toggleRow(s.id)}
                        >
                          <td className="text-center pr-0">
                            <ChevronDown
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                            />
                          </td>
                          <td className="text-sm text-gray-600 whitespace-nowrap">{formatDate(s.fecha)}</td>
                          <td className="text-sm font-medium text-gray-800">{s.numero_factura || '—'}</td>
                          <td className="text-center">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {METODO_LABEL[s.metodo_pago] || s.metodo_pago || '—'}
                            </span>
                          </td>
                          <td className="text-right font-medium text-gray-800">
                            ${formatAmount(s.total)}
                          </td>
                        </tr>

                        {expanded && (
                          <tr>
                            <td colSpan={5} className="p-0">
                              <div className="bg-gray-50 border-t border-b border-gray-100 px-6 py-3">
                                {items.length === 0 ? (
                                  <p className="text-xs text-gray-400 py-1">Sin detalle de productos</p>
                                ) : (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-xs text-gray-500 border-b border-gray-200">
                                        <th className="text-left font-medium pb-1.5">
                                          <span className="inline-flex items-center gap-1"><Package className="w-3 h-3" /> Producto</span>
                                        </th>
                                        <th className="font-medium pb-1.5" style={{ textAlign: 'center' }}>Cant.</th>
                                        <th className="font-medium pb-1.5" style={{ textAlign: 'right' }}>P. Unitario</th>
                                        <th className="font-medium pb-1.5" style={{ textAlign: 'right' }}>Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map((item, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                                          <td className="py-1.5 text-gray-700">{item.nombre || item.producto_id}</td>
                                          <td className="py-1.5 text-center text-gray-600">{item.cantidad}</td>
                                          <td className="py-1.5 text-right text-gray-600">${formatAmount(item.precio_unitario)}</td>
                                          <td className="py-1.5 text-right font-medium text-gray-800">
                                            ${formatAmount(item.subtotal ?? item.total ?? item.precio_unitario * item.cantidad)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="btn btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerPurchaseHistoryModal;
