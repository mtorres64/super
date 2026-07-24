import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { TiendaAuthContext, TiendaContext } from '../index';
import TiendaCheckoutView from './TiendaCheckoutView';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TiendaCheckout = () => {
  const { tiendaToken, tiendaUser, empresa_id, updateTiendaUser } = useContext(TiendaAuthContext);
  const { config, sucursales, carrito, vaciarCarrito, totalCarrito, apiBase, cambiarSucursal } = useContext(TiendaContext);
  const navigate = useNavigate();

  const isEcommerce = config?.tienda_modo === 'ecommerce';
  const [sucursalId, setSucursalId] = useState(
    isEcommerce ? (config?.tienda_ecommerce_sucursal_id || '') : (tiendaUser?.sucursal_id || '')
  );
  const [cambiandoSucursal, setCambiandoSucursal] = useState(false);

  const sucursalEnvioActivo = (sid) => {
    const branch = sucursales.find(s => s.id === sid);
    return branch ? branch.envio_activo !== false : true;
  };
  const [tipoEntrega, setTipoEntrega] = useState(() =>
    sucursalEnvioActivo(isEcommerce ? (config?.tienda_ecommerce_sucursal_id || '') : (tiendaUser?.sucursal_id || ''))
      ? 'domicilio' : 'retiro'
  );
  const getDireccionGuardada = (sid) =>
    tiendaUser?.direcciones_por_sucursal?.[sid || tiendaUser?.sucursal_id] || '';
  const getObservacionesGuardadas = (sid) =>
    tiendaUser?.observaciones_por_sucursal?.[sid || tiendaUser?.sucursal_id] || '';
  const getCoordenadasGuardadas = (sid) =>
    tiendaUser?.coordenadas_por_sucursal?.[sid || tiendaUser?.sucursal_id] || null;
  const [direccion, setDireccion] = useState(() => getDireccionGuardada(tiendaUser?.sucursal_id));
  const [dirEcommerce, setDirEcommerce] = useState({ provincia: '', localidad: '', calle: '', numero: '', pisoDpto: '', cp: '' });
  const [coordenadas, setCoordenadas] = useState(() => getCoordenadasGuardadas(tiendaUser?.sucursal_id));
  const [medioPago, setMedioPago] = useState('efectivo');
  const [observaciones, setObservaciones] = useState(() => getObservacionesGuardadas(tiendaUser?.sucursal_id));
  const [loading, setLoading] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);

  useEffect(() => {
    if (sucursalEnvioActivo(sucursalId) && config?.tienda_envio_activo !== false) {
      setTipoEntrega('domicilio');
    } else {
      setTipoEntrega('retiro');
    }
  }, [sucursalId]); // eslint-disable-line

  // Si la sucursal actual está inactiva, cambiar automáticamente a la primera activa
  useEffect(() => {
    if (!sucursales.length || isEcommerce) return;
    const actual = sucursales.find(s => s.id === sucursalId);
    if (actual && actual.tienda_activa === false) {
      const primeraActiva = sucursales.find(s => s.tienda_activa !== false);
      if (primeraActiva) handleCambiarSucursal(primeraActiva.id);
    }
  }, [sucursales, sucursalId]); // eslint-disable-line

  useEffect(() => {
    if (!pedidoConfirmado) return;
    const t = setTimeout(() => navigate(`/tienda/${empresa_id}`), 4000);
    return () => clearTimeout(t);
  }, [pedidoConfirmado, empresa_id, navigate]);

  const calcEnvio = () => {
    if (tipoEntrega !== 'domicilio') return { base: 0, extra: 0 };
    const base = config?.tienda_costo_envio || 0;
    if (!coordenadas) return { base, extra: 0 };
    const branch = sucursales.find(s => s.id === sucursalId);
    const radioKm = branch?.radio_envio_km;
    if (radioKm > 0 && branch?.lat != null && branch?.lng != null && branch?.radio_modo === 'costo_extra') {
      const dist = haversineKm(branch.lat, branch.lng, coordenadas.lat, coordenadas.lng);
      if (dist > radioKm) {
        const tramoKm = branch.radio_tramo_km || 0.5;
        const costoPorTramo = branch.radio_costo_extra_por_tramo || 0;
        const tramos = Math.ceil((dist - radioKm) / tramoKm);
        return { base, extra: tramos * costoPorTramo };
      }
    }
    return { base, extra: 0 };
  };
  const { base: costoEnvioBase, extra: costoExtraDistancia } = calcEnvio();
  const costoEnvio = costoEnvioBase + costoExtraDistancia;
  const totalFinal = totalCarrito + costoEnvio;
  const currencySymbol = config?.currency_symbol || '$';

  const handleCambiarSucursal = async (id) => {
    setCambiandoSucursal(true);
    try {
      await cambiarSucursal(id);
      tiendaUser.sucursal_id = id;
      setSucursalId(id);
      setDireccion(getDireccionGuardada(id));
      setObservaciones(getObservacionesGuardadas(id));
      setCoordenadas(prev => getCoordenadasGuardadas(id) || prev);
      toast.success('Sucursal actualizada. Los precios del carrito fueron recalculados.');
    } catch {
      toast.error('No se pudo cambiar la sucursal');
    } finally { setCambiandoSucursal(false); }
  };

  const handleConfirmar = async (e) => {
    e.preventDefault();
    if (carrito.length === 0) { toast.error('Tu carrito está vacío'); return; }
    const montoMinimo = config?.tienda_monto_minimo || 0;
    if (montoMinimo > 0 && totalCarrito < montoMinimo) {
      toast.error(`El monto mínimo de pedido es ${currencySymbol}${montoMinimo.toFixed(0)}`);
      return;
    }
    if (tipoEntrega === 'domicilio' && !sucursalEnvioActivo(sucursalId)) {
      toast.error('Esta sucursal no tiene envío a domicilio disponible');
      return;
    }
    if (tipoEntrega === 'domicilio' && coordenadas) {
      const branch = sucursales.find(s => s.id === sucursalId);
      const radioKm = branch?.radio_envio_km;
      if (radioKm > 0 && branch?.lat != null && branch?.lng != null) {
        const dist = haversineKm(branch.lat, branch.lng, coordenadas.lat, coordenadas.lng);
        if (dist > radioKm && (branch.radio_modo || 'restrictivo') === 'restrictivo') {
          toast.error(`Tu dirección está fuera del área de cobertura (${radioKm} km desde la sucursal)`);
          return;
        }
      }
    }
    let direccionFinal = direccion.trim();
    if (isEcommerce && tipoEntrega === 'domicilio') {
      const { provincia, localidad, calle, numero, pisoDpto, cp } = dirEcommerce;
      if (!provincia || !localidad || !calle || !numero) {
        toast.error('Completá provincia, localidad, calle y número');
        return;
      }
      const partes = [`${calle} ${numero}`];
      if (pisoDpto.trim()) partes.push(pisoDpto.trim());
      partes.push(localidad);
      if (cp.trim()) partes.push(`CP ${cp.trim()}`);
      partes.push(provincia);
      direccionFinal = partes.join(', ');
    } else if (tipoEntrega === 'domicilio' && !direccionFinal) {
      toast.error('Ingresá tu dirección de entrega');
      return;
    }
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
        direccion_entrega: tipoEntrega === 'domicilio' ? direccionFinal : '',
        observaciones: observaciones.trim(),
        metodo_pago: medioPago,
        ...(coordenadas && tipoEntrega === 'domicilio' ? { coordenadas_lat: coordenadas.lat, coordenadas_lng: coordenadas.lng } : {}),
      }, { headers: { Authorization: `Bearer ${tiendaToken}` } });
      vaciarCarrito();
      if (tipoEntrega === 'domicilio' && direccionFinal) {
        const sid = sucursalId || tiendaUser?.sucursal_id || 'default';
        const updates = {
          direcciones_por_sucursal: {
            ...(tiendaUser?.direcciones_por_sucursal || {}),
            [sid]: direccionFinal,
          },
        };
        if (observaciones.trim()) {
          updates.observaciones_por_sucursal = {
            ...(tiendaUser?.observaciones_por_sucursal || {}),
            [sid]: observaciones.trim(),
          };
        }
        if (coordenadas) {
          updates.coordenadas_por_sucursal = {
            ...(tiendaUser?.coordenadas_por_sucursal || {}),
            [sid]: coordenadas,
          };
        }
        updateTiendaUser(updates);
      }
      setPedidoConfirmado(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al confirmar el pedido');
    } finally { setLoading(false); }
  };

  return (
    <TiendaCheckoutView
      config={config}
      isEcommerce={isEcommerce}
      sucursales={isEcommerce ? [] : sucursales}
      sucursalId={sucursalId}
      onCambiarSucursal={handleCambiarSucursal}
      cambiandoSucursal={cambiandoSucursal}
      empresa_id={empresa_id}
      tiendaUser={tiendaUser}
      carrito={carrito}
      tipoEntrega={tipoEntrega} setTipoEntrega={setTipoEntrega}
      direccion={direccion} setDireccion={setDireccion}
      dirEcommerce={dirEcommerce} setDirEcommerce={setDirEcommerce}
      coordenadas={coordenadas} setCoordenadas={setCoordenadas}
      medioPago={medioPago} setMedioPago={setMedioPago}
      observaciones={observaciones} setObservaciones={setObservaciones}
      loading={loading}
      costoEnvio={costoEnvio}
      costoExtraDistancia={costoExtraDistancia}
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
