import React from 'react';
import { X, GitBranch, AlertTriangle, CheckCircle2 } from 'lucide-react';

const DistribuirModal = ({
  compra,
  branches,
  form,
  onSucursalChange,
  onOpcionChange,
  onItemChange,
  onClose,
  onSubmit,
  loading,
  closing,
  formatMoney,
}) => {
  const itemsSinProducto = compra.items.filter(it => !it.product_id);

  return (
    <div className={`modal-overlay${closing ? ' closing' : ''}`} onClick={onClose}>
      <div
        className={`modal-content${closing ? ' closing' : ''}`}
        style={{ maxWidth: '1400px', width: '98vw', height: '98vh', maxHeight: '98vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Aplicar a sucursal — {compra.numero_factura || '(sin número)'}
          </h2>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.25rem 1.5rem 0' }}>

          {/* Sucursal + opciones — fijo arriba */}
          <div className="flex gap-4 items-end mb-5 flex-shrink-0">
            <div className="w-64">
              <label className="form-label">Sucursal *</label>
              <select
                className="form-input"
                value={form.sucursal_id}
                onChange={e => onSucursalChange(e.target.value)}
                required
              >
                <option value="">— Seleccioná una sucursal —</option>
                {branches.filter(b => b.activo).map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-5 items-center pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-600"
                  checked={form.opcion_stock}
                  onChange={e => onOpcionChange('opcion_stock', e.target.checked)}
                />
                <span className="font-medium text-gray-700">Actualizar stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-green-600"
                  checked={form.opcion_precio}
                  onChange={e => onOpcionChange('opcion_precio', e.target.checked)}
                />
                <span className="font-medium text-gray-700">Actualizar precio / margen</span>
              </label>
            </div>
          </div>

          {/* Tabla — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="border border-gray-200 rounded-lg mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Cantidad factura</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Saldo</th>
                  {form.opcion_stock && (
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Cantidad a aplicar</th>
                  )}
                  {form.opcion_precio && form.sucursal_id && (
                    <>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Costo factura</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Precio actual</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Nuevo precio</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Margen %</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={item.product_id} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-3 py-2 font-medium text-gray-800">{item.nombre}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{item.cantidad_original}</td>
                    <td className="px-3 py-2 text-center">
                      {item.saldo > 0 ? (
                        <span className="inline-flex items-center gap-1 text-green-700 font-semibold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />{item.saldo}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />Sin saldo
                        </span>
                      )}
                    </td>
                    {form.opcion_stock && (
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={item.saldo}
                          step="1"
                          className="form-input py-0.5 text-xs text-center w-12"
                          value={item.cantidad_aplicar}
                          onChange={e => onItemChange(item.product_id, 'cantidad_aplicar', e.target.value)}
                          onClick={e => e.target.select()}
                          disabled={item.saldo === 0}
                        />
                      </td>
                    )}
                    {form.opcion_precio && form.sucursal_id && (
                      <>
                        <td className="px-3 py-2 text-right text-xs font-semibold text-blue-700">
                          {item.costo_unitario > 0 ? `$${formatMoney(item.costo_unitario)}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500 text-xs">
                          {item.precio_sucursal != null ? `$${formatMoney(item.precio_sucursal)}` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="form-input py-0.5 text-xs text-right pl-4 w-20"
                              style={(() => {
                                const np = parseFloat(item.nuevo_precio);
                                const pa = item.precio_sucursal;
                                if (pa != null && !isNaN(np) && np !== pa) {
                                  return np < pa
                                    ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' }
                                    : { borderColor: '#22c55e', backgroundColor: '#f0fdf4' };
                                }
                                return item.precio_edited ? { borderColor: '#f59e0b', backgroundColor: '#fffbeb' } : {};
                              })()}
                              value={item.nuevo_precio}
                              onChange={e => onItemChange(item.product_id, 'nuevo_precio', e.target.value.replace(',', '.'))}
                              onClick={e => e.target.select()}
                              onFocus={e => e.target.select()}
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="form-input py-0.5 text-xs text-right w-12"
                              style={item.margen_edited ? { borderColor: '#f59e0b', backgroundColor: '#fffbeb' } : {}}
                              value={item.nuevo_margen}
                              onChange={e => onItemChange(item.product_id, 'nuevo_margen', e.target.value.replace(',', '.'))}
                              onClick={e => e.target.select()}
                              onFocus={e => e.target.select()}
                              placeholder="0"
                            />
                            <span className="text-gray-400 text-xs">%</span>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {itemsSinProducto.length > 0 && (
                  <tr className="bg-gray-50/60">
                    <td colSpan={99} className="px-3 py-1.5 text-xs text-gray-400 italic">
                      {itemsSinProducto.length} ítem(s) sin producto vinculado — no se pueden aplicar automáticamente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Fijo al fondo: aplicaciones anteriores + botones */}
          <div className="flex-shrink-0 pb-5">
            {(compra.distribuciones || []).length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Aplicaciones anteriores</p>
                <div className="flex flex-wrap gap-2">
                  {compra.distribuciones.map(d => (
                    <span key={d.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-xs text-gray-600">
                      <GitBranch className="w-3 h-3" />
                      {d.sucursal_nombre} · {d.items.reduce((s, it) => s + (it.cantidad || 0), 0)} u.
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cerrar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !form.sucursal_id || (!form.opcion_stock && !form.opcion_precio)}
              >
                {loading
                  ? <span className="spinner w-4 h-4" />
                  : <GitBranch className="w-4 h-4" />
                }
                Aplicar
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default DistribuirModal;
