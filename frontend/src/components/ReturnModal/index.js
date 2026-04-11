import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { formatAmount } from '../../lib/utils';
import { toast } from 'sonner';
import useModalClose from '../../useModalClose';
import ReturnModalView from './ReturnModalView';

/**
 * Modal de devolución reutilizable.
 *
 * Props:
 *   sale        — objeto venta con { id, numero_factura, items: [{ producto_id, nombre, cantidad, precio_unitario }] }
 *   returnedQty — { producto_id: cantidad_ya_devuelta }
 *   onClose     — fn() cierra el modal
 *   onSuccess   — fn() callback tras devolución exitosa (ej: refetch)
 */
const ReturnModal = ({ sale, returnedQty, onClose, onSuccess }) => {
  const [returnSelected, setReturnSelected] = useState(() => {
    const init = {};
    sale.items.forEach(item => { init[item.producto_id] = false; });
    return init;
  });

  const [returnQuantities, setReturnQuantities] = useState(() => {
    const init = {};
    sale.items.forEach(item => {
      const available = item.cantidad - (returnedQty[item.producto_id] || 0);
      init[item.producto_id] = available > 0 ? available : 0;
    });
    return init;
  });

  const [returnReason, setReturnReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [closing, handleClose] = useModalClose(onClose);

  const availableItems = sale.items.filter(item => {
    const available = item.cantidad - (returnedQty[item.producto_id] || 0);
    return available > 0;
  });
  const allSelected = availableItems.length > 0 && availableItems.every(item => returnSelected[item.producto_id]);

  const handleSubmit = async () => {
    const items = sale.items
      .filter(item => returnSelected[item.producto_id])
      .map(item => {
        const available = item.cantidad - (returnedQty[item.producto_id] || 0);
        const cantidad = returnQuantities[item.producto_id] ?? available;
        return { producto_id: item.producto_id, cantidad };
      })
      .filter(item => item.cantidad > 0);

    if (items.length === 0) {
      toast.error('Seleccioná al menos un producto para devolver');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/sales/${sale.id}/return`, {
        items,
        motivo: returnReason || null
      });
      toast.success(`Devolución ${response.data.numero_devolucion} procesada — $${formatAmount(response.data.total)} devueltos al stock`);
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar la devolución');
    } finally {
      setSubmitting(false);
    }
  };

  const total = sale.items.reduce((sum, item) => {
    if (!returnSelected[item.producto_id]) return sum;
    const qty = returnQuantities[item.producto_id] ?? (item.cantidad - (returnedQty[item.producto_id] || 0));
    return sum + qty * item.precio_unitario;
  }, 0);

  return (
    <ReturnModalView
      sale={sale}
      returnedQty={returnedQty}
      returnSelected={returnSelected}
      setReturnSelected={setReturnSelected}
      returnQuantities={returnQuantities}
      setReturnQuantities={setReturnQuantities}
      returnReason={returnReason}
      setReturnReason={setReturnReason}
      submitting={submitting}
      closing={closing}
      handleClose={handleClose}
      handleSubmit={handleSubmit}
      availableItems={availableItems}
      allSelected={allSelected}
      total={total}
    />
  );
};

export default ReturnModal;
