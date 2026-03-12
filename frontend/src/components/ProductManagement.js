import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useModalClose from '../useModalClose';
import Pagination from './Pagination';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Search,
  AlertCircle,
  Save,
  X,
  Download,
  Upload,
  FileText,
  ChevronDown,
  Tag,
  Layers,
  Minus
} from 'lucide-react';

const normalize = (str) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').toLowerCase();

const ProductManagement = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategory, setNewCategory] = useState({ nombre: '', descripcion: '' });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    codigo_barras: '',
    tipo: 'codigo_barras',
    kind: 'normal',
    precio: '',
    precio_por_peso: '',
    categoria_id: '',
    stock: '',
    stock_minimo: 10,
    control_stock: true,
    combo_items: []
  });
  const [comboItemInput, setComboItemInput] = useState({ product_id: '', cantidad: 1 });
  const [comboSearch, setComboSearch] = useState('');
  const [showComboDropdown, setShowComboDropdown] = useState(false);
  const comboSearchRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      setConfig(response.data);
    } catch (error) {
      console.error('Error loading configuration');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      toast.error('Error al cargar categorías');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      codigo_barras: '',
      tipo: 'codigo_barras',
      kind: 'normal',
      precio: '',
      precio_por_peso: '',
      categoria_id: '',
      stock: '',
      stock_minimo: 10,
      control_stock: true,
      combo_items: []
    });
    setComboItemInput({ product_id: '', cantidad: 1 });
    setComboSearch('');
    setShowComboDropdown(false);
    setEditingProduct(null);
  };

  const openModal = (product = null) => {
    if (product) {
      setFormData({
        nombre: product.nombre,
        codigo_barras: product.codigo_barras || '',
        tipo: product.tipo,
        kind: product.kind || 'normal',
        precio: product.precio.toString(),
        precio_por_peso: product.precio_por_peso?.toString() || '',
        categoria_id: product.categoria_id,
        stock: product.stock.toString(),
        stock_minimo: product.stock_minimo.toString(),
        control_stock: product.control_stock !== undefined ? product.control_stock : true,
        combo_items: product.combo_items || []
      });
      setComboItemInput({ product_id: '', cantidad: 1 });
      setComboSearch('');
      setShowComboDropdown(false);
      setEditingProduct(product);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const addComboItem = () => {
    if (!comboItemInput.product_id) return;
    const already = formData.combo_items.find(ci => ci.product_id === comboItemInput.product_id);
    if (already) return;
    setFormData(prev => ({
      ...prev,
      combo_items: [...prev.combo_items, { product_id: comboItemInput.product_id, cantidad: Number(comboItemInput.cantidad) || 1 }]
    }));
    setComboItemInput({ product_id: '', cantidad: 1 });
    setComboSearch('');
    setShowComboDropdown(false);
  };

  const removeComboItem = (product_id) => {
    setFormData(prev => ({ ...prev, combo_items: prev.combo_items.filter(ci => ci.product_id !== product_id) }));
  };

  const updateComboItemCantidad = (product_id, cantidad) => {
    setFormData(prev => ({
      ...prev,
      combo_items: prev.combo_items.map(ci => ci.product_id === product_id ? { ...ci, cantidad: Number(cantidad) || 1 } : ci)
    }));
  };

  const getProductName = (productId) => {
    const p = products.find(p => p.id === productId);
    return p ? p.nombre : productId;
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const productData = {
        ...formData,
        precio: parseFloat(formData.precio),
        precio_por_peso: formData.precio_por_peso ? parseFloat(formData.precio_por_peso) : null,
        stock: formData.control_stock ? (parseInt(formData.stock) || 0) : 0,
        stock_minimo: formData.control_stock ? (parseInt(formData.stock_minimo) || 0) : 0,
        combo_items: formData.kind === 'combo' ? formData.combo_items : []
      };

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData);
        toast.success('Producto actualizado exitosamente');
      } else {
        await axios.post(`${API}/products`, productData);
        toast.success('Producto creado exitosamente');
      }

      fetchProducts();
      closeProductModal();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg).join(', ')
          : 'Error al guardar el producto';
      toast.error(msg);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/categories`, newCategory);
      toast.success('Categoría creada exitosamente');
      fetchCategories();
      setNewCategory({ nombre: '', descripcion: '' });
      closeCategoryModal();
    } catch (error) {
      toast.error('Error al crear la categoría');
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.nombre : 'Sin categoría';
  };

  const filteredProducts = products.filter(product =>
    product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.codigo_barras && product.codigo_barras.includes(searchTerm))
  );

  // Pagination logic
  const itemsPerPage = config?.items_per_page || 10;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleExport = async (format) => {
    setShowExportMenu(false);
    try {
      const response = await axios.get(`${API}/products/export`, {
        params: { format },
        responseType: 'blob',
      });
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `productos.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Productos exportados en ${ext.toUpperCase()}`);
    } catch (error) {
      toast.error('Error al exportar productos');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Selecciona un archivo');
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    try {
      const formDataFile = new FormData();
      formDataFile.append('file', importFile);
      const response = await axios.post(`${API}/products/import`, formDataFile, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(response.data);
      fetchProducts();
      toast.success(`Importación completada: ${response.data.created} creados, ${response.data.updated} actualizados`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al importar productos');
    } finally {
      setImportLoading(false);
    }
  };

  const [productModalClosing, closeProductModal] = useModalClose(closeModal);
  const [importModalClosing, closeImportModalAnim] = useModalClose(() => { setShowImportModal(false); setImportFile(null); });
  const [categoryModalClosing, closeCategoryModal] = useModalClose(() => setShowCategoryModal(false));
  const [bulkDeleteModalClosing, closeBulkDeleteModal] = useModalClose(() => setShowBulkDeleteModal(false));

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelectRow = (productId) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (paginatedProducts.every(p => selectedRows.has(p.id))) {
      setSelectedRows(prev => {
        const next = new Set(prev);
        paginatedProducts.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedRows(prev => {
        const next = new Set(prev);
        paginatedProducts.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    let successCount = 0;
    let errorCount = 0;
    for (const productId of selectedRows) {
      try {
        await axios.delete(`${API}/products/${productId}`);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`${successCount} producto(s) eliminado(s)`);
    if (errorCount > 0) toast.error(`${errorCount} producto(s) con error al eliminar`);
    closeBulkDeleteModal();
    setSelectedRows(new Set());
    await fetchProducts();
    setBulkDeleting(false);
  };

  const getLowStockProducts = () => {
    return products.filter(product =>
      product.kind !== 'combo' &&
      product.control_stock !== false &&
      product.stock <= product.stock_minimo
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" onClick={() => setShowExportMenu(false)}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Productos
          </h1>
          <p className="text-gray-600">
            {products.length} productos registrados
          </p>
          <button
            onClick={() => navigate('/branches', { state: { branchId: user?.branch_id } })}
            className="mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <Tag className="w-3 h-3" />
            Lista de precios de sucursal
          </button>
        </div>
        <button
          onClick={() => openModal()}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      {/* Low Stock Alert */}
      {getLowStockProducts().length > 0 && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {getLowStockProducts().length} productos con stock bajo
              </h3>
              <p className="text-sm text-red-700">
                Algunos productos requieren reabastecimiento
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar + Action Buttons */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Export dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              className="btn"
              style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
            >
              <Download className="w-4 h-4" />
              Exportar
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
                >
                  <FileText className="w-4 h-4 text-green-600" />
                  CSV
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  Excel (XLSX)
                </button>
              </div>
            )}
          </div>

          {/* Import button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="btn"
            style={{ background: 'var(--secondary)', color: 'var(--secondary-text)' }}
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>

          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn"
            style={{ background: 'var(--tertiary)', color: 'var(--tertiary-text)' }}
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">{selectedRows.size} seleccionado(s)</span>
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="btn btn-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar seleccionados
          </button>
          <button
            onClick={() => setSelectedRows(new Set())}
            className="text-gray-400 hover:text-gray-600 ml-auto"
            title="Deseleccionar todo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="table-container">
        <table className="table">
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
              <th>Producto</th>
              <th>Código</th>
              <th>Categoría</th>
              <th>Clase</th>
              <th>Stock Mínimo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map(product => (
              <tr key={product.id} className={selectedRows.has(product.id) ? 'bg-blue-50' : ''}>
                <td>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    checked={selectedRows.has(product.id)}
                    onChange={() => toggleSelectRow(product.id)}
                  />
                </td>
                <td>
                  <div>
                    <div className="font-medium text-gray-900">
                      {product.nombre}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {product.tipo.replace('_', ' ')}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="text-sm text-blue-600">
                    {product.codigo_barras || 'N/A'}
                  </span>
                </td>
                <td>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {getCategoryName(product.categoria_id)}
                  </span>
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    {product.kind === 'combo' ? (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full flex items-center gap-1 w-fit">
                        <Layers className="w-3 h-3" /> Combo
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full w-fit">Normal</span>
                    )}
                    {product.kind !== 'combo' && !product.control_stock && (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full w-fit">Sin stock</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="font-medium text-gray-900">
                    {product.stock_minimo}
                  </span>
                </td>
                <td>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.activo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td align="center">
                  <div className="">
                    <button
                      onClick={() => openModal(product)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredProducts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          itemName="productos"
        />
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className={`modal-overlay${productModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content${productModalClosing ? ' closing' : ''}`} style={{ maxWidth: '960px', width: '95vw' }}>
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
                {/* Row 1: Nombre */}
                <div className="form-group">
                  <label className="form-label">Nombre del Producto *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>

                {/* Row 2: Clase | Modo precio | Código */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="form-group">
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
                  <div className="form-group">
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
                  <div className="form-group">
                    <label className="form-label">Código de Barras</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.codigo_barras}
                      onChange={(e) => setFormData({...formData, codigo_barras: e.target.value})}
                    />
                  </div>
                </div>

                {/* Row 3: Categoría | Precio | Precio/kg */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="form-group">
                    <label className="form-label">Categoría *</label>
                    <select
                      className="form-select"
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Precio Unitario *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.precio}
                      onChange={(e) => setFormData({...formData, precio: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Precio por Kg</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      disabled={formData.tipo !== 'por_peso'}
                      value={formData.tipo === 'por_peso' ? formData.precio_por_peso : ''}
                      onChange={(e) => setFormData({...formData, precio_por_peso: e.target.value})}
                      placeholder={formData.tipo !== 'por_peso' ? '—' : ''}
                    />
                  </div>
                </div>

                {/* Row 4: Control de stock + Stock actual + Stock mínimo */}
                <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border transition-colors"
                  style={{ background: formData.control_stock ? '#f0fdf4' : '#f9fafb', borderColor: formData.control_stock ? '#86efac' : '#e5e7eb' }}>
                  {/* Toggle visual */}
                  <div className="flex items-center gap-3 flex-shrink-0 self-center pb-1">
                    <button
                      type="button"
                      disabled={formData.kind === 'combo'}
                      onClick={() => formData.kind !== 'combo' && setFormData({...formData, control_stock: !formData.control_stock})}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ background: formData.control_stock ? '#22c55e' : '#d1d5db' }}
                      aria-pressed={formData.control_stock}
                    >
                      <span
                        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                        style={{ transform: formData.control_stock ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
                      />
                    </button>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 leading-tight select-none">Control de stock</p>
                      <p className="text-xs leading-tight" style={{ color: formData.kind === 'combo' ? '#9ca3af' : formData.control_stock ? '#16a34a' : '#9ca3af' }}>
                        {formData.kind === 'combo' ? 'No aplica en combos' : formData.control_stock ? 'Activo — se descuenta en ventas' : 'Inactivo — no se controla'}
                      </p>
                    </div>
                  </div>
                  {/* Stock inputs */}
                  <div className="flex gap-3 flex-1 flex-wrap">
                    <div className="form-group mb-0 flex-1 min-w-28">
                      <label className="form-label">Stock Actual {formData.control_stock && <span className="text-red-500">*</span>}</label>
                      <input
                        type="number"
                        className="form-input"
                        disabled={!formData.control_stock}
                        value={formData.stock}
                        onChange={(e) => setFormData({...formData, stock: e.target.value})}
                        required={formData.control_stock}
                      />
                    </div>
                    <div className="form-group mb-0 flex-1 min-w-28">
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
                  </div>
                </div>

                {/* Combo items */}
                {formData.kind === 'combo' && (
                  <div className="space-y-3">
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

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <Save className="w-4 h-4" />
                  {editingProduct ? 'Actualizar' : 'Crear'} Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className={`modal-overlay${importModalClosing ? ' closing' : ''}`} onClick={() => setShowExportMenu(false)}>
          <div className={`modal-content${importModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title">Importar Productos</h3>
              <button onClick={closeImportModalAnim} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!importResult ? (
              <form onSubmit={handleImport}>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <p className="font-medium mb-1">Formato requerido (CSV o XLSX):</p>
                    <p className="font-mono text-xs">nombre, codigo_barras, tipo, precio, precio_por_peso, categoria, stock, stock_minimo</p>
                    <p className="mt-1 text-xs">• <strong>tipo</strong>: <code>codigo_barras</code> o <code>por_peso</code></p>
                    <p className="text-xs">• <strong>categoria</strong>: debe coincidir con una categoría existente</p>
                    <p className="text-xs">• Si el código de barras ya existe, el producto se actualizará</p>
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

                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={closeImportModalAnim} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={importLoading}>
                    {importLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="spinner w-4 h-4"></div>
                        Importando...
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div className={`modal-overlay${categoryModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content${categoryModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title">Nueva Categoría</h3>
              <button
                onClick={closeCategoryModal}
                className="modal-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory}>
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Nombre de la Categoría *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCategory.nombre}
                    onChange={(e) => setNewCategory({...newCategory, nombre: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={newCategory.descripcion}
                    onChange={(e) => setNewCategory({...newCategory, descripcion: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeCategoryModal}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <Save className="w-4 h-4" />
                  Crear Categoría
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
              Estás por eliminar <strong>{selectedRows.size} producto(s)</strong> de forma permanente.
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
    </div>
  );
};

export default ProductManagement;