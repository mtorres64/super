import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Printer,
  RefreshCw,
  Package,
  PackagePlus,
  SlidersHorizontal
} from 'lucide-react';
import Pagination from '../Pagination';

const StockAlertsView = ({
  user,
  items,
  total,
  totalPages,
  currentPage,
  setCurrentPage,
  loading,
  exportingExcel,
  exportingPdf,
  modal,
  saving,
  ITEMS_PER_PAGE,
  onRefresh,
  onExportExcel,
  onExportPdf,
  onOpenModal,
  onCloseModal,
  onSave,
  onModalValueChange,
  getDiffColor,
}) => {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              Productos con Stock Bajo
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {user?.rol === 'admin'
                ? 'Todas las sucursales'
                : 'Tu sucursal'}
              {!loading && ` · ${total} producto${total !== 1 ? 's' : ''} requieren atención`}
            </p>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="btn btn-secondary flex items-center gap-2"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onExportPdf}
            disabled={exportingPdf || total === 0}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {exportingPdf ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
          <button
            onClick={onExportExcel}
            disabled={exportingExcel || total === 0}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exportingExcel ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="spinner w-8 h-8"></div>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Package className="w-12 h-12 mb-3 text-green-300" />
            <p className="text-lg font-medium text-gray-600">¡Todo en orden!</p>
            <p className="text-sm mt-1">No hay productos con stock bajo en este momento.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    {user?.rol === 'admin' && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sucursal
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Actual
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Mínimo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diferencia
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    {user?.rol === 'admin' && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => {
                    const diff = item.stock - item.stock_minimo;
                    const isCritical = item.stock === 0;
                    return (
                      <tr key={item.branch_product_id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCritical ? 'bg-red-600' : 'bg-yellow-400'}`} />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.nombre}</div>
                              {item.codigo_barras && (
                                <div className="text-xs text-gray-400">{item.codigo_barras}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {user?.rol === 'admin' && (
                          <td className="px-4 py-3 text-sm text-gray-600">{item.sucursal || '—'}</td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${isCritical ? 'text-red-700' : 'text-orange-600'}`}>
                            {item.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {item.stock_minimo}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm ${getDiffColor(diff)}`}>
                            {diff}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCritical ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Sin stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Stock bajo
                            </span>
                          )}
                        </td>
                        {user?.rol === 'admin' && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => onOpenModal(item, 'stock')}
                                className="btn btn-color-secondary btn-icon-sm"
                                title="Agregar stock"
                              >
                                <PackagePlus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenModal(item, 'stock_minimo')}
                                className="btn btn-tertiary btn-icon-sm"
                                title="Modificar stock mínimo"
                              >
                                <SlidersHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              itemName="productos"
            />
          </>
        )}
      </div>

      {modal.open && (
        <div className="modal-overlay" onClick={onCloseModal}>
          <div className="modal-content" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {modal.action === 'stock_minimo' ? 'Modificar Stock Mínimo' : 'Agregar Stock'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{modal.item?.nombre}</p>
            <div className="mb-5">
              <label className="form-label">
                {modal.action === 'stock_minimo'
                  ? `Nuevo valor (actual: ${modal.item?.stock_minimo})`
                  : `Cantidad a agregar (stock actual: ${modal.item?.stock})`}
              </label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={modal.value}
                onChange={e => onModalValueChange(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && onSave()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onCloseModal} className="btn btn-secondary">Cancelar</button>
              <button onClick={onSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAlertsView;
