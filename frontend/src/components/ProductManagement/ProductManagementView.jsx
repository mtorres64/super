import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Edit, Trash2, Package, Search, Save, X,
  Download, Upload, FileText, Tag, Layers, Minus, CircleDot, SlidersHorizontal, ChevronDown, MoreVertical,
  Link, Sparkles, Camera,
} from 'lucide-react';
import Pagination from '../Pagination';
import SortIcon from '../ui/SortIcon';
import { getCategoryIcon, ICON_OPTIONS } from '../../utils/categoryIcons';
import BulkEditModal from './BulkEditModal';

const fmtTime = (secs) => {
  if (secs <= 0) return 'Finalizando...';
  if (secs < 60) return `~${secs} seg restantes`;
  if (secs < 3600) return `~${Math.ceil(secs / 60)} min restantes`;
  const h = Math.floor(secs / 3600);
  const m = Math.ceil((secs % 3600) / 60);
  return m > 0 ? `~${h} h ${m} min restantes` : `~${h} h restantes`;
};

const ProductManagementView = ({
  user,
  activeBranch,
  navigate,
  products,
  total,
  categories,
  loading,
  showModal,
  editingProduct,
  searchTerm,
  setSearchTerm,
  commitSearch,
  clearSearch,
  selectedCategory,
  setSelectedCategory,
  selectedKind,
  setSelectedKind,
  selectedActivo,
  setSelectedActivo,
  newCategory,
  setNewCategory,
  showCategoryModal,
  setShowCategoryModal,
  currentPage,
  showExportMenu,
  setShowExportMenu,
  showImportModal,
  setShowImportModal,
  importFile,
  setImportFile,
  importLoading,
  importProgress,
  templateLoading,
  importResult,
  setImportJob,
  fileInputRef,
  selectedRows,
  setSelectedRows,
  selectAllGlobal,
  handleSelectAllGlobal,
  handleClearSelection,
  showBulkDeleteModal,
  setShowBulkDeleteModal,
  bulkDeleting,
  formData,
  setFormData,
  comboItemInput,
  setComboItemInput,
  comboSearch,
  setComboSearch,
  showComboDropdown,
  setShowComboDropdown,
  comboSearchRef,
  filteredProducts,
  itemsPerPage,
  totalPages,
  paginatedProducts,
  productModalClosing,
  importModalClosing,
  categoryModalClosing,
  bulkDeleteModalClosing,
  openModal,
  closeProductModal,
  closeImportModalAnim,
  closeCategoryModal,
  closeBulkDeleteModal,
  editingCategory,
  setEditingCategory,
  editCategoryData,
  setEditCategoryData,
  categoryToDelete,
  setCategoryToDelete,
  handleSubmit,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
  startEditCategory,
  handleExport,
  handleImport,
  handleBulkDelete,
  handleDownloadTemplate,
  handlePageChange,
  toggleSelectRow,
  toggleSelectAll,
  handleBulkSetControlStock,
  handleToggleControlStock,
  addComboItem,
  removeComboItem,
  updateComboItemCantidad,
  getCategoryName,
  getProductName,
  getLowStockProducts,
  normalize,
  sortConfig,
  requestSort,
  showBulkEditModal,
  bulkEditItems,
  bulkEditSaving,
  bulkEditModalClosing,
  openBulkEditModal,
  closeBulkEditModal,
  updateBulkEditItem,
  handleBulkEditSave,
  suggestingImage,
  suggestImage,
  uploadingImage,
  uploadImage,
  savingProduct,
  driveToProxyUrl,
  handleBulkSuggestImages,
  bulkImageProgress,
  setBulkImageProgress,
  cancelBulkImages,
  cancelImport,
  config,
}) => {
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryInputText, setCategoryInputText] = useState('');
  const [showCategoryAc, setShowCategoryAc] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  useEffect(() => { if (formData.imagen_url) setImgLoading(true); }, [formData.imagen_url]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const categoryFilterRef = useRef(null);
  const bulkImageBottomRef = useRef(null);

  useEffect(() => {
    bulkImageBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bulkImageProgress?.results?.length]);

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

  useEffect(() => { setFocusedIdx(-1); }, [paginatedProducts]);
  useEffect(() => {
    if (focusedIdx >= 0) {
      document.querySelector('[data-pm-focused="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
      if (focusedIdx >= 0 && paginatedProducts[focusedIdx]) {
        openModal(paginatedProducts[focusedIdx]);
        setFocusedIdx(-1);
      } else {
        commitSearch();
      }
    }
  };

  useEffect(() => {
    if (!showCategoryModal) setCategorySearch('');
  }, [showCategoryModal]);

  useEffect(() => {
    if (showModal) {
      const cat = categories.find(c => c.id === formData.categoria_id);
      setCategoryInputText(cat ? cat.nombre : '');
    } else {
      setCategoryInputText('');
      setShowCategoryAc(false);
    }
  }, [showModal]); // only sync on modal open/close

  const filteredCategoryOptions = categories.filter(c =>
    c.nombre.toLowerCase().includes(categoryInputText.toLowerCase())
  );

  if (loading && paginatedProducts.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full" onClick={() => { setShowExportMenu(false); setShowMobileMenu(false); }}>
      <div className="mb-6">
        {/* Mobile: título + menú desplegable */}
        <div className="flex items-center justify-between md:hidden">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Productos</h1>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMobileMenu(v => !v)}
              className="btn btn-secondary p-2"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMobileMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={() => { setShowImportModal(true); setShowMobileMenu(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50"
                  style={{ color: 'var(--secondary-text)' }}
                >
                  <Upload className="w-4 h-4" />Importar
                </button>
                <button
                  onClick={() => { setShowCategoryModal(true); setShowMobileMenu(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50"
                  style={{ color: 'var(--tertiary-text)' }}
                >
                  <Tag className="w-4 h-4" />Categorías
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { openModal(); setShowMobileMenu(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium hover:bg-gray-50 text-green-700"
                >
                  <Plus className="w-4 h-4" />Nuevo Producto
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/branches', { state: { branchId: activeBranch?.id || user?.branch_id } })}
          className="md:hidden mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
        >
          <Tag className="w-3 h-3" />Lista de precios de sucursal
        </button>

        {/* Desktop: layout original */}
        <div className="hidden md:flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Productos</h1>
            <p className="text-gray-600">{total} productos registrados</p>
            <button
              onClick={() => navigate('/branches', { state: { branchId: activeBranch?.id || user?.branch_id } })}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              <Tag className="w-3 h-3" />Lista de precios de sucursal
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => setShowImportModal(true)} className="btn" style={{ background: 'var(--secondary)', color: 'var(--secondary-text)' }}>
              <Upload className="w-4 h-4" />Importar
            </button>
            <button onClick={() => setShowCategoryModal(true)} className="btn" style={{ background: 'var(--tertiary)', color: 'var(--tertiary-text)' }}>
              <Tag className="w-4 h-4" />Categorías
            </button>
            <button onClick={() => openModal()} className="btn btn-primary">
              <Plus className="w-4 h-4" />Nuevo Producto
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar + Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="form-input pl-10"
              style={searchTerm ? { paddingRight: '2.25rem' } : {}}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchTerm && (
              loading
                ? <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="spinner spinner-on-light w-4 h-4 text-gray-400" /></div>
                : <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
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
                  <button
                    type="button"
                    onClick={() => setShowCategoryFilter(v => !v)}
                    className="form-input pl-9 text-left flex items-center w-full"
                    style={{ color: selCat ? 'inherit' : '#9ca3af' }}
                  >
                    <SelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <span className="truncate">{selCat ? selCat.nombre : 'Categoría'}</span>
                    {selCat && (
                      <X
                        className="ml-auto h-3.5 w-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); setSelectedCategory(''); setShowCategoryFilter(false); }}
                      />
                    )}
                  </button>
                );
              })()}
              {showCategoryFilter && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <button type="button" onClick={() => { setSelectedCategory(''); setShowCategoryFilter(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
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
                  <button
                    type="button"
                    onClick={() => setShowCategoryFilter(v => !v)}
                    className="form-input pl-9 text-left flex items-center w-full"
                    style={{ color: selCat ? 'inherit' : '#9ca3af' }}
                  >
                    <SelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <span className="truncate">{selCat ? selCat.nombre : 'Categoría'}</span>
                    {selCat && (
                      <X className="ml-auto h-3.5 w-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); setSelectedCategory(''); setShowCategoryFilter(false); }} />
                    )}
                  </button>
                );
              })()}
              {showCategoryFilter && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <button type="button" onClick={() => { setSelectedCategory(''); setShowCategoryFilter(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
                    <Tag className="h-4 w-4" />Todas las categorías
                  </button>
                  {categories.map(cat => {
                    const CatIcon = getCategoryIcon(cat.nombre, cat.icono);
                    return (
                      <button key={cat.id} type="button" onClick={() => { setSelectedCategory(cat.id); setShowCategoryFilter(false); setShowMobileFilters(false); }}
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
                onClick={openBulkEditModal}
                className="btn btn-sm bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                <Edit className="w-4 h-4" />
                Editar seleccionados
              </button>
            )}
            <button
              onClick={() => handleBulkSetControlStock(true)}
              className="btn btn-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
            >
              Activar control stock
            </button>
            <button
              onClick={() => handleBulkSetControlStock(false)}
              className="btn btn-sm bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
            >
              Desactivar control stock
            </button>
            <button
              onClick={handleBulkSuggestImages}
              className="btn btn-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
            >
              <Sparkles className="w-4 h-4" />
              Sugerir fotos
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="btn btn-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar seleccionados
            </button>
            <button
              onClick={handleClearSelection}
              className="btn btn-sm ml-auto text-gray-500 border border-gray-300 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
              Limpiar selección
            </button>
          </div>
          {!selectAllGlobal && paginatedProducts.length > 0 && paginatedProducts.every(p => selectedRows.has(p.id)) && total > paginatedProducts.length && (
            <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-3">
              <span>Solo están seleccionados los {paginatedProducts.length} productos de esta página.</span>
              <button
                onClick={handleSelectAllGlobal}
                className="font-semibold text-yellow-900 underline hover:text-yellow-700 whitespace-nowrap"
              >
                Seleccionar los {total} productos
              </button>
            </div>
          )}
        </div>
      )}

      {/* Products Table */}
      <div className="table-container flex-1 min-h-0 flex flex-col">
        <div className="overflow-y-auto flex-1 min-h-0">
        {/* Select all — solo mobile */}
        <label className="md:hidden flex items-center gap-3 px-3 py-2 cursor-pointer select-none border-b border-gray-100">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
            checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedRows.has(p.id))}
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
                  checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedRows.has(p.id))}
                  ref={el => {
                    if (el) el.indeterminate = paginatedProducts.some(p => selectedRows.has(p.id)) && !paginatedProducts.every(p => selectedRows.has(p.id));
                  }}
                  onChange={toggleSelectAll}
                />
              </th>
              <th onClick={() => requestSort('nombre')} className="cursor-pointer select-none hover:bg-gray-50">Producto <SortIcon columnKey="nombre" sortConfig={sortConfig} /></th>
              <th style={{ textAlign: 'center' }} onClick={() => requestSort('codigo_barras')} className="cursor-pointer select-none hover:bg-gray-50">Código <SortIcon columnKey="codigo_barras" sortConfig={sortConfig} /></th>
              <th style={{ textAlign: 'center' }}>Categoría</th>
              <th style={{ textAlign: 'center' }}>Clase</th>
              <th style={{ textAlign: 'center' }}>Control Stock</th>
              <th style={{ textAlign: 'center' }} onClick={() => requestSort('stock_minimo')} className="cursor-pointer select-none hover:bg-gray-50">Stock Mínimo <SortIcon columnKey="stock_minimo" sortConfig={sortConfig} /></th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((product, idx) => (
              <tr
                key={product.id}
                data-pm-focused={focusedIdx === idx ? 'true' : undefined}
                data-expanded={expandedRows.has(product.id) ? 'true' : undefined}
                className={focusedIdx === idx ? 'bg-green-50 outline outline-2 outline-green-400' : selectedRows.has(product.id) ? 'bg-blue-50' : ''}
              >
                <td data-mobile="hide">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    checked={selectedRows.has(product.id)}
                    onChange={() => toggleSelectRow(product.id)}
                  />
                </td>
                <td data-mobile="title" onClick={() => toggleRowExpanded(product.id)} className="md:cursor-default cursor-pointer">
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
                      <div className="font-medium text-gray-900 truncate">
                        {product.nombre}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {product.tipo.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`md:hidden w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expandedRows.has(product.id) ? 'rotate-180' : ''}`} />
                </td>
                <td className="text-center" data-label="Código">
                  <span className="text-sm text-blue-600">
                    {product.codigo_barras || 'N/A'}
                  </span>
                </td>
                <td className="text-center" data-label="Categoría">
                  {(() => {
                    const cat = categories.find(c => c.id === product.categoria_id);
                    const CatIcon = getCategoryIcon(cat?.nombre, cat?.icono);
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        <CatIcon className="w-3 h-3" />
                        {cat?.nombre || 'Sin categoría'}
                      </span>
                    );
                  })()}
                </td>
                <td className="text-center" data-label="Clase">
                  {product.kind === 'combo' ? (
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full flex items-center gap-1 w-fit mx-auto">
                      <Layers className="w-3 h-3" /> Combo
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full w-fit mx-auto block">Normal</span>
                  )}
                </td>
                <td className="text-center" data-label="Control Stock">
                  <button
                    type="button"
                    disabled={product.kind === 'combo'}
                    onClick={() => handleToggleControlStock(product)}
                    title={product.kind === 'combo' ? 'No aplica en combos' : product.control_stock ? 'Activo — clic para desactivar' : 'Inactivo — clic para activar'}
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: product.control_stock ? 'var(--primary)' : '#d1d5db' }}
                  >
                    <span
                      className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                      style={{ transform: product.control_stock ? 'translateX(1.1rem)' : 'translateX(0.2rem)' }}
                    />
                  </button>
                </td>
                <td className="text-center" data-label="Stock Mín.">
                  <span className="font-medium text-gray-900">
                    {product.stock_minimo}
                  </span>
                </td>
                <td className="text-center" data-label="Estado">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.activo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td data-mobile="actions">
                  <div className="flex justify-end">
                    <button
                      onClick={() => openModal(product)}
                      className="btn-edit"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No se encontraron productos</p>
          </div>
        )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          itemName="productos"
        />
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className={`modal-overlay${productModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content modal-content-bounce${productModalClosing ? ' closing' : ''}`} style={{ maxWidth: '960px', width: '95vw' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={closeProductModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                {/* Layout 2 columnas: foto | campos */}
                <div className="flex gap-4 items-start">

                  {/* Columna izquierda: foto */}
                  <div className="flex-shrink-0 flex flex-col gap-1" style={{ width: '180px' }}>
                    <div className="relative rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden group" style={{ width: '180px', height: '180px' }}>
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <div className="spinner w-8 h-8" />
                          <span className="text-xs">Subiendo...</span>
                        </div>
                      ) : formData.imagen_url ? (
                        <>
                          {imgLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                              <div className="spinner w-8 h-8" />
                            </div>
                          )}
                          <img
                            src={driveToProxyUrl(formData.imagen_url)}
                            alt="preview"
                            className="w-full h-full object-contain"
                            onLoad={() => setImgLoading(false)}
                            onError={(e) => {
                              setImgLoading(false);
                              const url = formData.imagen_url || '';
                              if (url.includes('.400.jpg')) {
                                e.target.src = url.replace('.400.jpg', '.full.jpg');
                              } else {
                                e.target.style.display = 'none';
                              }
                            }}
                          />
                        </>
                      ) : config?.company_logo ? (
                        <img
                          src={config.company_logo}
                          alt="logo empresa"
                          className="w-full h-full object-contain opacity-40"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-gray-300" />
                      )}
                      {!uploadingImage && (
                        <label
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"
                          title="Subir foto a Open Food Facts"
                        >
                          <Camera className="w-7 h-7 text-white" />
                          <span className="text-white text-xs font-medium">Subir foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                    {formData.imagen_url && (
                      <a
                        href={formData.imagen_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-700 hover:underline text-center"
                      >
                        Ver imagen completa
                      </a>
                    )}
                    {formData.codigo_barras && !uploadingImage && (
                      <p className="text-xs text-gray-400 text-center leading-tight">
                        Hover para subir foto
                      </p>
                    )}
                  </div>

                  {/* Columna derecha: todos los campos */}
                  <div className="flex-1 flex flex-col gap-3 min-w-0">

                    {/* Nombre */}
                    <div className="form-group mb-0">
                      <label className="form-label">Nombre del Producto *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        required
                      />
                    </div>

                    {/* URL de imagen */}
                    <div className="flex flex-col gap-1">
                    <label className="form-label">URL de imagen</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          className="form-input pr-8"
                          placeholder="URL de imagen..."
                          value={formData.imagen_url}
                          onChange={(e) => setFormData({...formData, imagen_url: e.target.value})}
                        />
                        {formData.imagen_url && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, imagen_url: ''})}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={suggestImage}
                        disabled={suggestingImage || !formData.nombre.trim()}
                        title="Buscar imagen según el nombre del producto"
                        className="btn btn-secondary flex-shrink-0 disabled:opacity-50"
                      >
                        {suggestingImage ? <div className="spinner w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        Sugerir
                      </button>
                    </div>
                    </div>

                    {/* Clase | Modo precio | Código */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="form-group mb-0">
                        <label className="form-label">Clase *</label>
                        <select
                          className="form-select"
                          value={formData.kind}
                          onChange={(e) => setFormData({...formData, kind: e.target.value, combo_items: [], control_stock: e.target.value === 'combo' ? false : formData.control_stock})}
                          required
                        >
                          <option value="normal">Normal</option>
                          <option value="combo">Combo</option>
                        </select>
                      </div>
                      <div className="form-group mb-0">
                        <label className="form-label">Modo de precio *</label>
                        <select
                          className="form-select"
                          value={formData.tipo}
                          onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                          required
                        >
                          <option value="codigo_barras">Cód. Barras</option>
                          <option value="por_peso">Por Peso</option>
                        </select>
                      </div>
                      <div className="form-group mb-0">
                        <label className="form-label">Código de Barras</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.codigo_barras}
                          onChange={(e) => setFormData({...formData, codigo_barras: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Categoría | Stock Mínimo | Control de stock */}
                    <div className="grid grid-cols-3 gap-3 items-end">
                      {/* Categoría */}
                      <div className="form-group mb-0 relative">
                        <label className="form-label">Categoría *</label>
                        <div className="relative">
                          {formData.categoria_id && (() => {
                            const selCat = categories.find(c => c.id === formData.categoria_id);
                            const SelIcon = getCategoryIcon(categoryInputText, selCat?.icono);
                            return <SelIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />;
                          })()}
                          <input
                            type="text"
                            className={`form-input${formData.categoria_id ? ' pl-8' : ''}${!formData.categoria_id && categoryInputText ? ' border-red-400' : ''}`}
                            value={categoryInputText}
                            onChange={e => {
                              setCategoryInputText(e.target.value);
                              setShowCategoryAc(true);
                              setFormData({ ...formData, categoria_id: '' });
                            }}
                            onFocus={() => setShowCategoryAc(true)}
                            onBlur={() => setTimeout(() => setShowCategoryAc(false), 150)}
                            placeholder="Buscar categoría..."
                            autoComplete="off"
                          />
                        </div>
                        {showCategoryAc && filteredCategoryOptions.length > 0 && (
                          <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto" style={{ top: '100%', left: 0 }}>
                            {filteredCategoryOptions.map(cat => {
                              const CatIcon = getCategoryIcon(cat.nombre, cat.icono);
                              return (
                                <div
                                  key={cat.id}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800 flex items-center gap-2"
                                  onMouseDown={() => {
                                    setFormData({ ...formData, categoria_id: cat.id });
                                    setCategoryInputText(cat.nombre);
                                    setShowCategoryAc(false);
                                  }}
                                >
                                  <CatIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                  {cat.nombre}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {/* Stock Mínimo */}
                      <div className="form-group mb-0">
                        <label className="form-label">Stock Mínimo {formData.control_stock && <span className="text-red-500">*</span>}</label>
                        <input
                          type="number"
                          className="form-input"
                          disabled={!formData.control_stock}
                          value={formData.stock_minimo}
                          onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})}
                          required={formData.control_stock}
                        />
                      </div>
                      {/* Control de stock */}
                      <div className="form-group mb-0">
                        <label className="form-label">Control de stock</label>
                        <div className="form-input flex items-center justify-between">
                          <span className="text-sm" style={{ color: formData.kind === 'combo' ? '#9ca3af' : formData.control_stock ? '#16a34a' : '#9ca3af' }}>
                            {formData.kind === 'combo' ? 'No aplica' : formData.control_stock ? 'Activo' : 'Inactivo'}
                          </span>
                          <button
                            type="button"
                            disabled={formData.kind === 'combo'}
                            onClick={() => formData.kind !== 'combo' && setFormData({...formData, control_stock: !formData.control_stock})}
                            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ background: formData.control_stock ? 'var(--primary)' : '#d1d5db' }}
                            aria-pressed={formData.control_stock}
                          >
                            <span
                              className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                              style={{ transform: formData.control_stock ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Combo items */}
                {formData.kind === 'combo' && (
                  <div className="space-y-3">
                  <div className="border-t-2 border-purple-200" />
                    <label className="form-label flex items-center gap-1">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Productos del combo
                    </label>

                    {/* Existing combo items */}
                    {formData.combo_items.length > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-gray-600">Producto</th>
                              <th className="text-center px-3 py-2 font-medium text-gray-600 w-28">Cantidad</th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.combo_items.map((ci) => (
                              <tr key={ci.product_id} className="border-t border-gray-100">
                                <td className="px-3 py-2 text-gray-800">{getProductName(ci.product_id)}</td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className="form-input text-center w-20 py-1 text-sm"
                                    value={ci.cantidad}
                                    onChange={(e) => updateComboItemCantidad(ci.product_id, e.target.value)}
                                  />
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeComboItem(ci.product_id)}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Add combo item row */}
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <input
                          ref={comboSearchRef}
                          type="text"
                          placeholder="Buscar producto..."
                          className="form-input text-sm pl-8"
                          value={comboSearch}
                          onChange={(e) => {
                            setComboSearch(e.target.value);
                            setComboItemInput({...comboItemInput, product_id: ''});
                            setShowComboDropdown(true);
                          }}
                          onFocus={() => setShowComboDropdown(true)}
                          onBlur={() => setTimeout(() => setShowComboDropdown(false), 150)}
                          autoComplete="off"
                        />
                        {showComboDropdown && comboSearch.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {products
                              .filter(p =>
                                p.kind !== 'combo' &&
                                !formData.combo_items.find(ci => ci.product_id === p.id) &&
                                normalize(p.nombre).includes(normalize(comboSearch))
                              )
                              .map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-800"
                                  onMouseDown={() => {
                                    setComboItemInput({...comboItemInput, product_id: p.id});
                                    setComboSearch(p.nombre);
                                    setShowComboDropdown(false);
                                  }}
                                >
                                  {p.nombre}
                                </button>
                              ))
                            }
                            {products.filter(p =>
                              p.kind !== 'combo' &&
                              !formData.combo_items.find(ci => ci.product_id === p.id) &&
                              normalize(p.nombre).includes(normalize(comboSearch))
                            ).length === 0 && (
                              <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Cant."
                          className="form-input text-sm"
                          value={comboItemInput.cantidad}
                          onChange={(e) => setComboItemInput({...comboItemInput, cantidad: e.target.value})}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addComboItem}
                        disabled={!comboItemInput.product_id}
                        className="btn btn-primary btn-sm disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-6 text-center">
                Las cantidades y precios son solo de referencia. La lista de precios se define en cada sucursal.
              </p>
              <div className="flex justify-end space-x-3 mt-3">
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="btn btn-secondary"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProduct}
                >
                  {savingProduct
                    ? <><div className="spinner w-4 h-4" />{editingProduct ? 'Actualizando...' : 'Creando...'}</>
                    : <><Save className="w-4 h-4" />{editingProduct ? 'Actualizar' : 'Crear'} Producto</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className={`modal-overlay${importModalClosing ? ' closing' : ''}`} onClick={() => setShowExportMenu(false)}>
          <div className={`modal-content modal-content-bounce${importModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title">Importar Productos</h3>
              <div className="flex items-center gap-2">
                {importLoading && (
                  <button
                    type="button"
                    onClick={() => { setImportJob(prev => ({ ...prev, minimized: true })); setShowImportModal(false); }}
                    className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
                  >
                    Segundo plano
                  </button>
                )}
                <button onClick={closeImportModalAnim} className="modal-close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!importResult ? (
              <form onSubmit={handleImport}>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium mb-1">Formato requerido (CSV o XLSX):</p>
                        <p className="font-mono text-xs">nombre, tipo, precio, categoria, precio_costo, codigo_barras, stock, stock_minimo, clase</p>
                        <p className="mt-1 text-xs">• <strong>tipo</strong>: <code>codigo_barras</code> o <code>por_peso</code></p>
                        <p className="text-xs">• <strong>precio</strong>: se redondea al múltiplo de $50 más cercano</p>
                        <p className="text-xs">• <strong>precio_costo</strong>: opcional. Calcula el margen automáticamente</p>
                        <p className="text-xs">• <strong>clase</strong>: <code>Normal</code> o <code>Combo</code> (por defecto: Normal)</p>
                        <p className="text-xs">• <strong>categoria</strong>: debe coincidir con una categoría existente</p>
                        <p className="text-xs">• Si el código de barras ya existe, el producto se actualizará</p>
                      </div>
                      <button
                        type="button"
                        disabled={templateLoading}
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-300 rounded-md px-2.5 py-1.5 hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                      >
                        {templateLoading ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-700" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        {templateLoading ? 'Descargando...' : 'Descargar plantilla'}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Archivo (CSV o XLSX)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="form-input"
                      onChange={(e) => setImportFile(e.target.files[0])}
                      required
                    />
                  </div>
                </div>

                {importLoading && (
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Procesando productos...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-green-500 transition-all duration-200"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  {importLoading ? (
                    <button type="button" onClick={cancelImport} className="btn btn-danger">
                      Cancelar importación
                    </button>
                  ) : (
                    <button type="button" onClick={closeImportModalAnim} className="btn btn-secondary">
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary" disabled={importLoading}>
                    {importLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="spinner w-4 h-4"></div>
                        Procesando... {importProgress}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Importar
                      </span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
                    <div className="text-xs text-green-600">Creados</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
                    <div className="text-xs text-blue-600">Actualizados</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-700">{importResult.errors.length}</div>
                    <div className="text-xs text-red-600">Errores</div>
                  </div>
                </div>

                {importResult.new_categories?.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="font-medium text-yellow-800 text-sm mb-1">Categorías creadas automáticamente:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {importResult.new_categories.map((cat, i) => (
                        <span key={i} className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full px-2 py-0.5">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <p className="font-medium text-red-800 text-sm mb-1">Errores:</p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-700">{err}</p>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <button onClick={closeImportModalAnim} className="btn btn-primary">
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className={`ticket-modal-overlay${categoryModalClosing ? ' closing' : ''}`}>
          <div className={`ticket-modal-container${categoryModalClosing ? ' closing' : ''}`} style={{ maxWidth: '560px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Gestión de Categorías
              </h3>
              <button onClick={closeCategoryModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Buscador */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div className="input-icon-wrap">
                <span className="input-icon"><Search size={15} /></span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar categoría..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
              </div>
            </div>

            {/* Lista de categorías existentes */}
            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '1rem' }}>
              {categories.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.9rem' }}>
                  No hay categorías creadas aún.
                </p>
              ) : (
                <div className="space-y-2">
                  {[...categories]
                    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
                    .filter(cat => cat.nombre.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map(cat => (
                    <div key={cat.id}>
                      {editingCategory?.id === cat.id ? (
                        <form
                          onSubmit={handleUpdateCategory}
                          style={{
                            display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                            padding: '0.625rem', borderRadius: '8px',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)'
                          }}
                        >
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editCategoryData.nombre}
                              onChange={(e) => setEditCategoryData({ ...editCategoryData, nombre: e.target.value })}
                              required
                              autoFocus
                              style={{ fontSize: '0.875rem' }}
                            />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {ICON_OPTIONS.map(({ key, Icon, label }) => (
                                <button
                                  key={key}
                                  type="button"
                                  title={label}
                                  onClick={() => setEditCategoryData({ ...editCategoryData, icono: editCategoryData.icono === key ? '' : key })}
                                  style={{
                                    padding: '0.3rem',
                                    borderRadius: '5px',
                                    border: editCategoryData.icono === key ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                    background: editCategoryData.icono === key ? 'var(--color-primary-light, #d1fae5)' : 'var(--bg-primary)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}
                                >
                                  <Icon style={{ width: '0.875rem', height: '0.875rem', color: editCategoryData.icono === key ? 'var(--color-primary)' : 'var(--text-secondary)' }} />
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Descripción (opcional)"
                              value={editCategoryData.descripcion}
                              onChange={(e) => setEditCategoryData({ ...editCategoryData, descripcion: e.target.value })}
                              style={{ fontSize: '0.875rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '2px' }}>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                              <Save className="w-3 h-3" />
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditingCategory(null)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </form>
                      ) : categoryToDelete === cat.id ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.625rem 0.875rem', borderRadius: '8px',
                          background: '#fef2f2', border: '1px solid #fca5a5'
                        }}>
                          <span style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                            ¿Eliminar <strong>{cat.nombre}</strong>?
                          </span>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn"
                              onClick={() => handleDeleteCategory(cat.id)}
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: '#dc2626', color: '#fff' }}
                            >
                              Eliminar
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => setCategoryToDelete(null)}
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.625rem 0.875rem', borderRadius: '8px',
                          border: '1px solid var(--border-color)', background: 'var(--bg-primary)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {(() => { const I = getCategoryIcon(cat.nombre, cat.icono); return <I style={{ width: '1rem', height: '1rem', color: 'var(--text-secondary)', flexShrink: 0 }} />; })()}
                            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{cat.nombre}</span>
                            {cat.descripcion && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                                {cat.descripcion}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn-edit"
                              onClick={() => startEditCategory(cat)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="quantity-btn"
                              onClick={() => setCategoryToDelete(cat.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Separador */}
            <div style={{ borderTop: '1px solid var(--border-color)', marginBottom: '1rem' }} />

            {/* Formulario nueva categoría */}
            <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem' }}>Nueva Categoría</p>
            <form onSubmit={handleCreateCategory}>
              <div className="space-y-3">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCategory.nombre}
                    onChange={(e) => setNewCategory({ ...newCategory, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ícono</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {ICON_OPTIONS.map(({ key, Icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        title={label}
                        onClick={() => setNewCategory({ ...newCategory, icono: newCategory.icono === key ? '' : key })}
                        style={{
                          padding: '0.375rem',
                          borderRadius: '6px',
                          border: newCategory.icono === key ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                          background: newCategory.icono === key ? 'var(--color-primary-light, #d1fae5)' : 'var(--bg-primary)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Icon style={{ width: '1rem', height: '1rem', color: newCategory.icono === key ? 'var(--color-primary)' : 'var(--text-secondary)' }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCategory.descripcion}
                    onChange={(e) => setNewCategory({ ...newCategory, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button type="button" onClick={closeCategoryModal} className="btn btn-secondary">
                  Cerrar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus className="w-4 h-4" />
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className={`modal-overlay${bulkDeleteModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content max-w-md${bulkDeleteModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Eliminar productos
              </h3>
              <button onClick={closeBulkDeleteModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              Estás por eliminar <strong>{selectAllGlobal ? `${total} producto(s)` : `${selectedRows.size} producto(s)`}</strong> de forma permanente.
              <br />Esta acción no se puede deshacer.
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={closeBulkDeleteModal}
                disabled={bulkDeleting}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
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

      {/* Bulk Suggest Images Modal */}
      {bulkImageProgress && !bulkImageProgress.minimized && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', width: '95vw' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Sugerencia de fotos
              </h3>
              <div className="flex items-center gap-2">
                {bulkImageProgress.running && (
                  <>
                    <button
                      onClick={cancelBulkImages}
                      className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setBulkImageProgress(prev => ({ ...prev, minimized: true }))}
                      className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
                    >
                      Segundo plano
                    </button>
                  </>
                )}
                {!bulkImageProgress.running && (
                  <button onClick={() => setBulkImageProgress(null)} className="modal-close">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Progreso */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{bulkImageProgress.running ? 'Buscando imágenes...' : 'Completado'}</span>
                <span className="font-medium">{bulkImageProgress.current} / {bulkImageProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-1">
                <div
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${bulkImageProgress.total ? (bulkImageProgress.current / bulkImageProgress.total) * 100 : 0}%`,
                    background: bulkImageProgress.running ? 'var(--primary)' : '#8b5cf6',
                  }}
                />
              </div>
              {bulkImageProgress.running && bulkImageProgress.secsRemaining !== null && bulkImageProgress.current > 0 && (
                <p className="text-xs text-gray-400 text-right">{fmtTime(bulkImageProgress.secsRemaining)}</p>
              )}
            </div>

            {/* Resultados */}
            {bulkImageProgress.results.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
                {bulkImageProgress.results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 rounded">
                    <span className={`flex-shrink-0 text-base ${r.skipped ? 'text-blue-300' : r.ok ? 'text-green-500' : 'text-gray-300'}`}>
                      {r.skipped ? '↷' : r.ok ? '✓' : '–'}
                    </span>
                    <span className={`truncate ${r.skipped ? 'text-gray-400 italic' : r.ok ? 'text-gray-800' : 'text-gray-400'}`}>{r.nombre}</span>
                    {r.skipped && <span className="text-xs text-blue-300 flex-shrink-0">ya tiene foto</span>}
                  </div>
                ))}
                <div ref={bulkImageBottomRef} />
              </div>
            )}

            {!bulkImageProgress.running && (
              <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
                <span>
                  <span className="text-green-600 font-medium">{bulkImageProgress.results.filter(r => r.ok && !r.skipped).length}</span> encontradas,{' '}
                  <span className="text-blue-400">{bulkImageProgress.results.filter(r => r.skipped).length}</span> ya tenían,{' '}
                  <span className="text-gray-400">{bulkImageProgress.results.filter(r => !r.ok && !r.skipped).length}</span> sin resultado
                </span>
                <button onClick={() => setBulkImageProgress(null)} className="btn btn-primary btn-sm">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {(showBulkEditModal || bulkEditModalClosing) && (
        <BulkEditModal
          items={bulkEditItems}
          onItemChange={updateBulkEditItem}
          categories={categories}
          closing={bulkEditModalClosing}
          onClose={closeBulkEditModal}
          onSave={handleBulkEditSave}
          saving={bulkEditSaving}
        />
      )}
    </div>
  );
};

export default ProductManagementView;
