import React from 'react';
import { X, Save, Package } from 'lucide-react';

const BranchBulkEditModal = ({ items, onItemChange, closing, onClose, onSave, saving }) => {
  return (
    <div className={`modal-overlay${closing ? ' closing' : ''}`}>
      <div
        className={`modal-content modal-content-bounce${closing ? ' closing' : ''}`}
        style={{ maxWidth: '860px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            Editar {items.length} producto{items.length !== 1 ? 's' : ''} en sucursal
          </h3>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          <div className="space-y-2.5 pb-1">
            {items.map((item) => (
              <div key={item.product_id} className="border border-gray-200 rounded-lg p-3.5 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-sm text-gray-700 truncate">{item.nombre}</span>
                  {item.tipo === 'por_peso' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">Por peso</span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {/* Precio Costo */}
                  <div className="form-group mb-0">
                    <label className="form-label">Precio Costo</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input pl-8"
                        value={item.costo}
                        onChange={e => onItemChange(item.product_id, 'costo', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Margen */}
                  <div className="form-group mb-0">
                    <label className="form-label">Margen</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        className="form-input pr-6"
                        value={item.margen}
                        onChange={e => onItemChange(item.product_id, 'margen', e.target.value)}
                        placeholder="0.00"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                  </div>

                  {/* Precio Venta */}
                  <div className="form-group mb-0">
                    <label className="form-label">Precio Venta</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input pl-8"
                        value={item.precio}
                        onChange={e => onItemChange(item.product_id, 'precio', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="form-group mb-0">
                    <label className="form-label">Stock</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={item.stock}
                      onChange={e => onItemChange(item.product_id, 'stock', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={saving} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={onSave} disabled={saving} className="btn btn-primary">
            {saving ? (
              <><div className="spinner w-4 h-4" />Guardando...</>
            ) : (
              <><Save className="w-4 h-4" />Guardar {items.length} producto{items.length !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchBulkEditModal;
