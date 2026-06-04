import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../../App';
import { useSortableData } from '../../hooks/useSortableData';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useModalClose from '../../useModalClose';
import ProductManagementView from './ProductManagementView';

const normalize = (str) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').toLowerCase();

const ProductManagement = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [comboProducts, setComboProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategory, setNewCategory] = useState({ nombre: '', descripcion: '', icono: '' });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryData, setEditCategoryData] = useState({ nombre: '', descripcion: '', icono: '' });
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectAllGlobal, setSelectAllGlobal] = useState(false);
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

  const fetchConfiguration = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      setConfig(response.data);
    } catch (error) {
      console.error('Error loading configuration');
    } finally {
      setConfigLoaded(true);
    }
  };

  const loadProducts = useCallback(async (page, search, perPage) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/products`, {
        params: { page, per_page: perPage, ...(search && { search }) }
      });
      setProducts(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchComboProducts = async () => {
    try {
      const res = await axios.get(`${API}/products`, { params: { page: 1, per_page: 10000 } });
      setComboProducts(res.data.items);
    } catch { /* no-op */ }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories([...response.data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    } catch (error) {
      toast.error('Error al cargar categorías');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchConfiguration();
  }, []);

  // Auto-search while typing (from 2nd character), with debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchTerm.length === 0) {
      setDebouncedSearch('');
      setCurrentPage(1);
    } else if (searchTerm.length >= 2) {
      searchTimerRef.current = setTimeout(() => {
        setDebouncedSearch(searchTerm);
        setCurrentPage(1);
      }, 350);
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchTerm]);

  // Confirm text search on Enter press (immediate, no debounce)
  const commitSearch = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setDebouncedSearch(searchTerm);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  // Fetch products from server when page, search or config changes
  useEffect(() => {
    if (!configLoaded) return;
    const perPage = config?.items_per_page || 50;
    loadProducts(currentPage, debouncedSearch, perPage);
  }, [configLoaded, currentPage, debouncedSearch, loadProducts]);

  // Reset global selection when page or search changes
  useEffect(() => {
    setSelectAllGlobal(false);
    setSelectedRows(new Set());
  }, [currentPage, debouncedSearch]);

  // Load all products for combo dropdown when modal is a combo type
  useEffect(() => {
    if (showModal && formData.kind === 'combo') {
      fetchComboProducts();
    }
  }, [showModal, formData.kind]);

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
    const p = comboProducts.find(p => p.id === productId);
    return p ? p.nombre : productId;
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categoria_id) {
      toast.error('Seleccioná una categoría válida');
      return;
    }

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

      loadProducts(currentPage, debouncedSearch, config?.items_per_page || 50);
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
      setNewCategory({ nombre: '', descripcion: '', icono: '' });
      closeCategoryModal();
    } catch (error) {
      toast.error('Error al crear la categoría');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/categories/${editingCategory.id}`, editCategoryData);
      toast.success('Categoría actualizada');
      fetchCategories();
      setEditingCategory(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar la categoría');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axios.delete(`${API}/categories/${categoryId}`);
      toast.success('Categoría eliminada');
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar la categoría');
      setCategoryToDelete(null);
    }
  };

  const startEditCategory = (cat) => {
    setEditingCategory(cat);
    setEditCategoryData({ nombre: cat.nombre, descripcion: cat.descripcion || '', icono: cat.icono || '' });
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.nombre : 'Sin categoría';
  };

  // Sort current page client-side; pagination is handled by the server
  const { sortedItems: sortedProducts, sortConfig, requestSort } = useSortableData(products);
  const itemsPerPage = config?.items_per_page || 50;
  const paginatedProducts = sortedProducts;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

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
    setImportProgress(0);
    setImportResult(null);
    try {
      const token = localStorage.getItem('token');
      const formDataFile = new FormData();
      formDataFile.append('file', importFile);

      const response = await fetch(`${API}/products/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataFile,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al importar productos');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.progress !== undefined) {
              setImportProgress(data.progress);
            }
            if (data.done) {
              setImportResult(data);
              setCurrentPage(1);
              setSearchTerm('');
              setDebouncedSearch('');
              loadProducts(1, '', config?.items_per_page || 50);
              toast.success(`Importación completada: ${data.created} creados, ${data.updated} actualizados`);
            }
          } catch { /* ignore malformed event */ }
        }
      }
    } catch (error) {
      toast.error(error.message || 'Error al importar productos');
    } finally {
      setImportLoading(false);
    }
  };

  const [productModalClosing, closeProductModal] = useModalClose(closeModal);
  const [importModalClosing, closeImportModalAnim] = useModalClose(() => { setShowImportModal(false); setImportFile(null); setImportResult(null); setImportProgress(0); });
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
    setSelectAllGlobal(false);
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

  const handleSelectAllGlobal = () => setSelectAllGlobal(true);

  const handleClearSelection = () => {
    setSelectAllGlobal(false);
    setSelectedRows(new Set());
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      if (selectAllGlobal) {
        const res = await axios.delete(`${API}/products/bulk`, {
          data: { delete_all: true, search: debouncedSearch || null }
        });
        toast.success(`${res.data.deleted} producto(s) eliminado(s)`);
      } else {
        const res = await axios.delete(`${API}/products/bulk`, {
          data: { ids: [...selectedRows] }
        });
        toast.success(`${res.data.deleted} producto(s) eliminado(s)`);
      }
      closeBulkDeleteModal();
      setSelectedRows(new Set());
      setSelectAllGlobal(false);
      setCurrentPage(1);
      await loadProducts(1, debouncedSearch, config?.items_per_page || 50);
    } catch {
      toast.error('Error al eliminar productos');
    } finally {
      setBulkDeleting(false);
    }
  };

  const getLowStockProducts = () => {
    return products.filter(product =>
      product.kind !== 'combo' &&
      product.control_stock !== false &&
      product.stock <= product.stock_minimo
    );
  };

  const handleBulkSetControlStock = async (value) => {
    try {
      const payload = selectAllGlobal
        ? { delete_all: true, search: debouncedSearch || null, control_stock: value }
        : { ids: [...selectedRows], control_stock: value };
      const res = await axios.put(`${API}/products/bulk-control-stock`, payload);
      toast.success(`Control de stock ${value ? 'activado' : 'desactivado'} en ${res.data.updated} producto(s)`);
      handleClearSelection();
      loadProducts(currentPage, debouncedSearch, config?.items_per_page || 50);
    } catch {
      toast.error('Error al actualizar el control de stock');
    }
  };

  const handleToggleControlStock = async (product) => {
    if (product.kind === 'combo') return;
    const newValue = !product.control_stock;
    try {
      await axios.put(`${API}/products/${product.id}`, {
        nombre: product.nombre,
        codigo_barras: product.codigo_barras || '',
        tipo: product.tipo,
        kind: product.kind || 'normal',
        precio: product.precio,
        precio_por_peso: product.precio_por_peso || null,
        categoria_id: product.categoria_id,
        stock: product.stock,
        stock_minimo: product.stock_minimo,
        control_stock: newValue,
        combo_items: product.combo_items || []
      });
      toast.success(`Control de stock ${newValue ? 'activado' : 'desactivado'}`);
      loadProducts(currentPage, debouncedSearch, config?.items_per_page || 50);
    } catch {
      toast.error('Error al actualizar el control de stock');
    }
  };

  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    try {
      const res = await axios.get(`${API}/products/import-template`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_productos.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar la plantilla');
    } finally {
      setTemplateLoading(false);
    }
  };

  return (
    <ProductManagementView
      user={user}
      navigate={navigate}
      products={comboProducts}
      total={total}
      categories={categories}
      loading={loading}
      showModal={showModal}
      editingProduct={editingProduct}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      commitSearch={commitSearch}
      clearSearch={clearSearch}
      newCategory={newCategory}
      setNewCategory={setNewCategory}
      showCategoryModal={showCategoryModal}
      setShowCategoryModal={setShowCategoryModal}
      currentPage={currentPage}
      showExportMenu={showExportMenu}
      setShowExportMenu={setShowExportMenu}
      showImportModal={showImportModal}
      setShowImportModal={setShowImportModal}
      importFile={importFile}
      setImportFile={setImportFile}
      importLoading={importLoading}
      importProgress={importProgress}
      templateLoading={templateLoading}
      importResult={importResult}
      fileInputRef={fileInputRef}
      selectedRows={selectedRows}
      setSelectedRows={setSelectedRows}
      selectAllGlobal={selectAllGlobal}
      handleSelectAllGlobal={handleSelectAllGlobal}
      handleClearSelection={handleClearSelection}
      showBulkDeleteModal={showBulkDeleteModal}
      setShowBulkDeleteModal={setShowBulkDeleteModal}
      bulkDeleting={bulkDeleting}
      formData={formData}
      setFormData={setFormData}
      comboItemInput={comboItemInput}
      setComboItemInput={setComboItemInput}
      comboSearch={comboSearch}
      setComboSearch={setComboSearch}
      showComboDropdown={showComboDropdown}
      setShowComboDropdown={setShowComboDropdown}
      comboSearchRef={comboSearchRef}
      filteredProducts={sortedProducts}
      itemsPerPage={itemsPerPage}
      totalPages={totalPages}
      paginatedProducts={paginatedProducts}
      sortConfig={sortConfig}
      requestSort={requestSort}
      productModalClosing={productModalClosing}
      importModalClosing={importModalClosing}
      categoryModalClosing={categoryModalClosing}
      bulkDeleteModalClosing={bulkDeleteModalClosing}
      openModal={openModal}
      closeProductModal={closeProductModal}
      closeImportModalAnim={closeImportModalAnim}
      closeCategoryModal={closeCategoryModal}
      closeBulkDeleteModal={closeBulkDeleteModal}
      handleSubmit={handleSubmit}
      editingCategory={editingCategory}
      setEditingCategory={setEditingCategory}
      editCategoryData={editCategoryData}
      setEditCategoryData={setEditCategoryData}
      categoryToDelete={categoryToDelete}
      setCategoryToDelete={setCategoryToDelete}
      handleCreateCategory={handleCreateCategory}
      handleUpdateCategory={handleUpdateCategory}
      handleDeleteCategory={handleDeleteCategory}
      startEditCategory={startEditCategory}
      handleExport={handleExport}
      handleImport={handleImport}
      handleBulkDelete={handleBulkDelete}
      handleBulkSetControlStock={handleBulkSetControlStock}
      handleToggleControlStock={handleToggleControlStock}
      handleDownloadTemplate={handleDownloadTemplate}
      handlePageChange={handlePageChange}
      toggleSelectRow={toggleSelectRow}
      toggleSelectAll={toggleSelectAll}
      addComboItem={addComboItem}
      removeComboItem={removeComboItem}
      updateComboItemCantidad={updateComboItemCantidad}
      getCategoryName={getCategoryName}
      getProductName={getProductName}
      getLowStockProducts={getLowStockProducts}
      normalize={normalize}
    />
  );
};

export default ProductManagement;
