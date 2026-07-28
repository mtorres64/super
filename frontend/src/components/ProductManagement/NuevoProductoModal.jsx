import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Save, Layers, Search, Plus, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../App';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { useFormValidation } from '../../hooks/useFormValidation';
import FieldError from '../ui/FieldError';
import useModalClose from '../../useModalClose';

const normalize = (str) =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s]/g, '').toLowerCase();

const PRODUCT_RULES = {
  nombre: { required: true, message: 'El nombre es obligatorio' },
  codigo_barras: { required: true, message: 'El código de barras es obligatorio' },
};

const defaultForm = {
  nombre: '',
  codigo_barras: '',
  tipo: 'codigo_barras',
  kind: 'normal',
  precio: '',
  precio_costo: '',
  categoria_id: '',
  stock: '',
  stock_minimo: 10,
  control_stock: true,
  combo_items: [],
};

const defaultBranchPricing = () => ({ activo: false, costo: '', margen: '', precio: '' });

const applyRounding = (price, config) => {
  const redondeo = config?.redondeo_precio ?? 0;
  if (!redondeo) return parseFloat(price.toFixed(2));
  return Math.round(price / redondeo) * redondeo;
};

const NuevoProductoModal = ({ onClose, onProductCreated, initialNombre = '' }) => {
  const [formData, setFormData] = useState({ ...defaultForm, nombre: initialNombre });
  const [categories, setCategories] = useState([]);
  const [categoryInputText, setCategoryInputText] = useState('');
  const [showCategoryAc, setShowCategoryAc] = useState(false);
  const [comboProducts, setComboProducts] = useState([]);
  const [comboItemInput, setComboItemInput] = useState({ product_id: '', cantidad: 1 });
  const [comboSearch, setComboSearch] = useState('');
  const [showComboDropdown, setShowComboDropdown] = useState(false);
  const comboSearchRef = useRef(null);
  const productV = useFormValidation(PRODUCT_RULES);

  // Sucursales
  const [branches, setBranches] = useState([]);
  const [branchPricing, setBranchPricing] = useState({});
  const [config, setConfig] = useState(null);
  const [branchError, setBranchError] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchVisible, setBranchVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reemplaza a (autocomplete por sucursal)
  const [branchReplace, setBranchReplace] = useState({});     // { [branchId]: { product_id, nombre, branch_product_id } | null }
  const [replaceQuery, setReplaceQuery] = useState({});       // { [branchId]: string }
  const [replaceOptions, setReplaceOptions] = useState({});   // { [branchId]: item[] }
  const [replaceOpen, setReplaceOpen] = useState(null);       // branchId abierto
  const [replaceDropdownPos, setReplaceDropdownPos] = useState(null);
  const replaceInputRefs = useRef({});
  const replaceTimers = useRef({});

  const [closing, close] = useModalClose(onClose);

  const filteredCategoryOptions = categories.filter(c =>
    c.nombre.toLowerCase().includes(categoryInputText.toLowerCase())
  );

  useEffect(() => {
    axios.get(`${API}/categories`)
      .then(res => setCategories([...res.data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))))
      .catch(() => {});
    Promise.all([
      axios.get(`${API}/branches`),
      axios.get(`${API}/config`),
    ])
      .then(([branchRes, configRes]) => {
        const list = branchRes.data || [];
        setBranches(list);
        const init = {};
        list.forEach(b => { init[b.id] = defaultBranchPricing(); });
        setBranchPricing(init);
        setConfig(configRes.data);
      })
      .catch(() => {})
      .finally(() => { setLoadingBranches(false); setBranchVisible(true); });
  }, []);

  useEffect(() => {
    if (formData.kind === 'combo') {
      axios.get(`${API}/products`, { params: { page: 1, per_page: 10000 } })
        .then(res => setComboProducts(res.data.items || []))
        .catch(() => {});
    }
  }, [formData.kind]);

  // ── Cálculos por sucursal ────────────────────────────────────────────────────

  const getBp = (branchId) => branchPricing[branchId] || defaultBranchPricing();

  const setBp = (branchId, updater) => {
    setBranchPricing(prev => {
      const curr = prev[branchId] || defaultBranchPricing();
      const next = typeof updater === 'function' ? updater(curr) : { ...curr, ...updater };
      return { ...prev, [branchId]: next };
    });
  };

  const spreadToInactive = (next, sourceId, fields) => {
    Object.keys(next).forEach(id => {
      if (id !== sourceId && !next[id].activo) {
        next[id] = { ...next[id], ...fields };
      }
    });
  };

  const handleBranchCostoChange = (branchId, newCosto) => {
    setBranchPricing(prev => {
      const curr = prev[branchId] || defaultBranchPricing();
      const c = parseFloat(newCosto) || 0;
      const m = parseFloat(curr.margen) || 0;
      const newPrecio = c > 0 ? String(applyRounding(c * (1 + m / 100), config)) : curr.precio;
      const updated = { ...curr, costo: newCosto, precio: newPrecio };
      const next = { ...prev, [branchId]: updated };
      spreadToInactive(next, branchId, { costo: newCosto, precio: newPrecio, margen: updated.margen });
      return next;
    });
  };

  const handleBranchPrecioChange = (branchId, newPrecio) => {
    setBranchPricing(prev => {
      const curr = prev[branchId] || defaultBranchPricing();
      const p = parseFloat(newPrecio) || 0;
      const c = parseFloat(curr.costo) || 0;
      const m = parseFloat(curr.margen) || 0;
      let updated;
      if (c > 0) {
        const newMargen = p > 0 ? String(parseFloat(((p - c) / c * 100).toFixed(2))) : curr.margen;
        updated = { ...curr, precio: newPrecio, margen: newMargen };
      } else if (m) {
        const newCosto = p > 0 ? String(parseFloat((p / (1 + m / 100)).toFixed(2))) : curr.costo;
        updated = { ...curr, precio: newPrecio, costo: newCosto };
      } else {
        updated = { ...curr, precio: newPrecio, margen: '0', costo: newPrecio };
      }
      const next = { ...prev, [branchId]: updated };
      spreadToInactive(next, branchId, { costo: updated.costo, precio: newPrecio, margen: updated.margen });
      return next;
    });
  };

  const handleBranchMargenChange = (branchId, newMargen) => {
    setBranchPricing(prev => {
      const curr = prev[branchId] || defaultBranchPricing();
      const m = parseFloat(newMargen) || 0;
      const c = parseFloat(curr.costo) || 0;
      const p = parseFloat(curr.precio) || 0;
      let updated;
      if (c > 0) {
        const newPrecio = String(applyRounding(c * (1 + m / 100), config));
        updated = { ...curr, margen: newMargen, precio: newPrecio };
      } else {
        const impliedCosto = p > 0 && m !== 0
          ? String(parseFloat((p / (1 + m / 100)).toFixed(2)))
          : curr.costo;
        updated = { ...curr, margen: newMargen, costo: impliedCosto };
      }
      const next = { ...prev, [branchId]: updated };
      spreadToInactive(next, branchId, { costo: updated.costo, precio: updated.precio, margen: newMargen });
      return next;
    });
  };

  // ── Combo helpers ────────────────────────────────────────────────────────────

  const addComboItem = () => {
    if (!comboItemInput.product_id) return;
    if (formData.combo_items.find(ci => ci.product_id === comboItemInput.product_id)) return;
    setFormData(prev => ({
      ...prev,
      combo_items: [...prev.combo_items, { product_id: comboItemInput.product_id, cantidad: Number(comboItemInput.cantidad) || 1 }],
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
      combo_items: prev.combo_items.map(ci => ci.product_id === product_id ? { ...ci, cantidad: Number(cantidad) || 1 } : ci),
    }));
  };

  const getProductName = (productId) => {
    const p = comboProducts.find(p => p.id === productId);
    return p ? p.nombre : productId;
  };

  // ── Reemplaza a ─────────────────────────────────────────────────────────────

  const openReplaceDropdown = (branchId) => {
    const el = replaceInputRefs.current[branchId];
    if (el) {
      const rect = el.getBoundingClientRect();
      setReplaceDropdownPos({ top: rect.bottom, left: rect.left, width: rect.width });
    }
    setReplaceOpen(branchId);
  };

  const closeReplaceDropdown = () => {
    setReplaceOpen(null);
  };

  const searchReplaceProducts = (branchId, query) => {
    setReplaceQuery(prev => ({ ...prev, [branchId]: query }));
    clearTimeout(replaceTimers.current[branchId]);
    if (!query || query.length < 2) {
      setReplaceOptions(prev => ({ ...prev, [branchId]: [] }));
      return;
    }
    replaceTimers.current[branchId] = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/branches/${branchId}/products`, {
          params: { search: query, per_page: 10, activo_sucursal: true },
        });
        setReplaceOptions(prev => ({ ...prev, [branchId]: res.data.items || [] }));
      } catch {}
    }, 300);
  };

  const selectReplaceProduct = (branchId, item) => {
    setBranchReplace(prev => ({
      ...prev,
      [branchId]: { product_id: item.product_id, nombre: item.nombre },
    }));
    setBp(branchId, curr => ({ ...curr, activo: true }));
    setBranchError(false);
    setReplaceQuery(prev => ({ ...prev, [branchId]: '' }));
    setReplaceOptions(prev => ({ ...prev, [branchId]: [] }));
    setReplaceOpen(null);
  };

  const applyReplaceToAll = (sourceBranchId) => {
    const source = branchReplace[sourceBranchId];
    if (!source) return;
    setBranchReplace(prev => {
      const next = { ...prev };
      branches.forEach(b => { next[b.id] = { product_id: source.product_id, nombre: source.nombre }; });
      return next;
    });
    setBranchPricing(prev => {
      const next = { ...prev };
      branches.forEach(b => { next[b.id] = { ...next[b.id], activo: true }; });
      return next;
    });
    setBranchError(false);
  };

  const clearReplaceProduct = (branchId) => {
    setBranchReplace(prev => ({ ...prev, [branchId]: null }));
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productV.validate({ nombre: formData.nombre, codigo_barras: formData.codigo_barras })) return;
    if (!formData.categoria_id) {
      toast.error('Seleccioná una categoría válida');
      return;
    }
    if (branches.length > 0) {
      const activeBranches = Object.values(branchPricing).filter(bp => bp.activo);
      if (activeBranches.length === 0) {
        setBranchError(true);
        toast.error('Activá el producto en al menos una sucursal');
        return;
      }
      const activeSinPrecio = activeBranches.some(bp => {
        const p = parseFloat(bp.precio);
        return isNaN(p) || p <= 0;
      });
      if (activeSinPrecio) {
        toast.error('Ingresá el precio de venta en las sucursales activas');
        return;
      }
    }
    setBranchError(false);
    setSaving(true);
    try {
      const productData = {
        ...formData,
        precio: parseFloat(formData.precio) || 0,
        precio_costo: formData.precio_costo !== '' ? parseFloat(formData.precio_costo) : null,
        stock: formData.control_stock ? (parseInt(formData.stock) || 0) : 0,
        stock_minimo: formData.control_stock ? (parseInt(formData.stock_minimo) || 0) : 0,
        combo_items: formData.kind === 'combo' ? formData.combo_items : [],
      };
      const res = await axios.post(`${API}/products`, productData);
      const createdId = res.data.id;

      // POST /products auto-crea branch_products con precio=0 en todas las sucursales.
      // Hay que buscar el registro auto-creado y actualizarlo con los precios y el estado activo/inactivo.
      const activeBranchEntries = Object.entries(branchPricing).filter(([, bp]) => {
        const p = parseFloat(bp.precio);
        return !isNaN(p) && p > 0; // cualquier sucursal con precio, activa o no
      });

      const branchResults = await Promise.allSettled(
        activeBranchEntries.map(async ([branchId, bp]) => {
          // Buscar el branch_product auto-creado
          const listRes = await axios.get(`${API}/branches/${branchId}/products`, {
            params: { all: true, search: formData.nombre },
          });
          const item = (listRes.data.items || []).find(p => p.product_id === createdId);
          if (item?.branch_product_id) {
            await axios.put(`${API}/branch-products/${item.branch_product_id}`, {
              precio: parseFloat(bp.precio),
              margen: bp.margen !== '' ? parseFloat(bp.margen) : null,
              costo: bp.costo !== '' ? parseFloat(bp.costo) : null,
              activo: bp.activo,
            });
          }
        })
      );

      const errCount = branchResults.filter(r => r.status === 'rejected').length;
      if (errCount > 0) toast.error(`Error al configurar ${errCount} sucursal(es)`);

      // Desactivar productos reemplazados en cada sucursal
      const replaceEntries = Object.entries(branchReplace).filter(([, r]) => r?.product_id);
      await Promise.allSettled(
        replaceEntries.map(async ([branchId, r]) => {
          const listRes = await axios.get(`${API}/branches/${branchId}/products`, {
            params: { all: true, search: r.nombre },
          });
          const item = (listRes.data.items || []).find(p => p.product_id === r.product_id);
          if (item?.branch_product_id) {
            await axios.put(`${API}/branch-products/${item.branch_product_id}`, { activo: false });
          }
        })
      );

      toast.success('Producto creado exitosamente');
      onProductCreated(res.data, branchPricing);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg).join(', ')
          : 'Error al guardar el producto';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
    <div className={`modal-overlay${closing ? ' closing' : ''}`} style={{ zIndex: 10000 }}>
      <div className={`modal-content modal-content-bounce${closing ? ' closing' : ''}`} style={{ maxWidth: '960px', width: '95vw' }}>
        <div className="modal-header">
          <h3 className="modal-title">Nuevo Producto</h3>
          <button onClick={close} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit}>
          <div className="space-y-3">
            {/* Nombre */}
            <div className="form-group">
              <label className="form-label">Nombre del Producto *</label>
              <input
                type="text"
                className="form-input"
                value={formData.nombre}
                onChange={(e) => { setFormData({ ...formData, nombre: e.target.value }); productV.clearError('nombre'); }}
                required
              />
              <FieldError error={productV.errors.nombre} />
            </div>

            {/* Clase | Modo precio | Código */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="form-group">
                <label className="form-label">Clase *</label>
                <select
                  className="form-select"
                  value={formData.kind}
                  onChange={(e) => setFormData({ ...formData, kind: e.target.value, combo_items: [], control_stock: e.target.value === 'combo' ? false : formData.control_stock })}
                  required
                >
                  <option value="normal">Normal</option>
                  <option value="combo">Combo</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Modo de precio *</label>
                <select
                  className="form-select"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  required
                >
                  <option value="codigo_barras">Cód. Barras</option>
                  <option value="por_peso">Por Peso</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Código de Barras *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.codigo_barras}
                  onChange={(e) => { setFormData({ ...formData, codigo_barras: e.target.value }); productV.clearError('codigo_barras'); }}
                />
                <FieldError error={productV.errors.codigo_barras} />
              </div>
            </div>

            {/* Categoría | Stock Mínimo | Control de stock */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="form-group mb-0 flex-shrink-0" style={{ position: 'relative', width: '33.33%' }}>
                <label className="form-label">Categoría *</label>
                <div className="relative">
                  {formData.categoria_id && (() => {
                    const selCat = categories.find(c => c.id === formData.categoria_id);
                    const SelIcon = getCategoryIcon(categoryInputText, selCat?.icono);
                    return <SelIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />;
                  })()}
                  <input
                    type="text"
                    className={`form-input${formData.categoria_id ? ' pl-8' : ''}${!formData.categoria_id && categoryInputText ? ' border-red-400' : ''}`}
                    value={categoryInputText}
                    onChange={e => {
                      setCategoryInputText(e.target.value);
                      setShowCategoryAc(true);
                      setFormData({ ...formData, categoria_id: '' });
                    }}
                    onFocus={() => setShowCategoryAc(true)}
                    onBlur={() => setTimeout(() => setShowCategoryAc(false), 150)}
                    placeholder="Buscar categoría..."
                    autoComplete="off"
                  />
                </div>
                {showCategoryAc && filteredCategoryOptions.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto" style={{ top: '100%', left: 0 }}>
                    {filteredCategoryOptions.map(cat => {
                      const CatIcon = getCategoryIcon(cat.nombre, cat.icono);
                      return (
                        <div
                          key={cat.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800 flex items-center gap-2"
                          onMouseDown={() => {
                            setFormData({ ...formData, categoria_id: cat.id });
                            setCategoryInputText(cat.nombre);
                            setShowCategoryAc(false);
                          }}
                        >
                          <CatIcon className="w-4 h-4 text-gray-400 shrink-0" />
                          {cat.nombre}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="form-group mb-0 flex-1 min-w-28">
                <label className="form-label">Stock Mínimo {formData.control_stock && <span className="text-red-500">*</span>}</label>
                <input
                  type="number"
                  className="form-input"
                  disabled={!formData.control_stock}
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                  required={formData.control_stock}
                />
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  type="button"
                  disabled={formData.kind === 'combo'}
                  onClick={() => formData.kind !== 'combo' && setFormData({ ...formData, control_stock: !formData.control_stock })}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: formData.control_stock ? 'var(--primary)' : '#d1d5db' }}
                  aria-pressed={formData.control_stock}
                >
                  <span
                    className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                    style={{ transform: formData.control_stock ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
                  />
                </button>
                <div>
                  <p className="text-sm font-semibold text-gray-700 leading-tight select-none">Control de stock</p>
                  <p className="text-xs leading-tight" style={{ color: formData.kind === 'combo' ? '#9ca3af' : formData.control_stock ? '#16a34a' : '#9ca3af' }}>
                    {formData.kind === 'combo' ? 'No aplica en combos' : formData.control_stock ? 'Activo — se descuenta en ventas' : 'Inactivo — no se controla'}
                  </p>
                </div>
              </div>
            </div>

            {/* Combo items */}
            {formData.kind === 'combo' && (
              <div className="space-y-3">
                <label className="form-label flex items-center gap-1">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Productos del combo
                </label>
                {formData.combo_items.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Producto</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-600 w-28">Cantidad</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.combo_items.map((ci) => (
                          <tr key={ci.product_id} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-800">{getProductName(ci.product_id)}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number" min="0.01" step="0.01"
                                className="form-input text-center w-20 py-1 text-sm"
                                value={ci.cantidad}
                                onChange={(e) => updateComboItemCantidad(ci.product_id, e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button type="button" onClick={() => removeComboItem(ci.product_id)} className="text-red-400 hover:text-red-600">
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      ref={comboSearchRef}
                      type="text"
                      placeholder="Buscar producto..."
                      className="form-input text-sm pl-8"
                      value={comboSearch}
                      onChange={(e) => { setComboSearch(e.target.value); setComboItemInput({ ...comboItemInput, product_id: '' }); setShowComboDropdown(true); }}
                      onFocus={() => setShowComboDropdown(true)}
                      onBlur={() => setTimeout(() => setShowComboDropdown(false), 150)}
                      autoComplete="off"
                    />
                    {showComboDropdown && comboSearch.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {comboProducts
                          .filter(p => p.kind !== 'combo' && !formData.combo_items.find(ci => ci.product_id === p.id) && normalize(p.nombre).includes(normalize(comboSearch)))
                          .map(p => (
                            <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-800"
                              onMouseDown={() => { setComboItemInput({ ...comboItemInput, product_id: p.id }); setComboSearch(p.nombre); setShowComboDropdown(false); }}>
                              {p.nombre}
                            </button>
                          ))}
                        {comboProducts.filter(p => p.kind !== 'combo' && !formData.combo_items.find(ci => ci.product_id === p.id) && normalize(p.nombre).includes(normalize(comboSearch))).length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-24">
                    <input type="number" min="0.01" step="0.01" placeholder="Cant." className="form-input text-sm"
                      value={comboItemInput.cantidad}
                      onChange={(e) => setComboItemInput({ ...comboItemInput, cantidad: e.target.value })} />
                  </div>
                  <button type="button" onClick={addComboItem} disabled={!comboItemInput.product_id} className="btn btn-primary btn-sm disabled:opacity-50">
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
              </div>
            )}

            {/* Precios por sucursal */}
            {loadingBranches ? (
              <div className="border border-gray-200 rounded-lg px-4 py-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                Cargando sucursales…
              </div>
            ) : branches.length > 0 && (
              <div className={`border rounded-lg overflow-hidden ${branchError ? 'border-red-400' : 'border-gray-200'}${branchVisible ? ' branch-config-enter' : ''}`}>
                <div className={`px-3 py-2 border-b flex items-center gap-2 ${branchError ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                  <Building2 className={`w-4 h-4 ${branchError ? 'text-red-500' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${branchError ? 'text-red-600' : 'text-gray-700'}`}>Configuración por sucursal</span>
                  {branchError && <span className="text-xs text-red-500 ml-1">— activá al menos una sucursal</span>}
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 w-8"></th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Sucursal</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 text-gray-400 font-normal text-xs">Reemplaza a <span className="text-gray-300">(opcional)</span></th>
                      <th className="px-2 py-2 font-medium text-gray-600 text-right w-32">Costo</th>
                      <th className="px-2 py-2 font-medium text-gray-600 text-right w-28">Margen %</th>
                      <th className="px-2 py-2 font-medium text-gray-600 text-right w-32">Precio venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => {
                      const bp = getBp(branch.id);
                      return (
                        <tr key={branch.id} className={`border-t border-gray-100 transition-colors ${bp.activo ? 'bg-green-50/40' : ''}`}>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                              setBp(branch.id, curr => ({ ...curr, activo: !curr.activo }));
                              setBranchError(false);
                            }}
                              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                              style={{ background: bp.activo ? 'var(--primary)' : '#d1d5db' }}
                              aria-pressed={bp.activo}
                            >
                              <span
                                className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                                style={{ transform: bp.activo ? 'translateX(1.1rem)' : 'translateX(0.2rem)' }}
                              />
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`font-medium ${bp.activo ? 'text-gray-800' : 'text-gray-400'}`}>{branch.nombre}</span>
                          </td>
                          <td className="px-2 py-1.5">
                            {branchReplace[branch.id] ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded px-2 py-1 text-xs">
                                  <span className="text-orange-700 truncate max-w-[160px]">{branchReplace[branch.id].nombre}</span>
                                  <button type="button" onClick={() => clearReplaceProduct(branch.id)} className="text-orange-400 hover:text-orange-600 flex-shrink-0 ml-auto">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                {branches.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => applyReplaceToAll(branch.id)}
                                    className="text-xs text-orange-500 hover:text-orange-700 text-left leading-tight"
                                  >
                                    Aplicar a todas las sucursales
                                  </button>
                                )}
                              </div>
                            ) : (
                              <input
                                ref={el => { replaceInputRefs.current[branch.id] = el; }}
                                type="text"
                                className="form-input text-sm py-1 text-gray-500"
                                placeholder="Buscar producto..."
                                value={replaceQuery[branch.id] || ''}
                                onChange={e => searchReplaceProducts(branch.id, e.target.value)}
                                onFocus={() => openReplaceDropdown(branch.id)}
                                onBlur={() => setTimeout(closeReplaceDropdown, 180)}
                              />
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                disabled={!bp.activo}
                                className="form-input text-right text-sm pl-6 py-1.5 disabled:opacity-40"
                                value={bp.costo}
                                onChange={e => handleBranchCostoChange(branch.id, e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="relative">
                              <input
                                type="number"
                                min="-100"
                                step="0.01"
                                placeholder="0"
                                disabled={!bp.activo}
                                className="form-input text-right text-sm pr-6 py-1.5 disabled:opacity-40"
                                value={bp.margen}
                                onChange={e => handleBranchMargenChange(branch.id, e.target.value)}
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">%</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                disabled={!bp.activo}
                                className="form-input text-right text-sm pl-6 py-1.5 disabled:opacity-40"
                                value={bp.precio}
                                onChange={e => handleBranchPrecioChange(branch.id, e.target.value)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Las cantidades y precios son solo de referencia. La lista de precios se define en cada sucursal.
          </p>
          <div className="flex justify-end space-x-3 mt-3">
            <button type="button" onClick={close} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? <span className="spinner w-4 h-4" />
                : <Save className="w-4 h-4" />
              }
              {saving ? 'Guardando...' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Portal autocomplete "Reemplaza a" */}

    {replaceOpen && replaceDropdownPos && createPortal(
      <div
        style={{ position: 'fixed', top: replaceDropdownPos.top + 2, left: replaceDropdownPos.left, width: replaceDropdownPos.width, zIndex: 99999 }}
        className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
      >
        {(replaceOptions[replaceOpen] || []).length > 0
          ? (replaceOptions[replaceOpen]).map(item => (
              <div
                key={item.branch_product_id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800"
                onMouseDown={() => selectReplaceProduct(replaceOpen, item)}
              >
                <span className="font-medium">{item.nombre}</span>
                {item.codigo_barras && <span className="text-gray-400 ml-2 text-xs">{item.codigo_barras}</span>}
              </div>
            ))
          : (replaceQuery[replaceOpen]?.length >= 2) && (
              <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
            )
        }
      </div>,
      document.body
    )}
    </>
  );
};

export default NuevoProductoModal;
