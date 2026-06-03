import React from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingBag,
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  Building2,
  FileText,
  MapPin,
  TrendingUp,
  Package
} from 'lucide-react';
import SortIcon from '../ui/SortIcon';

const ComprasView = ({
  activeTab,
  setActiveTab,
  compras,
  loadingCompras,
  showCompraModal,
  editingCompra,
  compraForm,
  setCompraForm,
  searchCompra,
  setSearchCompra,
  branches,
  branchProducts,
  openAutocompleteIndex,
  setOpenAutocompleteIndex,
  dropdownPos,
  descInputRefs,
  showPriceModal,
  setShowPriceModal,
  priceUpdates,
  setPriceUpdates,
  priceModalMargins,
  setPriceModalMargins,
  priceModalItemsList,
  proveedores,
  loadingProveedores,
  showProveedorModal,
  editingProveedor,
  proveedorForm,
  setProveedorForm,
  searchProveedor,
  setSearchProveedor,
  filteredCompras,
  filteredProveedores,
  comprasSortConfig,
  comprasRequestSort,
  proveedoresSortConfig,
  proveedoresRequestSort,
  compraModalClosing,
  proveedorModalClosing,
  openCompraModal,
  closeCompraModalAnim,
  openProveedorModal,
  closeProveedorModalAnim,
  handleCompraSubmit,
  handleConfirmPriceModal,
  handleDeleteCompra,
  handleItemChange,
  handleSelectProduct,
  handleDescriptionFocus,
  handleImpuestosChange,
  handleProveedorSubmit,
  handleToggleProveedor,
  addItem,
  removeItem,
  getAutocompleteOptions,
  handleSucursalChange,
  formatDate,
  formatMoney,
}) => {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Compras</h1>
          <p className="text-gray-600">Gestión de facturas de compra y proveedores</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-0 mb-6 rounded-t-lg">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('facturas')}
            className="flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors"
            style={activeTab === 'facturas'
              ? { borderColor: 'var(--primary)', color: 'var(--primary)' }
              : { borderColor: 'transparent', color: '#6b7280' }}
          >
            <FileText className="w-4 h-4" />
            Facturas
          </button>
          <button
            onClick={() => setActiveTab('proveedores')}
            className="flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors"
            style={activeTab === 'proveedores'
              ? { borderColor: 'var(--primary)', color: 'var(--primary)' }
              : { borderColor: 'transparent', color: '#6b7280' }}
          >
            <Building2 className="w-4 h-4" />
            Proveedores
          </button>
        </div>
      </div>

      {/* ── TAB: FACTURAS ── */}
      {activeTab === 'facturas' && (
        <>
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por N° factura o proveedor..."
                  className="form-input pl-10"
                  value={searchCompra}
                  onChange={e => setSearchCompra(e.target.value)}
                />
              </div>
              <button onClick={() => openCompraModal()} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Nueva Factura
              </button>
            </div>
          </div>

          {loadingCompras ? (
            <div className="flex items-center justify-center h-40">
              <div className="spinner w-8 h-8" />
            </div>
          ) : filteredCompras.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay facturas registradas</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => comprasRequestSort('fecha')} className="cursor-pointer select-none hover:bg-gray-50">Fecha <SortIcon columnKey="fecha" sortConfig={comprasSortConfig} /></th>
                    <th onClick={() => comprasRequestSort('numero_factura')} className="cursor-pointer select-none hover:bg-gray-50">N° Factura <SortIcon columnKey="numero_factura" sortConfig={comprasSortConfig} /></th>
                    <th onClick={() => comprasRequestSort('proveedor_nombre')} className="cursor-pointer select-none hover:bg-gray-50">Proveedor <SortIcon columnKey="proveedor_nombre" sortConfig={comprasSortConfig} /></th>
                    <th>Sucursal</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                    <th style={{ textAlign: 'right' }}>Impuestos</th>
                    <th style={{ textAlign: 'right' }} onClick={() => comprasRequestSort('total')} className="cursor-pointer select-none hover:bg-gray-50">Total <SortIcon columnKey="total" sortConfig={comprasSortConfig} /></th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompras.map(compra => (
                    <tr key={compra.id}>
                      <td className="text-sm text-gray-600">{formatDate(compra.fecha)}</td>
                      <td className="font-medium">{compra.numero_factura}</td>
                      <td className="text-gray-700">{compra.proveedor_nombre || '—'}</td>
                      <td className="text-gray-700 text-sm">
                        {compra.sucursal_id
                          ? (branches.find(b => b.id === compra.sucursal_id)?.nombre || '—')
                          : '—'}
                      </td>
                      <td className="text-right text-gray-700">{formatMoney(compra.subtotal)}</td>
                      <td className="text-right text-gray-700">{formatMoney(compra.impuestos)}</td>
                      <td className="text-right font-semibold text-gray-900">{formatMoney(compra.total)}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openCompraModal(compra)}
                            className="btn btn-sm flex items-center gap-1"
                            style={{ background: 'var(--secondary)', color: 'var(--secondary-text)' }}
                            title="Editar"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompra(compra)}
                            className="btn btn-sm flex items-center gap-1"
                            style={{ background: 'var(--tertiary)', color: 'var(--tertiary-text)' }}
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TAB: PROVEEDORES ── */}
      {activeTab === 'proveedores' && (
        <>
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar proveedor o RUC/CUIT..."
                  className="form-input pl-10"
                  value={searchProveedor}
                  onChange={e => setSearchProveedor(e.target.value)}
                />
              </div>
              <button onClick={() => openProveedorModal()} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Nuevo Proveedor
              </button>
            </div>
          </div>

          {loadingProveedores ? (
            <div className="flex items-center justify-center h-40">
              <div className="spinner w-8 h-8" />
            </div>
          ) : filteredProveedores.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay proveedores registrados</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => proveedoresRequestSort('nombre')} className="cursor-pointer select-none hover:bg-gray-50">Nombre <SortIcon columnKey="nombre" sortConfig={proveedoresSortConfig} /></th>
                    <th onClick={() => proveedoresRequestSort('ruc_cuit')} className="cursor-pointer select-none hover:bg-gray-50">RUC / CUIT <SortIcon columnKey="ruc_cuit" sortConfig={proveedoresSortConfig} /></th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProveedores.map(prov => (
                    <tr key={prov.id}>
                      <td className="font-medium text-gray-900">{prov.nombre}</td>
                      <td className="text-gray-600">{prov.ruc_cuit || '—'}</td>
                      <td className="text-gray-600">{prov.email || '—'}</td>
                      <td className="text-gray-600">{prov.telefono || '—'}</td>
                      <td>
                        <span className={`badge ${prov.activo ? 'badge-success' : 'badge-danger'}`}>
                          {prov.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openProveedorModal(prov)}
                            className="btn btn-secondary btn-sm"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleProveedor(prov)}
                            className={`btn btn-sm ${prov.activo ? 'btn-danger' : 'btn-secondary'}`}
                            title={prov.activo ? 'Desactivar' : 'Activar'}
                          >
                            {prov.activo ? <X className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MODAL FACTURA (incluye confirmación de precios en el mismo overlay) ── */}
      {showCompraModal && (
        <div className={`modal-overlay${compraModalClosing ? ' closing' : ''}`} onClick={showPriceModal ? undefined : closeCompraModalAnim}>
          <div
            className={`modal-content${compraModalClosing ? ' closing' : ''}`}
            style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2">
                {showPriceModal ? (
                  <><TrendingUp className="w-5 h-5 text-green-600" /> Actualizar precios de venta</>
                ) : (
                  editingCompra ? 'Editar Factura' : 'Nueva Factura de Compra'
                )}
              </h2>
              <button
                onClick={showPriceModal ? () => setShowPriceModal(false) : closeCompraModalAnim}
                className="modal-close"
                title={showPriceModal ? 'Volver al formulario' : 'Cerrar'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompraSubmit} className={`modal-body${showPriceModal ? ' hidden' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label">N° de Factura *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={compraForm.numero_factura}
                    onChange={e => setCompraForm(prev => ({ ...prev, numero_factura: e.target.value }))}
                    placeholder="Ej: 0001-00001234"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Fecha *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={compraForm.fecha}
                    onChange={e => setCompraForm(prev => ({ ...prev, fecha: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">
                    <MapPin className="w-4 h-4 inline mr-1 text-gray-400" />
                    Sucursal
                  </label>
                  <select
                    className="form-input"
                    value={compraForm.sucursal_id}
                    onChange={e => handleSucursalChange(e.target.value)}
                  >
                    <option value="">— Sin sucursal —</option>
                    {branches.filter(b => b.activo).map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                  {compraForm.sucursal_id && branchProducts.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      {branchProducts.length} productos disponibles para autocompletar
                    </p>
                  )}
                </div>
                <div>
                  <label className="form-label">Proveedor</label>
                  <select
                    className="form-input"
                    value={compraForm.proveedor_id}
                    onChange={e => setCompraForm(prev => ({ ...prev, proveedor_id: e.target.value }))}
                  >
                    <option value="">— Sin proveedor —</option>
                    {proveedores.filter(p => p.activo).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items table */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="form-label mb-0">Ítems</label>
                  <button type="button" onClick={addItem} className="btn btn-secondary btn-sm">
                    <Plus className="w-3 h-3" /> Agregar ítem
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Descripción</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600 w-20">Cantidad</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">Costo Unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">Subtotal</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {compraForm.items.map((item, idx) => {
                        const costoNuevo = parseFloat(item.precio_unitario) || 0;
                        const precioSugerido = item.product_id && costoNuevo > 0 && item.margen_actual != null
                          ? parseFloat((costoNuevo * (1 + item.margen_actual / 100)).toFixed(2))
                          : null;

                        return (
                          <React.Fragment key={idx}>
                            <tr className="border-t border-gray-100">
                              {/* Description with autocomplete */}
                              <td className="px-2 py-1">
                                <input
                                  ref={el => { descInputRefs.current[idx] = el; }}
                                  type="text"
                                  className="form-input py-1 text-sm"
                                  value={item.descripcion}
                                  onChange={e => handleItemChange(idx, 'descripcion', e.target.value)}
                                  onFocus={e => handleDescriptionFocus(idx, e)}
                                  onBlur={() => setTimeout(() => setOpenAutocompleteIndex(null), 180)}
                                  placeholder={compraForm.sucursal_id ? 'Buscar producto...' : 'Descripción del artículo'}
                                />
                                {item.product_id && (
                                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-blue-700 items-center">
                                    <span className="flex items-center gap-1">
                                      <Package className="w-3 h-3" />
                                      Costo anterior: {item.costo_actual != null ? `$${formatMoney(item.costo_actual)}` : 'sin datos'}
                                    </span>
                                    <span>Precio venta: ${formatMoney(item.precio_actual)}</span>
                                    {item.margen_actual != null && (
                                      <span>Margen: {item.margen_actual}%</span>
                                    )}
                                    {precioSugerido != null && costoNuevo > 0 && (
                                      <span className="flex items-center gap-1 font-semibold text-green-700">
                                        <TrendingUp className="w-3 h-3" />
                                        Precio sugerido: ${formatMoney(precioSugerido)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  className="form-input py-1 text-sm text-right"
                                  value={item.cantidad}
                                  onChange={e => handleItemChange(idx, 'cantidad', e.target.value)}
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  className="form-input py-1 text-sm text-right"
                                  value={item.precio_unitario}
                                  onChange={e => handleItemChange(idx, 'precio_unitario', e.target.value)}
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-3 py-1 text-right text-gray-700">
                                {formatMoney(item.subtotal)}
                              </td>
                              <td className="px-2 py-1 text-center">
                                {compraForm.items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeItem(idx)}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="form-label">Subtotal</label>
                  <input
                    type="text"
                    className="form-input bg-gray-50"
                    value={formatMoney(compraForm.subtotal)}
                    readOnly
                  />
                </div>
                <div>
                  <label className="form-label">Impuestos / IVA</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-input"
                    value={compraForm.impuestos}
                    onChange={e => handleImpuestosChange(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="form-label">Total</label>
                  <input
                    type="text"
                    className="form-input bg-gray-50 font-semibold"
                    value={formatMoney(compraForm.total)}
                    readOnly
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Notas</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={compraForm.notas}
                  onChange={e => setCompraForm(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Observaciones opcionales..."
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeCompraModalAnim} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save className="w-4 h-4" />
                  {editingCompra ? 'Guardar Cambios' : 'Registrar Factura'}
                </button>
              </div>
            </form>

            {/* ── CONFIRMACIÓN DE PRECIOS (dentro del mismo modal) ── */}
            {showPriceModal && (
              <div className="modal-body">
                <p className="text-sm text-gray-600 mb-4">
                  Se detectaron <strong>{priceModalItemsList.length}</strong> producto{priceModalItemsList.length !== 1 ? 's' : ''} vinculado{priceModalItemsList.length !== 1 ? 's' : ''} a esta factura.
                  Seleccioná cuáles querés actualizar con el nuevo costo de compra.
                </p>

                <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Producto</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Costo ant.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Nuevo costo</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Precio actual</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Margen %</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">P. sugerido</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-600">Actualizar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceModalItemsList.map(item => (
                        <tr key={item.origIndex} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-medium text-gray-800">{item.descripcion}</td>
                          <td className="px-3 py-2 text-right text-gray-500">
                            {item.costo_actual != null ? `$${formatMoney(item.costo_actual)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">
                            ${formatMoney(item.costoNuevo)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {item.precio_actual != null ? `$${formatMoney(item.precio_actual)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <input
                                type="number"
                                value={item.margenEditable}
                                onChange={e => setPriceModalMargins(prev => ({ ...prev, [item.origIndex]: e.target.value }))}
                                className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:border-green-500"
                                placeholder="0"
                                min="0"
                                step="0.1"
                              />
                              <span className="text-gray-500 text-xs">%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.precioSugerido != null ? (
                              <span className={`font-medium ${
                                item.precioSugerido > (item.precio_actual || 0)
                                  ? 'text-green-600'
                                  : item.precioSugerido < (item.precio_actual || 0)
                                    ? 'text-red-600'
                                    : 'text-gray-700'
                              }`}>
                                ${formatMoney(item.precioSugerido)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs italic">sin margen</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={priceUpdates[item.origIndex] ?? false}
                              onChange={e => setPriceUpdates(prev => ({
                                ...prev,
                                [item.origIndex]: e.target.checked
                              }))}
                              disabled={item.precioSugerido == null}
                              className="w-4 h-4 accent-green-600"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  El costo de compra se actualizará en todos los productos vinculados independientemente de esta selección.
                </p>

                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowPriceModal(false)}
                    className="btn btn-secondary"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPriceModal(false)}
                    className="btn btn-secondary"
                  >
                    Solo registrar compra
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPriceModal(true)}
                    className="btn btn-primary"
                  >
                    <Save className="w-4 h-4" />
                    Registrar y actualizar seleccionados
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUTOCOMPLETE PORTAL (fuera del overflow del modal) ── */}
      {openAutocompleteIndex !== null && (() => {
        const options = getAutocompleteOptions(
          compraForm.items[openAutocompleteIndex]?.descripcion || ''
        );
        if (options.length === 0) return null;
        return createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999
            }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto"
            onMouseDown={e => e.preventDefault()}
          >
            {options.map(prod => (
              <button
                key={prod.product_id}
                type="button"
                onMouseDown={() => handleSelectProduct(openAutocompleteIndex, prod)}
                className="w-full text-left px-3 py-2 hover:bg-green-50 border-b border-gray-100 last:border-0"
              >
                <div className="font-medium text-gray-800 text-sm">{prod.nombre}</div>
                <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                  {prod.codigo_barras && <span>Cod: {prod.codigo_barras}</span>}
                  <span>Precio: ${formatMoney(prod.precio_sucursal ?? prod.precio_global)}</span>
                  {prod.margen_sucursal != null && <span>Margen: {prod.margen_sucursal}%</span>}
                </div>
              </button>
            ))}
          </div>,
          document.body
        );
      })()}

      {/* ── MODAL PROVEEDOR ── */}
      {showProveedorModal && (
        <div className={`modal-overlay${proveedorModalClosing ? ' closing' : ''}`} onClick={closeProveedorModalAnim}>
          <div
            className={`modal-content${proveedorModalClosing ? ' closing' : ''}`}
            style={{ maxWidth: '480px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button onClick={closeProveedorModalAnim} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProveedorSubmit} className="modal-body">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={proveedorForm.nombre}
                    onChange={e => setProveedorForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nombre o razón social"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">RUC / CUIT</label>
                  <input
                    type="text"
                    className="form-input"
                    value={proveedorForm.ruc_cuit}
                    onChange={e => setProveedorForm(prev => ({ ...prev, ruc_cuit: e.target.value }))}
                    placeholder="Número de identificación fiscal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={proveedorForm.email}
                      onChange={e => setProveedorForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="correo@proveedor.com"
                    />
                  </div>
                  <div>
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proveedorForm.telefono}
                      onChange={e => setProveedorForm(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Dirección</label>
                  <input
                    type="text"
                    className="form-input"
                    value={proveedorForm.direccion}
                    onChange={e => setProveedorForm(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Calle, número, ciudad"
                  />
                </div>
              </div>

              <div className="modal-footer mt-4">
                <button type="button" onClick={closeProveedorModalAnim} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save className="w-4 h-4" />
                  {editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprasView;
