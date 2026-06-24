import React, { useRef, useEffect } from 'react';
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
  Download,
  FileText,
  ChevronDown,
  Percent,
  SlidersHorizontal,
  Trash2,
  EyeOff,
  Tag,
  Layers,
  CircleDot,
  Store,
} from 'lucide-react';
import Pagination from '../Pagination';
import SortIcon from '../ui/SortIcon';
import { getCategoryIcon } from '../../utils/categoryIcons';
import BranchBulkEditModal from './BranchBulkEditModal';

const _BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const driveToProxyUrl = (url) => {
  if (!url || !url.includes('drive.google.com')) return url;
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? `${_BACKEND_URL}/api/drive-image?file_id=${m[1]}` : url;
};

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
  selectAllGlobal,
  showBulkMargenModal,
  bulkMargenTipo,
  bulkMargenValor,
  showBulkStockMinModal,
  bulkStockMinTipo,
  bulkStockMinValor,
  showBulkStockModal,
  bulkStockTipo,
  bulkStockValor,
  showBulkDeleteModal,
  bulkDeleting,
  currentPage,
  formData,
  branchModalClosing,
  bulkDeleteModalClosing,
  bulkMargenModalClosing,
  bulkStockMinModalClosing,
  bulkStockModalClosing,
  filteredProducts,
  total,
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
  onPendingCostoChange,
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
  onSetBulkStockTipo,
  onSetBulkStockValor,
  onSetShowBulkMargenModal,
  onSetShowBulkStockMinModal,
  onSetShowBulkStockModal,
  onSetShowBulkDeleteModal,
  onSetSelectedRows,
  onSelectAllGlobal,
  onClearSelection,
  onSetCurrentPage,
  onSearch,
  onCommitSearch,
  onClearSearch,
  onApplyBulkMargen,
  onApplyBulkStockMin,
  onApplyBulkStock,
  onHandleBulkDelete,
  onCloseBulkDeleteModalAnim,
  onCloseBulkMargenModal,
  onCloseBulkStockMinModal,
  onCloseBulkStockModal,
  getCategoryName,
  categories,
  getUsersInBranch,
  getProductCurrentMargen,
  sortConfig,
  requestSort,
  selectedCategory,
  setSelectedCategory,
  selectedKind,
  setSelectedKind,
  selectedActivo,
  setSelectedActivo,
  savingBranch,
  showDeleteBranchModal,
  deleteBranchModalClosing,
  branchToDelete,
  deletingBranch,
  onOpenDeleteBranchModal,
  onDeleteBranch,
  onCloseDeleteBranchModal,
  showBranchBulkEditModal,
  branchBulkEditItems,
  branchBulkEditSaving,
  branchBulkEditModalClosing,
  onOpenBranchBulkEditModal,
  onCloseBranchBulkEditModal,
  onUpdateBranchBulkEditItem,
  onHandleBranchBulkEditSave,
  tieneMultiSucursal = true,
  tieneTienda = false,
  togglingTiendaId = null,
  bulkTiendaLoading = false,
  onToggleMostrarEnTienda,
  onBulkSetMostrarEnTienda,
}) => {
  const [focusedIdx, setFocusedIdx] = React.useState(-1);
  const [showCategoryFilter, setShowCategoryFilter] = React.useState(false);
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  const [expandedRows, setExpandedRows] = React.useState(new Set());
  const categoryFilterRef = useRef(null);

  const toggleRowExpanded = (id) => setExpandedRows(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(e.target)) {
        setShowCategoryFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => { setFocusedIdx(-1); }, [paginatedProducts]);
  React.useEffect(() => {
    if (focusedIdx >= 0) {
      document.querySelector('[data-bm-focused="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIdx]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx(i => Math.min(i + 1, paginatedProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      onCommitSearch();
    }
  };

  if (loading || (!tieneMultiSucursal && !selectedBranch)) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  // Branch detail view
  if (selectedBranch) {
    return (
      <div className="p-6 flex flex-col h-full" onClick={() => onSetShowExportMenu(false)}>
        <div className="mb-6">
          {/* Fila título */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {tieneMultiSucursal && (
                <div className="hidden md:block">
                  <button onClick={onGoBack} className="btn btn-secondary">
                    <ArrowLeft className="w-4 h-4" />
                    Sucursales
                  </button>
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 min-w-0">
                  <Building2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <span className="truncate">{selectedBranch.nombre}</span>
                </h1>
                <p className="text-gray-500 text-sm truncate">{selectedBranch.direccion}</p>
              </div>
            </div>
            {/* Exportar — siempre visible, derecha */}
            <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
          {/* Cambios pendientes */}
          {hasPendingChanges && (
            <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
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
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                className="form-input pl-10"
                style={searchTerm ? { paddingRight: '2.25rem' } : {}}
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              {searchTerm && (
                loadingProducts
                  ? <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="spinner spinner-on-light w-4 h-4 text-gray-400" /></div>
                  : <button type="button" onClick={onClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
              )}
            </div>

            {/* Botón filtros — solo mobile */}
            <button
              type="button"
              onClick={() => setShowMobileFilters(v => !v)}
              className="md:hidden btn btn-secondary relative flex-shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {(selectedCategory || selectedKind || selectedActivo) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
              )}
            </button>

            {/* Filtros inline — solo desktop */}
            <div className="hidden md:flex gap-3 items-center">
              <div className="relative" style={{ minWidth: '10rem' }} ref={categoryFilterRef}>
                {(() => {
                  const selCat = categories.find(c => c.id === selectedCategory);
                  const SelIcon = selCat ? getCategoryIcon(selCat.nombre, selCat.icono) : Tag;
                  return (
                    <button type="button" onClick={() => setShowCategoryFilter(v => !v)}
                      className="form-input pl-9 text-left flex items-center w-full"
                      style={{ color: selCat ? 'inherit' : '#9ca3af' }}>
                      <SelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <span className="truncate">{selCat ? selCat.nombre : 'Categoría'}</span>
                      {selCat && <X className="ml-auto h-3.5 w-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); setSelectedCategory(''); setShowCategoryFilter(false); }} />}
                    </button>
                  );
                })()}
                {showCategoryFilter && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <button type="button" onClick={() => { setSelectedCategory(''); setShowCategoryFilter(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
                      <Tag className="h-4 w-4" />Todas las categorías
                    </button>
                    {categories.map(cat => {
                      const CatIcon = getCategoryIcon(cat.nombre, cat.icono);
                      return (
                        <button key={cat.id} type="button" onClick={() => { setSelectedCategory(cat.id); setShowCategoryFilter(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${selectedCategory === cat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                          <CatIcon className="h-4 w-4 flex-shrink-0" />{cat.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="relative" style={{ minWidth: '8rem' }}>
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select value={selectedKind} onChange={(e) => setSelectedKind(e.target.value)} className="form-input pl-9">
                  <option value="">Clase</option>
                  <option value="normal">Normal</option>
                  <option value="combo">Combo</option>
                </select>
              </div>
              <div className="relative" style={{ minWidth: '8rem' }}>
                <CircleDot className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select value={selectedActivo} onChange={(e) => setSelectedActivo(e.target.value)} className="form-input pl-9">
                  <option value="">Estado</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Panel filtros móvil */}
          {showMobileFilters && (
            <div className="md:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
              <div className="relative" ref={categoryFilterRef}>
                {(() => {
                  const selCat = categories.find(c => c.id === selectedCategory);
                  const SelIcon = selCat ? getCategoryIcon(selCat.nombre, selCat.icono) : Tag;
                  return (
                    <button type="button" onClick={() => setShowCategoryFilter(v => !v)}
                      className="form-input pl-9 text-left flex items-center w-full"
                      style={{ color: selCat ? 'inherit' : '#9ca3af' }}>
                      <SelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <span className="truncate">{selCat ? selCat.nombre : 'Categoría'}</span>
                      {selCat && <X className="ml-auto h-3.5 w-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); setSelectedCategory(''); setShowCategoryFilter(false); }} />}
                    </button>
                  );
                })()}
                {showCategoryFilter && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <button type="button" onClick={() => { setSelectedCategory(''); setShowCategoryFilter(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
                      <Tag className="h-4 w-4" />Todas las categorías
                    </button>
                    {categories.map(cat => {
                      const CatIcon = getCategoryIcon(cat.nombre, cat.icono);
                      return (
                        <button key={cat.id} type="button"
                          onClick={() => { setSelectedCategory(cat.id); setShowCategoryFilter(false); setShowMobileFilters(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${selectedCategory === cat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                          <CatIcon className="h-4 w-4 flex-shrink-0" />{cat.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select value={selectedKind} onChange={(e) => { setSelectedKind(e.target.value); setShowMobileFilters(false); }} className="form-input pl-9 w-full">
                  <option value="">Clase</option>
                  <option value="normal">Normal</option>
                  <option value="combo">Combo</option>
                </select>
              </div>
              <div className="relative">
                <CircleDot className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select value={selectedActivo} onChange={(e) => { setSelectedActivo(e.target.value); setShowMobileFilters(false); }} className="form-input pl-9 w-full">
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
                  onClick={onOpenBranchBulkEditModal}
                  className="btn btn-sm bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                >
                  <Edit className="w-4 h-4" />
                  Editar seleccionados
                </button>
              )}
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
                onClick={() => { onSetBulkStockTipo('establecer'); onSetBulkStockValor(''); onSetShowBulkStockModal(true); }}
                className="btn btn-secondary btn-sm"
              >
                <Package className="w-4 h-4" />
                Stock
              </button>
              {tieneTienda && (
                <>
                  <button
                    onClick={() => onBulkSetMostrarEnTienda(true)}
                    disabled={bulkTiendaLoading}
                    className="btn btn-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {bulkTiendaLoading ? (
                      <div className="animate-spin rounded-full w-4 h-4" style={{ border: '2px solid #ddd6fe', borderTopColor: '#9333ea' }} />
                    ) : (
                      <Store className="w-4 h-4" />
                    )}
                    Mostrar en tienda
                  </button>
                  <button
                    onClick={() => onBulkSetMostrarEnTienda(false)}
                    disabled={bulkTiendaLoading}
                    className="btn btn-sm bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {bulkTiendaLoading ? (
                      <div className="animate-spin rounded-full w-4 h-4" style={{ border: '2px solid #ddd6fe', borderTopColor: '#9333ea' }} />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                    Ocultar de tienda
                  </button>
                </>
              )}
              <button
                onClick={() => onSetShowBulkDeleteModal(true)}
                className="btn btn-sm bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              >
                <EyeOff className="w-4 h-4" />
                Desactivar seleccionados
              </button>
              <button
                onClick={onClearSelection}
                className="btn btn-sm ml-auto text-gray-500 border border-gray-300 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
                Limpiar selección
              </button>
            </div>
            {!selectAllGlobal && paginatedProducts.length > 0 && paginatedProducts.every(p => selectedRows.has(p.product_id)) && total > paginatedProducts.length && (
              <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-3">
                <span>Solo están seleccionados los {paginatedProducts.length} productos de esta página.</span>
                <button
                  onClick={onSelectAllGlobal}
                  className="font-semibold text-yellow-900 underline hover:text-yellow-700 whitespace-nowrap"
                >
                  Seleccionar los {total} productos
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col">
        {loadingProducts && paginatedProducts.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="spinner w-8 h-8"></div>
          </div>
        ) : (
          <div className="table-container flex-1 min-h-0 flex flex-col">
          <div className="overflow-y-auto flex-1 min-h-0">
            {/* Select all — solo mobile */}
            <label className="md:hidden flex items-center gap-3 px-3 py-2 cursor-pointer select-none border-b border-gray-100">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedRows.has(p.product_id))}
                onChange={onToggleSelectAll}
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
                      checked={allFilteredSelected}
                      ref={el => { if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected; }}
                      onChange={onToggleSelectAll}
                    />
                  </th>
                  <th onClick={() => requestSort('nombre')} className="cursor-pointer select-none hover:bg-gray-50">Producto <SortIcon columnKey="nombre" sortConfig={sortConfig} /></th>
                  <th>Categoría</th>
                  <th className="text-center cursor-pointer select-none bg-yellow-100 hover:bg-yellow-200" onClick={() => requestSort('costo_sucursal')}>Precio Costo <SortIcon columnKey="costo_sucursal" sortConfig={sortConfig} /></th>
                  <th className="text-center bg-yellow-100">Margen %</th>
                  <th className="text-center cursor-pointer select-none bg-yellow-100 hover:bg-yellow-200" onClick={() => requestSort('precio_sucursal')}>Precio Sucursal <SortIcon columnKey="precio_sucursal" sortConfig={sortConfig} /></th>
                  <th className="text-center cursor-pointer select-none bg-yellow-100 hover:bg-yellow-200" onClick={() => requestSort('stock_sucursal')}>Stock Sucursal <SortIcon columnKey="stock_sucursal" sortConfig={sortConfig} /></th>
                  <th className="text-center cursor-pointer select-none hover:bg-gray-50" onClick={() => requestSort('stock_minimo_sucursal')}>Stock Mínimo <SortIcon columnKey="stock_minimo_sucursal" sortConfig={sortConfig} /></th>
                  {tieneTienda && <th className="text-center">En Tienda</th>}
                  <th className="text-center">Activo</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product, idx) => {
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
                    <tr
                      key={product.product_id}
                      data-bm-focused={focusedIdx === idx ? 'true' : undefined}
                      data-expanded={expandedRows.has(product.product_id) ? 'true' : undefined}
                      className={focusedIdx === idx ? 'bg-green-50 outline outline-2 outline-green-400' : hasChange ? 'bg-amber-50' : isSelected ? 'bg-blue-50' : ''}
                    >
                      <td data-mobile="hide">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={isSelected}
                          onChange={() => onToggleSelectRow(product.product_id)}
                        />
                      </td>
                      <td data-mobile="title" onClick={() => toggleRowExpanded(product.product_id)} className="md:cursor-default cursor-pointer">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {(() => {
                            if (product.imagen_url) {
                              return (
                                <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                                  <img src={driveToProxyUrl(product.imagen_url)} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; e.target.parentNode.classList.add('flex','items-center','justify-center'); }} />
                                </div>
                              );
                            }
                            const cat = categories.find(c => c.id === product.categoria_id);
                            const CatIcon = getCategoryIcon(cat?.nombre, cat?.icono);
                            return (
                              <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                <CatIcon className="w-4 h-4 text-gray-500" />
                              </div>
                            );
                          })()}
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{product.nombre}</div>
                            {product.codigo_barras && (
                              <div className="text-xs text-blue-600">{product.codigo_barras}</div>
                            )}
                            <div className="text-xs text-gray-400 capitalize">
                              {product.tipo?.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        <ChevronDown className={`md:hidden w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expandedRows.has(product.product_id) ? 'rotate-180' : ''}`} />
                      </td>
                      <td data-label="Categoría">
                        {(() => {
                          const cat = categories.find(c => c.id === product.categoria_id);
                          const CatIcon = getCategoryIcon(cat?.nombre, cat?.icono);
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 rounded-full" style={{ color: '#1e3a5f' }}>
                              <CatIcon className="w-3 h-3" />
                              {getCategoryName(product.categoria_id)}
                            </span>
                          );
                        })()}
                      </td>
                      <td data-label="Precio Costo" className="text-center bg-yellow-50">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`w-24 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 ${hasChange && changes.costo_calculado !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}
                          value={changes.costo_calculado != null ? changes.costo_calculado : (product.costo_sucursal ?? '')}
                          placeholder="—"
                          onChange={(e) => {
                            const costo = parseFloat(e.target.value);
                            if (!isNaN(costo)) onPendingCostoChange(product.product_id, costo, product.margen_sucursal);
                          }}
                        />
                      </td>
                      <td data-label="Margen %" className="text-center bg-yellow-50">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            className={`w-20 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 ${hasChange && changes.margen !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}
                            value={currentMargen}
                            onChange={(e) => {
                              const parsed = parseFloat(e.target.value);
                              if (!isNaN(parsed)) onPendingMargenChange(product.product_id, parsed, product.costo_sucursal, product.precio_sucursal, product.precio_global);
                            }}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </td>
                      <td data-label="Precio Sucursal" className="text-center bg-yellow-50">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`w-28 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 ${hasChange && changes.precio !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}
                          value={currentPrice}
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            if (!isNaN(parsed)) onPendingPrecioChange(product.product_id, parsed, product.costo_sucursal, product.margen_sucursal);
                          }}
                          placeholder={product.precio_global?.toFixed(2)}
                        />
                        {product.tipo === 'por_peso' && (
                          <div className="mt-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-28 text-center border border-gray-200 rounded px-2 py-1 text-xs bg-white"
                              value={changes.precio_por_peso !== undefined ? changes.precio_por_peso : (product.precio_por_peso_sucursal ?? '')}
                              onChange={(e) => { const p = parseFloat(e.target.value); if (!isNaN(p)) onProductFieldChange(product.product_id, 'precio_por_peso', p); }}
                              placeholder="precio/kg"
                            />
                          </div>
                        )}
                      </td>
                      <td data-label="Stock" className="text-center bg-yellow-50">
                        <input
                          type="number"
                          min="0"
                          className={`w-20 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 ${hasChange && changes.stock !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}
                          value={currentStock}
                          onChange={(e) => { const s = parseInt(e.target.value); if (!isNaN(s)) onProductFieldChange(product.product_id, 'stock', s); }}
                        />
                      </td>
                      <td data-label="Stock Mínimo" className="text-center">
                        <input
                          type="number"
                          min="0"
                          className={`w-20 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 ${hasChange && changes.stock_minimo !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                          value={currentStockMinimo}
                          onChange={(e) => onProductFieldChange(product.product_id, 'stock_minimo', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      {tieneTienda && (
                        <td data-label="En Tienda" className="text-center">
                          {togglingTiendaId === product.branch_product_id ? (
                            <div className="inline-flex items-center justify-center" style={{ width: 36, height: 20 }}>
                              <div
                                className="animate-spin rounded-full"
                                style={{ width: 16, height: 16, border: '2.5px solid #e9d5ff', borderTopColor: '#9333ea' }}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!product.branch_product_id}
                              onClick={() => onToggleMostrarEnTienda(product)}
                              title={!product.branch_product_id ? 'Guarda cambios primero' : product.mostrar_en_tienda_sucursal ? 'Visible en tienda — clic para ocultar' : 'Oculto de tienda — clic para mostrar'}
                              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ background: product.mostrar_en_tienda_sucursal ? '#9333ea' : '#d1d5db' }}
                            >
                              <span
                                className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                                style={{ transform: product.mostrar_en_tienda_sucursal ? 'translateX(1.1rem)' : 'translateX(0.2rem)' }}
                              />
                            </button>
                          )}
                        </td>
                      )}
                      <td data-label="Activo" className="text-center">
                        <button
                          type="button"
                          disabled={!product.branch_product_id}
                          onClick={() => onToggleBranchProductActive(product)}
                          title={!product.branch_product_id ? 'Guarda cambios primero para activar/desactivar' : product.activo_sucursal ? 'Activo — clic para desactivar' : 'Inactivo — clic para activar'}
                          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
                          style={{ background: product.activo_sucursal ? 'var(--primary)' : '#d1d5db' }}
                        >
                          <span
                            className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                            style={{ transform: product.activo_sucursal ? 'translateX(1.1rem)' : 'translateX(0.2rem)' }}
                          />
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
            totalItems={total}
            itemsPerPage={itemsPerPage}
            onPageChange={onSetCurrentPage}
            itemName="productos"
          />
          </div>
        )}
        </div>

        {/* Bulk Deactivate Confirmation Modal */}
        {showBulkDeleteModal && (
          <div className={`modal-overlay${bulkDeleteModalClosing ? ' closing' : ''}`}>
            <div className={`modal-content max-w-md${bulkDeleteModalClosing ? ' closing' : ''}`}>
              <div className="modal-header">
                <h3 className="modal-title flex items-center gap-2">
                  <EyeOff className="w-5 h-5 text-amber-600" />
                  Desactivar productos en la sucursal
                </h3>
                <button onClick={onCloseBulkDeleteModalAnim} className="modal-close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Estás por desactivar <strong>{selectAllGlobal ? `${total} producto(s)` : `${selectedRows.size} producto(s)`}</strong> en la sucursal <strong>{selectedBranch.nombre}</strong>.
                <br />No aparecerán en el POS ni en ventas. Podés reactivarlos desde esta misma vista.
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
                  className="btn bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {bulkDeleting ? (
                    <><div className="spinner w-4 h-4" /> Desactivando...</>
                  ) : (
                    <><EyeOff className="w-4 h-4" /> Desactivar</>
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
                Aplicar a <strong>{selectAllGlobal ? `${total} producto(s)` : `${selectedRows.size} producto(s)`}</strong> seleccionado(s)
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

        {/* Bulk Stock Modal */}
        {showBulkStockModal && (
          <div className={`modal-overlay${bulkStockModalClosing ? ' closing' : ''}`}>
            <div className={`modal-content max-w-md${bulkStockModalClosing ? ' closing' : ''}`}>
              <div className="modal-header">
                <h3 className="modal-title flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  Cambio masivo de Stock
                </h3>
                <button onClick={onCloseBulkStockModal} className="modal-close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Aplicar a <strong>{selectAllGlobal ? `${total} producto(s)` : `${selectedRows.size} producto(s)`}</strong> seleccionado(s)
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
                        onClick={() => onSetBulkStockTipo(opt.value)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                          bulkStockTipo === opt.value
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
                    {bulkStockTipo === 'establecer' ? 'Nuevo stock' : bulkStockTipo === 'incrementar' ? 'Incremento' : 'Decremento'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input w-32 text-center mt-1"
                    value={bulkStockValor}
                    onChange={(e) => onSetBulkStockValor(e.target.value)}
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={onCloseBulkStockModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onApplyBulkStock}
                  disabled={bulkStockValor === ''}
                  className="btn btn-primary disabled:opacity-50"
                >
                  <Package className="w-4 h-4" />
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
                Aplicar a <strong>{selectAllGlobal ? `${total} producto(s)` : `${selectedRows.size} producto(s)`}</strong> seleccionado(s)
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

      {(showBranchBulkEditModal || branchBulkEditModalClosing) && (
        <BranchBulkEditModal
          items={branchBulkEditItems}
          onItemChange={onUpdateBranchBulkEditItem}
          closing={branchBulkEditModalClosing}
          onClose={onCloseBranchBulkEditModal}
          onSave={onHandleBranchBulkEditSave}
          saving={branchBulkEditSaving}
        />
      )}

      {/* Modal editar sucursal — disponible también en la vista de detalle */}
      {showModal && (
        <div className={`modal-overlay${branchModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content modal-content-bounce${branchModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title">Editar Sucursal</h3>
              <button onClick={onCloseBranchModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>
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
                <button type="button" onClick={onCloseBranchModal} disabled={savingBranch} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={savingBranch} className="btn btn-primary">
                  {savingBranch
                    ? <><div className="spinner w-4 h-4" />Actualizando...</>
                    : <><Save className="w-4 h-4" />Actualizar Sucursal</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    );
  }

  // Branch list view
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {tieneMultiSucursal ? 'Gestión de Sucursales' : 'Mi Sucursal'}
          </h1>
          {tieneMultiSucursal && (
            <p className="text-gray-600">{branches.length} sucursal(es) registrada(s)</p>
          )}
        </div>
        {tieneMultiSucursal && (
          <button onClick={() => onOpenModal()} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Nueva Sucursal
          </button>
        )}
      </div>

      {branches.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Sin sucursales</h3>
          {tieneMultiSucursal && (
            <>
              <p className="text-sm mb-4">Crea tu primera sucursal para gestionar inventario y precios diferenciales</p>
              <button onClick={() => onOpenModal()} className="btn btn-primary">
                <Plus className="w-4 h-4" /> Crear Primera Sucursal
              </button>
            </>
          )}
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

              <div className="flex gap-2 items-center">
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
                  className="btn-edit"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {tieneMultiSucursal && (
                  <button
                    onClick={() => onOpenDeleteBranchModal(branch)}
                    className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition-colors"
                    title="Eliminar sucursal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onToggleBranchActive(branch)}
                  title={branch.activo ? 'Activo — clic para desactivar' : 'Inactivo — clic para activar'}
                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1"
                  style={{ background: branch.activo ? 'var(--primary)' : '#d1d5db' }}
                >
                  <span
                    className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                    style={{ transform: branch.activo ? 'translateX(1.1rem)' : 'translateX(0.2rem)' }}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Branch Modal */}
      {showModal && (
        <div className={`modal-overlay${branchModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content modal-content-bounce${branchModalClosing ? ' closing' : ''}`}>
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
                {!editingBranch && (
                  <div className="form-group">
                    <label className="form-label">
                      Ajuste de margen sobre precios de referencia
                      <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        placeholder="Ej: 10 para +10%, -5 para -5%"
                        value={formData.margen_ajuste}
                        onChange={(e) => onSetFormData(prev => ({ ...prev, margen_ajuste: e.target.value }))}
                      />
                      <span className="text-gray-500 text-sm font-medium shrink-0">%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Si ingresás un valor, todos los precios de esta sucursal se calcularán aplicando ese porcentaje sobre los precios actuales.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={onCloseBranchModal} disabled={savingBranch} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={savingBranch} className="btn btn-primary">
                  {savingBranch ? (
                    <><div className="spinner w-4 h-4" />{editingBranch ? 'Actualizando...' : 'Creando...'}</>
                  ) : (
                    <><Save className="w-4 h-4" />{editingBranch ? 'Actualizar' : 'Crear'} Sucursal</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Branch Modal */}
      {showDeleteBranchModal && (
        <div className={`modal-overlay${deleteBranchModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content max-w-md${deleteBranchModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Eliminar Sucursal
              </h3>
              <button onClick={onCloseDeleteBranchModal} className="modal-close" disabled={deletingBranch}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              <p className="font-semibold mb-1">Esta acción es irreversible.</p>
              <p>
                Se eliminarán permanentemente <strong>todos los datos</strong> asociados a{' '}
                <strong>"{branchToDelete?.nombre}"</strong>:
              </p>
              <ul className="mt-2 space-y-0.5 list-disc list-inside text-red-700">
                <li>Configuración de productos (precios y stock de la sucursal)</li>
                <li>Sesiones de caja y movimientos</li>
                <li>Los usuarios asignados quedarán sin sucursal</li>
              </ul>
            </div>

            <div className="mb-4 text-sm text-gray-600">
              Las ventas históricas se conservan para auditoría.
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={onCloseDeleteBranchModal}
                disabled={deletingBranch}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={onDeleteBranch}
                disabled={deletingBranch}
                className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingBranch ? (
                  <><div className="spinner w-4 h-4" /> Eliminando...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Eliminar Sucursal</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BranchManagementView;
