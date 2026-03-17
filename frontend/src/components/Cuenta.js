import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  CreditCard,
  Calendar,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

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
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatCurrency = (amount, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);

const Cuenta = () => {
  useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [suscripcion, setSuscripcion] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [planes, setPlanes] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingPagos, setLoadingPagos] = useState(true);
  const [creandoPago, setCreandoPago] = useState(null); // null | 'mensual' | 'anual'

  useEffect(() => {
    fetchStatus();
    fetchPagos();
    axios.get(`${API}/cuenta/planes`).then(r => setPlanes(r.data)).catch(() => {});
  }, []);

  // Manejar retorno desde MercadoPago
  useEffect(() => {
    const pagoResult = searchParams.get('pago');
    if (pagoResult === 'success') {
      toast.success('¡Pago procesado correctamente! Tu suscripción fue actualizada.');
      fetchStatus();
      fetchPagos();
      setSearchParams({});
    } else if (pagoResult === 'failure') {
      toast.error('El pago no pudo completarse. Podés intentarlo nuevamente.');
      setSearchParams({});
    } else if (pagoResult === 'pending') {
      toast.info('Tu pago está siendo procesado. Te notificaremos cuando se acredite.');
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

  const handlePagar = async (planTipo = 'mensual') => {
    try {
      setCreandoPago(planTipo);
      const resp = await axios.post(`${API}/cuenta/pago/crear`, { plan_tipo: planTipo });
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
  const StatusIcon = statusConf?.icon || Clock;
  const showAlert = suscripcion && (
    statusNorm === 'vencida' ||
    enGracia ||
    (statusNorm !== 'suspendida' && statusNorm !== 'vencida' && suscripcion.dias_restantes <= 7)
  );

  const accionLabel = (statusNorm === 'vencida' || enGracia) ? 'Reactivar' : 'Renovar';

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Cuenta</h1>
          <p className="text-gray-600">Gestión de suscripción y pagos</p>
        </div>
        <button
          onClick={() => { fetchStatus(); fetchPagos(); }}
          className="btn btn-secondary"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Alerta de vencimiento */}
      {showAlert && !loadingStatus && (
        <div className={`mb-5 p-4 rounded-lg flex items-start gap-3 ${
          statusNorm === 'vencida'
            ? 'bg-red-50 border border-red-200 text-red-800'
            : enGracia
              ? 'bg-amber-50 border border-amber-300 text-amber-900'
              : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
        }`}>
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            {statusNorm === 'vencida' && !enGracia ? (
              fuePagada ? (
                <>
                  <p className="font-semibold">Tu suscripción ha vencido</p>
                  <p className="text-sm mt-0.5">El período de gracia también expiró. Realizá un pago para volver a operar.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Tu período de prueba ha vencido</p>
                  <p className="text-sm mt-0.5">Elegí un plan y realizá tu primer pago para continuar usando el sistema.</p>
                </>
              )
            ) : enGracia ? (
              <>
                <p className="font-semibold">
                  Tu suscripción venció — período de gracia activo
                </p>
                <p className="text-sm mt-0.5">
                  Podés seguir operando por{' '}
                  {suscripcion.dias_restantes > 0
                    ? `${suscripcion.dias_restantes} día${suscripcion.dias_restantes !== 1 ? 's' : ''} más`
                    : 'hoy'
                  }.{' '}
                  Si renovás ahora, tu ciclo se mantiene igual y la próxima fecha de pago no cambia.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">Tu suscripción vence en {suscripcion.dias_restantes} día{suscripcion.dias_restantes !== 1 ? 's' : ''}</p>
                <p className="text-sm mt-0.5">Renová antes de que expire para evitar interrupciones.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Card de estado de suscripción */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Estado de Suscripción
          </h2>

          {loadingStatus ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span>Cargando...</span>
            </div>
          ) : suscripcion ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Plan</p>
                <p className="font-semibold text-gray-900">{suscripcion.plan_nombre}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Estado</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConf?.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConf?.label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Vencimiento</p>
                <p className="font-semibold text-gray-900 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(suscripcion.fecha_vencimiento)}
                </p>
                {statusNorm !== 'suspendida' && (statusNorm !== 'vencida' || enGracia) && (
                  <p className={`text-xs mt-0.5 ${enGracia ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                    {enGracia
                      ? suscripcion.dias_restantes > 0
                        ? `${suscripcion.dias_restantes} días de gracia restantes`
                        : 'Gracia vence hoy'
                      : suscripcion.dias_restantes > 0
                        ? `${suscripcion.dias_restantes} días restantes`
                        : 'Vence hoy'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Precio</p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(suscripcion.precio, suscripcion.moneda)}
                  <span className="text-xs font-normal text-gray-500"> / mes</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No se encontró información de suscripción.</p>
          )}
        </div>

        {/* Selección de plan y botones de pago */}
        {suscripcion && statusNorm !== 'suspendida' && (
          <div className="px-6 pb-6 pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">Elegí tu plan:</p>
            <div className="flex flex-wrap gap-4">
              {/* Plan mensual */}
              <div className="flex-1 min-w-[200px] border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {planes?.mensual?.nombre ?? 'Plan Mensual'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {planes ? formatCurrency(planes.mensual.precio) : '—'}
                  </p>
                  <p className="text-xs text-gray-500">por mes</p>
                </div>
                <button
                  onClick={() => handlePagar('mensual')}
                  disabled={creandoPago !== null}
                  className="btn btn-primary flex items-center justify-center gap-2 w-full"
                >
                  {creandoPago === 'mensual' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Redirigiendo...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      {accionLabel} mensual
                    </>
                  )}
                </button>
              </div>

              {/* Plan anual */}
              <div className="flex-1 min-w-[200px] border border-gray-200 rounded-lg p-4 flex flex-col gap-3 relative">
                <span className="absolute -top-3 left-4 bg-green-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  1 mes gratis
                </span>
                <div>
                  <p className="font-semibold text-gray-900">
                    {planes?.anual?.nombre ?? 'Plan Anual'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {planes ? formatCurrency(planes.anual.precio) : '—'}
                  </p>
                  <p className="text-xs text-gray-500">por año (12 meses al precio de 11)</p>
                </div>
                <button
                  onClick={() => handlePagar('anual')}
                  disabled={creandoPago !== null}
                  className="btn btn-primary flex items-center justify-center gap-2 w-full"
                >
                  {creandoPago === 'anual' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Redirigiendo...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      {accionLabel} anual
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              Serás redirigido a MercadoPago para completar el pago de forma segura.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => handleSimularPago('mensual')}
                  className="btn btn-secondary text-xs border-dashed"
                >
                  [TEST] Simular mensual
                </button>
                <button
                  onClick={() => handleSimularPago('anual')}
                  className="btn btn-secondary text-xs border-dashed"
                >
                  [TEST] Simular anual
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historial de pagos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Historial de Pagos
          </h2>
        </div>

        {loadingPagos ? (
          <div className="p-6 flex items-center gap-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span>Cargando historial...</span>
          </div>
        ) : pagos.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No hay pagos registrados aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Concepto</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Monto</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">ID Pago MP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagos.map((pago) => {
                  const estadoConf = PAGO_ESTADO_CONFIG[pago.estado] || { label: pago.estado, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={pago.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                        {formatDate(pago.fecha)}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {pago.concepto}
                        {pago.periodo_inicio && pago.periodo_fin && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(pago.periodo_inicio)} — {formatDate(pago.periodo_fin)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(pago.monto, pago.moneda)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoConf.color}`}>
                          {estadoConf.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                        {pago.mp_payment_id || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cuenta;
