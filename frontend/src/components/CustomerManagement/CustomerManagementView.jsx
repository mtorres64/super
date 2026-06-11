import React, { useState } from 'react';
import {
  Plus, Edit, Trash2, Users, Search, X,
  CircleDot, SlidersHorizontal, ChevronDown, MoreVertical,
  Phone, Mail, MapPin, Calendar, Hash, ShoppingBag,
} from 'lucide-react';
import Pagination from '../Pagination';
import SortIcon from '../ui/SortIcon';
import BulkEditCustomerModal from './BulkEditCustomerModal';
import CustomerPurchaseHistoryModal from './CustomerPurchaseHistoryModal';
import CustomerFormModal from './CustomerFormModal';

const CustomerManagementView = ({
  user,
  customers,
  total,
  loading,
  showModal,
  editingCustomer,
  searchTerm,
  setSearchTerm,
  commitSearch,
  clearSearch,
  selectedActivo,
  setSelectedActivo,
  currentPage,
  selectedRows,
  selectAllGlobal,
  handleSelectAllGlobal,
  handleClearSelection,
  showBulkDeleteModal,
  setShowBulkDeleteModal,
  bulkDeleting,
  paginatedCustomers,
  itemsPerPage,
  totalPages,
  sortConfig,
  requestSort,
  customerModalClosing,
  bulkDeleteModalClosing,
  openModal,
  closeCustomerModal,
  closeBulkDeleteModal,
  handleCustomerSaved,
  handleBulkDelete,
  handleBulkSetStatus,
  showBulkEditModal,
  bulkEditItems,
  bulkEditSaving,
  bulkEditModalClosing,
  openBulkEditModal,
  closeBulkEditModal,
  updateBulkEditItem,
  handleBulkEditSave,
  handlePageChange,
  toggleSelectRow,
  toggleSelectAll,
  purchaseHistoryCustomer,
  purchaseHistoryClosing,
  openPurchaseHistory,
  closePurchaseHistory,
  customerToDelete,
  deleteModalClosing,
  deleting,
  openDeleteModal,
  closeDeleteModal,
  handleDeleteCustomer,
}) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRowExpanded = (id) => setExpandedRows(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') commitSearch();
  };

  if (loading && paginatedCustomers.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full" onClick={() => setShowMobileMenu(false)}>
      {/* Header */}
      <div className="mb-6">
        {/* Mobile */}
        <div className="flex items-center justify-between md:hidden">
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowMobileMenu(v => !v)} className="btn btn-secondary p-2">
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMobileMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={() => { openModal(); setShowMobileMenu(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium hover:bg-gray-50 text-green-700"
                >
                  <Plus className="w-4 h-4" />Nuevo Cliente
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Clientes</h1>
            <p className="text-gray-600">{total} cliente{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => openModal()} className="btn btn-primary">
              <Plus className="w-4 h-4" />Nuevo Cliente
            </button>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, documento, email o teléfono..."
              className="form-input pl-10"
              style={searchTerm ? { paddingRight: '2.25rem' } : {}}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchTerm && (
              loading
                ? <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="spinner spinner-on-light w-4 h-4 text-gray-400" /></div>
                : <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
            )}
          </div>

          {/* Botón filtros — mobile */}
          <button
            type="button"
            onClick={() => setShowMobileFilters(v => !v)}
            className="mobile-only btn btn-secondary relative flex-shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {selectedActivo && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
            )}
          </button>

          {/* Filtros — desktop */}
          <div className="hidden md:flex gap-3 items-center">
            <div className="relative" style={{ minWidth: '8rem' }}>
              <CircleDot className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <select value={selectedActivo} onChange={e => setSelectedActivo(e.target.value)} className="form-input pl-9">
                <option value="">Estado</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filtros móvil expandibles */}
        {showMobileFilters && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
            <div className="relative">
              <CircleDot className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <select value={selectedActivo} onChange={e => { setSelectedActivo(e.target.value); setShowMobileFilters(false); }} className="form-input pl-9 w-full">
                <option value="">Estado</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {(selectedRows.size > 0 || selectAllGlobal) && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-700 font-medium">
              {selectAllGlobal ? `${total} seleccionado(s) (todos)` : `${selectedRows.size} seleccionado(s)`}
            </span>
            {!selectAllGlobal && (
              <button
                onClick={openBulkEditModal}
                className="btn btn-sm bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                <Edit className="w-4 h-4" />Editar seleccionados
              </button>
            )}
            <button
              onClick={() => handleBulkSetStatus(true)}
              className="btn btn-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
            >
              Activar
            </button>
            <button
              onClick={() => handleBulkSetStatus(false)}
              className="btn btn-sm bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
            >
              Desactivar
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="btn btn-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />Eliminar seleccionados
            </button>
            <button
              onClick={handleClearSelection}
              className="btn btn-sm ml-auto text-gray-500 border border-gray-300 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />Limpiar selección
            </button>
          </div>
          {!selectAllGlobal && paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedRows.has(c.id)) && total > paginatedCustomers.length && (
            <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-3">
              <span>Solo están seleccionados los {paginatedCustomers.length} clientes de esta página.</span>
              <button onClick={handleSelectAllGlobal} className="font-semibold text-yellow-900 underline hover:text-yellow-700 whitespace-nowrap">
                Seleccionar los {total} clientes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="table-container flex-1 min-h-0 flex flex-col">
        <div className="overflow-y-auto flex-1 min-h-0">
          {/* Select all — mobile */}
          <label className="md:hidden flex items-center gap-3 px-3 py-2 cursor-pointer select-none border-b border-gray-100">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
              checked={paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedRows.has(c.id))}
              onChange={toggleSelectAll}
            />
            <span className="text-sm text-gray-500">Seleccionar todos</span>
          </label>

          <table className="table table-collapsible">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    checked={paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedRows.has(c.id))}
                    ref={el => {
                      if (el) el.indeterminate = paginatedCustomers.some(c => selectedRows.has(c.id)) && !paginatedCustomers.every(c => selectedRows.has(c.id));
                    }}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th onClick={() => requestSort('nombre')} className="cursor-pointer select-none hover:bg-gray-50">
                  Cliente <SortIcon columnKey="nombre" sortConfig={sortConfig} />
                </th>
                <th style={{ textAlign: 'center' }} onClick={() => requestSort('documento')} className="cursor-pointer select-none hover:bg-gray-50">
                  Documento <SortIcon columnKey="documento" sortConfig={sortConfig} />
                </th>
                <th style={{ textAlign: 'center' }}>Teléfono</th>
                <th style={{ textAlign: 'center' }}>Email</th>
                <th style={{ textAlign: 'center' }}>Dirección</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  data-expanded={expandedRows.has(customer.id) ? 'true' : undefined}
                  className={selectedRows.has(customer.id) ? 'bg-blue-50' : ''}
                >
                  <td data-mobile="hide">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      checked={selectedRows.has(customer.id)}
                      onChange={() => toggleSelectRow(customer.id)}
                    />
                  </td>

                  {/* Nombre — título en mobile */}
                  <td data-mobile="title" onClick={() => toggleRowExpanded(customer.id)} className="md:cursor-default cursor-pointer">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: 'var(--primary)' }}>
                        {customer.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{customer.nombre}</div>
                        {customer.fecha_nacimiento && (
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {customer.fecha_nacimiento}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`md:hidden w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expandedRows.has(customer.id) ? 'rotate-180' : ''}`} />
                  </td>

                  <td className="text-center" data-label="Documento">
                    {customer.documento ? (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <Hash className="w-3 h-3 text-gray-400" />
                        <span className="uppercase text-xs text-gray-400 mr-0.5">{customer.tipo_documento}</span>
                        {customer.documento}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  <td className="text-center" data-label="Teléfono">
                    {customer.telefono ? (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <Phone className="w-3 h-3 text-gray-400" />{customer.telefono}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  <td className="text-center" data-label="Email">
                    {customer.email ? (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-[140px]">{customer.email}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  <td className="text-center" data-label="Dirección">
                    {customer.direccion ? (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{customer.direccion}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  <td className="text-center" data-label="Estado">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      customer.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {customer.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  <td data-mobile="actions">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openPurchaseHistory(customer)}
                        className="btn btn-primary btn-sm"
                        title="Ver compras"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openModal(customer)} className="btn-edit" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => openDeleteModal(customer)} className="btn-delete" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginatedCustomers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No se encontraron clientes</p>
            </div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          itemName="clientes"
        />
      </div>

      {/* Modal alta/edición */}
      {showModal && (
        <CustomerFormModal
          editingCustomer={editingCustomer}
          closing={customerModalClosing}
          onClose={closeCustomerModal}
          onSaved={handleCustomerSaved}
        />
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className={`modal-overlay${bulkDeleteModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content max-w-md${bulkDeleteModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Eliminar clientes
              </h3>
              <button onClick={closeBulkDeleteModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              Estás por eliminar <strong>{selectAllGlobal ? `${total} cliente(s)` : `${selectedRows.size} cliente(s)`}</strong> de forma permanente.
              <br />Esta acción no se puede deshacer.
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button type="button" onClick={closeBulkDeleteModal} disabled={bulkDeleting} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="button" onClick={handleBulkDelete} disabled={bulkDeleting} className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
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

      {/* Bulk Edit Modal */}
      {(showBulkEditModal || bulkEditModalClosing) && (
        <BulkEditCustomerModal
          items={bulkEditItems}
          onItemChange={updateBulkEditItem}
          closing={bulkEditModalClosing}
          onClose={closeBulkEditModal}
          onSave={handleBulkEditSave}
          saving={bulkEditSaving}
        />
      )}

      {/* Delete Customer Modal */}
      {(customerToDelete || deleteModalClosing) && (
        <div className={`modal-overlay${deleteModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content max-w-md${deleteModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Eliminar cliente
              </h3>
              <button onClick={closeDeleteModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              Estás por eliminar a <strong>{customerToDelete?.nombre}</strong> de forma permanente.
              <br />Esta acción no se puede deshacer.
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button type="button" onClick={closeDeleteModal} disabled={deleting} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="button" onClick={handleDeleteCustomer} disabled={deleting} className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? (
                  <><div className="spinner w-4 h-4" /> Eliminando...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Eliminar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {(purchaseHistoryCustomer || purchaseHistoryClosing) && (
        <CustomerPurchaseHistoryModal
          customer={purchaseHistoryCustomer || {}}
          closing={purchaseHistoryClosing}
          onClose={closePurchaseHistory}
        />
      )}
    </div>
  );
};

export default CustomerManagementView;
