import React, { useState, useEffect, useRef, useCallback } from 'react';
import useModalClose from '../../useModalClose';
import axios from 'axios';
import { API } from '../../App';
import { useSortableData } from '../../hooks/useSortableData';
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
  costo_actual: null,
  actualizar_precio: true,
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
  const [globalProducts, setGlobalProducts] = useState([]);
  const [openAutocompleteIndex, setOpenAutocompleteIndex] = useState(null);
  const [autocompleteHighlight, setAutocompleteHighlight] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 240 });
  const descInputRefs = useRef({});
  const cantidadInputRefs = useRef({});
  const costoInputRefs = useRef({});

  // Config: precio
  const [autoUpdatePrices, setAutoUpdatePrices] = useState(true);

  // Distribuir modal
  const [distribuirModal, setDistribuirModal] = useState(null); // { compra }
  const emptyDistribuirForm = { sucursal_id: '', opcion_stock: true, opcion_precio: true, items: [] };
  const [distribuirForm, setDistribuirForm] = useState(emptyDistribuirForm);
  const [distribuirLoading, setDistribuirLoading] = useState(false);

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
    fetchGlobalProducts();
    axios.get(`${API}/config`).then(res => {
      setAutoUpdatePrices(res.data.auto_update_prices ?? true);
    }).catch(() => {});
  }, []);

  // ── Branches ─────────────────────────────────────────────────────────────────

  const fetchGlobalProducts = async () => {
    try {
      const res = await axios.get(`${API}/products`, { params: { per_page: 5000 } });
      const items = res.data.items || [];
      setGlobalProducts(items.map(p => ({
        product_id: p.id,
        nombre: p.nombre,
        codigo_barras: p.codigo_barras || null,
        precio_sucursal: null,
        precio_global: p.precio,
        margen_sucursal: null,
        costo_sucursal: null,
      })));
    } catch {}
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${API}/branches`);
      setBranches(res.data);
    } catch {
      // branches might not be accessible to all roles
    }
  };

  const fetchBranchProducts = async (branchId) => {
    if (!branchId) { setBranchProducts([]); return []; }
    try {
      const res = await axios.get(`${API}/branches/${branchId}/products`, { params: { all: true } });
      const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
      const activos = items.filter(p => p.activo_sucursal !== false);
      setBranchProducts(activos);
      if (activos.length === 0) {
        toast.info('Esta sucursal no tiene productos activos cargados');
      }
      return activos;
    } catch (err) {
      setBranchProducts([]);
      toast.error(err.response?.data?.detail || 'No se pudieron cargar los productos de la sucursal');
      return [];
    }
  };

  const getSaldo = (compra, productId) => {
    const original = compra.items
      .filter(it => it.product_id === productId)
      .reduce((s, it) => s + (parseFloat(it.cantidad) || 0), 0);
    const distribuido = (compra.distribuciones || [])
      .flatMap(d => d.items || [])
      .filter(it => it.product_id === productId)
      .reduce((s, it) => s + (parseFloat(it.cantidad) || 0), 0);
    return Math.max(0, original - distribuido);
  };

  const handleOpenDistribuirModal = (compra) => {
    const productMap = {};
    for (const it of compra.items) {
      if (!it.product_id) continue;
      if (!productMap[it.product_id]) {
        productMap[it.product_id] = {
          product_id: it.product_id,
          nombre: it.descripcion,
          costo_unitario: parseFloat(it.precio_unitario) || 0,
          cantidad_original: 0,
          saldo: 0,
          cantidad_aplicar: 0,
          precio_sucursal: null,
          margen_sucursal: null,
          nuevo_precio: '',
          nuevo_margen: '',
          precio_edited: false,
          margen_edited: false,
        };
      }
      productMap[it.product_id].cantidad_original += parseFloat(it.cantidad) || 0;
    }
    for (const pid of Object.keys(productMap)) {
      const saldo = getSaldo(compra, pid);
      productMap[pid].saldo = saldo;
      productMap[pid].cantidad_aplicar = saldo;
    }
    const autoSucursal = branches.length === 1 ? branches[0].id : '';
    setDistribuirModal({ compra });
    setDistribuirForm({ sucursal_id: autoSucursal, opcion_stock: true, opcion_precio: true, items: Object.values(productMap) });
    if (autoSucursal) {
      handleSucursalDistribuirChange(autoSucursal);
    }
  };

  const closeDistribuirModal = () => {
    setDistribuirModal(null);
    setDistribuirForm(emptyDistribuirForm);
  };

  const handleSucursalDistribuirChange = async (branchId) => {
    setDistribuirForm(prev => ({ ...prev, sucursal_id: branchId }));
    if (!branchId) return;
    try {
      const res = await axios.get(`${API}/branches/${branchId}/products`, { params: { all: true } });
      const bps = Array.isArray(res.data) ? res.data : (res.data.items || []);
      setDistribuirForm(prev => ({
        ...prev,
        items: prev.items.map(it => {
          const bp = bps.find(p => p.product_id === it.product_id);
          const precio = bp?.precio_sucursal ?? null;
          const margen = bp?.margen_sucursal ?? null;
          const costo = it.costo_unitario || 0;
          // Mantener margen almacenado y recalcular precio sobre el costo de la factura
          const nuevo_precio = margen != null && costo > 0
            ? Math.ceil(costo * (1 + margen / 100) / 100) * 100
            : (precio ?? it.nuevo_precio);
          return {
            ...it,
            precio_sucursal: precio,
            margen_sucursal: margen,
            nuevo_precio,
            nuevo_margen: margen ?? it.nuevo_margen,
            precio_edited: false,
            margen_edited: false,
          };
        }),
      }));
    } catch {
      toast.error('Error al cargar productos de la sucursal');
    }
  };

  const handleDistribuirOpcionChange = (field, value) => {
    setDistribuirForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDistribuirItemChange = (productId, field, value) => {
    setDistribuirForm(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (it.product_id !== productId) return it;
        const updated = { ...it, [field]: value };
        if (field === 'nuevo_precio') {
          updated.precio_edited = true;
          const precio = parseFloat(value) || 0;
          const costo = it.costo_unitario;
          if (precio > 0 && costo > 0) {
            updated.nuevo_margen = parseFloat(((precio / costo - 1) * 100).toFixed(2));
          }
        }
        if (field === 'nuevo_margen') {
          updated.margen_edited = true;
          const margen = parseFloat(value);
          const costo = it.costo_unitario;
          if (!isNaN(margen) && costo > 0) {
            updated.nuevo_precio = Math.ceil(costo * (1 + margen / 100) / 100) * 100;
          }
        }
        return updated;
      }),
    }));
  };

  const handleDistribuirSubmit = async (e) => {
    e.preventDefault();
    if (!distribuirForm.sucursal_id) { toast.error('Seleccioná una sucursal'); return; }
    if (!distribuirForm.opcion_stock && !distribuirForm.opcion_precio) { toast.error('Seleccioná al menos una opción'); return; }

    const items = distribuirForm.items
      .filter(it => {
        const qty = parseFloat(it.cantidad_aplicar) || 0;
        return (distribuirForm.opcion_stock && qty > 0) || distribuirForm.opcion_precio;
      })
      .map(it => ({
        product_id: it.product_id,
        cantidad: distribuirForm.opcion_stock ? (parseFloat(it.cantidad_aplicar) || 0) : 0,
        nuevo_precio: distribuirForm.opcion_precio ? (parseFloat(it.nuevo_precio) || null) : null,
        nuevo_margen: distribuirForm.opcion_precio ? (it.nuevo_margen !== '' ? parseFloat(it.nuevo_margen) : null) : null,
        actualizar_stock: distribuirForm.opcion_stock,
        actualizar_precio: distribuirForm.opcion_precio,
      }));

    if (items.length === 0) { toast.error('No hay ítems para aplicar'); return; }

    setDistribuirLoading(true);
    try {
      const updated = await axios.post(`${API}/compras/${distribuirModal.compra.id}/distribuir`, {
        sucursal_id: distribuirForm.sucursal_id,
        items,
      });
      toast.success('Aplicado correctamente a la sucursal');
      const updatedCompra = updated.data;
      setCompras(prev => prev.map(c => c.id === distribuirModal.compra.id ? updatedCompra : c));
      // Mantener el modal abierto y actualizar saldos para aplicar a otra sucursal
      setDistribuirModal({ compra: updatedCompra });
      const productMap = {};
      for (const it of updatedCompra.items) {
        if (!it.product_id) continue;
        if (!productMap[it.product_id]) {
          productMap[it.product_id] = {
            product_id: it.product_id,
            nombre: it.descripcion,
            costo_unitario: parseFloat(it.precio_unitario) || 0,
            cantidad_original: 0,
            saldo: 0,
            cantidad_aplicar: 0,
            precio_sucursal: null,
            margen_sucursal: null,
            nuevo_precio: '',
            nuevo_margen: '',
            precio_edited: false,
            margen_edited: false,
          };
        }
        productMap[it.product_id].cantidad_original += parseFloat(it.cantidad) || 0;
      }
      for (const pid of Object.keys(productMap)) {
        const saldo = getSaldo(updatedCompra, pid);
        productMap[pid].saldo = saldo;
        productMap[pid].cantidad_aplicar = saldo;
      }
      setDistribuirForm({ sucursal_id: '', opcion_stock: true, opcion_precio: true, items: Object.values(productMap) });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al aplicar');
    } finally {
      setDistribuirLoading(false);
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
      setAutocompleteHighlight(-1);
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
      costo_actual: product.costo_sucursal ?? (precio > 0 && product.margen_sucursal != null
        ? parseFloat((precio / (1 + product.margen_sucursal / 100)).toFixed(2))
        : null),
      actualizar_precio: autoUpdatePrices,
    };
    const qty = parseFloat(updatedItems[index].cantidad) || 0;
    const price = parseFloat(updatedItems[index].precio_unitario) || 0;
    updatedItems[index].subtotal = parseFloat((qty * price).toFixed(2));
    const { subtotal, total } = recalcTotals(updatedItems, compraForm.impuestos);
    setCompraForm(prev => ({ ...prev, items: updatedItems, subtotal, total }));
    setOpenAutocompleteIndex(null);
    setTimeout(() => {
      const el = cantidadInputRefs.current[index];
      if (el) { el.focus(); el.select(); }
    }, 0);
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

  const openCompraModal = async (compra = null) => {
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
        const bps = await fetchBranchProducts(compra.sucursal_id);
        if (bps.length > 0) {
          setCompraForm(prev => ({
            ...prev,
            items: prev.items.map(it => {
              if (!it.product_id) return it;
              const bp = bps.find(p => p.product_id === it.product_id);
              const precio = bp ? (bp.precio_sucursal ?? bp.precio_global ?? null) : null;
              const margen = bp ? (bp.margen_sucursal ?? null) : null;
              // Prefer costo_anterior stored at registration time; fallback to bp or derivation
              const costo = it.costo_anterior
                ?? bp?.costo_sucursal
                ?? (precio != null && margen != null
                  ? parseFloat((precio / (1 + margen / 100)).toFixed(2))
                  : null);
              return {
                ...it,
                precio_actual: precio,
                margen_actual: margen,
                costo_actual: costo,
                actualizar_precio: autoUpdatePrices,
              };
            })
          }));
        }
      }
      setEditingCompra(compra);
    } else {
      const autoSucursal = branches.length === 1 ? branches[0].id : '';
      setCompraForm({ ...emptyCompraForm, sucursal_id: autoSucursal });
      if (autoSucursal) {
        fetchBranchProducts(autoSucursal);
      } else {
        setBranchProducts([]);
      }
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
  };

  const buildPayload = () => {
    const itemsValidos = compraForm.items.filter(it => it.descripcion.trim());
    return {
      sucursal_id: compraForm.sucursal_id || null,
      proveedor_id: compraForm.proveedor_id || null,
      numero_factura: compraForm.numero_factura.trim(),
      fecha: new Date(compraForm.fecha).toISOString(),
      items: itemsValidos.map(it => {
        const costoNuevo = parseFloat(it.precio_unitario) || 0;
        const willUpdate = (it.actualizar_precio ?? autoUpdatePrices) && !!it.product_id && costoNuevo > 0 && it.margen_actual != null;
        const nuevoPrecio = willUpdate
          ? Math.ceil(costoNuevo * (1 + it.margen_actual / 100) / 100) * 100
          : null;
        return {
          descripcion: it.descripcion,
          cantidad: parseFloat(it.cantidad) || 0,
          precio_unitario: costoNuevo,
          subtotal: parseFloat(it.subtotal) || 0,
          product_id: it.product_id || null,
          actualizar_precio: willUpdate,
          nuevo_precio: nuevoPrecio,
          nuevo_margen: willUpdate ? it.margen_actual : null,
        };
      }),
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
    await submitCompra(buildPayload());
  };

  const handleDeleteCompra = (compra) => {
    setDeleteTarget(compra);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const confirmDeleteCompra = async () => {
    if (!deleteTarget) return;
    closeDeleteModalAnim();
    try {
      await axios.delete(`${API}/compras/${deleteTarget.id}`);
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
    const source = globalProducts;
    return source
      .filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_barras && p.codigo_barras.includes(q))
      )
      .slice(0, 10);
  }, [globalProducts]);

  const handleDescriptionFocus = (idx, e) => {
    const rect = e.target.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 2,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 280)
    });
    setAutocompleteHighlight(-1);
    setOpenAutocompleteIndex(idx);
  };

  useEffect(() => {
    if (autocompleteHighlight < 0) return;
    const el = document.querySelector(`[data-autocomplete-item="${autocompleteHighlight}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [autocompleteHighlight]);

  const handleDescriptionKeyDown = (idx, e) => {
    const options = getAutocompleteOptions(compraForm.items[idx]?.descripcion || '');
    if (!options.length || openAutocompleteIndex !== idx) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAutocompleteHighlight(h => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAutocompleteHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteHighlight >= 0) {
        handleSelectProduct(idx, options[autocompleteHighlight]);
        setAutocompleteHighlight(-1);
        setOpenAutocompleteIndex(null);
      }
    } else if (e.key === 'Escape') {
      setOpenAutocompleteIndex(null);
      setAutocompleteHighlight(-1);
    }
  };

  const handleCantidadKeyDown = (idx, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const el = costoInputRefs.current[idx];
      if (el) { el.focus(); el.select(); }
    }
  };

  const handleCostoKeyDown = (idx, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = compraForm.items[idx];
      const isComplete = item.descripcion?.trim() && parseFloat(item.cantidad) > 0 && parseFloat(item.precio_unitario) > 0;
      if (isComplete) {
        const newIdx = compraForm.items.length;
        addItem();
        setTimeout(() => {
          const el = descInputRefs.current[newIdx];
          if (el) el.focus();
        }, 50);
      }
    }
  };

  const handleToggleAllPrices = (value) => {
    setCompraForm(prev => ({
      ...prev,
      items: prev.items.map(it => ({ ...it, actualizar_precio: value }))
    }));
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
  const [deleteModalClosing, closeDeleteModalAnim] = useModalClose(closeDeleteModal);
  const [distribuirModalClosing, closeDistribuirModalAnim] = useModalClose(closeDistribuirModal);

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

  const { sortedItems: sortedCompras, sortConfig: comprasSortConfig, requestSort: comprasRequestSort } = useSortableData(filteredCompras);
  const { sortedItems: sortedProveedores, sortConfig: proveedoresSortConfig, requestSort: proveedoresRequestSort } = useSortableData(filteredProveedores);

  const formatDate = (iso) => {
    if (!iso) return '—';
    return parseApiDate(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatMoney = (val) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
      cantidadInputRefs={cantidadInputRefs}
      costoInputRefs={costoInputRefs}
      autoUpdatePrices={autoUpdatePrices}
      proveedores={proveedores}
      loadingProveedores={loadingProveedores}
      showProveedorModal={showProveedorModal}
      editingProveedor={editingProveedor}
      proveedorForm={proveedorForm}
      setProveedorForm={setProveedorForm}
      searchProveedor={searchProveedor}
      setSearchProveedor={setSearchProveedor}
      filteredCompras={sortedCompras}
      filteredProveedores={sortedProveedores}
      comprasSortConfig={comprasSortConfig}
      comprasRequestSort={comprasRequestSort}
      proveedoresSortConfig={proveedoresSortConfig}
      proveedoresRequestSort={proveedoresRequestSort}
      compraModalClosing={compraModalClosing}
      proveedorModalClosing={proveedorModalClosing}
      openCompraModal={openCompraModal}
      closeCompraModalAnim={closeCompraModalAnim}
      openProveedorModal={openProveedorModal}
      closeProveedorModalAnim={closeProveedorModalAnim}
      handleCompraSubmit={handleCompraSubmit}
      handleDeleteCompra={handleDeleteCompra}
      showDeleteModal={showDeleteModal}
      deleteTarget={deleteTarget}
      deleteModalClosing={deleteModalClosing}
      closeDeleteModalAnim={closeDeleteModalAnim}
      confirmDeleteCompra={confirmDeleteCompra}
      handleItemChange={handleItemChange}
      autocompleteHighlight={autocompleteHighlight}
      handleSelectProduct={handleSelectProduct}
      handleDescriptionFocus={handleDescriptionFocus}
      handleDescriptionKeyDown={handleDescriptionKeyDown}
      handleCantidadKeyDown={handleCantidadKeyDown}
      handleCostoKeyDown={handleCostoKeyDown}
      handleImpuestosChange={handleImpuestosChange}
      handleProveedorSubmit={handleProveedorSubmit}
      handleToggleProveedor={handleToggleProveedor}
      handleToggleAllPrices={handleToggleAllPrices}
      addItem={addItem}
      removeItem={removeItem}
      getAutocompleteOptions={getAutocompleteOptions}
      handleSucursalChange={handleSucursalChange}
      formatDate={formatDate}
      formatMoney={formatMoney}
      distribuirModal={distribuirModal}
      distribuirForm={distribuirForm}
      distribuirLoading={distribuirLoading}
      distribuirModalClosing={distribuirModalClosing}
      handleOpenDistribuirModal={handleOpenDistribuirModal}
      closeDistribuirModalAnim={closeDistribuirModalAnim}
      handleSucursalDistribuirChange={handleSucursalDistribuirChange}
      handleDistribuirOpcionChange={handleDistribuirOpcionChange}
      handleDistribuirItemChange={handleDistribuirItemChange}
      handleDistribuirSubmit={handleDistribuirSubmit}
    />
  );
};

export default Compras;
