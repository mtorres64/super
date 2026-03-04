import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
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
  Printer
} from 'lucide-react';

const CashReport = () => {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchReport();
    }
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      const response = await axios.get(`${API}/cash-sessions/${sessionId}/report`);
      setReport(response.data);
    } catch (error) {
      toast.error('Error al cargar el reporte');
    } finally {
      setLoading(false);
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

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const handlePrint = () => {
    setGeneratingPdf(true);
    try {
      const { session, movements, user, branch, resumen } = report;
      const isClosed = session.status === 'cerrada';
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210;
      const margin = 20;
      const colRight = W - margin;
      let y = 0;

      // Helpers
      const line = (y1) => {
        pdf.setDrawColor(180);
        pdf.line(margin, y1, colRight, y1);
      };
      const sectionTitle = (text, yPos) => {
        pdf.setFillColor(40, 40, 40);
        pdf.rect(margin, yPos, colRight - margin, 7, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(text, margin + 3, yPos + 5);
        pdf.setTextColor(0, 0, 0);
        return yPos + 10;
      };
      const row = (label, value, yPos, bold = false) => {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.text(label, margin + 2, yPos);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.text(value, colRight - 2, yPos, { align: 'right' });
        return yPos + 6;
      };

      // ── ENCABEZADO ──────────────────────────────────────
      pdf.setFillColor(20, 20, 20);
      pdf.rect(0, 0, W, 28, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPORTE DE ARQUEO DE CAJA', W / 2, 13, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Sesión: ${session.id.slice(0, 8).toUpperCase()}   |   ${branch?.nombre || ''}   |   ${branch?.direccion || ''}`, W / 2, 22, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      y = 34;

      // ── DATOS DE SESIÓN ──────────────────────────────────
      y = sectionTitle('DATOS DE LA SESIÓN', y);
      y = row('Cajero', user?.nombre || '-', y);
      y = row('Sucursal', branch?.nombre || '-', y);
      y = row('Apertura', formatDate(session.fecha_apertura), y);
      if (isClosed) y = row('Cierre', formatDate(session.fecha_cierre), y);
      y = row('Estado', session.status.toUpperCase(), y, true);
      y += 4;

      // ── RESUMEN FINANCIERO ────────────────────────────────
      y = sectionTitle('RESUMEN FINANCIERO', y);
      y = row('Monto inicial', formatCurrency(session.monto_inicial), y);
      y = row(`Ventas (${resumen.total_ventas} transacciones)`, formatCurrency(session.monto_ventas), y);
      y = row('Retiros', formatCurrency(session.monto_retiros || 0), y);
      line(y); y += 2;
      y = row('Total esperado en caja', formatCurrency(session.monto_esperado || (session.monto_inicial + session.monto_ventas - (session.monto_retiros || 0))), y, true);
      if (isClosed) {
        y = row('Monto final contado', formatCurrency(session.monto_final || 0), y);
        const dif = session.diferencia || 0;
        const difLabel = dif === 0 ? 'Sin diferencia' : dif > 0 ? 'Sobrante' : 'Faltante';
        y = row(`Diferencia (${difLabel})`, formatCurrency(Math.abs(dif)), y, true);
      }
      y += 4;

      // ── DESGLOSE POR MÉTODO DE PAGO ───────────────────────
      y = sectionTitle('DESGLOSE POR MÉTODO DE PAGO', y);
      y = row('Efectivo', formatCurrency(resumen.ingresos_efectivo), y);
      y = row('Tarjeta', formatCurrency(resumen.ingresos_tarjeta), y);
      y = row('Transferencia', formatCurrency(resumen.ingresos_transferencia), y);
      y += 4;

      // ── MOVIMIENTOS DE CAJA ────────────────────────────────
      y = sectionTitle('MOVIMIENTOS DE CAJA', y);

      // Cabecera de tabla
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, y, colRight - margin, 6, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Fecha', margin + 2, y + 4);
      pdf.text('Tipo', margin + 45, y + 4);
      pdf.text('Descripción', margin + 70, y + 4);
      pdf.text('Monto', colRight - 2, y + 4, { align: 'right' });
      y += 7;

      pdf.setFont('helvetica', 'normal');
      movements.forEach((mov, i) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        if (i % 2 === 0) {
          pdf.setFillColor(248, 248, 248);
          pdf.rect(margin, y - 1, colRight - margin, 6, 'F');
        }
        pdf.setFontSize(8);
        pdf.text(formatDate(mov.fecha), margin + 2, y + 3);
        pdf.text(mov.tipo, margin + 45, y + 3);
        const desc = pdf.splitTextToSize(mov.descripcion || '-', 50);
        pdf.text(desc[0], margin + 70, y + 3);
        pdf.text(formatCurrency(mov.monto), colRight - 2, y + 3, { align: 'right' });
        y += 6;
      });
      y += 4;

      // ── OBSERVACIONES ─────────────────────────────────────
      if (session.observaciones) {
        if (y > 250) { pdf.addPage(); y = 20; }
        y = sectionTitle('OBSERVACIONES', y);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(session.observaciones, colRight - margin - 4);
        pdf.text(lines, margin + 2, y);
        y += lines.length * 5 + 4;
      }

      // ── PIE DE PÁGINA ──────────────────────────────────────
      const totalPages = pdf.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setDrawColor(180);
        pdf.line(margin, 285, colRight, 285);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`Generado el ${new Date().toLocaleString('es-ES')}`, margin, 290);
        pdf.text(`Página ${p} de ${totalPages}`, colRight, 290, { align: 'right' });
      }

      pdf.save(`reporte-caja-${session.id.slice(0, 8)}.pdf`);
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

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

  const { session, movements, sales, user, branch, resumen } = report;
  const isClosed = session.status === 'cerrada';

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 print:shadow-none">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                <FileText className="w-8 h-8 inline mr-2" />
                Reporte de Arqueo de Caja
              </h1>
              <p className="text-gray-600">
                Sesión ID: {session.id.slice(0, 8)}...
              </p>
            </div>
            
            <button
              onClick={handlePrint}
              disabled={generatingPdf}
              className="btn btn-secondary print:hidden flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {generatingPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          </div>

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
                  <th className="text-left py-2">Fecha</th>
                  <th className="text-left py-2">Tipo</th>
                  <th className="text-left py-2">Descripción</th>
                  <th className="text-right py-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(movement => (
                  <tr key={movement.id} className="border-b border-gray-100">
                    <td className="py-2 text-sm">
                      {formatDate(movement.fecha)}
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        movement.tipo === 'apertura' ? 'bg-blue-100 text-blue-800' :
                        movement.tipo === 'venta' ? 'bg-green-100 text-green-800' :
                        movement.tipo === 'retiro' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {movement.tipo}
                      </span>
                    </td>
                    <td className="py-2 text-sm">{movement.descripcion}</td>
                    <td className="py-2 text-right font-medium">
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

export default CashReport;