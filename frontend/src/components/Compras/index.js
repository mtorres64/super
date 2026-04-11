import React, { useState, useEffect, useRef, useCallback } from 'react';
import useModalClose from '../../useModalClose';
import axios from 'axios';
import { API } from '../../App';
import { parseApiDate } from '../../lib/utils';
import { toast } from 'sonner';
import ComprasView from './ComprasView';

const emptyItem = {
  descripcion: '',
  cantidad: '',
  precio_unitario: '',
  subtotal: 0,
  product_id: null,
  precio_actual: null,
  margen_actual: null,
  costo_actual: null
};

const emptyCompraForm = {
  sucursal_id: '',
  proveedor_id: '',
  numero_factura: '',
  fecha: new Date().toISOString().slice(0, 10),
  items: [{ ...emptyItem }],
  subtotal: 0,
  impuestos: '',
  total: 0,
  notas: ''
};

const emptyProveedorForm = {
  nombre: '',
  ruc_cuit: '',
  email: '',
  telefono: '',
  direccion: ''
};

const Compras = () => {
  const [activeTab, setActiveTab] = useState('facturas');

  // Compras state
  const [compras, setCompras] = useState([]);
  const [loadingCompras, setLoadingCompras] = useState(true);
  const [showCompraModal, setShowCompraModal] = useState(false);
  const [editingCompra, setEditingCompra] = useState(null);
  const [compraForm, setCompraForm] = useState(emptyCompraForm);
  const [searchCompra, setSearchCompra] = useState('');

  // Branches & products for autocomplete
  const [branches, setBranches] = useState([]);
  const [branchProducts, setBranchProducts] = useState([]);
  const [openAutocompleteIndex, setOpenAutocompleteIndex] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 240 });
  const descInputRefs = useRef({});

  // Price update modal
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [priceUpdates, setPriceUpdates] = useState({});

  // Proveedores state
  const [proveedores, setProveedores] = useState([]);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [proveedorForm, setProveedorForm] = useState(emptyProveedorForm);
  const [searchProveedor, setSearchProveedor] = useState('');

  useEffect(() => {
    fetchCompras();
    fetchProveedores();
    fetchBranches();
  }, []);

  // ── Branches ─────────────────────────────────────────────────────────────────

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${API}/branches`);
      setBranches(res.data);
    } catch {
      // branches might not be accessible to all roles
    }
  };

  const fetchBranchProducts = async (branchId) => {
    if (!branchId) { setBranchProducts([]); return; }
    try {
      const res = await axios.get(`${API}/branches/${branchId}/products`);
      const activos = res.data.filter(p => p.activo_sucursal !== false);
      setBranchProducts(activos);
      if (activos.length === 0) {
        toast.info('Esta sucursal no tiene productos activos cargados');
      }
    } catch (err) {
      setBranchProducts([]);
      toast.error(err.response?.data?.detail || 'No se pudieron cargar los productos de la sucursal');
    }
  };

  const handleSucursalChange = (branchId) => {
    setCompraForm(prev => ({
      ...prev,
      sucursal_id: branchId,
      items: prev.items.map(it => ({
        ...it,
        product_id: null,
        precio_actual: null,
        margen_actual: null,
        costo_actual: null
      }))
    }));
    fetchBranchProducts(branchId);
  };

  // ── Compras helpers ───────────────────────────────────────────────────────────

  const fetchCompras = async () => {
    try {
      const res = await axios.get(`${API}/compras`);
      setCompras(res.data);
    } catch {
      toast.error('Error al cargar las compras');
    } finally {
      setLoadingCompras(false);
    }
  };

  const fetchProveedores = async () => {
    try {
      const res = await axios.get(`${API}/proveedores`);
      setProveedores(res.data);
    } catch {
      toast.error('Error al cargar los proveedores');
    } finally {
      setLoadingProveedores(false);
    }
  };

  const recalcTotals = (items, impuestos) => {
    const subtotal = items.reduce((sum, it) => sum + (parseFloat(it.subtotal) || 0), 0);
    const imp = parseFloat(impuestos) || 0;
    return { subtotal, total: subtotal + imp };
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...compraForm.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    if (field === 'cantidad' || field === 'precio_unitario') {
      const qty = parseFloat(field === 'cantidad' ? value : updatedItems[index].cantidad) || 0;
      const price = parseFloat(field === 'precio_unitario' ? value : updatedItems[index].precio_unitario) || 0;
      updatedItems[index].subtotal = parseFloat((qty * price).toFixed(2));
    }
    // Clear product link if description is changed manually
    if (field === 'descripcion') {
      updatedItems[index].product_id = null;
      updatedItems[index].precio_actual = null;
      updatedItems[index].margen_actual = null;
      updatedItems[index].costo_actual = null;
    }
    const { subtotal, total } = recalcTotals(updatedItems, compraForm.impuestos);
    setCompraForm(prev => ({ ...prev, items: updatedItems, subtotal, total }));
  };

  const handleSelectProduct = (index, product) => {
    const updatedItems = [...compraForm.items];
    const precio = product.precio_sucursal ?? product.precio_global ?? 0;
    updatedItems[index] = {
      ...updatedItems[index],
      descripcion: product.nombre,
      product_id: product.product_id,
      precio_actual: precio,
      margen_actual: product.margen_sucursal ?? null,
      costo_actual: product.costo_sucursal ?? null
    };
    const qty = parseFloat(updatedItems[index].cantidad) || 0;
    const price = parseFloat(updatedItems[index].precio_unitario) || 0;
    updatedItems[index].subtotal = parseFloat((qty * price).toFixed(2));
    const { subtotal, total } = recalcTotals(updatedItems, compraForm.impuestos);
    setCompraForm(prev => ({ ...prev, items: updatedItems, subtotal, total }));
    setOpenAutocompleteIndex(null);
  };

  const addItem = () => {
    setCompraForm(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }]
    }));
  };

  const removeItem = (index) => {
    const updatedItems = compraForm.items.filter((_, i) => i !== index);
    const { subtotal, total } = recalcTotals(updatedItems, compraForm.impuestos);
    setCompraForm(prev => ({ ...prev, items: updatedItems, subtotal, total }));
  };

  const handleImpuestosChange = (value) => {
    const { subtotal, total } = recalcTotals(compraForm.items, value);
    setCompraForm(prev => ({ ...prev, impuestos: value, subtotal, total }));
  };

  const openCompraModal = (compra = null) => {
    if (compra) {
      setCompraForm({
        sucursal_id: compra.sucursal_id || '',
        proveedor_id: compra.proveedor_id || '',
        numero_factura: compra.numero_factura,
        fecha: compra.fecha ? compra.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
        items: compra.items.length > 0
          ? compra.items.map(it => ({ ...emptyItem, ...it }))
          : [{ ...emptyItem }],
        subtotal: compra.subtotal,
        impuestos: compra.impuestos?.toString() || '',
        total: compra.total,
        notas: compra.notas || ''
      });
      if (compra.sucursal_id) {
        fetchBranchProducts(compra.sucursal_id);
      }
      setEditingCompra(compra);
    } else {
      setCompraForm(emptyCompraForm);
      setBranchProducts([]);
      setEditingCompra(null);
    }
    setShowCompraModal(true);
  };

  const closeCompraModal = () => {
    setShowCompraModal(false);
    setEditingCompra(null);
    setCompraForm(emptyCompraForm);
    setBranchProducts([]);
    setOpenAutocompleteIndex(null);
    setShowPriceModal(false);
    setPendingPayload(null);
    setPriceUpdates({});
  };

  const buildPayload = (priceUpdatesMap = {}) => {
    const itemsValidos = compraForm.items.filter(it => it.descripcion.trim());
    return {
      sucursal_id: compraForm.sucursal_id || null,
      proveedor_id: compraForm.proveedor_id || null,
      numero_factura: compraForm.numero_factura.trim(),
      fecha: new Date(compraForm.fecha).toISOString(),
      items: itemsValidos.map((it, origIndex) => ({
        descripcion: it.descripcion,
        cantidad: parseFloat(it.cantidad) || 0,
        precio_unitario: parseFloat(it.precio_unitario) || 0,
        subtotal: parseFloat(it.subtotal) || 0,
        product_id: it.product_id || null,
        actualizar_precio: priceUpdatesMap[origIndex] ?? false
      })),
      subtotal: compraForm.subtotal,
      impuestos: parseFloat(compraForm.impuestos) || 0,
      total: compraForm.total,
      notas: compraForm.notas || null
    };
  };

  const submitCompra = async (payload) => {
    try {
      if (editingCompra) {
        await axios.put(`${API}/compras/${editingCompra.id}`, payload);
        toast.success('Factura actualizada');
      } else {
        await axios.post(`${API}/compras`, payload);
        toast.success('Factura registrada');
      }
      fetchCompras();
      closeCompraModalAnim();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar la factura');
    }
  };

  const handleCompraSubmit = async (e) => {
    e.preventDefault();
    if (!compraForm.numero_factura.trim()) {
      toast.error('El número de factura es obligatorio');
      return;
    }
    const itemsValidos = compraForm.items.filter(it => it.descripcion.trim());
    const itemsConProducto = itemsValidos
      .map((it, i) => ({ ...it, origIndex: i }))
      .filter(it => it.product_id && compraForm.sucursal_id);

    if (itemsConProducto.length > 0) {
      const initialUpdates = {};
      itemsConProducto.forEach(it => { initialUpdates[it.origIndex] = false; });
      setPriceUpdates(initialUpdates);
      setPendingPayload(itemsConProducto);
      setShowPriceModal(true);
    } else {
      await submitCompra(buildPayload());
    }
  };

  const handleConfirmPriceModal = async (applyUpdates) => {
    setShowPriceModal(false);
    await submitCompra(buildPayload(applyUpdates ? priceUpdates : {}));
  };

  const handleDeleteCompra = async (compra) => {
    if (!window.confirm(`¿Eliminar la factura ${compra.numero_factura}?`)) return;
    try {
      await axios.delete(`${API}/compras/${compra.id}`);
      toast.success('Factura eliminada');
      fetchCompras();
    } catch {
      toast.error('Error al eliminar la factura');
    }
  };

  // ── Autocomplete ──────────────────────────────────────────────────────────────

  const getAutocompleteOptions = useCallback((query) => {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase();
    return branchProducts
      .filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_barras && p.codigo_barras.includes(q))
      )
      .slice(0, 10);
  }, [branchProducts]);

  const handleDescriptionFocus = (idx, e) => {
    const rect = e.target.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 2,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 280)
    });
    setOpenAutocompleteIndex(idx);
  };

  // ── Proveedores helpers ───────────────────────────────────────────────────────

  const openProveedorModal = (prov = null) => {
    if (prov) {
      setProveedorForm({
        nombre: prov.nombre,
        ruc_cuit: prov.ruc_cuit || '',
        email: prov.email || '',
        telefono: prov.telefono || '',
        direccion: prov.direccion || ''
      });
      setEditingProveedor(prov);
    } else {
      setProveedorForm(emptyProveedorForm);
      setEditingProveedor(null);
    }
    setShowProveedorModal(true);
  };

  const closeProveedorModal = () => {
    setShowProveedorModal(false);
    setEditingProveedor(null);
    setProveedorForm(emptyProveedorForm);
  };

  const [compraModalClosing, closeCompraModalAnim] = useModalClose(closeCompraModal);
  const [proveedorModalClosing, closeProveedorModalAnim] = useModalClose(closeProveedorModal);

  const handleProveedorSubmit = async (e) => {
    e.preventDefault();
    if (!proveedorForm.nombre.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }
    const payload = {
      nombre: proveedorForm.nombre.trim(),
      ruc_cuit: proveedorForm.ruc_cuit || null,
      email: proveedorForm.email || null,
      telefono: proveedorForm.telefono || null,
      direccion: proveedorForm.direccion || null
    };
    try {
      if (editingProveedor) {
        await axios.put(`${API}/proveedores/${editingProveedor.id}`, payload);
        toast.success('Proveedor actualizado');
      } else {
        await axios.post(`${API}/proveedores`, payload);
        toast.success('Proveedor creado');
      }
      fetchProveedores();
      closeProveedorModalAnim();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar el proveedor');
    }
  };

  const handleToggleProveedor = async (prov) => {
    try {
      await axios.put(`${API}/proveedores/${prov.id}`, { activo: !prov.activo });
      toast.success(prov.activo ? 'Proveedor desactivado' : 'Proveedor activado');
      fetchProveedores();
    } catch {
      toast.error('Error al actualizar el proveedor');
    }
  };

  // ── Filters ───────────────────────────────────────────────────────────────────

  const filteredCompras = compras.filter(c =>
    c.numero_factura.toLowerCase().includes(searchCompra.toLowerCase()) ||
    (c.proveedor_nombre && c.proveedor_nombre.toLowerCase().includes(searchCompra.toLowerCase()))
  );

  const filteredProveedores = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(searchProveedor.toLowerCase()) ||
    (p.ruc_cuit && p.ruc_cuit.includes(searchProveedor))
  );

  const formatDate = (iso) => {
    if (!iso) return '—';
    return parseApiDate(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatMoney = (val) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ── Price modal computed data ─────────────────────────────────────────────────

  const priceModalItemsList = (pendingPayload || []).map(it => {
    const costoNuevo = parseFloat(it.precio_unitario) || 0;
    const margen = it.margen_actual;
    const precioSugerido = costoNuevo > 0 && margen != null
      ? parseFloat((costoNuevo * (1 + margen / 100)).toFixed(2))
      : null;
    return { ...it, costoNuevo, precioSugerido };
  });

  return (
    <ComprasView
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      compras={compras}
      loadingCompras={loadingCompras}
      showCompraModal={showCompraModal}
      editingCompra={editingCompra}
      compraForm={compraForm}
      setCompraForm={setCompraForm}
      searchCompra={searchCompra}
      setSearchCompra={setSearchCompra}
      branches={branches}
      branchProducts={branchProducts}
      openAutocompleteIndex={openAutocompleteIndex}
      setOpenAutocompleteIndex={setOpenAutocompleteIndex}
      dropdownPos={dropdownPos}
      descInputRefs={descInputRefs}
      showPriceModal={showPriceModal}
      setShowPriceModal={setShowPriceModal}
      priceUpdates={priceUpdates}
      setPriceUpdates={setPriceUpdates}
      priceModalItemsList={priceModalItemsList}
      proveedores={proveedores}
      loadingProveedores={loadingProveedores}
      showProveedorModal={showProveedorModal}
      editingProveedor={editingProveedor}
      proveedorForm={proveedorForm}
      setProveedorForm={setProveedorForm}
      searchProveedor={searchProveedor}
      setSearchProveedor={setSearchProveedor}
      filteredCompras={filteredCompras}
      filteredProveedores={filteredProveedores}
      compraModalClosing={compraModalClosing}
      proveedorModalClosing={proveedorModalClosing}
      openCompraModal={openCompraModal}
      closeCompraModalAnim={closeCompraModalAnim}
      openProveedorModal={openProveedorModal}
      closeProveedorModalAnim={closeProveedorModalAnim}
      handleCompraSubmit={handleCompraSubmit}
      handleConfirmPriceModal={handleConfirmPriceModal}
      handleDeleteCompra={handleDeleteCompra}
      handleItemChange={handleItemChange}
      handleSelectProduct={handleSelectProduct}
      handleDescriptionFocus={handleDescriptionFocus}
      handleImpuestosChange={handleImpuestosChange}
      handleProveedorSubmit={handleProveedorSubmit}
      handleToggleProveedor={handleToggleProveedor}
      addItem={addItem}
      removeItem={removeItem}
      getAutocompleteOptions={getAutocompleteOptions}
      handleSucursalChange={handleSucursalChange}
      formatDate={formatDate}
      formatMoney={formatMoney}
    />
  );
};

export default Compras;
