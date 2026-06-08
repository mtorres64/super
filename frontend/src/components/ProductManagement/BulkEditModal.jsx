import React from 'react';
import { X, Save, Package } from 'lucide-react';

const BulkEditModal = ({ items, onItemChange, categories, closing, onClose, onSave, saving }) => {
  return (
    <div className={`modal-overlay${closing ? ' closing' : ''}`}>
      <div
        className={`modal-content modal-content-bounce${closing ? ' closing' : ''}`}
        style={{ maxWidth: '920px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            Editar {items.length} producto{items.length !== 1 ? 's' : ''}
          </h3>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          <div className="space-y-3 pb-1">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-sm text-gray-700 truncate">{item._nombre_original}</span>
                  {item.kind === 'combo' && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded shrink-0">Combo</span>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Nombre + Categoría */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group mb-0">
                      <label className="form-label">Nombre</label>
                      <input
                        type="text"
                        className="form-input"
                        value={item.nombre}
                        onChange={e => onItemChange(item.id, 'nombre', e.target.value)}
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Categoría</label>
                      <select
                        className="form-select"
                        value={item.categoria_id || ''}
                        onChange={e => onItemChange(item.id, 'categoria_id', e.target.value)}
                      >
                        <option value="">Sin categoría</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Precio + Costo + Código */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="form-group mb-0">
                      <label className="form-label">Precio</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={item.precio}
                        onChange={e => onItemChange(item.id, 'precio', e.target.value)}
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Precio Costo</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={item.precio_costo}
                        onChange={e => onItemChange(item.id, 'precio_costo', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Código de barras</label>
                      <input
                        type="text"
                        className="form-input"
                        value={item.codigo_barras}
                        onChange={e => onItemChange(item.id, 'codigo_barras', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Control stock + Stock + Stock mín */}
                  <div
                    className="flex items-end gap-3 p-2.5 rounded-lg border transition-colors"
                    style={{
                      background: item.control_stock ? '#f0fdf4' : '#f9fafb',
                      borderColor: item.control_stock ? '#86efac' : '#e5e7eb',
                    }}
                  >
                    <div className="flex items-center gap-2 shrink-0 self-center pb-1">
                      <button
                        type="button"
                        disabled={item.kind === 'combo'}
                        onClick={() => item.kind !== 'combo' && onItemChange(item.id, 'control_stock', !item.control_stock)}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: item.control_stock ? 'var(--primary)' : '#d1d5db' }}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                          style={{ transform: item.control_stock ? 'translateX(1.1rem)' : 'translateX(0.2rem)' }}
                        />
                      </button>
                      <span className="text-xs font-medium text-gray-600 select-none whitespace-nowrap">
                        {item.kind === 'combo' ? 'No aplica' : 'Control stock'}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-1">
                      <div className="form-group mb-0 flex-1">
                        <label className="form-label">Stock</label>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          disabled={!item.control_stock || item.kind === 'combo'}
                          value={item.stock}
                          onChange={e => onItemChange(item.id, 'stock', e.target.value)}
                        />
                      </div>
                      <div className="form-group mb-0 flex-1">
                        <label className="form-label">Stock Mín.</label>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          disabled={!item.control_stock || item.kind === 'combo'}
                          value={item.stock_minimo}
                          onChange={e => onItemChange(item.id, 'stock_minimo', e.target.value)}
                        />
                      </div>
                    </div>
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

export default BulkEditModal;
