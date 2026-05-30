import React, { useState, useEffect, useRef, useContext } from 'react';
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
  const [templateLoading, setTemplateLoading] = useState(false);
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

  const { sortedItems: sortedProducts, sortConfig, requestSort } = useSortableData(filteredProducts);

  // Pagination logic
  const itemsPerPage = config?.items_per_page || 10;
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

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
  const [importModalClosing, closeImportModalAnim] = useModalClose(() => { setShowImportModal(false); setImportFile(null); setImportResult(null); });
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
      products={products}
      categories={categories}
      loading={loading}
      showModal={showModal}
      editingProduct={editingProduct}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
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
      templateLoading={templateLoading}
      importResult={importResult}
      fileInputRef={fileInputRef}
      selectedRows={selectedRows}
      setSelectedRows={setSelectedRows}
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
      handleCreateCategory={handleCreateCategory}
      handleExport={handleExport}
      handleImport={handleImport}
      handleBulkDelete={handleBulkDelete}
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
