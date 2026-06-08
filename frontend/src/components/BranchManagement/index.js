import React, { useState, useEffect, useRef } from 'react';
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
  const [selectAllGlobal, setSelectAllGlobal] = useState(false);
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
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [config, setConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef(null);
  const prevBranchRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedKind, setSelectedKind] = useState('');
  const [selectedActivo, setSelectedActivo] = useState('');
  const [branchProductsCache, setBranchProductsCache] = useState({});

  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: ''
  });

  useEffect(() => {
    fetchBranches();
    fetchUsers();
    fetchCategories();
    axios.get(`${API}/config`)
      .then(r => setConfig(r.data))
      .catch(() => {})
      .finally(() => setConfigLoaded(true));
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

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [selectedCategory, selectedKind, selectedActivo]);

  // Clear selectAllGlobal when filters change (it's tied to a specific filter state)
  useEffect(() => {
    setSelectAllGlobal(false);
  }, [debouncedSearch, selectedCategory, selectedKind, selectedActivo]);

  // Re-fetch when branch, page or search changes
  useEffect(() => {
    if (!selectedBranch || !configLoaded) return;
    const perPage = config?.items_per_page || 50;
    const branchChanged = prevBranchRef.current !== selectedBranch.id;
    prevBranchRef.current = selectedBranch.id;
    if (branchChanged) {
      setBranchProductsCache({});
      setPendingChanges({});
      setSelectedRows(new Set());
      setSelectAllGlobal(false);
    } else {
      setSelectAllGlobal(false);
    }
    const doFetch = async () => {
      setLoadingProducts(true);
      try {
        const response = await axios.get(`${API}/branches/${selectedBranch.id}/products`, {
          params: {
            page: currentPage, per_page: perPage,
            ...(debouncedSearch && { search: debouncedSearch }),
            ...(selectedCategory && { category_id: selectedCategory }),
            ...(selectedKind && { kind: selectedKind }),
            ...(selectedActivo !== '' && { activo_sucursal: selectedActivo === 'true' }),
          }
        });
        const { items, total: t, total_pages } = response.data;
        setBranchProducts(items);
        setTotal(t);
        setTotalPages(total_pages);
        setBranchProductsCache(prev => {
          const next = { ...prev };
          items.forEach(p => { next[p.product_id] = p; });
          return next;
        });
      } catch (error) {
        const msg = error.response?.data?.detail || error.message || 'Error desconocido';
        toast.error(`Error al cargar productos: ${msg}`);
      } finally {
        setLoadingProducts(false);
      }
    };
    doFetch();
  }, [selectedBranch, currentPage, debouncedSearch, selectedCategory, selectedKind, selectedActivo, configLoaded]);

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
      setCategories([...response.data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    } catch (error) {
      console.error('Error al cargar categorías');
    }
  };

  const reloadBranchProducts = async () => {
    if (!selectedBranch) return;
    const perPage = config?.items_per_page || 50;
    setLoadingProducts(true);
    try {
      const response = await axios.get(`${API}/branches/${selectedBranch.id}/products`, {
        params: {
          page: currentPage, per_page: perPage,
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(selectedCategory && { category_id: selectedCategory }),
          ...(selectedKind && { kind: selectedKind }),
          ...(selectedActivo !== '' && { activo_sucursal: selectedActivo === 'true' }),
        }
      });
      const { items, total: t, total_pages } = response.data;
      setBranchProducts(items);
      setTotal(t);
      setTotalPages(total_pages);
      setBranchProductsCache(prev => {
        const next = { ...prev };
        items.forEach(p => { next[p.product_id] = p; });
        return next;
      });
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Error desconocido';
      toast.error(`Error al cargar productos: ${msg}`);
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

  const [showDeleteBranchModal, setShowDeleteBranchModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [deletingBranch, setDeletingBranch] = useState(false);

  const [branchModalClosing, closeBranchModal] = useModalClose(closeModal);
  const [deleteBranchModalClosing, closeDeleteBranchModal] = useModalClose(() => {
    setShowDeleteBranchModal(false);
    setBranchToDelete(null);
  });
  const [bulkDeleteModalClosing, closeBulkDeleteModalAnim] = useModalClose(() => setShowBulkDeleteModal(false));
  const [bulkMargenModalClosing, closeBulkMargenModal] = useModalClose(() => setShowBulkMargenModal(false));
  const [bulkStockMinModalClosing, closeBulkStockMinModal] = useModalClose(() => setShowBulkStockMinModal(false));
  const [bulkStockModalClosing, closeBulkStockModal] = useModalClose(() => setShowBulkStockModal(false));

  const [savingBranch, setSavingBranch] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSavingBranch(true);
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
    } finally {
      setSavingBranch(false);
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

  const openDeleteBranchModal = (branch) => {
    setBranchToDelete(branch);
    setShowDeleteBranchModal(true);
  };

  const deleteBranch = async () => {
    if (!branchToDelete) return;
    setDeletingBranch(true);
    try {
      await axios.delete(`${API}/branches/${branchToDelete.id}`);
      toast.success(`Sucursal "${branchToDelete.nombre}" eliminada`);
      closeDeleteBranchModal();
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar la sucursal');
    } finally {
      setDeletingBranch(false);
    }
  };

  const selectBranch = (branch) => {
    setSelectedBranch(branch);
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
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
    if (selectAllGlobal) {
      setSelectAllGlobal(false);
      setSelectedRows(new Set());
      return;
    }
    if (sortedProducts.every(p => selectedRows.has(p.product_id))) {
      setSelectedRows(prev => {
        const next = new Set(prev);
        sortedProducts.forEach(p => next.delete(p.product_id));
        return next;
      });
    } else {
      setSelectedRows(prev => {
        const next = new Set(prev);
        sortedProducts.forEach(p => next.add(p.product_id));
        return next;
      });
    }
  };

  const handleSelectAllGlobal = () => setSelectAllGlobal(true);

  const handleClearSelection = () => {
    setSelectAllGlobal(false);
    setSelectedRows(new Set());
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
    const costo = product.costo_sucursal;
    if (costo > 0) return parseFloat(((precioRef - costo) / costo * 100).toFixed(2));
    return product.precio_global > 0
      ? parseFloat(((precioRef / product.precio_global - 1) * 100).toFixed(2))
      : 0;
  };

  const fetchAllBranchProducts = async () => {
    const res = await axios.get(`${API}/branches/${selectedBranch.id}/products`, {
      params: { page: 1, per_page: 10000, ...(debouncedSearch && { search: debouncedSearch }) }
    });
    const all = res.data.items;
    setBranchProductsCache(prev => {
      const next = { ...prev };
      all.forEach(p => { next[p.product_id] = p; });
      return next;
    });
    return all;
  };

  const applyBulkMargen = async () => {
    const valor = parseFloat(bulkMargenValor);
    if (isNaN(valor)) { toast.error('Ingresa un valor de margen válido'); return; }

    let targetProducts;
    try {
      targetProducts = selectAllGlobal
        ? await fetchAllBranchProducts()
        : [...selectedRows].map(id => branchProductsCache[id]).filter(Boolean);
    } catch { toast.error('Error al cargar productos'); return; }

    setPendingChanges(prev => {
      const next = { ...prev };
      for (const product of targetProducts) {
        const productId = product.product_id;
        const currentMargen = getProductCurrentMargen(product, prev[productId]);
        let newMargen;
        if (bulkMargenTipo === 'establecer') newMargen = valor;
        else if (bulkMargenTipo === 'incrementar') newMargen = parseFloat((currentMargen + valor).toFixed(2));
        else newMargen = parseFloat((currentMargen - valor).toFixed(2));
        const _costo = product.costo_sucursal;
        const _base = _costo > 0 ? _costo : product.precio_global;
        const newPrecio = _base > 0
          ? parseFloat((_base * (1 + newMargen / 100)).toFixed(2))
          : (product.precio_sucursal ?? product.precio_global);
        next[productId] = { ...next[productId], margen: newMargen, precio: newPrecio };
      }
      return next;
    });
    closeBulkMargenModal();
    setBulkMargenValor('');
    toast.success(`Margen aplicado a ${targetProducts.length} producto(s). Recuerda guardar los cambios.`);
  };

  const applyBulkStockMin = async () => {
    const valor = parseInt(bulkStockMinValor, 10);
    if (isNaN(valor) || valor < 0) { toast.error('Ingresa un valor válido'); return; }

    let targetProducts;
    try {
      targetProducts = selectAllGlobal
        ? await fetchAllBranchProducts()
        : [...selectedRows].map(id => branchProductsCache[id]).filter(Boolean);
    } catch { toast.error('Error al cargar productos'); return; }

    setPendingChanges(prev => {
      const next = { ...prev };
      for (const product of targetProducts) {
        const productId = product.product_id;
        const current = prev[productId]?.stock_minimo !== undefined
          ? prev[productId].stock_minimo
          : (product.stock_minimo_sucursal || 0);
        let newVal;
        if (bulkStockMinTipo === 'establecer') newVal = valor;
        else if (bulkStockMinTipo === 'incrementar') newVal = Math.max(0, current + valor);
        else newVal = Math.max(0, current - valor);
        next[productId] = { ...next[productId], stock_minimo: newVal };
      }
      return next;
    });
    closeBulkStockMinModal();
    setBulkStockMinValor('');
    toast.success(`Stock mínimo aplicado a ${targetProducts.length} producto(s). Recuerda guardar los cambios.`);
  };

  const applyBulkStock = async () => {
    const valor = parseInt(bulkStockValor, 10);
    if (isNaN(valor) || valor < 0) { toast.error('Ingresa un valor válido'); return; }

    let targetProducts;
    try {
      targetProducts = selectAllGlobal
        ? await fetchAllBranchProducts()
        : [...selectedRows].map(id => branchProductsCache[id]).filter(Boolean);
    } catch { toast.error('Error al cargar productos'); return; }

    setPendingChanges(prev => {
      const next = { ...prev };
      for (const product of targetProducts) {
        const productId = product.product_id;
        const current = prev[productId]?.stock !== undefined
          ? prev[productId].stock
          : (product.stock_sucursal ?? 0);
        let newVal;
        if (bulkStockTipo === 'establecer') newVal = valor;
        else if (bulkStockTipo === 'incrementar') newVal = Math.max(0, current + valor);
        else newVal = Math.max(0, current - valor);
        next[productId] = { ...next[productId], stock: newVal };
      }
      return next;
    });
    closeBulkStockModal();
    setBulkStockValor('');
    toast.success(`Stock aplicado a ${targetProducts.length} producto(s). Recuerda guardar los cambios.`);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      if (selectAllGlobal) {
        const res = await axios.post(`${API}/branch-products/bulk-deactivate`, {
          branch_id: selectedBranch.id, delete_all: true, search: debouncedSearch || null
        });
        toast.success(`${res.data.updated} producto(s) desactivado(s) en la sucursal`);
      } else {
        const productIds = [...selectedRows];
        const res = await axios.post(`${API}/branch-products/bulk-deactivate`, {
          ids: productIds, branch_id: selectedBranch.id
        });
        if (res.data.updated > 0) toast.success(`${res.data.updated} producto(s) desactivado(s) en la sucursal`);
      }
      closeBulkDeleteModalAnim();
      setSelectedRows(new Set());
      setSelectAllGlobal(false);
      await reloadBranchProducts();
    } catch {
      toast.error('Error al desactivar productos');
    } finally {
      setBulkDeleting(false);
    }
  };

  const saveProductChanges = async () => {
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) return;
    setSavingChanges(true);
    const results = await Promise.allSettled(
      entries.map(async ([productId, changes]) => {
        const product = branchProductsCache[productId];
        if (!product) return;
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
      })
    );
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.filter(r => r.status === 'rejected').length;
    if (successCount > 0) toast.success(`${successCount} producto(s) actualizado(s)`);
    if (errorCount > 0) toast.error(`${errorCount} producto(s) con error`);
    setPendingChanges({});
    await reloadBranchProducts();
    setSavingChanges(false);
  };

  const toggleBranchProductActive = async (product) => {
    if (!product.branch_product_id) return;
    try {
      await axios.put(`${API}/branch-products/${product.branch_product_id}`, {
        activo: !product.activo_sucursal
      });
      toast.success('Estado actualizado');
      reloadBranchProducts();
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

  // Sort current page client-side; filtering and pagination handled by the server
  const { sortedItems: sortedProducts, sortConfig, requestSort } = useSortableData(branchProducts);
  const filteredProducts = sortedProducts;
  const itemsPerPage = config?.items_per_page || 50;
  const paginatedProducts = sortedProducts;

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;
  const allFilteredSelected = selectAllGlobal || (sortedProducts.length > 0 && sortedProducts.every(p => selectedRows.has(p.product_id)));
  const someFilteredSelected = selectAllGlobal || sortedProducts.some(p => selectedRows.has(p.product_id));

  const handlePendingMargenChange = (productId, margen, costo, precioGlobal) => {
    const base = costo > 0 ? costo : precioGlobal;
    const newPrecio = base > 0
      ? parseFloat((base * (1 + margen / 100)).toFixed(2))
      : base;
    setPendingChanges(prev => ({
      ...prev,
      [productId]: { ...prev[productId], margen, precio: newPrecio }
    }));
  };

  const handlePendingPrecioChange = (productId, precio, costo, precioGlobal) => {
    const base = costo > 0 ? costo : precioGlobal;
    const impliedMargen = base > 0
      ? parseFloat(((precio - base) / base * 100).toFixed(2))
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
      selectAllGlobal={selectAllGlobal}
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
      total={total}
      itemsPerPage={itemsPerPage}
      totalPages={totalPages}
      paginatedProducts={paginatedProducts}
      sortConfig={sortConfig}
      requestSort={requestSort}
      hasPendingChanges={hasPendingChanges}
      allFilteredSelected={allFilteredSelected}
      someFilteredSelected={someFilteredSelected}
      savingBranch={savingBranch}
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
      onSelectAllGlobal={handleSelectAllGlobal}
      onClearSelection={handleClearSelection}
      onSetCurrentPage={setCurrentPage}
      onSearch={handleSearch}
      onCommitSearch={commitSearch}
      onClearSearch={clearSearch}
      onApplyBulkMargen={applyBulkMargen}
      onApplyBulkStockMin={applyBulkStockMin}
      onApplyBulkStock={applyBulkStock}
      onHandleBulkDelete={handleBulkDelete}
      onCloseBulkDeleteModalAnim={closeBulkDeleteModalAnim}
      onCloseBulkMargenModal={closeBulkMargenModal}
      onCloseBulkStockMinModal={closeBulkStockMinModal}
      onCloseBulkStockModal={closeBulkStockModal}
      getCategoryName={getCategoryName}
      categories={categories}
      getUsersInBranch={getUsersInBranch}
      getProductCurrentMargen={getProductCurrentMargen}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      selectedKind={selectedKind}
      setSelectedKind={setSelectedKind}
      selectedActivo={selectedActivo}
      setSelectedActivo={setSelectedActivo}
      showDeleteBranchModal={showDeleteBranchModal}
      deleteBranchModalClosing={deleteBranchModalClosing}
      branchToDelete={branchToDelete}
      deletingBranch={deletingBranch}
      onOpenDeleteBranchModal={openDeleteBranchModal}
      onDeleteBranch={deleteBranch}
      onCloseDeleteBranchModal={closeDeleteBranchModal}
    />
  );
};

export default BranchManagement;
