import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { useSortableData } from '../../hooks/useSortableData';
import { formatAmount, parseApiDate } from '../../lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import PurchasesReportView from './PurchasesReportView';

const PurchasesReport = () => {
  const [compras, setCompras] = useState([]);
  const [branches, setBranches] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [dateFilter, setDateFilter] = useState('month');
  const [branchFilter, setBranchFilter] = useState('all');
  const [proveedorFilter, setProveedorFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [comprasRes, branchesRes, proveedoresRes] = await Promise.all([
        axios.get(`${API}/compras`),
        axios.get(`${API}/branches`),
        axios.get(`${API}/proveedores`)
      ]);
      setCompras(comprasRes.data);
      setBranches(branchesRes.data);
      setProveedores(proveedoresRes.data);
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const getBranchName = (branchId) => {
    if (!branchId) return 'Sin sucursal';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.nombre : branchId;
  };

  const getProveedorName = (proveedorId) => {
    if (!proveedorId) return 'Sin proveedor';
    const prov = proveedores.find(p => p.id === proveedorId);
    return prov ? prov.nombre : proveedorId;
  };

  const getFilteredCompras = () => {
    const now = new Date();
    let filtered = [...compras];

    if (branchFilter !== 'all') {
      filtered = filtered.filter(c => c.sucursal_id === branchFilter);
    }

    if (proveedorFilter !== 'all') {
      filtered = filtered.filter(c => c.proveedor_id === proveedorFilter);
    }

    switch (dateFilter) {
      case 'today': {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = filtered.filter(c => new Date(c.fecha) >= today);
        break;
      }
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        filtered = filtered.filter(c => new Date(c.fecha) >= weekAgo);
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        filtered = filtered.filter(c => new Date(c.fecha) >= monthAgo);
        break;
      }
      case 'custom':
        if (customDateFrom && customDateTo) {
          const fromDate = new Date(customDateFrom);
          const toDate = new Date(customDateTo);
          toDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(c => {
            const d = new Date(c.fecha);
            return d >= fromDate && d <= toDate;
          });
        }
        break;
      default:
        break;
    }

    return filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  const calculateStats = (data) => {
    const totalCompras = data.length;
    const totalGastado = data.reduce((sum, c) => sum + c.total, 0);
    const promedio = totalCompras > 0 ? totalGastado / totalCompras : 0;

    const byProveedor = {};
    data.forEach(c => {
      const key = c.proveedor_id || 'sin_proveedor';
      if (byProveedor[key]) {
        byProveedor[key].count++;
        byProveedor[key].total += c.total;
      } else {
        byProveedor[key] = { count: 1, total: c.total, nombre: getProveedorName(key === 'sin_proveedor' ? null : key) };
      }
    });

    const byBranch = {};
    if (branchFilter === 'all') {
      data.forEach(c => {
        const key = c.sucursal_id || 'sin_sucursal';
        if (byBranch[key]) {
          byBranch[key].count++;
          byBranch[key].total += c.total;
        } else {
          byBranch[key] = { count: 1, total: c.total, nombre: getBranchName(key === 'sin_sucursal' ? null : key) };
        }
      });
    }

    return { totalCompras, totalGastado, promedio, byProveedor, byBranch };
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

  const handleExportPDF = () => {
    const filtered = getFilteredCompras();
    if (filtered.length === 0) return;
    setGeneratingPdf(true);
    try {
      const stats = calculateStats(filtered);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210;
      const margin = 20;
      const colRight = W - margin;
      let y = 0;

      const line = (y1) => { pdf.setDrawColor(180); pdf.line(margin, y1, colRight, y1); };
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

      // Encabezado
      pdf.setFillColor(20, 20, 20);
      pdf.rect(0, 0, W, 28, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPORTE DE COMPRAS', W / 2, 13, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const periodoLabel = { today: 'Hoy', week: 'Última semana', month: 'Último mes', all: 'Todas', custom: 'Rango personalizado' }[dateFilter] || dateFilter;
      const sucursalLabel = branchFilter === 'all' ? 'Todas las sucursales' : getBranchName(branchFilter);
      pdf.text(`Período: ${periodoLabel}   |   Sucursal: ${sucursalLabel}   |   Generado: ${new Date().toLocaleDateString('es-ES')}`, W / 2, 22, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      y = 34;

      // Resumen
      y = sectionTitle('RESUMEN', y);
      y = row('Total de compras', stats.totalCompras.toString(), y);
      y = row('Total gastado', `$${formatAmount(stats.totalGastado)}`, y, true);
      y = row('Compra promedio', `$${formatAmount(stats.promedio)}`, y);
      y += 4;

      // Por proveedor
      if (Object.keys(stats.byProveedor).length > 0) {
        y = sectionTitle('DESGLOSE POR PROVEEDOR', y);
        Object.entries(stats.byProveedor).forEach(([, data]) => {
          y = row(`${data.nombre} (${data.count} facturas)`, `$${formatAmount(data.total)}`, y);
          if (y > 270) { pdf.addPage(); y = 20; }
        });
        y += 4;
      }

      // Por sucursal
      if (branchFilter === 'all' && Object.keys(stats.byBranch).length > 1) {
        y = sectionTitle('COMPRAS POR SUCURSAL', y);
        Object.entries(stats.byBranch).forEach(([, data]) => {
          y = row(`${data.nombre} (${data.count} compras)`, `$${formatAmount(data.total)}`, y);
        });
        y += 4;
      }

      // Tabla
      y = sectionTitle('HISTORIAL DE COMPRAS', y);
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, y, colRight - margin, 6, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Factura', margin + 2, y + 4);
      pdf.text('Fecha', margin + 35, y + 4);
      pdf.text('Sucursal', margin + 72, y + 4);
      pdf.text('Proveedor', margin + 105, y + 4);
      pdf.text('Items', margin + 138, y + 4);
      pdf.text('Total', colRight - 2, y + 4, { align: 'right' });
      y += 7;

      pdf.setFont('helvetica', 'normal');
      filtered.forEach((compra, i) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        if (i % 2 === 0) {
          pdf.setFillColor(248, 248, 248);
          pdf.rect(margin, y - 1, colRight - margin, 6, 'F');
        }
        pdf.setFontSize(8);
        pdf.text(compra.numero_factura || '-', margin + 2, y + 3);
        pdf.text(formatDate(compra.fecha), margin + 35, y + 3);
        pdf.text(getBranchName(compra.sucursal_id), margin + 72, y + 3);
        pdf.text(getProveedorName(compra.proveedor_id), margin + 105, y + 3);
        pdf.text(`${compra.items.length} prod.`, margin + 138, y + 3);
        pdf.text(`$${formatAmount(compra.total)}`, colRight - 2, y + 3, { align: 'right' });
        y += 6;
      });

      // Pie de página
      const totalPages = pdf.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        line(285);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`Generado el ${new Date().toLocaleString('es-ES')}`, margin, 290);
        pdf.text(`Página ${p} de ${totalPages}`, colRight, 290, { align: 'right' });
      }

      pdf.save(`reporte-compras-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const exportToXLSX = () => {
    const filtered = getFilteredCompras();
    if (filtered.length === 0) return;
    const rows = filtered.map(c => ({
      Factura: c.numero_factura,
      Fecha: formatDate(c.fecha),
      Sucursal: getBranchName(c.sucursal_id),
      Proveedor: getProveedorName(c.proveedor_id),
      Items: c.items.length,
      Subtotal: c.subtotal,
      Impuestos: c.impuestos,
      Total: c.total,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 24 },
      { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compras');
    XLSX.writeFile(wb, `compras_${dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Reporte exportado exitosamente');
  };

  const getDailyData = (data) => {
    const byDay = {};
    data.forEach(item => {
      const d = new Date(item.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (byDay[key]) {
        byDay[key].total += item.total;
        byDay[key].count++;
      } else {
        byDay[key] = { fecha: label, total: item.total, count: 1, key };
      }
    });
    return Object.values(byDay).sort((a, b) => a.key.localeCompare(b.key));
  };

  const getTopProveedores = (data) => {
    const byProv = {};
    data.forEach(c => {
      const nombre = getProveedorName(c.proveedor_id);
      if (byProv[nombre]) {
        byProv[nombre] += c.total;
      } else {
        byProv[nombre] = c.total;
      }
    });
    return Object.entries(byProv)
      .map(([nombre, total]) => ({ nombre, total: parseFloat(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  };

  const filteredCompras = loading ? [] : getFilteredCompras();
  const { sortedItems: sortedCompras, sortConfig, requestSort } = useSortableData(filteredCompras);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }
  const stats = calculateStats(filteredCompras);
  const dailyData = getDailyData(filteredCompras);
  const topProveedores = getTopProveedores(filteredCompras);

  return (
    <PurchasesReportView
      filteredCompras={sortedCompras}
      sortConfig={sortConfig}
      requestSort={requestSort}
      stats={stats}
      dailyData={dailyData}
      topProveedores={topProveedores}
      branches={branches}
      proveedores={proveedores}
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      branchFilter={branchFilter}
      setBranchFilter={setBranchFilter}
      proveedorFilter={proveedorFilter}
      setProveedorFilter={setProveedorFilter}
      customDateFrom={customDateFrom}
      setCustomDateFrom={setCustomDateFrom}
      customDateTo={customDateTo}
      setCustomDateTo={setCustomDateTo}
      generatingPdf={generatingPdf}
      handleExportPDF={handleExportPDF}
      exportToXLSX={exportToXLSX}
      formatDate={formatDate}
      formatAmount={formatAmount}
      getBranchName={getBranchName}
      getProveedorName={getProveedorName}
    />
  );
};

export default PurchasesReport;
