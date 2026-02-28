import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
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
  ChevronDown
} from 'lucide-react';

const ProductManagement = () => {
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

  const [formData, setFormData] = useState({
    nombre: '',
    codigo_barras: '',
    tipo: 'codigo_barras',
    precio: '',
    precio_por_peso: '',
    categoria_id: '',
    stock: '',
    stock_minimo: 10
  });

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
      precio: '',
      precio_por_peso: '',
      categoria_id: '',
      stock: '',
      stock_minimo: 10
    });
    setEditingProduct(null);
  };

  const openModal = (product = null) => {
    if (product) {
      setFormData({
        nombre: product.nombre,
        codigo_barras: product.codigo_barras || '',
        tipo: product.tipo,
        precio: product.precio.toString(),
        precio_por_peso: product.precio_por_peso?.toString() || '',
        categoria_id: product.categoria_id,
        stock: product.stock.toString(),
        stock_minimo: product.stock_minimo.toString()
      });
      setEditingProduct(product);
    } else {
      resetForm();
    }
    setShowModal(true);
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
        stock: parseInt(formData.stock),
        stock_minimo: parseInt(formData.stock_minimo)
      };

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData);
        toast.success('Producto actualizado exitosamente');
      } else {
        await axios.post(`${API}/products`, productData);
        toast.success('Producto creado exitosamente');
      }

      fetchProducts();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar el producto');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/categories`, newCategory);
      toast.success('Categoría creada exitosamente');
      fetchCategories();
      setNewCategory({ nombre: '', descripcion: '' });
      setShowCategoryModal(false);
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

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getLowStockProducts = () => {
    return products.filter(product => product.stock <= product.stock_minimo);
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
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* Export dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              className="btn btn-secondary"
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
            className="btn btn-secondary"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>

          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn btn-secondary"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
          <button
            onClick={() => openModal()}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
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

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Código</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map(product => (
              <tr key={product.id}>
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
                  <div>
                    <div className="font-medium">
                      ${product.precio.toFixed(2)}
                    </div>
                    {product.precio_por_peso && (
                      <div className="text-sm text-gray-500">
                        ${product.precio_por_peso.toFixed(2)}/kg
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex items-center">
                    <span className={`font-medium ${
                      product.stock <= product.stock_minimo 
                        ? 'text-red-600' 
                        : 'text-gray-900'
                    }`}>
                      {product.stock}
                    </span>
                    {product.stock <= product.stock_minimo && (
                      <AlertCircle className="w-4 h-4 text-red-500 ml-2" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Mín: {product.stock_minimo}
                  </div>
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={closeModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Tipo de Producto *</label>
                    <select
                      className="form-select"
                      value={formData.tipo}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                      required
                    >
                      <option value="codigo_barras">Código de Barras</option>
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

                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <select
                    className="form-select"
                    value={formData.categoria_id}
                    onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                  {formData.tipo === 'por_peso' && (
                    <div className="form-group">
                      <label className="form-label">Precio por Kg</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={formData.precio_por_peso}
                        onChange={(e) => setFormData({...formData, precio_por_peso: e.target.value})}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Stock Actual *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stock Mínimo *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.stock_minimo}
                      onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
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
        <div className="modal-overlay" onClick={() => setShowExportMenu(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Importar Productos</h3>
              <button onClick={closeImportModal} className="modal-close">
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
                  <button type="button" onClick={closeImportModal} className="btn btn-secondary">
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
                  <button onClick={closeImportModal} className="btn btn-primary">
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Nueva Categoría</h3>
              <button 
                onClick={() => setShowCategoryModal(false)} 
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
                  onClick={() => setShowCategoryModal(false)}
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
    </div>
  );
};

export default ProductManagement;