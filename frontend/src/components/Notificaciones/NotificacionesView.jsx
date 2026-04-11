import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Clock, AlertTriangle, Check, RefreshCw } from 'lucide-react';

const ICON_MAP = {
  Clock,
  AlertTriangle,
  Bell,
};

const NotificacionesView = ({
  loading,
  notificaciones,
  total,
  noLeidas,
  marcandoTodas,
  tipoConfig,
  formatFecha,
  onRefresh,
  onMarcarLeida,
  onMarcarTodasLeidas,
}) => {
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notificaciones
          </h1>
          {noLeidas > 0 && (
            <p className="text-sm text-indigo-600 mt-1">
              {noLeidas} sin leer
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {noLeidas > 0 && (
            <button
              onClick={onMarcarTodasLeidas}
              disabled={marcandoTodas}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {notificaciones.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow border border-gray-100">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tenés notificaciones</p>
          <p className="text-gray-400 text-sm mt-1">Estás al día con tu plan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notificaciones.map((notif) => {
            const cfg = tipoConfig[notif.tipo] || {
              label: notif.tipo,
              icon: 'Bell',
              color: 'text-gray-600',
              bg: 'bg-gray-50 border-gray-200',
              iconBg: 'bg-gray-100',
            };
            const IconComp = ICON_MAP[cfg.icon] || Bell;
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  notif.leida
                    ? 'bg-white border-gray-100 opacity-70'
                    : `${cfg.bg} shadow-sm`
                }`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${notif.leida ? 'bg-gray-100' : cfg.iconBg}`}>
                  <IconComp className={`w-5 h-5 ${notif.leida ? 'text-gray-400' : cfg.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-semibold text-sm ${notif.leida ? 'text-gray-500' : 'text-gray-900'}`}>
                        {notif.titulo}
                        {!notif.leida && (
                          <span className="ml-2 inline-block w-2 h-2 bg-indigo-500 rounded-full align-middle"></span>
                        )}
                      </p>
                      <p className={`text-sm mt-0.5 ${notif.leida ? 'text-gray-400' : 'text-gray-600'}`}>
                        {notif.mensaje}
                      </p>
                    </div>
                    {!notif.leida && (
                      <button
                        onClick={() => onMarcarLeida(notif.id)}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Marcar como leída"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">{formatFecha(notif.fecha)}</p>
                </div>
              </div>
            );
          })}

          {total > 50 && (
            <p className="text-center text-sm text-gray-400 py-2">
              Mostrando las últimas 50 notificaciones
            </p>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <p className="text-sm text-indigo-700">
          ¿Tu plan está por vencer?{' '}
          <Link to="/cuenta" className="font-semibold underline hover:text-indigo-900">
            Renovalo desde Cuenta →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default NotificacionesView;
