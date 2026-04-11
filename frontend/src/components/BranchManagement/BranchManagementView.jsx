import React from 'react';
import {
  Building2,
  Plus,
  Edit,
  ChevronRight,
  ArrowLeft,
  Search,
  Save,
  X,
  Users,
  Package,
  ToggleLeft,
  ToggleRight,
  Download,
  FileText,
  ChevronDown,
  Percent,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import Pagination from '../Pagination';

const BranchManagementView = ({
  loading,
  branches,
  selectedBranch,
  loadingProducts,
  searchTerm,
  showModal,
  editingBranch,
  pendingChanges,
  savingChanges,
  showExportMenu,
  selectedRows,
  showBulkMargenModal,
  bulkMargenTipo,
  bulkMargenValor,
  showBulkStockMinModal,
  bulkStockMinTipo,
  bulkStockMinValor,
  showBulkDeleteModal,
  bulkDeleting,
  currentPage,
  formData,
  branchModalClosing,
  bulkDeleteModalClosing,
  bulkMargenModalClosing,
  bulkStockMinModalClosing,
  filteredProducts,
  itemsPerPage,
  totalPages,
  paginatedProducts,
  hasPendingChanges,
  allFilteredSelected,
  someFilteredSelected,
  onOpenModal,
  onCloseBranchModal,
  onSubmit,
  onToggleBranchActive,
  onSelectBranch,
  onGoBack,
  onProductFieldChange,
  onPendingMargenChange,
  onPendingPrecioChange,
  onToggleSelectAll,
  onToggleSelectRow,
  onSaveProductChanges,
  onToggleBranchProductActive,
  onExportBranch,
  onSetShowExportMenu,
  onSetFormData,
  onSetBulkMargenTipo,
  onSetBulkMargenValor,
  onSetBulkStockMinTipo,
  onSetBulkStockMinValor,
  onSetShowBulkMargenModal,
  onSetShowBulkStockMinModal,
  onSetShowBulkDeleteModal,
  onSetSelectedRows,
  onSetCurrentPage,
  onSearch,
  onApplyBulkMargen,
  onApplyBulkStockMin,
  onHandleBulkDelete,
  onCloseBulkDeleteModalAnim,
  onCloseBulkMargenModal,
  onCloseBulkStockMinModal,
  getCategoryName,
  getUsersInBranch,
  getProductCurrentMargen,
}) => {
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  // Branch detail view
  if (selectedBranch) {
    return (
      <div className="p-6" onClick={() => onSetShowExportMenu(false)}>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onGoBack} className="btn btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-green-600" />
              {selectedBranch.nombre}
            </h1>
            <p className="text-gray-500 text-sm">{selectedBranch.direccion}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {hasPendingChanges && (
              <>
                <span className="text-sm text-amber-600 font-medium">
                  {Object.keys(pendingChanges).length} cambio(s) sin guardar
                </span>
                <button
                  onClick={onSaveProductChanges}
                  disabled={savingChanges}
                  className="btn btn-primary"
                >
                  {savingChanges ? (
                    <><div className="spinner w-4 h-4" /> Guardando...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Guardar Cambios</>
                  )}
                </button>
              </>
            )}
            {/* Export branch products */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onSetShowExportMenu(prev => !prev)}
                className="btn btn-secondary"
              >
                <Download className="w-4 h-4" />
                Exportar
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => onExportBranch('csv')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
                  >
                    <FileText className="w-4 h-4 text-green-600" />
                    CSV
                  </button>
                  <button
                    onClick={() => onExportBranch('xlsx')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    Excel (XLSX)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-700 font-medium">{selectedRows.size} seleccionado(s)</span>
            <button
              onClick={() => { onSetBulkMargenTipo('establecer'); onSetBulkMargenValor(''); onSetShowBulkMargenModal(true); }}
              className="btn btn-secondary btn-sm"
            >
              <Percent className="w-4 h-4" />
              Margen
            </button>
            <button
              onClick={() => { onSetBulkStockMinTipo('establecer'); onSetBulkStockMinValor(''); onSetShowBulkStockMinModal(true); }}
              className="btn btn-secondary btn-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Stock Mín.
            </button>
            <button
              onClick={() => onSetShowBulkDeleteModal(true)}
              className="btn btn-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar seleccionados
            </button>
            <button
              onClick={() => onSetSelectedRows(new Set())}
              className="text-gray-400 hover:text-gray-600 ml-auto"
              title="Deseleccionar todo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loadingProducts ? (
          <div className="flex items-center justify-center h-48">
            <div className="spinner w-8 h-8"></div>
          </div>
        ) : (
          <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      checked={allFilteredSelected}
                      ref={el => { if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected; }}
                      onChange={onToggleSelectAll}
                    />
                  </th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="text-center">Precio Global</th>
                  <th className="text-center">Margen %</th>
                  <th className="text-center">Precio Sucursal</th>
                  <th className="text-center">Stock Sucursal</th>
                  <th className="text-center">Stock Mínimo</th>
                  <th className="text-center">Activo</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map(product => {
                  const changes = pendingChanges[product.product_id] || {};
                  const currentPrice = changes.precio !== undefined
                    ? changes.precio
                    : (product.precio_sucursal ?? product.precio_global);
                  const currentStock = changes.stock !== undefined
                    ? changes.stock
                    : (product.stock_sucursal ?? product.stock_global);
                  const currentStockMinimo = changes.stock_minimo !== undefined
                    ? changes.stock_minimo
                    : (product.stock_minimo_sucursal || 0);
                  const currentMargen = getProductCurrentMargen(product, changes);
                  const hasChange = pendingChanges[product.product_id] !== undefined;
                  const isSelected = selectedRows.has(product.product_id);

                  return (
                    <tr key={product.product_id} className={hasChange ? 'bg-amber-50' : isSelected ? 'bg-blue-50' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={isSelected}
                          onChange={() => onToggleSelectRow(product.product_id)}
                        />
                      </td>
                      <td>
                        <div className="font-medium text-gray-900">{product.nombre}</div>
                        {product.codigo_barras && (
                          <div className="text-xs text-blue-600">{product.codigo_barras}</div>
                        )}
                        <div className="text-xs text-gray-400 capitalize">
                          {product.tipo?.replace('_', ' ')}
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {getCategoryName(product.categoria_id)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="text-gray-500">${product.precio_global?.toFixed(2)}</span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            className={`w-20 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 ${hasChange && changes.margen !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                            value={currentMargen}
                            onChange={(e) => {
                              const margen = parseFloat(e.target.value) || 0;
                              onPendingMargenChange(product.product_id, margen, product.precio_global);
                            }}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`w-28 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 ${hasChange && changes.precio !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                          value={currentPrice}
                          onChange={(e) => {
                            const precio = parseFloat(e.target.value) || 0;
                            onPendingPrecioChange(product.product_id, precio, product.precio_global);
                          }}
                          placeholder={product.precio_global?.toFixed(2)}
                        />
                        {product.tipo === 'por_peso' && (
                          <div className="mt-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-28 text-center border border-gray-200 rounded px-2 py-1 text-xs"
                              value={changes.precio_por_peso !== undefined ? changes.precio_por_peso : (product.precio_por_peso_sucursal ?? '')}
                              onChange={(e) => onProductFieldChange(product.product_id, 'precio_por_peso', parseFloat(e.target.value) || 0)}
                              placeholder="precio/kg"
                            />
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <input
                          type="number"
                          min="0"
                          className={`w-20 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 ${hasChange && changes.stock !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                          value={currentStock}
                          onChange={(e) => onProductFieldChange(product.product_id, 'stock', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="number"
                          min="0"
                          className={`w-20 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 ${hasChange && changes.stock_minimo !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                          value={currentStockMinimo}
                          onChange={(e) => onProductFieldChange(product.product_id, 'stock_minimo', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => onToggleBranchProductActive(product)}
                          disabled={!product.branch_product_id}
                          className="text-gray-400 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={!product.branch_product_id ? 'Guarda cambios primero para activar/desactivar' : ''}
                        >
                          {product.activo_sucursal
                            ? <ToggleRight className="w-6 h-6 text-green-500" />
                            : <ToggleLeft className="w-6 h-6 text-gray-400" />
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={onSetCurrentPage}
            itemName="productos"
          />
          </>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteModal && (
          <div className={`modal-overlay${bulkDeleteModalClosing ? ' closing' : ''}`}>
            <div className={`modal-content max-w-md${bulkDeleteModalClosing ? ' closing' : ''}`}>
              <div className="modal-header">
                <h3 className="modal-title flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  Eliminar productos de la sucursal
                </h3>
                <button onClick={onCloseBulkDeleteModalAnim} className="modal-close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                Estás por eliminar <strong>{selectedRows.size} producto(s)</strong> de la sucursal <strong>{selectedBranch.nombre}</strong>.
                <br />Esta acción no se puede deshacer.
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={onCloseBulkDeleteModalAnim}
                  disabled={bulkDeleting}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onHandleBulkDelete}
                  disabled={bulkDeleting}
                  className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkDeleting ? (
                    <><div className="spinner w-4 h-4" /> Eliminando...</>
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Eliminar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Stock Mínimo Modal */}
        {showBulkStockMinModal && (
          <div className={`modal-overlay${bulkStockMinModalClosing ? ' closing' : ''}`}>
            <div className={`modal-content max-w-md${bulkStockMinModalClosing ? ' closing' : ''}`}>
              <div className="modal-header">
                <h3 className="modal-title flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-green-600" />
                  Cambio masivo de Stock Mínimo
                </h3>
                <button onClick={onCloseBulkStockMinModal} className="modal-close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Aplicar a <strong>{selectedRows.size} producto(s)</strong> seleccionado(s)
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Tipo de cambio</label>
                  <div className="flex gap-2 mt-1">
                    {[
                      { value: 'establecer', label: 'Establecer' },
                      { value: 'incrementar', label: 'Incrementar' },
                      { value: 'decrementar', label: 'Decrementar' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onSetBulkStockMinTipo(opt.value)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                          bulkStockMinTipo === opt.value
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {bulkStockMinTipo === 'establecer' ? 'Nuevo mínimo' : bulkStockMinTipo === 'incrementar' ? 'Incremento' : 'Decremento'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input w-32 text-center mt-1"
                    value={bulkStockMinValor}
                    onChange={(e) => onSetBulkStockMinValor(e.target.value)}
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={onCloseBulkStockMinModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onApplyBulkStockMin}
                  disabled={bulkStockMinValor === ''}
                  className="btn btn-primary disabled:opacity-50"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Margen Modal */}
        {showBulkMargenModal && (
          <div className={`modal-overlay${bulkMargenModalClosing ? ' closing' : ''}`}>
            <div className={`modal-content max-w-md${bulkMargenModalClosing ? ' closing' : ''}`}>
              <div className="modal-header">
                <h3 className="modal-title flex items-center gap-2">
                  <Percent className="w-5 h-5 text-green-600" />
                  Cambio masivo de Margen
                </h3>
                <button onClick={onCloseBulkMargenModal} className="modal-close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Aplicar a <strong>{selectedRows.size} producto(s)</strong> seleccionado(s)
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Tipo de cambio</label>
                  <div className="flex gap-2 mt-1">
                    {[
                      { value: 'establecer', label: 'Establecer' },
                      { value: 'incrementar', label: 'Incrementar' },
                      { value: 'decrementar', label: 'Decrementar' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onSetBulkMargenTipo(opt.value)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                          bulkMargenTipo === opt.value
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {bulkMargenTipo === 'establecer' ? 'Nuevo margen' : bulkMargenTipo === 'incrementar' ? 'Incremento' : 'Decremento'}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input w-32 text-center"
                      value={bulkMargenValor}
                      onChange={(e) => onSetBulkMargenValor(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                    />
                    <span className="text-gray-500 font-medium">%</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                  {bulkMargenTipo === 'establecer' && (
                    <span>El margen se establecerá en <strong>{bulkMargenValor || '0'}%</strong> para todos los seleccionados. El precio sucursal se recalculará como <em>precio_global × (1 + margen/100)</em>.</span>
                  )}
                  {bulkMargenTipo === 'incrementar' && (
                    <span>Al margen actual de cada producto se le sumará <strong>{bulkMargenValor || '0'}%</strong>. El precio sucursal se actualizará automáticamente.</span>
                  )}
                  {bulkMargenTipo === 'decrementar' && (
                    <span>Al margen actual de cada producto se le restará <strong>{bulkMargenValor || '0'}%</strong>. El precio sucursal se actualizará automáticamente.</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={onCloseBulkMargenModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onApplyBulkMargen}
                  disabled={bulkMargenValor === ''}
                  className="btn btn-primary disabled:opacity-50"
                >
                  <Percent className="w-4 h-4" />
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Branch list view
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Gestión de Sucursales
          </h1>
          <p className="text-gray-600">{branches.length} sucursal(es) registrada(s)</p>
        </div>
        <button onClick={() => onOpenModal()} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Nueva Sucursal
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Sin sucursales</h3>
          <p className="text-sm mb-4">Crea tu primera sucursal para gestionar inventario y precios diferenciales</p>
          <button onClick={() => onOpenModal()} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Crear Primera Sucursal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(branch => (
            <div
              key={branch.id}
              className={`bg-white rounded-xl border-2 p-5 shadow-sm transition-all ${branch.activo ? 'border-gray-200 hover:border-green-300 hover:shadow-md' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${branch.activo ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Building2 className={`w-5 h-5 ${branch.activo ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{branch.nombre}</h3>
                    <p className="text-xs text-gray-500">{branch.direccion}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${branch.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {branch.activo ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {branch.telefono && (
                <p className="text-sm text-gray-500 mb-3">📞 {branch.telefono}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {getUsersInBranch(branch.id)} usuario(s)
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onSelectBranch(branch)}
                  className="flex-1 btn btn-primary btn-sm"
                >
                  <Package className="w-4 h-4" />
                  Ver Productos
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onOpenModal(branch)}
                  className="btn btn-secondary btn-sm"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onToggleBranchActive(branch)}
                  className="btn btn-secondary btn-sm"
                  title={branch.activo ? 'Desactivar sucursal' : 'Activar sucursal'}
                >
                  {branch.activo
                    ? <ToggleRight className="w-4 h-4 text-green-600" />
                    : <ToggleLeft className="w-4 h-4 text-gray-400" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Branch Modal */}
      {showModal && (
        <div className={`modal-overlay${branchModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content${branchModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
              </h3>
              <button onClick={onCloseBranchModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingBranch && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>Nota:</strong> Al crear la sucursal, todos los productos existentes se asignarán automáticamente con sus precios actuales.
              </div>
            )}

            <form onSubmit={onSubmit}>
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Nombre de la Sucursal *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => onSetFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Dirección *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.direccion}
                    onChange={(e) => onSetFormData(prev => ({ ...prev, direccion: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.telefono}
                    onChange={(e) => onSetFormData(prev => ({ ...prev, telefono: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={onCloseBranchModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save className="w-4 h-4" />
                  {editingBranch ? 'Actualizar' : 'Crear'} Sucursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagementView;
