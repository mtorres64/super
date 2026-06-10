import React from 'react';
import {
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  User,
  MapPin,
  Calendar,
  Calculator,
  AlertCircle,
  CheckCircle,
  Printer,
  ArrowLeft
} from 'lucide-react';
import SortIcon from '../ui/SortIcon';
import { useSortableData } from '../../hooks/useSortableData';

const CashReportView = ({
  loading,
  report,
  generatingPdf,
  handlePrint,
  handleBack,
  formatDate,
  formatCurrency,
}) => {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reporte no encontrado</h2>
          <p className="text-gray-600">No se pudo cargar el reporte de caja solicitado.</p>
        </div>
      </div>
    );
  }

  const { session, movements: rawMovements, user, branch, resumen } = report;
  const isClosed = session.status === 'cerrada';
  const { sortedItems: movements, sortConfig, requestSort } = useSortableData(rawMovements || []);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {handleBack && (
          <button
            onClick={handleBack}
            className="btn btn-secondary flex items-center gap-2 mb-4 print:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Reportes de Caja
          </button>
        )}
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg mb-6 print:shadow-none overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Reporte de Arqueo de Caja
                </p>
                <div className="flex flex-wrap items-center gap-2 text-gray-900">
                  <span className="flex items-center gap-1.5 text-xl font-bold">
                    <User className="w-5 h-5 text-gray-400" />
                    {user?.nombre}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="flex items-center gap-1.5 text-xl font-semibold">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    {branch?.nombre}
                  </span>
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                    {isClosed ? 'Cerrada' : 'Abierta'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  ID sesión: {session.id.slice(0, 8).toUpperCase()}
                  {branch?.direccion && <span> · {branch.direccion}</span>}
                </p>
              </div>
              <button
                onClick={handlePrint}
                disabled={generatingPdf}
                className="btn btn-secondary print:hidden flex items-center gap-2 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                {generatingPdf ? 'Generando PDF...' : 'Descargar PDF'}
              </button>
            </div>
          </div>

          <div className="p-6">

          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Cajero</p>
                  <p className="font-medium">{user?.nombre}</p>
                </div>
              </div>

              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Sucursal</p>
                  <p className="font-medium">{branch?.nombre}</p>
                  <p className="text-xs text-gray-500">{branch?.direccion}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Apertura</p>
                  <p className="font-medium">{formatDate(session.fecha_apertura)}</p>
                </div>
              </div>

              {isClosed && (
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Cierre</p>
                    <p className="font-medium">{formatDate(session.fecha_cierre)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                {isClosed ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                )}
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <p className={`font-medium capitalize ${
                    isClosed ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {session.status}
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>{/* /p-6 */}
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 print:shadow-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            <Calculator className="w-6 h-6 inline mr-2" />
            Resumen Financiero
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Monto Inicial</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {formatCurrency(session.monto_inicial)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Ventas</p>
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(session.monto_ventas)}
                  </p>
                  <p className="text-xs text-green-600">{resumen.total_ventas} transacciones</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Esperado</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {formatCurrency(session.monto_esperado || (session.monto_inicial + session.monto_ventas - session.monto_retiros))}
                  </p>
                </div>
                <Calculator className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            {isClosed && (
              <div className={`p-4 rounded-lg ${
                session.diferencia === 0
                  ? 'bg-green-50'
                  : session.diferencia > 0
                  ? 'bg-yellow-50'
                  : 'bg-red-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      session.diferencia === 0
                        ? 'text-green-600'
                        : session.diferencia > 0
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {session.diferencia === 0 ? 'Exacto' : session.diferencia > 0 ? 'Sobrante' : 'Faltante'}
                    </p>
                    <p className={`text-2xl font-bold ${
                      session.diferencia === 0
                        ? 'text-green-800'
                        : session.diferencia > 0
                        ? 'text-yellow-800'
                        : 'text-red-800'
                    }`}>
                      {formatCurrency(Math.abs(session.diferencia || 0))}
                    </p>
                    <p className={`text-xs ${
                      session.diferencia === 0
                        ? 'text-green-600'
                        : session.diferencia > 0
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      Final: {formatCurrency(session.monto_final || 0)}
                    </p>
                  </div>
                  {session.diferencia === 0 ? (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  ) : (
                    <AlertCircle className={`w-8 h-8 ${
                      session.diferencia > 0 ? 'text-yellow-400' : 'text-red-400'
                    }`} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 print:shadow-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Desglose por Método de Pago
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Efectivo</p>
                  <p className="text-xl font-bold text-green-800">
                    {formatCurrency(resumen.ingresos_efectivo)}
                  </p>
                </div>
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Tarjeta</p>
                  <p className="text-xl font-bold text-blue-800">
                    {formatCurrency(resumen.ingresos_tarjeta)}
                  </p>
                </div>
                <div className="w-6 h-6 bg-blue-400 rounded"></div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Transferencia</p>
                  <p className="text-xl font-bold text-purple-800">
                    {formatCurrency(resumen.ingresos_transferencia)}
                  </p>
                </div>
                <div className="w-6 h-6 bg-purple-400 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Movements Table */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 print:shadow-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Movimientos de Caja
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th onClick={() => requestSort('fecha')} className="text-left py-2 cursor-pointer select-none hover:bg-gray-50">Fecha <SortIcon columnKey="fecha" sortConfig={sortConfig} /></th>
                  <th onClick={() => requestSort('tipo')} className="text-left py-2 cursor-pointer select-none hover:bg-gray-50">Tipo <SortIcon columnKey="tipo" sortConfig={sortConfig} /></th>
                  <th className="text-left py-2">Descripción</th>
                  <th onClick={() => requestSort('monto')} className="text-right py-2 cursor-pointer select-none hover:bg-gray-50">Monto <SortIcon columnKey="monto" sortConfig={sortConfig} /></th>
                </tr>
              </thead>
              <tbody>
                {movements.map(movement => (
                  <tr key={movement.id} className="border-b border-gray-100">
                    <td data-mobile="title" className="py-2 text-sm">
                      {formatDate(movement.fecha)}
                    </td>
                    <td data-label="Tipo" className="py-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        movement.tipo === 'apertura' ? 'bg-blue-100 text-blue-800' :
                        movement.tipo === 'venta' ? 'bg-green-100 text-green-800' :
                        movement.tipo === 'retiro' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {movement.tipo}
                      </span>
                    </td>
                    <td data-label="Descripción" className="py-2 text-sm">{movement.descripcion}</td>
                    <td data-label="Monto" className="py-2 text-right font-medium">
                      {formatCurrency(movement.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Observations */}
        {(session.observaciones || (isClosed && session.observaciones)) && (
          <div className="bg-white rounded-lg shadow-lg p-6 print:shadow-none">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Observaciones
            </h2>
            <div className="bg-gray-50 rounded p-4">
              <p className="text-gray-700">
                {session.observaciones || 'Sin observaciones'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body { font-size: 12px; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default CashReportView;
