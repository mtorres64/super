import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';

const emptyCompraForm = {
  proveedor_id: '',
  numero_factura: '',
  fecha: new Date().toISOString().slice(0, 10),
  items: [{ descripcion: '', cantidad: '', precio_unitario: '', subtotal: 0 }],
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
  }, []);

  // ── Compras helpers ──────────────────────────────────────────────────────────

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

  // Recalculate totals whenever items or impuestos change
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
    const { subtotal, total } = recalcTotals(updatedItems, compraForm.impuestos);
    setCompraForm(prev => ({ ...prev, items: updatedItems, subtotal, total }));
  };

  const addItem = () => {
    setCompraForm(prev => ({
      ...prev,
      items: [...prev.items, { descripcion: '', cantidad: '', precio_unitario: '', subtotal: 0 }]
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
        proveedor_id: compra.proveedor_id || '',
        numero_factura: compra.numero_factura,
        fecha: compra.fecha ? compra.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
        items: compra.items.length > 0
          ? compra.items
          : [{ descripcion: '', cantidad: '', precio_unitario: '', subtotal: 0 }],
        subtotal: compra.subtotal,
        impuestos: compra.impuestos?.toString() || '',
        total: compra.total,
        notas: compra.notas || ''
      });
      setEditingCompra(compra);
    } else {
      setCompraForm(emptyCompraForm);
      setEditingCompra(null);
    }
    setShowCompraModal(true);
  };

  const closeCompraModal = () => {
    setShowCompraModal(false);
    setEditingCompra(null);
    setCompraForm(emptyCompraForm);
  };

  const handleCompraSubmit = async (e) => {
    e.preventDefault();
    if (!compraForm.numero_factura.trim()) {
      toast.error('El número de factura es obligatorio');
      return;
    }
    const itemsValidos = compraForm.items.filter(it => it.descripcion.trim());
    const payload = {
      proveedor_id: compraForm.proveedor_id || null,
      numero_factura: compraForm.numero_factura.trim(),
      fecha: new Date(compraForm.fecha).toISOString(),
      items: itemsValidos.map(it => ({
        descripcion: it.descripcion,
        cantidad: parseFloat(it.cantidad) || 0,
        precio_unitario: parseFloat(it.precio_unitario) || 0,
        subtotal: parseFloat(it.subtotal) || 0
      })),
      subtotal: compraForm.subtotal,
      impuestos: parseFloat(compraForm.impuestos) || 0,
      total: compraForm.total,
      notas: compraForm.notas || null
    };
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

  // ── Proveedores helpers ──────────────────────────────────────────────────────

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

  // ── Filters ─────────────────────────────────────────────────────────────────

  const filteredCompras = compras.filter(c =>
    c.numero_factura.toLowerCase().includes(searchCompra.toLowerCase()) ||
    (c.proveedor_nombre && c.proveedor_nombre.toLowerCase().includes(searchCompra.toLowerCase()))
  );

  const filteredProveedores = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(searchProveedor.toLowerCase()) ||
    (p.ruc_cuit && p.ruc_cuit.includes(searchProveedor))
  );

  const getProveedorNombre = (id) => {
    const p = proveedores.find(p => p.id === id);
    return p ? p.nombre : '—';
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatMoney = (val) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

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
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('facturas')}
          className={`px-5 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'facturas'
              ? 'bg-white border border-b-white border-gray-200 text-green-700 -mb-px'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-1" />
          Facturas
        </button>
        <button
          onClick={() => setActiveTab('proveedores')}
          className={`px-5 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'proveedores'
              ? 'bg-white border border-b-white border-gray-200 text-green-700 -mb-px'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-1" />
          Proveedores
        </button>
      </div>

      {/* ── TAB: FACTURAS ── */}
      {activeTab === 'facturas' && (
        <>
          <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
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
          <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
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

      {/* ── MODAL FACTURA ── */}
      {showCompraModal && (
        <div className="modal-overlay" onClick={closeCompraModal}>
          <div
            className="modal-content"
            style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCompra ? 'Editar Factura' : 'Nueva Factura de Compra'}
              </h2>
              <button onClick={closeCompraModal} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompraSubmit} className="modal-body">
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
                <div className="md:col-span-2">
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
                        <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">Precio Unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">Subtotal</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {compraForm.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              className="form-input py-1 text-sm"
                              value={item.descripcion}
                              onChange={e => handleItemChange(idx, 'descripcion', e.target.value)}
                              placeholder="Descripción del artículo"
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
                      ))}
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
          </div>
        </div>
      )}

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
