import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { formatAmount } from '../../lib/utils';

const ReturnModalView = ({
  sale,
  returnedQty,
  returnSelected,
  setReturnSelected,
  returnQuantities,
  setReturnQuantities,
  returnReason,
  setReturnReason,
  submitting,
  closing,
  handleClose,
  handleSubmit,
  availableItems,
  allSelected,
  total,
}) => (
  <div className={`ticket-modal-overlay${closing ? ' closing' : ''}`}>
    <div className={`ticket-modal-container${closing ? ' closing' : ''}`} style={{ maxWidth: '560px', width: '100%' }}>
      <div className="modal-header">
        <h3 className="modal-title">
          <RotateCcw className="w-5 h-5 inline mr-2" />
          Devolución — {sale.numero_factura}
        </h3>
        <button onClick={handleClose} className="modal-close"><X className="w-4 h-4" /></button>
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
                    ${formatAmount(item.precio_unitario)} c/u · {item.cantidad} en venta
                    {alreadyReturned > 0 && <span className="ml-1 text-orange-600">· {alreadyReturned} ya devueltos</span>}
                    {exhausted && <span className="ml-1 text-gray-400">· ya devuelto</span>}
                  </div>
                </div>
                {isChecked && (
                  <div className="flex flex-col items-center shrink-0 gap-0.5">
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
                    <span className="text-xs text-gray-400 whitespace-nowrap">máx. {available}</span>
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
            <strong>Total a devolver: </strong>${formatAmount(total)}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={handleClose} className="btn btn-secondary">Cancelar</button>
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

export default ReturnModalView;
