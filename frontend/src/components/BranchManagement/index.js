import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { API } from '../../App';
import { useSortableData } from '../../hooks/useSortableData';
import useModalClose from '../../useModalClose';
import { toast } from 'sonner';
import BranchManagementView from './BranchManagementView';

const BranchManagement = () => {
  const location = useLocation();
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
  const [showBulkStockMinModal, setShowBulkStockMinModal] = useState(false);
  const [bulkStockMinTipo, setBulkStockMinTipo] = useState('establecer');
  const [bulkStockMinValor, setBulkStockMinValor] = useState('');
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkStockTipo, setBulkStockTipo] = useState('establecer');
  const [bulkStockValor, setBulkStockValor] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [config, setConfig] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: ''
  });

  useEffect(() => {
    fetchBranches();
    fetchUsers();
    fetchCategories();
    axios.get(`${API}/config`).then(r => setConfig(r.data)).catch(() => {});
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
      const targetId = location.state?.branchId;
      if (targetId) {
        const branch = response.data.find(b => b.id === targetId);
        if (branch) selectBranch(branch);
      }
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

  const [branchModalClosing, closeBranchModal] = useModalClose(closeModal);
  const [bulkDeleteModalClosing, closeBulkDeleteModalAnim] = useModalClose(() => setShowBulkDeleteModal(false));
  const [bulkMargenModalClosing, closeBulkMargenModal] = useModalClose(() => setShowBulkMargenModal(false));
  const [bulkStockMinModalClosing, closeBulkStockMinModal] = useModalClose(() => setShowBulkStockMinModal(false));
  const [bulkStockModalClosing, closeBulkStockModal] = useModalClose(() => setShowBulkStockModal(false));

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
      closeBranchModal();
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
    closeBulkMargenModal();
    setBulkMargenValor('');
    toast.success(`Margen aplicado a ${selectedRows.size} producto(s). Recuerda guardar los cambios.`);
  };

  const applyBulkStockMin = () => {
    const valor = parseInt(bulkStockMinValor, 10);
    if (isNaN(valor) || valor < 0) {
      toast.error('Ingresa un valor válido');
      return;
    }
    setPendingChanges(prev => {
      const next = { ...prev };
      for (const productId of selectedRows) {
        const product = branchProducts.find(p => p.product_id === productId);
        if (!product) continue;
        const current = prev[productId]?.stock_minimo !== undefined
          ? prev[productId].stock_minimo
          : (product.stock_minimo_sucursal || 0);
        let newVal;
        if (bulkStockMinTipo === 'establecer') {
          newVal = valor;
        } else if (bulkStockMinTipo === 'incrementar') {
          newVal = Math.max(0, current + valor);
        } else {
          newVal = Math.max(0, current - valor);
        }
        next[productId] = { ...next[productId], stock_minimo: newVal };
      }
      return next;
    });
    closeBulkStockMinModal();
    setBulkStockMinValor('');
    toast.success(`Stock mínimo aplicado a ${selectedRows.size} producto(s). Recuerda guardar los cambios.`);
  };

  const applyBulkStock = () => {
    const valor = parseInt(bulkStockValor, 10);
    if (isNaN(valor) || valor < 0) {
      toast.error('Ingresa un valor válido');
      return;
    }
    setPendingChanges(prev => {
      const next = { ...prev };
      for (const productId of selectedRows) {
        const product = branchProducts.find(p => p.product_id === productId);
        if (!product) continue;
        const current = prev[productId]?.stock !== undefined
          ? prev[productId].stock
          : (product.stock_sucursal ?? 0);
        let newVal;
        if (bulkStockTipo === 'establecer') {
          newVal = valor;
        } else if (bulkStockTipo === 'incrementar') {
          newVal = Math.max(0, current + valor);
        } else {
          newVal = Math.max(0, current - valor);
        }
        next[productId] = { ...next[productId], stock: newVal };
      }
      return next;
    });
    closeBulkStockModal();
    setBulkStockValor('');
    toast.success(`Stock aplicado a ${selectedRows.size} producto(s). Recuerda guardar los cambios.`);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    let successCount = 0;
    let errorCount = 0;
    for (const productId of selectedRows) {
      const product = branchProducts.find(p => p.product_id === productId);
      if (!product?.branch_product_id) { errorCount++; continue; }
      try {
        await axios.delete(`${API}/branch-products/${product.branch_product_id}`);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`${successCount} producto(s) eliminado(s) de la sucursal`);
    if (errorCount > 0) toast.error(`${errorCount} producto(s) con error al eliminar`);
    closeBulkDeleteModalAnim();
    setSelectedRows(new Set());
    await fetchBranchProducts(selectedBranch.id);
    setBulkDeleting(false);
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
            stock_minimo: changes.stock_minimo ?? 10
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

  const { sortedItems: sortedProducts, sortConfig, requestSort } = useSortableData(filteredProducts);

  const itemsPerPage = config?.items_per_page || 10;
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedRows.has(p.product_id));
  const someFilteredSelected = filteredProducts.some(p => selectedRows.has(p.product_id));

  const handlePendingMargenChange = (productId, margen, precioGlobal) => {
    const newPrecio = precioGlobal > 0
      ? parseFloat((precioGlobal * (1 + margen / 100)).toFixed(2))
      : precioGlobal;
    setPendingChanges(prev => ({
      ...prev,
      [productId]: { ...prev[productId], margen, precio: newPrecio }
    }));
  };

  const handlePendingPrecioChange = (productId, precio, precioGlobal) => {
    const impliedMargen = precioGlobal > 0
      ? parseFloat(((precio / precioGlobal - 1) * 100).toFixed(2))
      : 0;
    setPendingChanges(prev => ({
      ...prev,
      [productId]: { ...prev[productId], precio, margen: impliedMargen }
    }));
  };

  return (
    <BranchManagementView
      loading={loading}
      branches={branches}
      selectedBranch={selectedBranch}
      branchProducts={branchProducts}
      loadingProducts={loadingProducts}
      searchTerm={searchTerm}
      showModal={showModal}
      editingBranch={editingBranch}
      pendingChanges={pendingChanges}
      savingChanges={savingChanges}
      showExportMenu={showExportMenu}
      selectedRows={selectedRows}
      showBulkMargenModal={showBulkMargenModal}
      bulkMargenTipo={bulkMargenTipo}
      bulkMargenValor={bulkMargenValor}
      showBulkStockMinModal={showBulkStockMinModal}
      bulkStockMinTipo={bulkStockMinTipo}
      bulkStockMinValor={bulkStockMinValor}
      showBulkStockModal={showBulkStockModal}
      bulkStockTipo={bulkStockTipo}
      bulkStockValor={bulkStockValor}
      showBulkDeleteModal={showBulkDeleteModal}
      bulkDeleting={bulkDeleting}
      currentPage={currentPage}
      formData={formData}
      branchModalClosing={branchModalClosing}
      bulkDeleteModalClosing={bulkDeleteModalClosing}
      bulkMargenModalClosing={bulkMargenModalClosing}
      bulkStockMinModalClosing={bulkStockMinModalClosing}
      bulkStockModalClosing={bulkStockModalClosing}
      filteredProducts={sortedProducts}
      itemsPerPage={itemsPerPage}
      totalPages={totalPages}
      paginatedProducts={paginatedProducts}
      sortConfig={sortConfig}
      requestSort={requestSort}
      hasPendingChanges={hasPendingChanges}
      allFilteredSelected={allFilteredSelected}
      someFilteredSelected={someFilteredSelected}
      onOpenModal={openModal}
      onCloseBranchModal={closeBranchModal}
      onSubmit={handleSubmit}
      onToggleBranchActive={toggleBranchActive}
      onSelectBranch={selectBranch}
      onGoBack={goBack}
      onProductFieldChange={handleProductFieldChange}
      onPendingMargenChange={handlePendingMargenChange}
      onPendingPrecioChange={handlePendingPrecioChange}
      onToggleSelectAll={toggleSelectAll}
      onToggleSelectRow={toggleSelectRow}
      onSaveProductChanges={saveProductChanges}
      onToggleBranchProductActive={toggleBranchProductActive}
      onExportBranch={handleExportBranch}
      onSetShowExportMenu={setShowExportMenu}
      onSetFormData={setFormData}
      onSetBulkMargenTipo={setBulkMargenTipo}
      onSetBulkMargenValor={setBulkMargenValor}
      onSetBulkStockMinTipo={setBulkStockMinTipo}
      onSetBulkStockMinValor={setBulkStockMinValor}
      onSetBulkStockTipo={setBulkStockTipo}
      onSetBulkStockValor={setBulkStockValor}
      onSetShowBulkMargenModal={setShowBulkMargenModal}
      onSetShowBulkStockMinModal={setShowBulkStockMinModal}
      onSetShowBulkStockModal={setShowBulkStockModal}
      onSetShowBulkDeleteModal={setShowBulkDeleteModal}
      onSetSelectedRows={setSelectedRows}
      onSetCurrentPage={setCurrentPage}
      onSearch={handleSearch}
      onApplyBulkMargen={applyBulkMargen}
      onApplyBulkStockMin={applyBulkStockMin}
      onApplyBulkStock={applyBulkStock}
      onHandleBulkDelete={handleBulkDelete}
      onCloseBulkDeleteModalAnim={closeBulkDeleteModalAnim}
      onCloseBulkMargenModal={closeBulkMargenModal}
      onCloseBulkStockMinModal={closeBulkStockMinModal}
      onCloseBulkStockModal={closeBulkStockModal}
      getCategoryName={getCategoryName}
      getUsersInBranch={getUsersInBranch}
      getProductCurrentMargen={getProductCurrentMargen}
    />
  );
};

export default BranchManagement;
