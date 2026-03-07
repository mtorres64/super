import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { RotateCcw, X } from 'lucide-react';

/**
 * Modal de devolución reutilizable.
 *
 * Props:
 *   sale        — objeto venta con { id, numero_factura, items: [{ producto_id, nombre, cantidad, precio_unitario }] }
 *   returnedQty — { producto_id: cantidad_ya_devuelta }
 *   onClose     — fn() cierra el modal
 *   onSuccess   — fn() callback tras devolución exitosa (ej: refetch)
 */
const ReturnModal = ({ sale, returnedQty, onClose, onSuccess }) => {
  const [returnSelected, setReturnSelected] = useState(() => {
    const init = {};
    sale.items.forEach(item => { init[item.producto_id] = false; });
    return init;
  });

  const [returnQuantities, setReturnQuantities] = useState(() => {
    const init = {};
    sale.items.forEach(item => {
      const available = item.cantidad - (returnedQty[item.producto_id] || 0);
      init[item.producto_id] = available > 0 ? available : 0;
    });
    return init;
  });

  const [returnReason, setReturnReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableItems = sale.items.filter(item => {
    const available = item.cantidad - (returnedQty[item.producto_id] || 0);
    return available > 0;
  });
  const allSelected = availableItems.length > 0 && availableItems.every(item => returnSelected[item.producto_id]);

  const handleSubmit = async () => {
    const items = sale.items
      .filter(item => returnSelected[item.producto_id])
      .map(item => {
        const available = item.cantidad - (returnedQty[item.producto_id] || 0);
        const cantidad = returnQuantities[item.producto_id] ?? available;
        return { producto_id: item.producto_id, cantidad };
      })
      .filter(item => item.cantidad > 0);

    if (items.length === 0) {
      toast.error('Seleccioná al menos un producto para devolver');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/sales/${sale.id}/return`, {
        items,
        motivo: returnReason || null
      });
      toast.success(`Devolución ${response.data.numero_devolucion} procesada — $${response.data.total.toFixed(2)} devueltos al stock`);
      onClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar la devolución');
    } finally {
      setSubmitting(false);
    }
  };

  const total = sale.items.reduce((sum, item) => {
    if (!returnSelected[item.producto_id]) return sum;
    const qty = returnQuantities[item.producto_id] ?? (item.cantidad - (returnedQty[item.producto_id] || 0));
    return sum + qty * item.precio_unitario;
  }, 0);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '560px', width: '100%' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <RotateCcw className="w-5 h-5 inline mr-2" />
            Devolución — {sale.numero_factura}
          </h3>
          <button onClick={onClose} className="modal-close"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4">
          {/* Select all */}
          <label className="flex items-center gap-2 mb-3 p-2 bg-gray-100 rounded-lg cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={e => {
                const next = {};
                availableItems.forEach(item => { next[item.producto_id] = e.target.checked; });
                setReturnSelected(prev => ({ ...prev, ...next }));
              }}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Devolver todo</span>
          </label>

          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {sale.items.map(item => {
              const alreadyReturned = returnedQty[item.producto_id] || 0;
              const available = item.cantidad - alreadyReturned;
              const isChecked = !!returnSelected[item.producto_id];
              const exhausted = available <= 0;
              return (
                <div
                  key={item.producto_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isChecked ? 'bg-green-50 border-green-200' : exhausted ? 'bg-gray-50 border-gray-100 opacity-50' : 'bg-gray-50 border-gray-200'}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={exhausted}
                    onChange={e => setReturnSelected(prev => ({ ...prev, [item.producto_id]: e.target.checked }))}
                    className="w-4 h-4 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{item.nombre || item.producto_id}</div>
                    <div className="text-xs text-gray-500">
                      ${item.precio_unitario.toFixed(2)} c/u · {item.cantidad} en venta
                      {alreadyReturned > 0 && <span className="ml-1 text-orange-600">· {alreadyReturned} ya devueltos</span>}
                      {exhausted && <span className="ml-1 text-gray-400">· ya devuelto</span>}
                    </div>
                  </div>
                  {isChecked && (
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="1"
                        max={available}
                        value={returnQuantities[item.producto_id] ?? available}
                        onChange={e => setReturnQuantities(prev => ({
                          ...prev,
                          [item.producto_id]: Math.min(available, Math.max(1, parseInt(e.target.value) || 1))
                        }))}
                        className="form-input w-16 text-center text-sm"
                      />
                      <span className="text-xs text-gray-400">/ {available}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Motivo (opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Producto defectuoso, error en pedido..."
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
            />
          </div>

          {total > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm text-blue-800">
              <strong>Total a devolver: </strong>${total.toFixed(2)}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !Object.values(returnSelected).some(Boolean)}
              className="btn btn-primary"
            >
              {submitting ? (
                <><div className="spinner w-4 h-4" /> Procesando...</>
              ) : (
                <><RotateCcw className="w-4 h-4" /> Confirmar Devolución</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnModal;
