import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import {
  ShoppingBag,
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  Building2,
  FileText,
  AlertCircle,
  MapPin,
  TrendingUp,
  Package
} from 'lucide-react';

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
      closeCompraModal();
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
      closeProveedorModal();
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
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Compras</h1>
          <p className="text-gray-600">Gestión de facturas de compra y proveedores</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-0 mb-6 rounded-t-lg">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('facturas')}
            className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'facturas'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Facturas
          </button>
          <button
            onClick={() => setActiveTab('proveedores')}
            className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'proveedores'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Proveedores
          </button>
        </div>
      </div>

      {/* ── TAB: FACTURAS ── */}
      {activeTab === 'facturas' && (
        <>
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por N° factura o proveedor..."
                  className="form-input pl-10"
                  value={searchCompra}
                  onChange={e => setSearchCompra(e.target.value)}
                />
              </div>
              <button onClick={() => openCompraModal()} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Nueva Factura
              </button>
            </div>
          </div>

          {loadingCompras ? (
            <div className="flex items-center justify-center h-40">
              <div className="spinner w-8 h-8" />
            </div>
          ) : filteredCompras.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay facturas registradas</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>N° Factura</th>
                    <th>Proveedor</th>
                    <th>Sucursal</th>
                    <th className="text-right">Subtotal</th>
                    <th className="text-right">Impuestos</th>
                    <th className="text-right">Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompras.map(compra => (
                    <tr key={compra.id}>
                      <td className="text-sm text-gray-600">{formatDate(compra.fecha)}</td>
                      <td className="font-medium">{compra.numero_factura}</td>
                      <td className="text-gray-700">{compra.proveedor_nombre || '—'}</td>
                      <td className="text-gray-700 text-sm">
                        {compra.sucursal_id
                          ? (branches.find(b => b.id === compra.sucursal_id)?.nombre || '—')
                          : '—'}
                      </td>
                      <td className="text-right text-gray-700">{formatMoney(compra.subtotal)}</td>
                      <td className="text-right text-gray-700">{formatMoney(compra.impuestos)}</td>
                      <td className="text-right font-semibold text-gray-900">{formatMoney(compra.total)}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openCompraModal(compra)}
                            className="btn btn-secondary btn-sm"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompra(compra)}
                            className="btn btn-danger btn-sm"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TAB: PROVEEDORES ── */}
      {activeTab === 'proveedores' && (
        <>
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar proveedor o RUC/CUIT..."
                  className="form-input pl-10"
                  value={searchProveedor}
                  onChange={e => setSearchProveedor(e.target.value)}
                />
              </div>
              <button onClick={() => openProveedorModal()} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Nuevo Proveedor
              </button>
            </div>
          </div>

          {loadingProveedores ? (
            <div className="flex items-center justify-center h-40">
              <div className="spinner w-8 h-8" />
            </div>
          ) : filteredProveedores.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay proveedores registrados</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>RUC / CUIT</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProveedores.map(prov => (
                    <tr key={prov.id}>
                      <td className="font-medium text-gray-900">{prov.nombre}</td>
                      <td className="text-gray-600">{prov.ruc_cuit || '—'}</td>
                      <td className="text-gray-600">{prov.email || '—'}</td>
                      <td className="text-gray-600">{prov.telefono || '—'}</td>
                      <td>
                        <span className={`badge ${prov.activo ? 'badge-success' : 'badge-danger'}`}>
                          {prov.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openProveedorModal(prov)}
                            className="btn btn-secondary btn-sm"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleProveedor(prov)}
                            className={`btn btn-sm ${prov.activo ? 'btn-danger' : 'btn-secondary'}`}
                            title={prov.activo ? 'Desactivar' : 'Activar'}
                          >
                            {prov.activo ? <X className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MODAL FACTURA (incluye confirmación de precios en el mismo overlay) ── */}
      {showCompraModal && (
        <div className="modal-overlay" onClick={showPriceModal ? undefined : closeCompraModal}>
          <div
            className="modal-content"
            style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2">
                {showPriceModal ? (
                  <><TrendingUp className="w-5 h-5 text-green-600" /> Actualizar precios de venta</>
                ) : (
                  editingCompra ? 'Editar Factura' : 'Nueva Factura de Compra'
                )}
              </h2>
              <button
                onClick={showPriceModal ? () => setShowPriceModal(false) : closeCompraModal}
                className="modal-close"
                title={showPriceModal ? 'Volver al formulario' : 'Cerrar'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompraSubmit} className={`modal-body${showPriceModal ? ' hidden' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label">N° de Factura *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={compraForm.numero_factura}
                    onChange={e => setCompraForm(prev => ({ ...prev, numero_factura: e.target.value }))}
                    placeholder="Ej: 0001-00001234"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Fecha *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={compraForm.fecha}
                    onChange={e => setCompraForm(prev => ({ ...prev, fecha: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">
                    <MapPin className="w-4 h-4 inline mr-1 text-gray-400" />
                    Sucursal
                  </label>
                  <select
                    className="form-input"
                    value={compraForm.sucursal_id}
                    onChange={e => handleSucursalChange(e.target.value)}
                  >
                    <option value="">— Sin sucursal —</option>
                    {branches.filter(b => b.activo).map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                  {compraForm.sucursal_id && branchProducts.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      {branchProducts.length} productos disponibles para autocompletar
                    </p>
                  )}
                </div>
                <div>
                  <label className="form-label">Proveedor</label>
                  <select
                    className="form-input"
                    value={compraForm.proveedor_id}
                    onChange={e => setCompraForm(prev => ({ ...prev, proveedor_id: e.target.value }))}
                  >
                    <option value="">— Sin proveedor —</option>
                    {proveedores.filter(p => p.activo).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items table */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="form-label mb-0">Ítems</label>
                  <button type="button" onClick={addItem} className="btn btn-secondary btn-sm">
                    <Plus className="w-3 h-3" /> Agregar ítem
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Descripción</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600 w-20">Cantidad</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">Costo Unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">Subtotal</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {compraForm.items.map((item, idx) => {
                        const costoNuevo = parseFloat(item.precio_unitario) || 0;
                        const precioSugerido = item.product_id && costoNuevo > 0 && item.margen_actual != null
                          ? parseFloat((costoNuevo * (1 + item.margen_actual / 100)).toFixed(2))
                          : null;

                        return (
                          <React.Fragment key={idx}>
                            <tr className="border-t border-gray-100">
                              {/* Description with autocomplete */}
                              <td className="px-2 py-1">
                                <input
                                  ref={el => { descInputRefs.current[idx] = el; }}
                                  type="text"
                                  className="form-input py-1 text-sm"
                                  value={item.descripcion}
                                  onChange={e => handleItemChange(idx, 'descripcion', e.target.value)}
                                  onFocus={e => handleDescriptionFocus(idx, e)}
                                  onBlur={() => setTimeout(() => setOpenAutocompleteIndex(null), 180)}
                                  placeholder={compraForm.sucursal_id ? 'Buscar producto...' : 'Descripción del artículo'}
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  className="form-input py-1 text-sm text-right"
                                  value={item.cantidad}
                                  onChange={e => handleItemChange(idx, 'cantidad', e.target.value)}
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  className="form-input py-1 text-sm text-right"
                                  value={item.precio_unitario}
                                  onChange={e => handleItemChange(idx, 'precio_unitario', e.target.value)}
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-3 py-1 text-right text-gray-700">
                                {formatMoney(item.subtotal)}
                              </td>
                              <td className="px-2 py-1 text-center">
                                {compraForm.items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeItem(idx)}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* Info row when a product is linked */}
                            {item.product_id && (
                              <tr className="bg-blue-50 border-t border-blue-100">
                                <td colSpan={5} className="px-4 py-1.5">
                                  <div className="flex flex-wrap gap-4 text-xs text-blue-800 items-center">
                                    <span className="flex items-center gap-1">
                                      <Package className="w-3 h-3" />
                                      Costo anterior: {item.costo_actual != null ? `$${formatMoney(item.costo_actual)}` : 'sin datos'}
                                    </span>
                                    <span>Precio venta: ${formatMoney(item.precio_actual)}</span>
                                    {item.margen_actual != null && (
                                      <span>Margen: {item.margen_actual}%</span>
                                    )}
                                    {precioSugerido != null && costoNuevo > 0 && (
                                      <span className="flex items-center gap-1 font-semibold text-green-700">
                                        <TrendingUp className="w-3 h-3" />
                                        Precio sugerido: ${formatMoney(precioSugerido)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="form-label">Subtotal</label>
                  <input
                    type="text"
                    className="form-input bg-gray-50"
                    value={formatMoney(compraForm.subtotal)}
                    readOnly
                  />
                </div>
                <div>
                  <label className="form-label">Impuestos / IVA</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-input"
                    value={compraForm.impuestos}
                    onChange={e => handleImpuestosChange(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="form-label">Total</label>
                  <input
                    type="text"
                    className="form-input bg-gray-50 font-semibold"
                    value={formatMoney(compraForm.total)}
                    readOnly
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Notas</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={compraForm.notas}
                  onChange={e => setCompraForm(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Observaciones opcionales..."
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeCompraModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save className="w-4 h-4" />
                  {editingCompra ? 'Guardar Cambios' : 'Registrar Factura'}
                </button>
              </div>
            </form>

            {/* ── CONFIRMACIÓN DE PRECIOS (dentro del mismo modal) ── */}
            {showPriceModal && (
              <div className="modal-body">
                <p className="text-sm text-gray-600 mb-4">
                  Se detectaron <strong>{priceModalItemsList.length}</strong> producto{priceModalItemsList.length !== 1 ? 's' : ''} vinculado{priceModalItemsList.length !== 1 ? 's' : ''} a esta factura.
                  Seleccioná cuáles querés actualizar con el nuevo costo de compra.
                </p>

                <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Producto</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Costo ant.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Nuevo costo</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Precio actual</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">P. sugerido</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-600">Actualizar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceModalItemsList.map(item => (
                        <tr key={item.origIndex} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-medium text-gray-800">{item.descripcion}</td>
                          <td className="px-3 py-2 text-right text-gray-500">
                            {item.costo_actual != null ? `$${formatMoney(item.costo_actual)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">
                            ${formatMoney(item.costoNuevo)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {item.precio_actual != null ? `$${formatMoney(item.precio_actual)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.precioSugerido != null ? (
                              <span className={`font-medium ${
                                item.precioSugerido > (item.precio_actual || 0)
                                  ? 'text-green-600'
                                  : item.precioSugerido < (item.precio_actual || 0)
                                    ? 'text-red-600'
                                    : 'text-gray-700'
                              }`}>
                                ${formatMoney(item.precioSugerido)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs italic">sin margen</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={priceUpdates[item.origIndex] ?? false}
                              onChange={e => setPriceUpdates(prev => ({
                                ...prev,
                                [item.origIndex]: e.target.checked
                              }))}
                              disabled={item.precioSugerido == null}
                              className="w-4 h-4 accent-green-600"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  El costo de compra se actualizará en todos los productos vinculados independientemente de esta selección.
                </p>

                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowPriceModal(false)}
                    className="btn btn-secondary"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPriceModal(false)}
                    className="btn btn-secondary"
                  >
                    Solo registrar compra
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPriceModal(true)}
                    className="btn btn-primary"
                  >
                    <Save className="w-4 h-4" />
                    Registrar y actualizar seleccionados
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUTOCOMPLETE PORTAL (fuera del overflow del modal) ── */}
      {openAutocompleteIndex !== null && (() => {
        const options = getAutocompleteOptions(
          compraForm.items[openAutocompleteIndex]?.descripcion || ''
        );
        if (options.length === 0) return null;
        return createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999
            }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto"
            onMouseDown={e => e.preventDefault()}
          >
            {options.map(prod => (
              <button
                key={prod.product_id}
                type="button"
                onMouseDown={() => handleSelectProduct(openAutocompleteIndex, prod)}
                className="w-full text-left px-3 py-2 hover:bg-green-50 border-b border-gray-100 last:border-0"
              >
                <div className="font-medium text-gray-800 text-sm">{prod.nombre}</div>
                <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                  {prod.codigo_barras && <span>Cod: {prod.codigo_barras}</span>}
                  <span>Precio: ${formatMoney(prod.precio_sucursal ?? prod.precio_global)}</span>
                  {prod.margen_sucursal != null && <span>Margen: {prod.margen_sucursal}%</span>}
                </div>
              </button>
            ))}
          </div>,
          document.body
        );
      })()}

      {/* ── MODAL PROVEEDOR ── */}
      {showProveedorModal && (
        <div className="modal-overlay" onClick={closeProveedorModal}>
          <div
            className="modal-content"
            style={{ maxWidth: '480px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button onClick={closeProveedorModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProveedorSubmit} className="modal-body">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={proveedorForm.nombre}
                    onChange={e => setProveedorForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nombre o razón social"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">RUC / CUIT</label>
                  <input
                    type="text"
                    className="form-input"
                    value={proveedorForm.ruc_cuit}
                    onChange={e => setProveedorForm(prev => ({ ...prev, ruc_cuit: e.target.value }))}
                    placeholder="Número de identificación fiscal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={proveedorForm.email}
                      onChange={e => setProveedorForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="correo@proveedor.com"
                    />
                  </div>
                  <div>
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proveedorForm.telefono}
                      onChange={e => setProveedorForm(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Dirección</label>
                  <input
                    type="text"
                    className="form-input"
                    value={proveedorForm.direccion}
                    onChange={e => setProveedorForm(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Calle, número, ciudad"
                  />
                </div>
              </div>

              <div className="modal-footer mt-4">
                <button type="button" onClick={closeProveedorModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save className="w-4 h-4" />
                  {editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compras;
