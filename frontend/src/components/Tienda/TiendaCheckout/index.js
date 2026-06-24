import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { TiendaAuthContext, TiendaContext } from '../index';
import TiendaCheckoutView from './TiendaCheckoutView';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TiendaCheckout = () => {
  const { tiendaToken, tiendaUser, empresa_id, updateTiendaUser } = useContext(TiendaAuthContext);
  const { config, sucursales, carrito, vaciarCarrito, totalCarrito, apiBase, cambiarSucursal } = useContext(TiendaContext);
  const navigate = useNavigate();

  const [sucursalId, setSucursalId] = useState(tiendaUser?.sucursal_id || '');
  const [cambiandoSucursal, setCambiandoSucursal] = useState(false);
  const [tipoEntrega, setTipoEntrega] = useState('domicilio');
  const getDireccionGuardada = (sid) =>
    tiendaUser?.direcciones_por_sucursal?.[sid || tiendaUser?.sucursal_id] || '';
  const [direccion, setDireccion] = useState(() => getDireccionGuardada(tiendaUser?.sucursal_id));
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);

  const costoEnvio = tipoEntrega === 'domicilio' ? (config?.tienda_costo_envio || 0) : 0;
  const totalFinal = totalCarrito + costoEnvio;
  const currencySymbol = config?.currency_symbol || '$';

  const handleCambiarSucursal = async (id) => {
    setCambiandoSucursal(true);
    try {
      await cambiarSucursal(id);
      tiendaUser.sucursal_id = id;
      setSucursalId(id);
      setDireccion(getDireccionGuardada(id));
      toast.success('Sucursal actualizada. Los precios del carrito fueron recalculados.');
    } catch {
      toast.error('No se pudo cambiar la sucursal');
    } finally { setCambiandoSucursal(false); }
  };

  const handleConfirmar = async (e) => {
    e.preventDefault();
    if (carrito.length === 0) { toast.error('Tu carrito está vacío'); return; }
    if (tipoEntrega === 'domicilio' && !direccion.trim()) { toast.error('Ingresá tu dirección de entrega'); return; }
    setLoading(true);
    try {
      const items = carrito.map(i => ({
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      }));
      const { data } = await axios.post(`${apiBase}/pedidos`, {
        items,
        tipo_entrega: tipoEntrega,
        direccion_entrega: tipoEntrega === 'domicilio' ? direccion.trim() : '',
        observaciones: observaciones.trim(),
      }, { headers: { Authorization: `Bearer ${tiendaToken}` } });
      vaciarCarrito();
      if (tipoEntrega === 'domicilio' && direccion.trim()) {
        const sid = sucursalId || tiendaUser?.sucursal_id || 'default';
        updateTiendaUser({
          direcciones_por_sucursal: {
            ...(tiendaUser?.direcciones_por_sucursal || {}),
            [sid]: direccion.trim(),
          }
        });
      }
      setPedidoConfirmado(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al confirmar el pedido');
    } finally { setLoading(false); }
  };

  return (
    <TiendaCheckoutView
      config={config}
      sucursales={sucursales}
      sucursalId={sucursalId}
      onCambiarSucursal={handleCambiarSucursal}
      cambiandoSucursal={cambiandoSucursal}
      empresa_id={empresa_id}
      tiendaUser={tiendaUser}
      carrito={carrito}
      tipoEntrega={tipoEntrega} setTipoEntrega={setTipoEntrega}
      direccion={direccion} setDireccion={setDireccion}
      observaciones={observaciones} setObservaciones={setObservaciones}
      loading={loading}
      costoEnvio={costoEnvio}
      totalCarrito={totalCarrito}
      totalFinal={totalFinal}
      currencySymbol={currencySymbol}
      pedidoConfirmado={pedidoConfirmado}
      onConfirmar={handleConfirmar}
      onVolverCatalogo={() => navigate(`/tienda/${empresa_id}`)}
    />
  );
};

export default TiendaCheckout;
