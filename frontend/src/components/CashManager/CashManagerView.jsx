import React from 'react';
import { Link } from 'react-router-dom';
import Pagination from '../Pagination';
import {
  DollarSign,
  Calculator,
  Lock,
  Unlock,
  TrendingUp,
  FileText,
  BookOpen,
  Clock,
  History,
  Eye,
  Filter,
  Building2
} from 'lucide-react';

const CashManagerView = ({
  user,
  loading,
  currentSession,
  openingCash,
  closingCash,
  showOpenModal,
  showCloseModal,
  openModalClosing,
  closeModalClosing,
  openForm,
  closeForm,
  setShowOpenModal,
  setShowCloseModal,
  setOpenForm,
  setCloseForm,
  openCashSession,
  closeCashSession,
  closeOpenModal,
  closeCloseModal,
  formatDate,
  formatAmount,
  parseApiDate,
  sessionHistory,
  historyLoading,
  historyPage,
  historyTotal,
  historyTotalPages,
  historyPerPage,
  onHistoryPageChange,
  branches,
  historyBranchFilter,
  onBranchFilterChange,
  showAdminCloseModal,
  adminCloseTarget,
  adminCloseForm,
  setAdminCloseForm,
  adminCloseModalClosing,
  adminClosing,
  openAdminCloseModal,
  closeAdminCloseModal,
  adminCloseSession,
}) => {
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Caja
        </h1>
        <p className="text-gray-600">
          Cajero: {user?.nombre}
        </p>
      </div>

      {/* Current Session Status */}
      <div className="mb-8">
        {currentSession ? (
          <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Unlock className="w-8 h-8 text-green-600 mr-4" />
                <div>
                  <h2 className="text-xl font-semibold text-green-900">
                    Caja Abierta
                  </h2>
                  <p className="text-green-700">
                    Abierta: {formatDate(currentSession.fecha_apertura)}
                  </p>
                  <p className="text-green-700">
                    Monto inicial: ${formatAmount(currentSession.monto_inicial)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="btn btn-danger"
                  disabled={closingCash}
                >
                  <Lock className="w-4 h-4" />
                  Cerrar Caja
                </button>
              </div>
            </div>

            {/* Session Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-title">Ventas del día</div>
                  <div className="stat-icon">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
                <div className="stat-value">
                  ${formatAmount(currentSession.monto_ventas)}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-title">Total esperado</div>
                  <div className="stat-icon">
                    <Calculator className="w-6 h-6" />
                  </div>
                </div>
                <div className="stat-value">
                  ${formatAmount(currentSession.monto_inicial + currentSession.monto_ventas - currentSession.monto_retiros)}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-title">Tiempo abierta</div>
                  <div className="stat-icon">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
                <div className="stat-value">
                  {Math.floor((new Date() - parseApiDate(currentSession.fecha_apertura)) / (1000 * 60 * 60))}h
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Lock className="w-8 h-8 text-red-600 mr-4" />
                <div>
                  <h2 className="text-xl font-semibold text-red-900">
                    Caja Cerrada
                  </h2>
                  <p className="text-red-700">
                    Debe abrir la caja antes de realizar ventas
                  </p>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="btn btn-primary"
                  disabled={openingCash}
                >
                  <Unlock className="w-4 h-4" />
                  Abrir Caja
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/pos"
          className={`group block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 ${
            currentSession ? 'border-green-200 hover:border-green-300' : 'border-gray-200 opacity-50 pointer-events-none'
          }`}
        >
          <div className="flex items-center">
            <div className="bg-green-500 p-3 rounded-lg text-white group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Realizar Venta
              </h3>
              <p className="text-sm text-gray-500">
                Procesar cobros
              </p>
            </div>
          </div>
        </Link>

        <Link
          to={currentSession ? `/cash-report/${currentSession.id}` : '#'}
          className={`group block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 ${
            currentSession ? 'border-blue-200 hover:border-blue-300' : 'border-gray-200 opacity-50 pointer-events-none'
          }`}
        >
          <div className="flex items-center">
            <div className="bg-blue-500 p-3 rounded-lg text-white group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Reporte de Caja
              </h3>
              <p className="text-sm text-gray-500">
                Ver movimientos
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/sales?from=caja"
          className="group block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-purple-200 hover:border-purple-300"
        >
          <div className="flex items-center">
            <div className="bg-purple-500 p-3 rounded-lg text-white group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Historial
              </h3>
              <p className="text-sm text-gray-500">
                Ver ventas pasadas
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/manual"
          className="group block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-orange-200 hover:border-orange-300"
        >
          <div className="flex items-center">
            <div className="bg-orange-500 p-3 rounded-lg text-white group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Ayuda
              </h3>
              <p className="text-sm text-gray-500">
                Manual del sistema
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Historial de cajas — solo admin */}
      {user?.rol === 'admin' && (
        <div className="mt-8">
          <div className="flex items-center mb-4">
            <History className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Historial de Cajas</h2>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">Filtrar por:</span>
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <select
                  className="form-select"
                  value={historyBranchFilter}
                  onChange={(e) => onBranchFilterChange(e.target.value)}
                >
                  <option value="">Todas las sucursales</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-8">
              <div className="spinner w-6 h-6" />
            </div>
          ) : sessionHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No hay sesiones de caja registradas.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Cajero</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Apertura</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Cierre</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">M. Inicial</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Ventas</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Retiros</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">M. Final</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Diferencia</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sessionHistory.map((s) => {
                      const isOpen = s.status === 'abierta';
                      const duracion = (() => {
                        const desde = parseApiDate(s.fecha_apertura);
                        const hasta = s.fecha_cierre ? parseApiDate(s.fecha_cierre) : new Date();
                        const mins = Math.floor((hasta - desde) / 60000);
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return h > 0 ? `${h}h ${m}m` : `${m}m`;
                      })();

                      return (
                        <tr key={s.id} className={isOpen ? 'bg-green-50' : ''}>
                          <td className="px-4 py-3 font-medium text-gray-900">{s.user_nombre}</td>
                          <td className="px-4 py-3 text-gray-600">{s.branch_nombre}</td>
                          <td className="px-4 py-3">
                            {isOpen ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Abierta · {duracion}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                Cerrada · {duracion}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(s.fecha_apertura)}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {s.fecha_cierre ? formatDate(s.fecha_cierre) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">${formatAmount(s.monto_inicial)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">${formatAmount(s.monto_ventas)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">${formatAmount(s.monto_retiros)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {s.monto_final != null ? `$${formatAmount(s.monto_final)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {s.diferencia != null ? (
                              <span className={s.diferencia >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {s.diferencia >= 0 ? '+' : ''}${formatAmount(s.diferencia)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                to={`/cash-report/${s.id}`}
                                className="inline-flex items-center justify-center w-8 h-8 rounded transition-opacity hover:opacity-80"
                                style={{ background: 'var(--secondary)', color: 'var(--secondary-text)' }}
                                title="Ver detalle"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {s.status === 'abierta' && (
                                <button
                                  onClick={() => openAdminCloseModal(s)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded transition-opacity hover:opacity-80"
                                  style={{ background: 'var(--tertiary)', color: 'var(--tertiary-text)' }}
                                  title="Cerrar caja"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={historyPage}
                totalPages={historyTotalPages}
                totalItems={historyTotal}
                itemsPerPage={historyPerPage}
                onPageChange={onHistoryPageChange}
                itemName="sesiones"
              />
            </div>
          )}
        </div>
      )}

      {/* Open Cash Modal */}
      {showOpenModal && (
        <div className={`modal-overlay${openModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content modal-content-bounce${openModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title">Abrir Caja</h3>
              <button onClick={closeOpenModal} className="modal-close">
                ×
              </button>
            </div>

            <div className="p-4">
              <div className="form-group">
                <label className="form-label">Monto Inicial *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={openForm.monto_inicial}
                  onChange={(e) => setOpenForm({ ...openForm, monto_inicial: e.target.value })}
                  placeholder="0.00"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Dinero en efectivo con el que inicia la caja
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={openForm.observaciones}
                  onChange={(e) => setOpenForm({ ...openForm, observaciones: e.target.value })}
                  placeholder="Notas adicionales sobre la apertura..."
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeOpenModal}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={openCashSession}
                  disabled={!openForm.monto_inicial || openingCash}
                  className="btn btn-primary"
                >
                  {openingCash ? (
                    <>
                      <div className="spinner w-4 h-4" />
                      Abriendo...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      Abrir Caja
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Cash Modal */}
      {showCloseModal && (
        <div className={`modal-overlay${closeModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content modal-content-bounce${closeModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title">Cerrar Caja</h3>
              <button onClick={closeCloseModal} className="modal-close">
                ×
              </button>
            </div>

            <div className="p-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Resumen de la sesión</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>Monto inicial: ${formatAmount(currentSession?.monto_inicial)}</p>
                  <p>Ventas del día: ${formatAmount(currentSession?.monto_ventas)}</p>
                  <p>Retiros: ${formatAmount(currentSession?.monto_retiros)}</p>
                  <p className="font-bold border-t border-blue-200 pt-1">
                    Total esperado: ${formatAmount((currentSession?.monto_inicial || 0) + (currentSession?.monto_ventas || 0) - (currentSession?.monto_retiros || 0))}
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Monto Final en Caja *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={closeForm.monto_final}
                  onChange={(e) => setCloseForm({ ...closeForm, monto_final: e.target.value })}
                  placeholder="0.00"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Dinero real contado en la caja
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={closeForm.observaciones}
                  onChange={(e) => setCloseForm({ ...closeForm, observaciones: e.target.value })}
                  placeholder="Notas sobre diferencias o incidentes..."
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeCloseModal}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={closeCashSession}
                  disabled={!closeForm.monto_final || closingCash}
                  className="btn btn-danger"
                >
                  {closingCash ? (
                    <>
                      <div className="spinner w-4 h-4" />
                      Cerrando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Cerrar Caja
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Admin Close Modal */}
      {showAdminCloseModal && adminCloseTarget && (
        <div className={`modal-overlay${adminCloseModalClosing ? ' closing' : ''}`}>
          <div className={`modal-content modal-content-bounce${adminCloseModalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title">Cerrar Caja — {adminCloseTarget.user_nombre}</h3>
              <button onClick={closeAdminCloseModal} className="modal-close">×</button>
            </div>

            <div className="p-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-yellow-900 mb-2">Resumen de la sesión</h4>
                <div className="space-y-1 text-sm text-yellow-800">
                  <p>Cajero: <span className="font-medium">{adminCloseTarget.user_nombre}</span></p>
                  <p>Sucursal: <span className="font-medium">{adminCloseTarget.branch_nombre}</span></p>
                  <p>Monto inicial: ${formatAmount(adminCloseTarget.monto_inicial)}</p>
                  <p>Ventas: ${formatAmount(adminCloseTarget.monto_ventas)}</p>
                  <p>Retiros: ${formatAmount(adminCloseTarget.monto_retiros)}</p>
                  <p className="font-bold border-t border-yellow-200 pt-1">
                    Total esperado: ${formatAmount(
                      (adminCloseTarget.monto_inicial || 0) +
                      (adminCloseTarget.monto_ventas || 0) -
                      (adminCloseTarget.monto_retiros || 0)
                    )}
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Monto Final en Caja *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={adminCloseForm.monto_final}
                  onChange={(e) => setAdminCloseForm({ ...adminCloseForm, monto_final: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={adminCloseForm.observaciones}
                  onChange={(e) => setAdminCloseForm({ ...adminCloseForm, observaciones: e.target.value })}
                  placeholder="Motivo del cierre administrativo..."
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={closeAdminCloseModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={adminCloseSession}
                  disabled={!adminCloseForm.monto_final || adminClosing}
                  className="btn btn-danger"
                >
                  {adminClosing ? (
                    <><div className="spinner w-4 h-4" /> Cerrando...</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Cerrar Caja</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashManagerView;
