import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
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
  Percent
} from 'lucide-react';

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchProducts, setBranchProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});
  const [savingChanges, setSavingChanges] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showBulkMargenModal, setShowBulkMargenModal] = useState(false);
  const [bulkMargenTipo, setBulkMargenTipo] = useState('establecer');
  const [bulkMargenValor, setBulkMargenValor] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: ''
  });

  useEffect(() => {
    fetchBranches();
    fetchUsers();
    fetchCategories();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
    } catch (error) {
      toast.error('Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error al cargar usuarios');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error al cargar categorías');
    }
  };

  const fetchBranchProducts = async (branchId) => {
    setLoadingProducts(true);
    setPendingChanges({});
    setSelectedRows(new Set());
    try {
      const response = await axios.get(`${API}/branches/${branchId}/products`);
      setBranchProducts(response.data);
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Error desconocido';
      toast.error(`Error al cargar productos: ${msg}`);
      console.error('fetchBranchProducts error:', error.response?.status, msg);
    } finally {
      setLoadingProducts(false);
    }
  };

  const openModal = (branch = null) => {
    if (branch) {
      setFormData({
        nombre: branch.nombre,
        direccion: branch.direccion,
        telefono: branch.telefono || ''
      });
      setEditingBranch(branch);
    } else {
      setFormData({ nombre: '', direccion: '', telefono: '' });
      setEditingBranch(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBranch(null);
    setFormData({ nombre: '', direccion: '', telefono: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await axios.put(`${API}/branches/${editingBranch.id}`, formData);
        toast.success('Sucursal actualizada');
      } else {
        await axios.post(`${API}/branches`, formData);
        toast.success('Sucursal creada. Los productos se han sincronizado automáticamente.');
      }
      fetchBranches();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar la sucursal');
    }
  };

  const toggleBranchActive = async (branch) => {
    try {
      await axios.put(`${API}/branches/${branch.id}`, { activo: !branch.activo });
      toast.success(`Sucursal ${!branch.activo ? 'activada' : 'desactivada'}`);
      fetchBranches();
    } catch (error) {
      toast.error('Error al cambiar estado de la sucursal');
    }
  };

  const selectBranch = (branch) => {
    setSelectedBranch(branch);
    setSearchTerm('');
    fetchBranchProducts(branch.id);
  };

  const goBack = () => {
    setSelectedBranch(null);
    setBranchProducts([]);
    setPendingChanges({});
    setSelectedRows(new Set());
  };

  const handleProductFieldChange = (productId, field, value) => {
    setPendingChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const toggleSelectAll = () => {
    if (filteredProducts.every(p => selectedRows.has(p.product_id))) {
      setSelectedRows(prev => {
        const next = new Set(prev);
        filteredProducts.forEach(p => next.delete(p.product_id));
        return next;
      });
    } else {
      setSelectedRows(prev => {
        const next = new Set(prev);
        filteredProducts.forEach(p => next.add(p.product_id));
        return next;
      });
    }
  };

  const toggleSelectRow = (productId) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const getProductCurrentMargen = (product, pendingForProduct) => {
    if (pendingForProduct?.margen !== undefined) return pendingForProduct.margen;
    if (product.margen_sucursal !== null && product.margen_sucursal !== undefined) return product.margen_sucursal;
    const precioRef = product.precio_sucursal ?? product.precio_global;
    return product.precio_global > 0
      ? parseFloat(((precioRef / product.precio_global - 1) * 100).toFixed(2))
      : 0;
  };

  const applyBulkMargen = () => {
    const valor = parseFloat(bulkMargenValor);
    if (isNaN(valor)) {
      toast.error('Ingresa un valor de margen válido');
      return;
    }
    setPendingChanges(prev => {
      const next = { ...prev };
      for (const productId of selectedRows) {
        const product = branchProducts.find(p => p.product_id === productId);
        if (!product) continue;
        const currentMargenForProduct = getProductCurrentMargen(product, prev[productId]);
        let newMargen;
        if (bulkMargenTipo === 'establecer') {
          newMargen = valor;
        } else if (bulkMargenTipo === 'incrementar') {
          newMargen = parseFloat((currentMargenForProduct + valor).toFixed(2));
        } else {
          newMargen = parseFloat((currentMargenForProduct - valor).toFixed(2));
        }
        const newPrecio = product.precio_global > 0
          ? parseFloat((product.precio_global * (1 + newMargen / 100)).toFixed(2))
          : product.precio_global;
        next[productId] = { ...next[productId], margen: newMargen, precio: newPrecio };
      }
      return next;
    });
    setShowBulkMargenModal(false);
    setBulkMargenValor('');
    toast.success(`Margen aplicado a ${selectedRows.size} producto(s). Recuerda guardar los cambios.`);
  };

  const saveProductChanges = async () => {
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) return;
    setSavingChanges(true);
    let successCount = 0;
    let errorCount = 0;
    for (const [productId, changes] of entries) {
      const product = branchProducts.find(p => p.product_id === productId);
      if (!product) continue;
      try {
        if (product.branch_product_id) {
          await axios.put(`${API}/branch-products/${product.branch_product_id}`, changes);
        } else {
          await axios.post(`${API}/branch-products`, {
            product_id: productId,
            branch_id: selectedBranch.id,
            precio: changes.precio ?? product.precio_global,
            margen: changes.margen,
            stock: changes.stock ?? product.stock_global,
            stock_minimo: 10
          });
        }
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Error al actualizar producto ${productId}:`, error);
      }
    }
    if (successCount > 0) toast.success(`${successCount} producto(s) actualizado(s)`);
    if (errorCount > 0) toast.error(`${errorCount} producto(s) con error`);
    await fetchBranchProducts(selectedBranch.id);
    setSavingChanges(false);
  };

  const toggleBranchProductActive = async (product) => {
    if (!product.branch_product_id) return;
    try {
      await axios.put(`${API}/branch-products/${product.branch_product_id}`, {
        activo: !product.activo_sucursal
      });
      toast.success('Estado actualizado');
      fetchBranchProducts(selectedBranch.id);
    } catch (error) {
      toast.error('Error al cambiar estado del producto');
    }
  };

  const handleExportBranch = async (format) => {
    setShowExportMenu(false);
    try {
      const response = await axios.get(`${API}/branches/${selectedBranch.id}/products/export`, {
        params: { format },
        responseType: 'blob',
      });
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const branchSlug = selectedBranch.nombre.replace(/\s+/g, '_');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `productos_${branchSlug}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Productos exportados en ${ext.toUpperCase()}`);
    } catch (error) {
      toast.error('Error al exportar productos de la sucursal');
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.nombre : 'Sin categoría';
  };

  const getUsersInBranch = (branchId) => {
    return users.filter(u => u.branch_id === branchId).length;
  };

  const filteredProducts = branchProducts.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.includes(searchTerm))
  );

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedRows.has(p.product_id));
  const someFilteredSelected = filteredProducts.some(p => selectedRows.has(p.product_id));

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
      <div className="p-6" onClick={() => setShowExportMenu(false)}>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={goBack} className="btn btn-secondary">
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
                  onClick={saveProductChanges}
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
            {/* Bulk actions - visible when rows are selected */}
            {selectedRows.size > 0 && (
              <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
                <span className="text-sm text-blue-600 font-medium">
                  {selectedRows.size} seleccionado(s)
                </span>
                <button
                  onClick={() => { setBulkMargenTipo('establecer'); setBulkMargenValor(''); setShowBulkMargenModal(true); }}
                  className="btn btn-secondary btn-sm"
                >
                  <Percent className="w-4 h-4" />
                  Margen
                </button>
                <button
                  onClick={() => setSelectedRows(new Set())}
                  className="text-gray-400 hover:text-gray-600"
                  title="Deseleccionar todo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* Export branch products */}
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
                    onClick={() => handleExportBranch('csv')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
                  >
                    <FileText className="w-4 h-4 text-green-600" />
                    CSV
                  </button>
                  <button
                    onClick={() => handleExportBranch('xlsx')}
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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loadingProducts ? (
          <div className="flex items-center justify-center h-48">
            <div className="spinner w-8 h-8"></div>
          </div>
        ) : (
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
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="text-center">Precio Global</th>
                  <th className="text-center">Margen %</th>
                  <th className="text-center">Precio Sucursal</th>
                  <th className="text-center">Stock Sucursal</th>
                  <th className="text-center">Activo</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const changes = pendingChanges[product.product_id] || {};
                  const currentPrice = changes.precio !== undefined
                    ? changes.precio
                    : (product.precio_sucursal ?? product.precio_global);
                  const currentStock = changes.stock !== undefined
                    ? changes.stock
                    : (product.stock_sucursal ?? product.stock_global);
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
                          onChange={() => toggleSelectRow(product.product_id)}
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
                              const newPrecio = product.precio_global > 0
                                ? parseFloat((product.precio_global * (1 + margen / 100)).toFixed(2))
                                : product.precio_global;
                              setPendingChanges(prev => ({
                                ...prev,
                                [product.product_id]: { ...prev[product.product_id], margen, precio: newPrecio }
                              }));
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
                            const impliedMargen = product.precio_global > 0
                              ? parseFloat(((precio / product.precio_global - 1) * 100).toFixed(2))
                              : 0;
                            setPendingChanges(prev => ({
                              ...prev,
                              [product.product_id]: { ...prev[product.product_id], precio, margen: impliedMargen }
                            }));
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
                              onChange={(e) => handleProductFieldChange(product.product_id, 'precio_por_peso', parseFloat(e.target.value) || 0)}
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
                          onChange={(e) => handleProductFieldChange(product.product_id, 'stock', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => toggleBranchProductActive(product)}
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
        )}

        {/* Bulk Margen Modal */}
        {showBulkMargenModal && (
          <div className="modal-overlay">
            <div className="modal-content max-w-md">
              <div className="modal-header">
                <h3 className="modal-title flex items-center gap-2">
                  <Percent className="w-5 h-5 text-green-600" />
                  Cambio masivo de Margen
                </h3>
                <button onClick={() => setShowBulkMargenModal(false)} className="modal-close">
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
                        onClick={() => setBulkMargenTipo(opt.value)}
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
                      onChange={(e) => setBulkMargenValor(e.target.value)}
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
                <button type="button" onClick={() => setShowBulkMargenModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={applyBulkMargen}
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
        <button onClick={() => openModal()} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Nueva Sucursal
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Sin sucursales</h3>
          <p className="text-sm mb-4">Crea tu primera sucursal para gestionar inventario y precios diferenciales</p>
          <button onClick={() => openModal()} className="btn btn-primary">
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
                  onClick={() => selectBranch(branch)}
                  className="flex-1 btn btn-primary btn-sm"
                >
                  <Package className="w-4 h-4" />
                  Ver Productos
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openModal(branch)}
                  className="btn btn-secondary btn-sm"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleBranchActive(branch)}
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
              </h3>
              <button onClick={closeModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingBranch && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>Nota:</strong> Al crear la sucursal, todos los productos existentes se asignarán automáticamente con sus precios actuales.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Nombre de la Sucursal *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Dirección *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
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

export default BranchManagement;