import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Calculator, 
  Lock, 
  Unlock,
  TrendingUp,
  FileText,
  AlertCircle,
  Clock
} from 'lucide-react';

const CashManager = () => {
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState(false);
  const [closingCash, setClosingCash] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const { user } = useContext(AuthContext);
  
  const [openForm, setOpenForm] = useState({
    monto_inicial: '',
    observaciones: ''
  });
  
  const [closeForm, setCloseForm] = useState({
    monto_final: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchCurrentSession();
  }, []);

  const fetchCurrentSession = async () => {
    try {
      const response = await axios.get(`${API}/cash-sessions/current`);
      setCurrentSession(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error('Error al verificar sesión de caja');
      }
    } finally {
      setLoading(false);
    }
  };

  const openCashSession = async () => {
    setOpeningCash(true);
    try {
      const response = await axios.post(`${API}/cash-sessions`, {
        monto_inicial: parseFloat(openForm.monto_inicial),
        observaciones: openForm.observaciones
      });
      setCurrentSession(response.data);
      setShowOpenModal(false);
      setOpenForm({ monto_inicial: '', observaciones: '' });
      toast.success('Caja abierta exitosamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al abrir caja');
    } finally {
      setOpeningCash(false);
    }
  };

  const closeCashSession = async () => {
    setClosingCash(true);
    try {
      const response = await axios.put(`${API}/cash-sessions/${currentSession.id}/close`, {
        monto_final: parseFloat(closeForm.monto_final),
        observaciones: closeForm.observaciones
      });
      setCurrentSession(null);
      setShowCloseModal(false);
      setCloseForm({ monto_final: '', observaciones: '' });
      toast.success('Caja cerrada exitosamente');
      
      // Show closing summary
      const diferencia = response.data.diferencia;
      if (diferencia !== 0) {
        const message = diferencia > 0 
          ? `Sobrante: $${diferencia.toFixed(2)}`
          : `Faltante: $${Math.abs(diferencia).toFixed(2)}`;
        toast.info(message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cerrar caja');
    } finally {
      setClosingCash(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
                    Monto inicial: ${currentSession.monto_inicial.toFixed(2)}
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
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <DollarSign className="w-6 h-6 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Ventas del día</p>
                    <p className="text-xl font-bold text-green-600">
                      ${currentSession.monto_ventas.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <Calculator className="w-6 h-6 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Total esperado</p>
                    <p className="text-xl font-bold text-blue-600">
                      ${(currentSession.monto_inicial + currentSession.monto_ventas - currentSession.monto_retiros).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <Clock className="w-6 h-6 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Tiempo abierta</p>
                    <p className="text-xl font-bold text-purple-600">
                      {Math.floor((new Date() - new Date(currentSession.fecha_apertura)) / (1000 * 60 * 60))}h
                    </p>
                  </div>
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
          to="/sales"
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

        <div className="group block p-6 bg-white rounded-lg shadow border-2 border-orange-200">
          <div className="flex items-center">
            <div className="bg-orange-500 p-3 rounded-lg text-white">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Ayuda
              </h3>
              <p className="text-sm text-gray-500">
                Soporte técnico
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Open Cash Modal */}
      {showOpenModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Abrir Caja</h3>
              <button onClick={() => setShowOpenModal(false)} className="modal-close">
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
                  onChange={(e) => setOpenForm({...openForm, monto_inicial: e.target.value})}
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
                  onChange={(e) => setOpenForm({...openForm, observaciones: e.target.value})}
                  placeholder="Notas adicionales sobre la apertura..."
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowOpenModal(false)}
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Cerrar Caja</h3>
              <button onClick={() => setShowCloseModal(false)} className="modal-close">
                ×
              </button>
            </div>

            <div className="p-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Resumen de la sesión</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>Monto inicial: ${currentSession?.monto_inicial.toFixed(2)}</p>
                  <p>Ventas del día: ${currentSession?.monto_ventas.toFixed(2)}</p>
                  <p>Retiros: ${currentSession?.monto_retiros.toFixed(2)}</p>
                  <p className="font-bold border-t border-blue-200 pt-1">
                    Total esperado: ${((currentSession?.monto_inicial || 0) + (currentSession?.monto_ventas || 0) - (currentSession?.monto_retiros || 0)).toFixed(2)}
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
                  onChange={(e) => setCloseForm({...closeForm, monto_final: e.target.value})}
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
                  onChange={(e) => setCloseForm({...closeForm, observaciones: e.target.value})}
                  placeholder="Notas sobre diferencias o incidentes..."
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCloseModal(false)}
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
    </div>
  );
};

export default CashManager;