import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../../App';
import { useSortableData } from '../../hooks/useSortableData';
import { toast } from 'sonner';
import useModalClose from '../../useModalClose';
import CustomerManagementView from './CustomerManagementView';

const CustomerManagement = () => {
  const { user } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [config, setConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedActivo, setSelectedActivo] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectAllGlobal, setSelectAllGlobal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditItems, setBulkEditItems] = useState([]);
  const [bulkEditSaving, setBulkEditSaving] = useState(false);

  const [purchaseHistoryCustomer, setPurchaseHistoryCustomer] = useState(null);

  const fetchConfiguration = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      setConfig(response.data);
    } catch {
      // no-op
    } finally {
      setConfigLoaded(true);
    }
  };

  const loadCustomers = useCallback(async (page, search, perPage, activo) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/customers`, {
        params: {
          page,
          per_page: perPage,
          ...(search && { search }),
          ...(activo !== '' && activo !== undefined && { activo: activo === 'true' }),
        },
      });
      setCustomers(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfiguration();
  }, []);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedActivo]);

  useEffect(() => {
    if (!configLoaded) return;
    const perPage = config?.items_per_page || 50;
    loadCustomers(currentPage, debouncedSearch, perPage, selectedActivo);
  }, [configLoaded, currentPage, debouncedSearch, selectedActivo, loadCustomers]);

  useEffect(() => {
    setSelectAllGlobal(false);
  }, [debouncedSearch, selectedActivo]);

  const openModal = (customer = null) => {
    setEditingCustomer(customer || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleCustomerSaved = async () => {
    await loadCustomers(currentPage, debouncedSearch, config?.items_per_page || 50, selectedActivo);
    closeCustomerModal();
  };

  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/customers/${customerToDelete.id}`);
      toast.success('Cliente eliminado');
      closeDeleteModal();
      await loadCustomers(currentPage, debouncedSearch, config?.items_per_page || 50, selectedActivo);
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al eliminar el cliente';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const [customerModalClosing, closeCustomerModal] = useModalClose(closeModal);
  const [bulkDeleteModalClosing, closeBulkDeleteModal] = useModalClose(() => setShowBulkDeleteModal(false));
  const [bulkEditModalClosing, closeBulkEditModal] = useModalClose(() => { setShowBulkEditModal(false); setBulkEditItems([]); });
  const [purchaseHistoryClosing, closePurchaseHistory] = useModalClose(() => setPurchaseHistoryCustomer(null));
  const [deleteModalClosing, closeDeleteModal] = useModalClose(() => setCustomerToDelete(null));

  const { sortedItems: sortedCustomers, sortConfig, requestSort } = useSortableData(customers);
  const itemsPerPage = config?.items_per_page || 50;
  const paginatedCustomers = sortedCustomers;

  const handlePageChange = (page) => setCurrentPage(page);

  const toggleSelectRow = (customerId) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectAllGlobal(false);
    if (paginatedCustomers.every(c => selectedRows.has(c.id))) {
      setSelectedRows(prev => {
        const next = new Set(prev);
        paginatedCustomers.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedRows(prev => {
        const next = new Set(prev);
        paginatedCustomers.forEach(c => next.add(c.id));
        return next;
      });
    }
  };

  const handleSelectAllGlobal = () => setSelectAllGlobal(true);
  const handleClearSelection = () => { setSelectAllGlobal(false); setSelectedRows(new Set()); };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const payload = selectAllGlobal
        ? { delete_all: true, search: debouncedSearch || null }
        : { ids: [...selectedRows] };
      const res = await axios.delete(`${API}/customers/bulk`, { data: payload });
      toast.success(`${res.data.deleted} cliente(s) eliminado(s)`);
      closeBulkDeleteModal();
      setSelectedRows(new Set());
      setSelectAllGlobal(false);
      setCurrentPage(1);
      await loadCustomers(1, debouncedSearch, config?.items_per_page || 50, selectedActivo);
    } catch {
      toast.error('Error al eliminar clientes');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkSetStatus = async (activo) => {
    try {
      const payload = selectAllGlobal
        ? { delete_all: true, search: debouncedSearch || null, activo }
        : { ids: [...selectedRows], activo };
      const res = await axios.put(`${API}/customers/bulk-status`, payload);
      toast.success(`Estado actualizado en ${res.data.updated} cliente(s)`);
      handleClearSelection();
      loadCustomers(currentPage, debouncedSearch, config?.items_per_page || 50, selectedActivo);
    } catch {
      toast.error('Error al actualizar el estado');
    }
  };

  const openBulkEditModal = () => {
    const selected = paginatedCustomers.filter(c => selectedRows.has(c.id));
    setBulkEditItems(selected.map(c => ({
      id: c.id,
      _nombre_original: c.nombre,
      nombre: c.nombre,
      tipo_documento: c.tipo_documento || 'dni',
      documento: c.documento || '',
      telefono: c.telefono || '',
      email: c.email || '',
      direccion: c.direccion || '',
      observaciones: c.observaciones || '',
      activo: c.activo,
    })));
    setShowBulkEditModal(true);
  };

  const updateBulkEditItem = (id, field, value) => {
    setBulkEditItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleBulkEditSave = async () => {
    setBulkEditSaving(true);
    const results = await Promise.allSettled(
      bulkEditItems.map(item =>
        axios.put(`${API}/customers/${item.id}`, {
          nombre: item.nombre,
          tipo_documento: item.tipo_documento,
          documento: item.documento || null,
          telefono: item.telefono || null,
          email: item.email || null,
          direccion: item.direccion || null,
          observaciones: item.observaciones || null,
          activo: item.activo,
        })
      )
    );
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const fail = results.filter(r => r.status === 'rejected').length;
    if (ok > 0) toast.success(`${ok} cliente${ok !== 1 ? 's' : ''} actualizado${ok !== 1 ? 's' : ''}`);
    if (fail > 0) toast.error(`${fail} cliente${fail !== 1 ? 's' : ''} con error`);
    setBulkEditSaving(false);
    closeBulkEditModal();
    handleClearSelection();
    loadCustomers(currentPage, debouncedSearch, config?.items_per_page || 50, selectedActivo);
  };

  return (
    <CustomerManagementView
      user={user}
      customers={customers}
      total={total}
      loading={loading}
      showModal={showModal}
      editingCustomer={editingCustomer}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      commitSearch={commitSearch}
      clearSearch={clearSearch}
      selectedActivo={selectedActivo}
      setSelectedActivo={setSelectedActivo}
      currentPage={currentPage}
      selectedRows={selectedRows}
      selectAllGlobal={selectAllGlobal}
      handleSelectAllGlobal={handleSelectAllGlobal}
      handleClearSelection={handleClearSelection}
      showBulkDeleteModal={showBulkDeleteModal}
      setShowBulkDeleteModal={setShowBulkDeleteModal}
      bulkDeleting={bulkDeleting}
      paginatedCustomers={paginatedCustomers}
      sortedCustomers={sortedCustomers}
      itemsPerPage={itemsPerPage}
      totalPages={totalPages}
      sortConfig={sortConfig}
      requestSort={requestSort}
      customerModalClosing={customerModalClosing}
      bulkDeleteModalClosing={bulkDeleteModalClosing}
      openModal={openModal}
      closeCustomerModal={closeCustomerModal}
      closeBulkDeleteModal={closeBulkDeleteModal}
      handleCustomerSaved={handleCustomerSaved}
      handleBulkDelete={handleBulkDelete}
      handleBulkSetStatus={handleBulkSetStatus}
      showBulkEditModal={showBulkEditModal}
      bulkEditItems={bulkEditItems}
      bulkEditSaving={bulkEditSaving}
      bulkEditModalClosing={bulkEditModalClosing}
      openBulkEditModal={openBulkEditModal}
      closeBulkEditModal={closeBulkEditModal}
      updateBulkEditItem={updateBulkEditItem}
      handleBulkEditSave={handleBulkEditSave}
      handlePageChange={handlePageChange}
      toggleSelectRow={toggleSelectRow}
      toggleSelectAll={toggleSelectAll}
      purchaseHistoryCustomer={purchaseHistoryCustomer}
      purchaseHistoryClosing={purchaseHistoryClosing}
      openPurchaseHistory={(customer) => setPurchaseHistoryCustomer(customer)}
      closePurchaseHistory={closePurchaseHistory}
      customerToDelete={customerToDelete}
      deleteModalClosing={deleteModalClosing}
      deleting={deleting}
      openDeleteModal={(customer) => setCustomerToDelete(customer)}
      closeDeleteModal={closeDeleteModal}
      handleDeleteCustomer={handleDeleteCustomer}
    />
  );
};

export default CustomerManagement;
