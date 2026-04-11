import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { formatAmount, parseApiDate } from '../../lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import CashReportView from './CashReportView';

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
    const date = parseApiDate(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `$${formatAmount(amount)}`;
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

  return (
    <CashReportView
      loading={loading}
      report={report}
      generatingPdf={generatingPdf}
      handlePrint={handlePrint}
      formatDate={formatDate}
      formatCurrency={formatCurrency}
    />
  );
};

export default CashReport;
