import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../../App';
import { parseApiDate } from '../../lib/utils';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import CuentaView from './CuentaView';
import { useSortableData } from '../../hooks/useSortableData';

const STATUS_CONFIG = {
  trial:      { label: 'Período de Prueba', color: 'bg-blue-100 text-blue-800',   icon: Clock        },
  activa:     { label: 'Activa',            color: 'bg-green-100 text-green-800', icon: CheckCircle  },
  vencida:    { label: 'Vencida',           color: 'bg-red-100 text-red-800',     icon: XCircle      },
  suspendida: { label: 'Suspendida',        color: 'bg-gray-100 text-gray-700',   icon: AlertCircle  },
};

const PAGO_ESTADO_CONFIG = {
  approved:  { label: 'Aprobado',   color: 'bg-green-100 text-green-800' },
  pending:   { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-800' },
  rejected:  { label: 'Rechazado',  color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelado',  color: 'bg-gray-100 text-gray-700' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = parseApiDate(dateStr);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatCurrency = (amount, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);

const Cuenta = () => {
  const { refreshSuscripcion } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [suscripcion, setSuscripcion] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [planes, setPlanes] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingPagos, setLoadingPagos] = useState(true);
  const [creandoPago, setCreandoPago] = useState(null); // null | 'emprendedor-mensual' | etc.
  const [gestionandoAuto, setGestionandoAuto] = useState(false); // activando/cancelando débito auto

  const [whatsappNumero, setWhatsappNumero] = useState(null);

  useEffect(() => {
    fetchStatus();
    fetchPagos();
    axios.get(`${API}/cuenta/planes`).then(r => {
      setPlanes(r.data);
      if (r.data.whatsapp_numero) setWhatsappNumero(r.data.whatsapp_numero);
    }).catch(() => {});
  }, []);

  // Manejar retorno desde MercadoPago
  useEffect(() => {
    const pagoResult = searchParams.get('pago');
    const suscripcionResult = searchParams.get('suscripcion');
    if (pagoResult === 'success') {
      toast.success('¡Pago procesado correctamente! Tu suscripción fue actualizada.');
      fetchStatus();
      fetchPagos();
      refreshSuscripcion();
      setSearchParams({});
    } else if (pagoResult === 'failure') {
      toast.error('El pago no pudo completarse. Podés intentarlo nuevamente.');
      setSearchParams({});
    } else if (pagoResult === 'pending') {
      toast.info('Tu pago está siendo procesado. Te notificaremos cuando se acredite.');
      setSearchParams({});
    } else if (suscripcionResult === 'authorized') {
      toast.success('¡Débito automático activado! A partir del próximo ciclo se cobrará automáticamente.');
      fetchStatus();
      fetchPagos();
      refreshSuscripcion();
      setSearchParams({});
    } else if (suscripcionResult === 'cancelled') {
      toast.info('Proceso de suscripción automática cancelado.');
      setSearchParams({});
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const resp = await axios.get(`${API}/cuenta/status`);
      setSuscripcion(resp.data);
    } catch (err) {
      toast.error('Error al cargar el estado de la suscripción');
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchPagos = async () => {
    try {
      setLoadingPagos(true);
      const resp = await axios.get(`${API}/cuenta/pagos`);
      setPagos(resp.data);
    } catch (err) {
      // silencioso si no hay pagos
    } finally {
      setLoadingPagos(false);
    }
  };

  const handleSimularPago = async (planTipo = 'mensual') => {
    try {
      await axios.post(`${API}/cuenta/pago/simular-aprobado?plan_tipo=${planTipo}`);
      const label = planTipo === 'anual' ? 'anual (12 meses)' : 'mensual (1 mes)';
      toast.success(`[TEST] Pago ${label} simulado. Suscripción renovada.`);
      fetchStatus();
      fetchPagos();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al simular pago');
    }
  };

  const handleActivarSuscripcionAuto = async () => {
    try {
      setGestionandoAuto('activando');
      const resp = await axios.post(`${API}/cuenta/suscripcion/activar`);
      const url = resp.data.init_point || resp.data.sandbox_init_point;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('No se pudo obtener el enlace de autorización');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al activar el débito automático';
      toast.error(msg);
    } finally {
      setGestionandoAuto(false);
    }
  };

  const handleCancelarSuscripcionAuto = async () => {
    if (!window.confirm('¿Cancelar el débito automático? Tu suscripción actual sigue vigente hasta su vencimiento.')) return;
    try {
      setGestionandoAuto('cancelando');
      await axios.post(`${API}/cuenta/suscripcion/cancelar`);
      toast.success('Débito automático cancelado. Tu suscripción sigue activa hasta su vencimiento.');
      fetchStatus();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al cancelar el débito automático';
      toast.error(msg);
    } finally {
      setGestionandoAuto(false);
    }
  };

  const handlePagar = async (planTipo = 'mensual', planTier = 'profesional') => {
    const key = `${planTier}-${planTipo}`;
    try {
      setCreandoPago(key);
      const resp = await axios.post(`${API}/cuenta/pago/crear`, { plan_tipo: planTipo, plan_tier: planTier });
      const url = resp.data.init_point || resp.data.sandbox_init_point;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('No se pudo obtener el enlace de pago');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al iniciar el pago';
      toast.error(msg);
    } finally {
      setCreandoPago(null);
    }
  };

  const statusNorm = suscripcion?.status?.toLowerCase();
  const enGracia = suscripcion?.en_gracia;
  const fuePagada = suscripcion?.fue_pagada;

  const statusConf = suscripcion
    ? (enGracia
        ? { label: 'En período de gracia', color: 'bg-amber-100 text-amber-800', icon: Clock }
        : (STATUS_CONFIG[suscripcion.status?.toLowerCase()] || STATUS_CONFIG.suspendida))
    : null;
  const showAlert = suscripcion && (
    statusNorm === 'vencida' ||
    enGracia ||
    (statusNorm !== 'suspendida' && statusNorm !== 'vencida' && suscripcion.dias_restantes <= 7)
  );

  const accionLabel = (statusNorm === 'vencida' || enGracia) ? 'Reactivar' : 'Renovar';

  const { sortedItems: sortedPagos, sortConfig, requestSort } = useSortableData(pagos);

  return (
    <CuentaView
      suscripcion={suscripcion}
      pagos={sortedPagos}
      sortConfig={sortConfig}
      requestSort={requestSort}
      planes={planes}
      loadingStatus={loadingStatus}
      loadingPagos={loadingPagos}
      creandoPago={creandoPago}
      gestionandoAuto={gestionandoAuto}
      whatsappNumero={whatsappNumero}
      statusNorm={statusNorm}
      enGracia={enGracia}
      fuePagada={fuePagada}
      statusConf={statusConf}
      showAlert={showAlert}
      accionLabel={accionLabel}
      PAGO_ESTADO_CONFIG={PAGO_ESTADO_CONFIG}
      formatDate={formatDate}
      formatCurrency={formatCurrency}
      onRefresh={() => { fetchStatus(); fetchPagos(); }}
      onPagar={handlePagar}
      onSimularPago={handleSimularPago}
      onActivarSuscripcionAuto={handleActivarSuscripcionAuto}
      onCancelarSuscripcionAuto={handleCancelarSuscripcionAuto}
    />
  );
};

export default Cuenta;
