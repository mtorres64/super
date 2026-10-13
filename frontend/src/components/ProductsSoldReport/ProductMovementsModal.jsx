import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { X, TrendingUp, Package, Receipt, Building2, Printer } from 'lucide-react';
import { API } from '../../App';
import { formatAmount, parseApiDate } from '../../lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import TicketModal from '../TicketModal';

const formatPeriodDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

const ProductMovementsModal = ({
  producto, fechaDesde, fechaHasta, branchId, branches,
  closing, onClose, config, afipConfig,
}) => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketSale, setTicketSale] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!producto || !fechaDesde || !fechaHasta) return;
    let cancelled = false;
    setLoading(true);
    axios.get(`${API}/reportes/productos-vendidos/movimientos`, {
      params: {
        producto_nombre: producto,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        branch_id: branchId,
      },
    })
      .then(r => { if (!cancelled) setVentas(r.data); })
      .catch(() => { if (!cancelled) setVentas([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [producto, fechaDesde, fechaHasta, branchId]);

  const totalUnidades = ventas.reduce((s, v) => s + (v.cantidad_producto || 0), 0);
  const totalRecaudado = ventas.reduce((s, v) => s + (v.subtotal_producto || 0), 0);

  const chartData = useMemo(() => {
    const byDay = new Map();
    ventas.forEach(v => {
      const d = parseApiDate(v.fecha);
      if (!d) return;
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!byDay.has(sortKey)) {
        byDay.set(sortKey, {
          fecha: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
          cantidad: 0,
        });
      }
      byDay.get(sortKey).cantidad += v.cantidad_producto || 0;
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, cantidad: Math.round(v.cantidad * 100) / 100 }));
  }, [ventas]);

  const formatDate = (iso) => {
    const d = parseApiDate(iso);
    if (!d) return '—';
    return d.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getBranchName = (id) => {
    const b = branches?.find(b => b.id === id);
    return b ? b.nombre : (id || 'Sin sucursal');
  };

  const branchLabel = !branchId || branchId === 'all' ? 'Todas las sucursales' : getBranchName(branchId);
  const periodoLabel = `${formatPeriodDate(fechaDesde)} – ${formatPeriodDate(fechaHasta)}`;

  const handleExportPDF = () => {
    if (ventas.length === 0) return;
    setGeneratingPdf(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210;
      const margin = 20;
      const colRight = W - margin;
      let y = 0;

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
        pdf.text(value, colRight - 2, yPos, { align: 'right' });
        return yPos + 6;
      };

      pdf.setFillColor(20, 20, 20);
      pdf.rect(0, 0, W, 28, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MOVIMIENTOS DE PRODUCTO', W / 2, 13, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${producto}`, W / 2, 20, { align: 'center' });
      pdf.setFontSize(8);
      pdf.text(`Período: ${periodoLabel}   |   Sucursal: ${branchLabel}   |   Generado: ${new Date().toLocaleDateString('es-ES')}`, W / 2, 25.5, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      y = 34;

      y = sectionTitle('RESUMEN', y);
      y = row('Ventas', ventas.length.toString(), y);
      y = row('Unidades vendidas', Number.isInteger(totalUnidades) ? totalUnidades.toString() : totalUnidades.toFixed(2), y);
      y = row('Total recaudado', `$${formatAmount(totalRecaudado)}`, y, true);
      y += 4;

      y = sectionTitle('DETALLE DE VENTAS', y);
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, y, colRight - margin, 6, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Fecha', margin + 2, y + 4);
      pdf.text('Sucursal', margin + 42, y + 4);
      pdf.text('Comprobante', margin + 80, y + 4);
      pdf.text('Cant.', margin + 120, y + 4);
      pdf.text('Subtotal', colRight - 2, y + 4, { align: 'right' });
      y += 7;

      pdf.setFont('helvetica', 'normal');
      ventas.forEach((v, i) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        if (i % 2 === 0) {
          pdf.setFillColor(248, 248, 248);
          pdf.rect(margin, y - 1, colRight - margin, 6, 'F');
        }
        pdf.setFontSize(8);
        pdf.text(formatDate(v.fecha), margin + 2, y + 3);
        const sucursal = v.branch_nombre || getBranchName(v.branch_id);
        pdf.text(sucursal.length > 22 ? sucursal.slice(0, 20) + '…' : sucursal, margin + 42, y + 3);
        pdf.text(v.numero_factura || '—', margin + 80, y + 3);
        pdf.text(
          Number.isInteger(v.cantidad_producto) ? v.cantidad_producto.toString() : v.cantidad_producto.toFixed(2),
          margin + 120, y + 3
        );
        pdf.text(`$${formatAmount(v.subtotal_producto)}`, colRight - 2, y + 3, { align: 'right' });
        y += 6;
      });

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

      pdf.save(`movimientos-${producto.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <>
      <div className={`ticket-modal-overlay${closing ? ' closing' : ''}`}>
        <div
          className={`ticket-modal-container${closing ? ' closing' : ''}`}
          style={{ maxWidth: '920px', width: '95vw' }}
        >
          <div className="modal-header">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="modal-title">Movimientos — {producto}</h3>
            </div>
            <button onClick={onClose} className="modal-close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 px-1">
            <p className="text-sm text-gray-500">
              Período: <span className="font-medium text-gray-700">{periodoLabel}</span>
              {' · '}{branchLabel}
            </p>
            <button
              onClick={handleExportPDF}
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
              disabled={ventas.length === 0 || generatingPdf}
            >
              <Printer className="w-3.5 h-3.5" />
              {generatingPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="spinner w-8 h-8" />
            </div>
          ) : ventas.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay ventas de este producto en el período seleccionado</p>
            </div>
          ) : (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 px-1">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Ventas</p>
                  <p className="text-xl font-bold text-gray-800">{ventas.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Unidades vendidas</p>
                  <p className="text-xl font-bold text-gray-800">
                    {Number.isInteger(totalUnidades) ? totalUnidades : totalUnidades.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Total recaudado</p>
                  <p className="text-xl font-bold text-gray-800">${formatAmount(totalRecaudado)}</p>
                </div>
              </div>

              {/* Evolución en el período */}
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                    <Tooltip formatter={(v) => [v, 'Unidades']} />
                    <Line type="monotone" dataKey="cantidad" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Detalle de ventas */}
              <div className="overflow-x-auto" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Sucursal</th>
                      <th>Comprobante</th>
                      <th style={{ textAlign: 'center' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                      <th style={{ width: '1rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map(v => (
                      <tr key={v.id}>
                        <td className="text-sm text-gray-600 whitespace-nowrap">{formatDate(v.fecha)}</td>
                        <td className="text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {v.branch_nombre || getBranchName(v.branch_id)}
                          </span>
                        </td>
                        <td className="text-sm font-medium text-gray-800">{v.numero_factura || '—'}</td>
                        <td className="text-center font-semibold text-gray-800">
                          {Number.isInteger(v.cantidad_producto) ? v.cantidad_producto : v.cantidad_producto.toFixed(2)}
                        </td>
                        <td className="text-right font-medium text-gray-800">${formatAmount(v.subtotal_producto)}</td>
                        <td className="text-center">
                          <button
                            onClick={() => setTicketSale(v)}
                            className="btn btn-color-secondary btn-icon-sm"
                            title="Ver ticket"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="btn btn-secondary">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {ticketSale && (
        <TicketModal
          sale={ticketSale}
          config={config}
          afipConfig={afipConfig}
          title="Ticket de venta"
          onClose={() => setTicketSale(null)}
          onPrint={() => window.print()}
        />
      )}
    </>
  );
};

export default ProductMovementsModal;
