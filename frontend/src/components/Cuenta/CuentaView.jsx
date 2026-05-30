import React, { useState } from 'react';
import SortIcon from '../ui/SortIcon';
import {
  AlertCircle,
  Clock,
  CreditCard,
  Calendar,
  RefreshCw,
  ExternalLink,
  Zap,
  ZapOff,
  CheckCircle2,
  X,
} from 'lucide-react';

const WA_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TIER_CONFIG = [
  {
    key: 'emprendedor',
    label: 'Emprendedor',
    badgeCls: 'bg-emerald-100 text-emerald-700',
    features: ['POS / Ventas', 'Caja', 'Inventario', 'Notificaciones'],
  },
  {
    key: 'profesional',
    label: 'Profesional',
    badgeCls: 'bg-blue-100 text-blue-700',
    features: ['Todo Emprendedor', 'Reportes de Ventas', 'Compras y Proveedores', 'Alertas de Stock', 'Usuarios y Roles', 'Configuración'],
  },
  {
    key: 'empresarial',
    label: 'Empresarial',
    badgeCls: 'bg-violet-100 text-violet-700',
    features: ['Todo Profesional', 'Multi-sucursal'],
  },
];

const PlanSelector = ({ planes, suscripcion, creandoPago, whatsappNumero, accionLabel, formatCurrency, onPagar }) => {
  const [modalTier, setModalTier] = useState(null);
  const tierData = modalTier ? planes?.tiers?.[modalTier.key] : null;

  return (
    <>
      <div className="px-6 pb-6 pt-4 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-3">Elegí tu plan:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIER_CONFIG.map((tier) => {
            const { key, label, badgeCls, features } = tier;
            const priceMensual = planes?.tiers?.[key]?.precio_mensual;
            const isCurrentTier = suscripcion?.plan_tier === key;
            return (
              <div
                key={key}
                className="border rounded-xl overflow-hidden flex flex-col"
                style={isCurrentTier ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 1px var(--primary)' } : {}}
              >
                {isCurrentTier && (
                  <div className="px-4 py-1 text-center" style={{ background: 'var(--primary)' }}>
                    <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--primary-text)' }}>Plan actual</span>
                  </div>
                )}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{label}</p>
                    <ul className="mt-2 space-y-0.5">
                      {features.map(f => (
                        <li key={f} className="text-xs text-gray-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-t border-gray-100 pt-3 mt-auto">
                    <p className="text-lg font-bold text-gray-900 mb-2">
                      {priceMensual != null ? formatCurrency(priceMensual) : '—'}
                      <span className="text-xs font-normal text-gray-500"> / mes</span>
                    </p>
                    <button
                      onClick={() => setModalTier(tier)}
                      className="btn btn-primary w-full text-sm"
                    >
                      Elegir plan
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Serás redirigido a MercadoPago para completar el pago de forma segura.
        </p>
      </div>

      {/* Modal de período */}
      {modalTier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setModalTier(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${modalTier.badgeCls}`}>
                  {modalTier.label}
                </span>
                <p className="text-sm font-medium text-gray-700 mt-1">Elegí la frecuencia de pago</p>
              </div>
              <button onClick={() => setModalTier(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Opciones */}
            <div className="p-5 flex flex-col gap-3">
              {/* Mensual */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Mensual</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {tierData?.precio_mensual != null ? formatCurrency(tierData.precio_mensual) : '—'}
                      <span className="text-xs font-normal text-gray-500"> / mes</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onPagar('mensual', modalTier.key); setModalTier(null); }}
                    disabled={creandoPago !== null}
                    className="btn btn-primary flex items-center gap-2 flex-1 text-sm justify-center"
                  >
                    {creandoPago === `${modalTier.key}-mensual` ? (
                      <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> Redirigiendo...</>
                    ) : (
                      <><ExternalLink className="w-3.5 h-3.5" /> {accionLabel} mensual</>
                    )}
                  </button>
                  {whatsappNumero && (
                    <a
                      href={`https://wa.me/${whatsappNumero.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      title="Pagar por transferencia"
                      className="flex items-center justify-center px-3 self-stretch rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] transition-colors shrink-0"
                    >
                      {WA_ICON}
                    </a>
                  )}
                </div>
              </div>

              {/* Anual */}
              <div className="border border-gray-200 rounded-xl p-4 relative">
                <span className="absolute -top-2.5 right-4 bg-green-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  1 mes gratis
                </span>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Anual</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {tierData?.precio_anual != null ? formatCurrency(tierData.precio_anual) : '—'}
                      <span className="text-xs font-normal text-gray-500"> / año</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">12 meses al precio de 11</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onPagar('anual', modalTier.key); setModalTier(null); }}
                    disabled={creandoPago !== null}
                    className="btn btn-primary flex items-center gap-2 flex-1 text-sm justify-center"
                  >
                    {creandoPago === `${modalTier.key}-anual` ? (
                      <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> Redirigiendo...</>
                    ) : (
                      <><ExternalLink className="w-3.5 h-3.5" /> {accionLabel} anual</>
                    )}
                  </button>
                  {whatsappNumero && (
                    <a
                      href={`https://wa.me/${whatsappNumero.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      title="Pagar por transferencia"
                      className="flex items-center justify-center px-3 self-stretch rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] transition-colors shrink-0"
                    >
                      {WA_ICON}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const CuentaView = ({
  suscripcion,
  pagos,
  planes,
  loadingStatus,
  loadingPagos,
  creandoPago,
  gestionandoAuto,
  whatsappNumero,
  statusNorm,
  enGracia,
  fuePagada,
  statusConf,
  showAlert,
  accionLabel,
  PAGO_ESTADO_CONFIG,
  formatDate,
  formatCurrency,
  onRefresh,
  onPagar,
  onSimularPago,
  onActivarSuscripcionAuto,
  onCancelarSuscripcionAuto,
  sortConfig,
  requestSort,
}) => {
  const StatusIcon = statusConf?.icon || Clock;

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Cuenta</h1>
          <p className="text-gray-600">Gestión de suscripción y pagos</p>
        </div>
        <button
          onClick={onRefresh}
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
                {suscripcion.plan_tier && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    suscripcion.plan_tier === 'empresarial' ? 'bg-violet-100 text-violet-700' :
                    suscripcion.plan_tier === 'profesional' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {{
                      emprendedor: 'Emprendedor',
                      profesional: 'Profesional',
                      empresarial: 'Empresarial',
                    }[suscripcion.plan_tier] ?? suscripcion.plan_tier}
                  </span>
                )}
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
                  {formatCurrency(
                    planes?.tiers?.[suscripcion.plan_tier]?.precio_mensual ?? suscripcion.precio,
                    suscripcion.moneda
                  )}
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
          <>
          <PlanSelector
            planes={planes}
            suscripcion={suscripcion}
            creandoPago={creandoPago}
            whatsappNumero={whatsappNumero}
            accionLabel={accionLabel}
            formatCurrency={formatCurrency}
            onPagar={onPagar}
          />

            {/* ── Débito automático ──────────────────────────────────────── */}
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              {(() => {
                const tipoCobro = suscripcion?.tipo_cobro || 'manual';
                const esAutomatico = tipoCobro === 'automatico';
                const pendienteAuth = tipoCobro === 'pendiente_autorizacion';
                const diaFact = suscripcion?.dia_facturacion;

                return (
                  <div className={`rounded-lg p-4 ${esAutomatico ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        {esAutomatico ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                          <Zap className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {esAutomatico ? 'Débito automático activo' : 'Débito automático'}
                          </p>
                          {esAutomatico ? (
                            <p className="text-xs text-green-700 mt-0.5">
                              Tu suscripción se renueva automáticamente cada mes
                              {diaFact ? ` el día ${diaFact}` : ''}.
                              No tenés que hacer nada.
                            </p>
                          ) : pendienteAuth ? (
                            <p className="text-xs text-amber-700 mt-0.5">
                              Autorización pendiente — completá el proceso en MercadoPago para activar el cobro automático.
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Activá el débito automático y olvidate de renovar cada mes.
                              MP cobra solo el día {diaFact || 'de tu ciclo'} sin que tengas que hacer nada.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {esAutomatico ? (
                          <button
                            onClick={onCancelarSuscripcionAuto}
                            disabled={gestionandoAuto !== false}
                            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {gestionandoAuto === 'cancelando' ? (
                              <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-500" /> Cancelando...</>
                            ) : (
                              <><ZapOff className="w-3.5 h-3.5" /> Cancelar débito auto</>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={onActivarSuscripcionAuto}
                            disabled={gestionandoAuto !== false || creandoPago !== null}
                            className="btn btn-primary flex items-center gap-1.5 text-sm"
                          >
                            {gestionandoAuto === 'activando' ? (
                              <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> Redirigiendo...</>
                            ) : (
                              <><Zap className="w-3.5 h-3.5" /> Activar débito automático</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => onSimularPago('mensual')} className="btn btn-secondary text-xs border-dashed">
                  [TEST] Simular mensual
                </button>
                <button onClick={() => onSimularPago('anual')} className="btn btn-secondary text-xs border-dashed">
                  [TEST] Simular anual
                </button>
              </div>
            )}
          </>
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
                  <th onClick={() => requestSort('fecha')} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100">Fecha <SortIcon columnKey="fecha" sortConfig={sortConfig} /></th>
                  <th onClick={() => requestSort('concepto')} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100">Concepto <SortIcon columnKey="concepto" sortConfig={sortConfig} /></th>
                  <th onClick={() => requestSort('monto')} className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100">Monto <SortIcon columnKey="monto" sortConfig={sortConfig} /></th>
                  <th onClick={() => requestSort('estado')} className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100">Estado <SortIcon columnKey="estado" sortConfig={sortConfig} /></th>
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

export default CuentaView;
