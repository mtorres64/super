import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../../App';
import useModalClose from '../../useModalClose';

const emptyDistribuirForm = { sucursal_id: '', opcion_stock: true, opcion_precio: true, items: [] };

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

const buildItems = (compra) => {
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
  return Object.values(productMap);
};

/**
 * Lógica del modal "Aplicar a sucursal" de una compra. Se usa desde Compras y desde Logs.
 * @param branches            sucursales disponibles
 * @param onCompraUpdated     callback(compra) tras aplicar correctamente
 */
const useDistribuirCompra = ({ branches, onCompraUpdated }) => {
  const [modal, setModal] = useState(null); // { compra }
  const [form, setForm] = useState(emptyDistribuirForm);
  const [loading, setLoading] = useState(false);

  const handleSucursalChange = async (branchId) => {
    setForm(prev => ({ ...prev, sucursal_id: branchId }));
    if (!branchId) return;
    try {
      const res = await axios.get(`${API}/branches/${branchId}/products`, { params: { all: true } });
      const bps = Array.isArray(res.data) ? res.data : (res.data.items || []);
      setForm(prev => ({
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

  const open = (compra, sucursalPreseleccionada = null) => {
    const autoSucursal = sucursalPreseleccionada || (branches.length === 1 ? branches[0].id : '');
    setModal({ compra });
    setForm({ sucursal_id: autoSucursal, opcion_stock: true, opcion_precio: true, items: buildItems(compra) });
    if (autoSucursal) handleSucursalChange(autoSucursal);
  };

  const close = () => {
    setModal(null);
    setForm(emptyDistribuirForm);
  };

  const handleOpcionChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (productId, field, value) => {
    setForm(prev => ({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sucursal_id) { toast.error('Seleccioná una sucursal'); return; }
    if (!form.opcion_stock && !form.opcion_precio) { toast.error('Seleccioná al menos una opción'); return; }

    const items = form.items
      .filter(it => {
        const qty = parseFloat(it.cantidad_aplicar) || 0;
        return (form.opcion_stock && qty > 0) || form.opcion_precio;
      })
      .map(it => ({
        product_id: it.product_id,
        cantidad: form.opcion_stock ? (parseFloat(it.cantidad_aplicar) || 0) : 0,
        nuevo_precio: form.opcion_precio ? (parseFloat(it.nuevo_precio) || null) : null,
        nuevo_margen: form.opcion_precio ? (it.nuevo_margen !== '' ? parseFloat(it.nuevo_margen) : null) : null,
        actualizar_stock: form.opcion_stock,
        actualizar_precio: form.opcion_precio,
      }));

    if (items.length === 0) { toast.error('No hay ítems para aplicar'); return; }

    setLoading(true);
    try {
      const updated = await axios.post(`${API}/compras/${modal.compra.id}/distribuir`, {
        sucursal_id: form.sucursal_id,
        items,
      });
      toast.success('Aplicado correctamente a la sucursal');
      const updatedCompra = updated.data;
      onCompraUpdated?.(updatedCompra);
      // Mantener el modal abierto y actualizar saldos para aplicar a otra sucursal
      setModal({ compra: updatedCompra });
      setForm({ sucursal_id: '', opcion_stock: true, opcion_precio: true, items: buildItems(updatedCompra) });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al aplicar');
    } finally {
      setLoading(false);
    }
  };

  const [closing, closeAnim] = useModalClose(close);

  return {
    modal, form, loading, closing,
    open, closeAnim,
    handleSucursalChange, handleOpcionChange, handleItemChange, handleSubmit,
  };
};

export default useDistribuirCompra;
